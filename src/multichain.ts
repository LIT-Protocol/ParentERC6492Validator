import { MerkleTree } from "merkletreejs";
import {
  type Address,
  type Hash,
  type Hex,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  concat,
} from "viem";

// ============ Types ============

export interface ChainConfig {
  chainId: number;
  entryPoint: Address;
  childAddress: Address;
  userOpHash: Hash;
}

export interface MultiChainApprovalParams {
  childAddress: Address;
  chainConfigs: ChainConfig[];
  approvalNonce: bigint;
  validUntil: number; // uint48 timestamp in seconds
  scope: Hash;
}

export interface MultiChainApprovalResult {
  merkleRoot: Hash;
  approvalHash: Hash;
  perChainData: PerChainData[];
}

export interface PerChainData {
  chainId: number;
  leaf: Hash;
  merkleProof: Hash[];
}

export interface SignedMultiChainApproval {
  approvalNonce: bigint;
  validUntil: number; // uint48 timestamp in seconds
  merkleRoot: Hash;
  merkleProof: Hash[];
  parentSig6492: Hex;
  scope: Hash;
}

// ============ Type Hashes (must match Solidity contract) ============

export const LEAF_TYPEHASH = keccak256(
  Buffer.from(
    "Leaf(uint256 chainId,address child,address entryPoint,bytes32 userOpHash)"
  )
);

export const APPROVAL_TYPEHASH = keccak256(
  Buffer.from(
    "Approval(address child,bytes32 merkleRoot,uint256 nonce,uint48 validUntil,bytes32 scope)"
  )
);

// ============ Core Functions ============

/**
 * Computes the leaf hash for a specific chain's UserOp
 * @param chainId The chain ID
 * @param child The child account address
 * @param entryPoint The entry point address
 * @param userOpHash The user operation hash
 * @returns The leaf hash
 */
export function computeLeafHash(
  chainId: number,
  child: Address,
  entryPoint: Address,
  userOpHash: Hash
): Hash {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, uint256, address, address, bytes32"),
      [LEAF_TYPEHASH, BigInt(chainId), child, entryPoint, userOpHash]
    )
  );
}

/**
 * Computes the approval hash that the parent must sign
 * @param child The child account address
 * @param merkleRoot The Merkle root of all chain leaves
 * @param nonce The approval nonce
 * @param validUntil The deadline timestamp (uint48)
 * @param scope The scope identifier
 * @returns The approval hash
 */
export function computeApprovalHash(
  child: Address,
  merkleRoot: Hash,
  nonce: bigint,
  validUntil: number,
  scope: Hash
): Hash {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, address, bytes32, uint256, uint48, bytes32"),
      [APPROVAL_TYPEHASH, child, merkleRoot, nonce, validUntil, scope]
    )
  );
}

/**
 * Builds a Merkle tree from per-chain leaves and returns the root + proofs
 * @param leaves Array of leaf hashes
 * @returns Object containing merkle root and proof getter function
 */
export function buildMerkleTree(leaves: Hash[]): {
  root: Hash;
  getProof: (index: number) => Hash[];
} {
  // Use keccak256 and sortPairs for consistency with OpenZeppelin MerkleProof
  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    hashLeaves: false, // Leaves are already hashed
  });

  const root = tree.getHexRoot() as Hash;

  return {
    root,
    getProof: (index: number) => {
      const proof = tree.getHexProof(leaves[index]);
      return proof as Hash[];
    },
  };
}

/**
 * Prepares a multi-chain approval by computing leaves, building the Merkle tree,
 * and returning all necessary data for signing and submission
 * @param params The multi-chain approval parameters
 * @returns The multi-chain approval result with merkle root, approval hash, and per-chain data
 */
export function prepareMultiChainApproval(
  params: MultiChainApprovalParams
): MultiChainApprovalResult {
  const { childAddress, chainConfigs, approvalNonce, validUntil, scope } =
    params;

  // Compute leaf for each chain
  const leaves: Hash[] = chainConfigs.map((config) =>
    computeLeafHash(
      config.chainId,
      childAddress,
      config.entryPoint,
      config.userOpHash
    )
  );

  // Build Merkle tree
  const { root: merkleRoot, getProof } = buildMerkleTree(leaves);

  // Compute approval hash
  const approvalHash = computeApprovalHash(
    childAddress,
    merkleRoot,
    approvalNonce,
    validUntil,
    scope
  );

  // Build per-chain data with proofs
  const perChainData: PerChainData[] = chainConfigs.map((config, index) => ({
    chainId: config.chainId,
    leaf: leaves[index],
    merkleProof: getProof(index),
  }));

  return {
    merkleRoot,
    approvalHash,
    perChainData,
  };
}

/**
 * Encodes the signature for a specific chain's UserOp
 * @param approval The signed multi-chain approval data
 * @returns ABI-encoded signature for userOp.signature field
 */
export function encodeUserOpSignature(approval: SignedMultiChainApproval): Hex {
  return encodeAbiParameters(
    parseAbiParameters(
      "(uint256 approvalNonce, uint48 validUntil, bytes32 merkleRoot, bytes32[] merkleProof, bytes parentSig6492, bytes32 scope)"
    ),
    [
      {
        approvalNonce: approval.approvalNonce,
        validUntil: approval.validUntil,
        merkleRoot: approval.merkleRoot,
        merkleProof: approval.merkleProof,
        parentSig6492: approval.parentSig6492,
        scope: approval.scope,
      },
    ]
  );
}

/**
 * Creates a dummy signature for gas estimation
 * @param numChains Number of chains in the approval
 * @param chainIndex Index of this chain (0-indexed)
 * @returns A dummy signature that approximates the real signature size
 */
export function getDummySignature(numChains: number, chainIndex: number): Hex {
  // Dummy ECDSA signature (65 bytes)
  const dummySig =
    "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c" as Hex;

  // Generate dummy leaves
  const dummyLeaves: Hash[] = [];
  for (let i = 0; i < numChains; i++) {
    dummyLeaves.push(keccak256(Buffer.from(`dummy_leaf_${i}`)) as Hash);
  }

  // Build tree and get proof
  const { root, getProof } = buildMerkleTree(dummyLeaves);
  const proof = getProof(chainIndex);

  return encodeUserOpSignature({
    approvalNonce: 0n,
    validUntil: Math.floor(Date.now() / 1000) + 3600,
    merkleRoot: root,
    merkleProof: proof,
    parentSig6492: dummySig,
    scope:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash,
  });
}

// ============ ERC-6492 Utilities ============

export const ERC6492_MAGIC =
  "0x6492649264926492649264926492649264926492649264926492649264926492" as const;

/**
 * Wraps a signature with ERC-6492 format for counterfactual accounts
 * @param factoryAddress The factory address that will deploy the account
 * @param factoryCalldata The calldata to pass to the factory
 * @param signature The original signature from the account
 * @returns The wrapped ERC-6492 signature
 */
export function wrapSignatureWith6492(
  factoryAddress: Address,
  factoryCalldata: Hex,
  signature: Hex
): Hex {
  return concat([
    encodeAbiParameters(parseAbiParameters("address, bytes, bytes"), [
      factoryAddress,
      factoryCalldata,
      signature,
    ]),
    ERC6492_MAGIC,
  ]);
}

/**
 * Checks if a signature is wrapped with ERC-6492 format
 * @param signature The signature to check
 * @returns True if the signature is ERC-6492 wrapped
 */
export function isERC6492Signature(signature: Hex): boolean {
  if (signature.length < 66) return false; // 32 bytes (64 hex chars) + 0x prefix
  const magic = signature.slice(-64);
  return `0x${magic}` === ERC6492_MAGIC;
}

// ============ Helper Functions ============

/**
 * Creates a scope hash from a string identifier
 * @param scopeString The scope identifier string (e.g., "SESSION_KEY_INSTALL")
 * @returns The keccak256 hash of the scope string
 */
export function createScope(scopeString: string): Hash {
  return keccak256(Buffer.from(scopeString));
}

/**
 * Validates that all chain configs use the same child address
 * @param chainConfigs The chain configurations to validate
 * @throws Error if child addresses don't match
 */
export function validateChainConfigs(chainConfigs: ChainConfig[]): void {
  if (chainConfigs.length === 0) {
    throw new Error("At least one chain config is required");
  }

  const childAddress = chainConfigs[0].childAddress;
  for (const config of chainConfigs) {
    if (config.childAddress !== childAddress) {
      throw new Error(
        `Child address mismatch: expected ${childAddress}, got ${config.childAddress}`
      );
    }
  }
}
