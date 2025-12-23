# ParentERC6492Validator

A Kernel v3.3 validator module that enables **multi-chain approval with a single parent signature**. This validator allows a parent smart account (or EOA) to authorize UserOperations on child accounts across multiple chains using a single signature over a Merkle root.

## Why This Exists

In a multi-chain world, managing child accounts across different networks becomes complex:

- **Without this validator**: The parent needs to sign separate approvals for each chain, requiring N signatures for N chains
- **With this validator**: The parent signs **once** over a Merkle root, and that signature is valid across all chains

This is particularly useful for:
- **Delegated account management**: A parent account controls child accounts on multiple chains
- **Session key rotation**: Rotate session keys across all chains with one signature
- **Multi-chain DAOs**: A single governance approval can authorize actions on all deployment chains
- **Smart account hierarchies**: Parent-child account relationships that span chains

## How It Works

### Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Parent Account              │
                    │  (Signs ONCE over Merkle Root)      │
                    └───────────────┬─────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │   Merkle Root     │
                          │  (of all leaves)  │
                          └─────────┬─────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
    ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
    │  Leaf (Base)  │       │  Leaf (Arb)   │       │  Leaf (OP)    │
    │  chainId=8453 │       │  chainId=42161│       │  chainId=10   │
    └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
            │                       │                       │
    ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
    │ Child Account │       │ Child Account │       │ Child Account │
    │  (Base)       │       │  (Arbitrum)   │       │  (Optimism)   │
    └───────────────┘       └───────────────┘       └───────────────┘
```

### Validation Flow

1. **Leaf Hash Computation**: For each chain, compute a leaf hash:
   ```
   leafHash = keccak256(LEAF_TYPEHASH, chainId, child, entryPoint, userOpHash)
   ```

2. **Merkle Tree Construction**: Build a Merkle tree from all leaf hashes

3. **Parent Signs Once**: Parent signs the approval hash (containing the Merkle root):
   ```
   approvalHash = keccak256(APPROVAL_TYPEHASH, child, merkleRoot, nonce, validUntil, scope)
   ```

4. **Per-Chain Verification**: On each chain, the validator:
   - Computes the leaf hash for that chain's UserOp
   - Verifies the leaf against the Merkle root using the proof
   - Verifies the parent's signature (ERC-6492 compatible)
   - Increments the nonce to prevent replay

### ERC-6492 Support

This validator supports [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492) signatures, which means:
- Parent can be an **undeployed smart account** (counterfactual)
- Parent can be a **deployed smart account** (ERC-1271)
- Parent can be an **EOA** (standard ECDSA)

## Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in:

```bash
# Private key for the EOA that owns the parent smart account
PRIVATE_KEY=0x...

# ZeroDev Project ID (from https://dashboard.zerodev.app)
ZERODEV_PROJECT_ID=...

# RPC URLs (optional, defaults provided)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

## Usage

### Deploying the Validator

```typescript
import { deployValidator, computeValidatorAddress } from "parent-erc6492-validator";

// Deploy to a chain
const result = await deployValidator({
  publicClient,
  walletClient,
  chain: baseSepolia,
});

console.log(`Validator deployed at: ${result.address}`);
```

### Installing on a Child Account

```typescript
import { encodeInstallData } from "parent-erc6492-validator";

// Encode installation data
const installData = encodeInstallData(
  parentAddress,  // The parent account that will authorize operations
  0n,             // Initial nonce
  "0x0000000000000000000000000000000000000000000000000000000000000000" // Scope (0 = any)
);

// Install via Kernel's installModule
await childClient.sendTransaction({
  to: childAccount.address,
  data: encodeFunctionData({
    abi: kernelAbi,
    functionName: "installModule",
    args: [1n, validatorAddress, installData], // 1 = validator module type
  }),
});
```

### Creating a Multi-Chain Approval

```typescript
import {
  computeLeafHash,
  computeApprovalHash,
  buildMerkleTree,
  encodeUserOpSignature,
} from "parent-erc6492-validator";

// 1. Compute leaf hashes for each chain
const baseLeaf = computeLeafHash(
  8453,           // Base chain ID
  childAddress,
  entryPointAddress,
  baseUserOpHash
);

const arbLeaf = computeLeafHash(
  42161,          // Arbitrum chain ID
  childAddress,
  entryPointAddress,
  arbUserOpHash
);

// 2. Build Merkle tree
const { root: merkleRoot, getProof } = buildMerkleTree([baseLeaf, arbLeaf]);

// 3. Compute approval hash
const approvalHash = computeApprovalHash(
  childAddress,
  merkleRoot,
  nonce,
  validUntil,    // Unix timestamp
  scope          // bytes32 scope identifier
);

// 4. Parent signs ONCE
const parentSignature = await parentSigner.signMessage({
  message: { raw: approvalHash },
});

// 5. Generate chain-specific signatures
const baseSignature = encodeUserOpSignature({
  approvalNonce: nonce,
  validUntil,
  merkleRoot,
  merkleProof: getProof(0),  // Proof for Base leaf
  parentSig6492: parentSignature,
  scope,
});

const arbSignature = encodeUserOpSignature({
  approvalNonce: nonce,
  validUntil,
  merkleRoot,
  merkleProof: getProof(1),  // Proof for Arbitrum leaf
  parentSig6492: parentSignature,
  scope,
});
```

### Using with ZeroDev SDK

```typescript
import { toParentValidator } from "parent-erc6492-validator";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";

// Create the parent validator
const parentValidator = await toParentValidator({
  validatorAddress,
  parentAddress: parentAccount.address,
  parentSigner: ownerSigner,
  publicClient,
});

// Create child account with parent validator
const childAccount = await createKernelAccount(publicClient, {
  entryPoint: ENTRY_POINT,
  plugins: {
    sudo: parentValidator,  // Or use as a secondary validator
  },
  kernelVersion: "0.3.1",
});

// Create client - signatures are automatically generated
const childClient = createKernelAccountClient({
  account: childAccount,
  chain,
  bundlerTransport: http(bundlerUrl),
  paymaster: createZeroDevPaymasterClient({ chain, transport: http(paymasterUrl) }),
});

// Send transaction - parent approval happens automatically
await childClient.sendTransaction({
  to: recipient,
  value: parseEther("0.01"),
});
```

## Contract Interface

### Key Functions

| Function | Description |
|----------|-------------|
| `onInstall(bytes data)` | Install the validator on a child account |
| `onUninstall(bytes data)` | Uninstall the validator |
| `validateUserOp(PackedUserOperation, bytes32)` | Validate a UserOp against parent approval |
| `isValidSignatureWithSender(address, bytes32, bytes)` | ERC-1271 signature validation |
| `computeLeafHash(...)` | Compute the leaf hash for a chain |
| `computeApprovalHash(...)` | Compute the approval hash to sign |

### Storage

| Mapping | Description |
|---------|-------------|
| `parentOf[child]` | The parent account for each child |
| `nonceOf[child]` | Current approval nonce (prevents replay) |
| `scopeOf[child]` | Scope restriction (0 = any scope allowed) |

### Events

```solidity
event ModuleInstalled(address indexed child, address parent, uint256 initialNonce, bytes32 scope);
event ModuleUninstalled(address indexed child);
event NonceUsed(address indexed child, uint256 nonce);
```

### Errors

```solidity
error InvalidParent();      // Parent address is zero
error InvalidNonce();       // Nonce doesn't match
error ExpiredApproval();    // Past validUntil timestamp
error InvalidMerkleProof(); // Merkle proof verification failed
error InvalidSignature();   // Parent signature invalid
error ScopeMismatch();      // Scope doesn't match allowed scope
error NotInitialized();     // Validator not installed
error AlreadyInitialized(); // Validator already installed
```

## Running Tests

### Solidity Tests (Foundry)

```bash
# Run all contract tests
forge test -vv

# Run with gas reporting
forge test -vv --gas-report
```

### End-to-End Test

The E2E test (`src/__tests__/e2e.test.ts`) demonstrates the full multi-chain flow:

1. **Deploys validators** to Base Sepolia and Arbitrum Sepolia
2. **Creates parent account** on Base Sepolia
3. **Creates child accounts** on both chains (same address via deterministic deployment)
4. **Generates single parent signature** covering both chains
5. **Verifies hash computation** matches on-chain

```bash
# Run the E2E test
npm run test:e2e
```

#### What the E2E Test Demonstrates

```
======================================================================
ParentERC6492Validator Multi-Chain E2E Test
======================================================================

--- Step 7: Create Multi-Chain Approval (Single Parent Signature) ---
  Base leaf: 0x606e7f27a306251a1c...
  Arb leaf: 0x75c52672a1711a9bce...
  Merkle root: 0x9dcbb84f778da775cca1e1f1185a1bf4cdec671afe7a01a8021861f1399f83ed

  *** SINGLE APPROVAL HASH: 0x7283ef7ba4a2766b1db10b11e40866bfc2a6d0d1... ***
  *** SINGLE PARENT SIGNATURE: 0xdb16089c7506509daafdd698d7a047d6d036288c... ***

--- Step 8: Generate Chain-Specific Signatures ---
  Base Sepolia signature: 0x0000000000000000... (416 bytes)
  Arbitrum Sepolia signature: 0x0000000000000000... (416 bytes)

Key Achievement:
  → ONE parent signature authorizes operations on MULTIPLE chains!
  → Each chain uses the same signature with different Merkle proofs
```

## API Reference

### Types

```typescript
interface ChainConfig {
  chainId: number;
  entryPoint: Address;
  childAddress: Address;
  userOpHash: Hash;
}

interface MultiChainApprovalParams {
  childAddress: Address;
  chainConfigs: ChainConfig[];
  approvalNonce: bigint;
  validUntil: number;  // Unix timestamp
  scope: Hash;
}

interface SignedMultiChainApproval {
  approvalNonce: bigint;
  validUntil: number;
  merkleRoot: Hash;
  merkleProof: Hash[];
  parentSig6492: Hex;
  scope: Hash;
}
```

### Core Functions

```typescript
// Compute leaf hash for a chain
function computeLeafHash(
  chainId: number,
  child: Address,
  entryPoint: Address,
  userOpHash: Hash
): Hash;

// Compute approval hash for parent to sign
function computeApprovalHash(
  child: Address,
  merkleRoot: Hash,
  nonce: bigint,
  validUntil: number,
  scope: Hash
): Hash;

// Build Merkle tree from leaves
function buildMerkleTree(leaves: Hash[]): {
  root: Hash;
  getProof: (index: number) => Hash[];
};

// Encode signature for UserOp
function encodeUserOpSignature(approval: SignedMultiChainApproval): Hex;
```

## Security Considerations

1. **Nonce Management**: Each approval increments the child's nonce, preventing replay attacks
2. **Deadline Enforcement**: Approvals have a `validUntil` timestamp enforced on-chain
3. **Scope Restriction**: Optional scope limits what operations the validator can approve
4. **Merkle Proofs**: Each chain must provide a valid proof for its specific UserOp hash
5. **ERC-6492**: Supports counterfactual parent accounts that aren't deployed yet

## License

MIT
