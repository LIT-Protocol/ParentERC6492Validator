## Goal

Build a Kernel v3.3 **validator module** for a **child Kernel account** such that:

- Child’s **sudo validator** is `ParentERC6492Validator`
- A single user approval comes from the **parent smart account** as an **ERC-6492 signature**
- Approval covers **N chains** by signing a **Merkle root** of per-chain leaf hashes (multi-chain mode)
- Each chain still submits its own UserOp, but **no extra user signatures per chain**
- The validator prevents replay (nonce/deadline) and binds approval to a specific child + action.

Use `@zerodev/multi-chain-ecdsa-validator` as conceptual reference for the Merkle/proof UX and leaf hashing, but replace ECDSA verification with ERC-6492 verification against a **parent account address**.

---

## Repo layout

- `contracts/ParentERC6492Validator.sol`
- `contracts/interfaces/…` (only if needed; prefer importing)
- `src/` (TS helpers: encoding signatures, leaf hashing, Merkle proofs, deployment)
- `test/` (Foundry recommended + minimal TS integration tests)

---

## Step 1 — Identify Kernel v3.3 validator interfaces in `zerodev-sdk`

In `./zerodev-sdk`, locate:

- Kernel v3.3 account contract + validator interface:

  - the interface your validator must implement (commonly something like `IKernelValidator` / `IValidator` with `validateUserOp` + optional hooks)

- The **EntryPoint 0.7** UserOp struct definition used by Kernel v3.3
- Any helper libs for:

  - computing UserOp hash / validation data packing
  - ERC-1271 / signature checker utilities (if present)
  - ERC-6492 verification helper (if present)

**Instruction:** import these from the published packages if possible; otherwise import from `zerodev-sdk` as a dependency in your repo (do not copy code).

---

## Step 2 — Decide the validation scheme (must be deterministic and chain-safe)

You need two hashes:

### 2.1 Leaf hash (per chain)

Follow the spirit of multi-chain-ecdsa-validator:

- Compute a per-chain leaf that _binds chain context_
- Recommended leaf inputs:

  - `chainId`
  - `childAccountAddress`
  - `entryPointAddress` (optional but good)
  - `userOpHash` (computed using EntryPoint’s hash algorithm for that chain)
  - `actionNonce` (optional; can be global instead)

**Leaf = keccak256(abi.encode(LEAF_TYPEHASH, chainId, child, entryPoint, userOpHash))**

### 2.2 Root approval hash (signed by parent via ERC-6492)

Parent signs a message committing to:

- `merkleRoot`
- `childAccountAddress`
- `validUntil` (deadline)
- `approvalNonce` (replay protection)
- `purpose` (e.g. `"ROTATE_SESSION_KEY"` or a bytes32 “scope”)

**ApprovalHash = keccak256(abi.encode(APPROVAL_TYPEHASH, child, merkleRoot, approvalNonce, validUntil, scope))**

This approval signature is **ERC-6492** (works even if parent not deployed on that chain), and is verified on-chain in the validator.

---

## Step 3 — Solidity: implement `ParentERC6492Validator`

### 3.1 Storage

Per child account (validator instance is usually shared; store per-account state keyed by `msg.sender` / `account`):

- `mapping(address child => address parent)`
- `mapping(address child => uint256 approvalNonce)` OR `mapping(address child => mapping(uint256 => bool) usedNonce)`
- Optional: `mapping(address child => mapping(bytes32 => bool) usedRoot)` if you want one-time root usage

Pick **nonce-based** (simpler).

### 3.2 Initialization

Implement the module’s init function expected by Kernel (often `onInstall(bytes data)` or similar):

- decode `data` = `(address parent, uint256 initialNonce, bytes32 scope?)`
- store parent for `msg.sender` (child account)
- set nonce

Also implement uninstall hook if required by Kernel module system (clear mappings).

### 3.3 `validateUserOp`

Implement Kernel’s validator entrypoint (exact signature from v3.3):

- Inputs will include UserOp + userOpHash + maybe missing funds

- Decode `userOp.signature` into:

  ```
  struct MultiChainApproval {
    uint256 approvalNonce;
    uint48 validUntil;
    bytes32 merkleRoot;
    bytes32[] merkleProof;
    bytes parentSig6492;
    bytes32 scope; // optional
  }
  ```

- Recompute:

  - `leaf` from (chainId, child address, entryPoint, userOpHash)
  - verify Merkle proof => root equals `merkleRoot`
  - enforce `block.timestamp <= validUntil`
  - enforce `approvalNonce == expectedNonce(child)` and then increment nonce (or mark used)
  - compute `approvalHash` from (child, merkleRoot, approvalNonce, validUntil, scope)
  - verify `parentSig6492` against `approvalHash` for stored `parent(child)` using an **ERC-6492 signature checker** (import if available; otherwise use a known-safe library dependency)

- Return Kernel’s expected packed validation result (import packing helpers if available).

**Important:** The validator should not accept approvals that don’t bind to `child` and `scope`, or you risk replay onto other child accounts.

### 3.4 ERC-6492 verification

Preferred approach:

- Import an ERC-6492 “signature checker” from a reputable dependency if ZeroDev doesn’t export one.
- It should validate:

  - if signature is a 6492 “wrapper”, deploy/call the counterfactual verifier as specified and/or validate against the parent address
  - or if parent is deployed, fallback to ERC-1271 check

Do **not** hand-roll complex 6492 parsing unless unavoidable.

---

## Step 4 — TS helper library (userland)

Create `src/multichain.ts`:

- Takes:

  - list of chain configs `{ chainId, entryPoint, publicClient, childAddress }`
  - list of per-chain unsigned UserOps (or build them)

- Computes:

  - each chain’s `userOpHash`
  - leaf hashes
  - Merkle tree and proofs
  - root

- Asks parent account client to sign **ApprovalHash** once (EIP-712 recommended; otherwise `signMessage` of hash)

Then for each chain, produces a `userOp.signature` that ABI-encodes `MultiChainApproval` with that chain’s proof + shared parentSig.

**Reference:** mirror multi-chain-ecdsa-validator’s “prepareAndSignUserOperations” flow conceptually, but:

- do not copy their code verbatim
- import their utilities if public/exported
- otherwise implement minimal Merkle/proof logic with a small dependency (e.g. `merkletreejs`) in TS.

---

## Step 5 — Deployment + “child account with sudo validator” wiring

Write a small script `src/deploy.ts`:

1. Deploy `ParentERC6492Validator` with CREATE2 on each chain (same address).
2. Create the **child Kernel v3.3** account via ZeroDev SDK:

   - set `plugins.sudo` to point to `ParentERC6492Validator`
   - pass initData so the validator stores the `parent` address for that child

3. Install ZeroDev **Permissions / Session Keys** plugin on the child:

   - either via `initConfig` on creation (preferred)
   - or immediately after deploy with an admin UserOp

You should use ZeroDev SDK imports for:

- `createKernelAccount` (v3.3)
- plugin install/init helpers
- Permissions/session keys plugin helpers
  and avoid copying SDK logic.

---

## Step 6 — Tests (must cover multi-chain mode)

Foundry tests (fast + deterministic):

- Setup two chains in tests is hard; instead:

  - Unit test Merkle verification and signature verification in isolation:

    - Provide sample `userOpHash` values and chainIds
    - Build root+proof offchain and validate onchain

- Add one integration test using anvil fork(s) or separate RPCs if you can:

  - create child account, install Permissions
  - build 2 chain approvals (simulate 6)
  - submit userOp on each chain with same parentSig/root, different proof
  - assert permissions changed on both

Also test:

- nonce replay fails
- expired approval fails
- proof mismatch fails
- changing child address breaks approval
- scope mismatch breaks approval

---

## Step 7 — Docs in README

Document:

- How to deploy validator
- How to create child account with this sudo validator
- How to generate multi-chain approval signature
- ABI layout of `userOp.signature`
- Security notes (nonce + deadline + scope binding)

---

## Implementation notes / guardrails

- **Do not** allow session key (regular validator) to modify permissions; only sudo path should.
- Approval should bind to:

  - child address
  - merkle root (which commits to per-chain ops)
  - nonce + deadline
  - scope string/bytes32 to avoid “approve anything” signatures

- Use CREATE2 deployment for validator so it’s the same address across chains.
- Keep the on-chain validator minimal; keep Merkle construction off-chain.
