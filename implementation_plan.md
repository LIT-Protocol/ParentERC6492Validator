## Goal

Build a Kernel v3.3 **validator module** for a **child Kernel account** such that:

- Child’s **sudo validator** is `ParentERC6492Validator`
- A single user approval comes from the **parent smart account** as an **ERC-6492 signature**
- Approval covers **N chains** by signing a **Merkle root** of per-chain leaf hashes (multi-chain mode)
- Each chain still submits its own UserOp, but **no extra user signatures per chain**
- The validator prevents replay (nonce/deadline) and binds approval to a specific child + action.

Use `@zerodev/multi-chain-ecdsa-validator` in `zerodev-sdk/plugins/multi-chain-ecdsa` as conceptual reference for the Merkle/proof UX and leaf hashing, but replace ECDSA verification with ERC-6492 verification against a **parent account address**. There's an example in `zerodev-examples/multi-chain/main.ts` that shows how to use the multi-chain ecdsa validator. Let's make our e2e test work the same way.

---

## Repo layout

- `contracts/ParentERC6492Validator.sol`
- `contracts/interfaces/…` (only if needed; prefer importing)
- `src/` (TS helpers: encoding signatures, leaf hashing, Merkle proofs, deployment)
- `test/` (Foundry recommended + minimal TS integration tests)

---

## Step 1 — Solidity: implement `ParentERC6492Validator`

Follow `@zerodev/multi-chain-ecdsa-validator` in `zerodev-sdk/plugins/multi-chain-ecdsa` as an example as closely as possible. You may copy this code verbatim as a starting point.

### 1.1 Storage

Per child account (validator instance is usually shared; store per-account state keyed by `msg.sender` / `account`):

- `mapping(address child => address parent)`
- `mapping(address child => uint256 approvalNonce)` OR `mapping(address child => mapping(uint256 => bool) usedNonce)`
- Optional: `mapping(address child => mapping(bytes32 => bool) usedRoot)` if you want one-time root usage

Pick **nonce-based** (simpler).

### 1.2 Initialization

Implement the module’s init function expected by Kernel (often `onInstall(bytes data)` or similar):

- decode `data` = `(address parent, uint256 initialNonce, bytes32 scope?)`
- store parent for `msg.sender` (child account)
- set nonce

Also implement uninstall hook if required by Kernel module system (clear mappings).

### 1.3 `validateUserOp`

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

**Important:** The validator should not accept approvals that don’t bind to `child`, or you risk replay onto other child accounts.

### 1.4 ERC-6492 verification

Preferred approach:

- Import an ERC-6492 “signature checker” from a reputable dependency if ZeroDev doesn’t export one.
- It should validate:

  - if signature is a 6492 “wrapper”, deploy/call the counterfactual verifier as specified and/or validate against the parent address
  - or if parent is deployed, fallback to ERC-1271 check

Do **not** hand-roll complex 6492 parsing unless unavoidable.

---

## Step 2 — TS helper library (userland)

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

**Reference:** mirror multi-chain-ecdsa-validator’s “prepareAndSignUserOperations” flow, but:

- import their utilities if public/exported
- otherwise implement minimal Merkle/proof logic using the same dependency that the multi-chain-ecdsa-validator uses in TS.

---

## Step 3 — Tests (must cover multi-chain mode)

First, create unit tests of the underlying solidity code. Then, create real world e2e tests on Base Sepolia and Arbitrum Sepolia. Use the following env vars in the .env file:

- PRIVATE_KEY: a private key with ETH on Base Sepolia and Arbitrum Sepolia.
- ZERODEV_PROJECT_ID: a project id from the ZeroDev dashboard enabled for Base Sepolia and Arbitrum Sepolia.
- BASE_SEPOLIA_RPC_URL: a RPC URL for Base Sepolia.
- ARBITRUM_SEPOLIA_RPC_URL: a RPC URL for Arbitrum Sepolia.

Use the ZeroDev API v3 with the URL in this format: https://rpc.zerodev.app/api/v3/<ZeroDevProjectId>/chain/<ChainId>

In the e2e test, you should:

- deploy parent smart account
- create child accounts on Base Sepolia and Arbitrum Sepolia, with parent smart account as the sudo validator using our ParentERC6492Validator
- build test transactions for the child accounts on Base Sepolia and Arbitrum Sepolia, sending 0 ETH to the 0x00..000 address on each chain
- sign the test transactions with the parent smart account, to be validated by our ParentERC6492Validator
- submit userOp on each chain with same parentSig/root, different proof
- assert that the txn succeeded on both chains

Also test:

- nonce replay fails
- expired approval fails
- proof mismatch fails
- changing child address breaks approval
- scope mismatch breaks approval

---

## Step 4 — Docs in README

Document:

- How to deploy validator
- How to create child account with this sudo validator
- How to generate multi-chain approval signature
- ABI layout of `userOp.signature`
- Security notes (nonce + deadline + scope binding)

---

## Implementation notes / guardrails

- Approval should bind to:
  - child address
  - merkle root (which commits to per-chain ops)
  - nonce + deadline
- Use CREATE2 deployment for validator so it’s the same address across chains.
- Keep the on-chain validator minimal; keep Merkle construction off-chain.
