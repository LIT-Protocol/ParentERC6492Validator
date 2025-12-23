/**
 * Creates a KernelValidator that uses ParentERC6492Validator
 * This validator requires signatures from a parent account to authorize UserOps
 */

import {
  type Address,
  type Hex,
  type Hash,
  type PublicClient,
  encodePacked,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
} from "viem";
import {
  type UserOperation,
  getUserOperationHash,
} from "viem/account-abstraction";
import { toAccount, type LocalAccount } from "viem/accounts";
import { getChainId, signMessage } from "viem/actions";
import { VALIDATOR_ABI } from "./abi.js";
import { computeLeafHash, computeApprovalHash, encodeUserOpSignature } from "./multichain.js";

// ============ Types ============

export interface ParentValidatorConfig {
  /** Address of the deployed ParentERC6492Validator contract */
  validatorAddress: Address;
  /** Address of the parent account that will sign approvals */
  parentAddress: Address;
  /** The parent's signer (EOA or smart account client) */
  parentSigner: LocalAccount;
  /** Scope restriction for approvals (optional, default: bytes32(0) for any) */
  scope?: Hash;
  /** Public client for chain interactions */
  publicClient: PublicClient;
  /** Chain ID (will be fetched from client if not provided) */
  chainId?: number;
  /** Kernel version for compatibility */
  kernelVersion?: string;
}

export interface ParentValidator {
  address: Address;
  source: "ParentERC6492Validator";
  type: "local";
  publicKey: Hex;
  validatorType: "SECONDARY";
  supportedKernelVersions: string;
  getIdentifier: () => Hex;
  getEnableData: (accountAddress?: Address) => Promise<Hex>;
  getNonceKey: (accountAddress?: Address, customNonceKey?: bigint) => Promise<bigint>;
  isEnabled: (accountAddress: Address, selector: Hex) => Promise<boolean>;
  signMessage: (params: { message: { raw: Hex } }) => Promise<Hex>;
  signTypedData: (typedData: any) => Promise<Hex>;
  signUserOperation: (userOperation: UserOperation & { chainId?: number }) => Promise<Hex>;
  getStubSignature: (userOperation: UserOperation) => Promise<Hex>;
  signTransaction: () => Promise<never>;
}

// ============ Main Function ============

/**
 * Creates a KernelValidator that uses ParentERC6492Validator for multi-chain approvals
 *
 * @param config Configuration for the parent validator
 * @returns A KernelValidator compatible with ZeroDev SDK
 */
export async function toParentValidator(
  config: ParentValidatorConfig
): Promise<ParentValidator> {
  const {
    validatorAddress,
    parentAddress,
    parentSigner,
    scope = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash,
    publicClient,
    kernelVersion = "0.3.1",
  } = config;

  // Get chain ID
  const chainId = config.chainId ?? await getChainId(publicClient);

  // Track nonce per child account
  const nonceCache = new Map<Address, bigint>();

  // Helper to get current nonce for a child account
  async function getCurrentNonce(childAddress: Address): Promise<bigint> {
    // Check cache first
    let nonce = nonceCache.get(childAddress);
    if (nonce !== undefined) {
      return nonce;
    }

    // Fetch from contract
    try {
      nonce = await publicClient.readContract({
        address: validatorAddress,
        abi: VALIDATOR_ABI,
        functionName: "nonceOf",
        args: [childAddress],
      }) as bigint;
    } catch {
      // Validator not installed yet, start at 0
      nonce = 0n;
    }

    nonceCache.set(childAddress, nonce);
    return nonce;
  }

  // Helper to increment nonce in cache
  function incrementNonce(childAddress: Address): void {
    const current = nonceCache.get(childAddress) ?? 0n;
    nonceCache.set(childAddress, current + 1n);
  }

  // Create the base account interface
  const account = toAccount({
    address: parentSigner.address,

    async signMessage({ message }) {
      return signMessage(publicClient, {
        account: parentSigner,
        message,
      });
    },

    async signTransaction() {
      throw new Error("Parent validator doesn't sign transactions directly");
    },

    async signTypedData(typedData) {
      return parentSigner.signTypedData(typedData);
    },
  });

  // Return the full validator interface
  return {
    ...account,
    address: validatorAddress,
    source: "ParentERC6492Validator" as const,
    type: "local" as const,
    publicKey: parentSigner.publicKey,
    validatorType: "SECONDARY" as const,
    supportedKernelVersions: `>=${kernelVersion}`,

    getIdentifier(): Hex {
      return validatorAddress;
    },

    async getEnableData(accountAddress?: Address): Promise<Hex> {
      // Encode: (parentAddress, initialNonce, scope)
      return encodeAbiParameters(
        parseAbiParameters("address, uint256, bytes32"),
        [parentAddress, 0n, scope]
      );
    },

    async getNonceKey(
      _accountAddress?: Address,
      customNonceKey?: bigint
    ): Promise<bigint> {
      if (customNonceKey !== undefined) {
        return customNonceKey;
      }
      // Use the validator address as the nonce key prefix
      // This separates nonces for this validator from other validators
      return BigInt(validatorAddress);
    },

    async isEnabled(accountAddress: Address, _selector: Hex): Promise<boolean> {
      try {
        const isInitialized = await publicClient.readContract({
          address: validatorAddress,
          abi: VALIDATOR_ABI,
          functionName: "isInitialized",
          args: [accountAddress],
        });
        return isInitialized as boolean;
      } catch {
        return false;
      }
    },

    async signUserOperation(
      userOperation: UserOperation & { chainId?: number }
    ): Promise<Hex> {
      const childAddress = userOperation.sender;
      const opChainId = userOperation.chainId ?? chainId;

      // Get the UserOp hash as computed by EntryPoint
      const userOpHash = getUserOperationHash({
        userOperation: {
          ...userOperation,
          signature: "0x",
        } as UserOperation<"0.7">,
        entryPointAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
        entryPointVersion: "0.7",
        chainId: opChainId,
      });

      // Get current nonce for this child
      const currentNonce = await getCurrentNonce(childAddress);

      // Set validity period (1 hour from now)
      const validUntil = Math.floor(Date.now() / 1000) + 3600;

      // Compute the leaf hash for this chain
      const leafHash = computeLeafHash(
        opChainId,
        childAddress,
        "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // EntryPoint v0.7
        userOpHash
      );

      // For single-chain approval, merkle root = leaf
      const merkleRoot = leafHash;
      const merkleProof: Hash[] = [];

      // Compute the approval hash that the parent needs to sign
      const approvalHash = computeApprovalHash(
        childAddress,
        merkleRoot,
        currentNonce,
        validUntil,
        scope
      );

      // Parent signs the approval hash with ERC-191 personal sign prefix
      // This is what our contract expects (toEthSignedMessageHash)
      const parentSignature = await signMessage(publicClient, {
        account: parentSigner,
        message: { raw: approvalHash },
      });

      // Increment nonce for next operation
      incrementNonce(childAddress);

      // Encode the full signature for the validator
      return encodeUserOpSignature({
        approvalNonce: currentNonce,
        validUntil,
        merkleRoot,
        merkleProof,
        parentSig6492: parentSignature,
        scope,
      });
    },

    async getStubSignature(_userOperation: UserOperation): Promise<Hex> {
      // Return a dummy signature for gas estimation
      // The signature structure must match what the contract expects
      const dummySig =
        "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c" as Hex;
      const dummyRoot =
        "0x0000000000000000000000000000000000000000000000000000000000000001" as Hash;

      return encodeUserOpSignature({
        approvalNonce: 0n,
        validUntil: Math.floor(Date.now() / 1000) + 3600,
        merkleRoot: dummyRoot,
        merkleProof: [],
        parentSig6492: dummySig,
        scope,
      });
    },
  };
}

// ============ Multi-Chain Support ============

export interface MultiChainApprovalParams {
  /** The child account address */
  childAddress: Address;
  /** Map of chainId -> userOpHash for each chain */
  chainUserOpHashes: Map<number, Hash>;
  /** Current approval nonce */
  nonce: bigint;
  /** Validity deadline (unix timestamp) */
  validUntil: number;
  /** Scope restriction */
  scope: Hash;
  /** Parent signer */
  parentSigner: LocalAccount;
  /** Public client for signing */
  publicClient: PublicClient;
}

export interface MultiChainApprovalResult {
  /** The merkle root of all leaf hashes */
  merkleRoot: Hash;
  /** Map of chainId -> encoded signature for that chain */
  signatures: Map<number, Hex>;
}

/**
 * Creates signatures for a multi-chain approval
 * This allows a single parent signature to authorize UserOps on multiple chains
 */
export async function createMultiChainApproval(
  params: MultiChainApprovalParams
): Promise<MultiChainApprovalResult> {
  const {
    childAddress,
    chainUserOpHashes,
    nonce,
    validUntil,
    scope,
    parentSigner,
    publicClient,
  } = params;

  const entryPoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;

  // Compute leaf hashes for each chain
  const leaves: { chainId: number; hash: Hash }[] = [];
  for (const [chainId, userOpHash] of chainUserOpHashes) {
    const leafHash = computeLeafHash(chainId, childAddress, entryPoint, userOpHash);
    leaves.push({ chainId, hash: leafHash });
  }

  // Sort leaves by hash value for consistent merkle tree construction
  leaves.sort((a, b) => {
    const aNum = BigInt(a.hash);
    const bNum = BigInt(b.hash);
    return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
  });

  // Build merkle tree
  let level = leaves.map((l) => l.hash);
  const tree: Hash[][] = [level];

  while (level.length > 1) {
    const nextLevel: Hash[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i]; // Duplicate last if odd
      // Sort the pair for consistent hashing
      const [a, b] = BigInt(left) < BigInt(right) ? [left, right] : [right, left];
      const combined = keccak256(encodePacked(["bytes32", "bytes32"], [a, b]));
      nextLevel.push(combined);
    }
    level = nextLevel;
    tree.push(level);
  }

  const merkleRoot = tree[tree.length - 1][0];

  // Compute approval hash and sign
  const approvalHash = computeApprovalHash(childAddress, merkleRoot, nonce, validUntil, scope);
  const parentSignature = await signMessage(publicClient, {
    account: parentSigner,
    message: { raw: approvalHash },
  });

  // Generate proof for each leaf
  const signatures = new Map<number, Hex>();
  for (const { chainId, hash } of leaves) {
    const proof = getMerkleProof(tree, hash);
    const encoded = encodeUserOpSignature({
      approvalNonce: nonce,
      validUntil,
      merkleRoot,
      merkleProof: proof,
      parentSig6492: parentSignature,
      scope,
    });
    signatures.set(chainId, encoded);
  }

  return { merkleRoot, signatures };
}

/**
 * Gets the merkle proof for a leaf in the tree
 */
function getMerkleProof(tree: Hash[][], leaf: Hash): Hash[] {
  const proof: Hash[] = [];
  let index = tree[0].indexOf(leaf);

  if (index === -1) {
    throw new Error("Leaf not found in tree");
  }

  for (let i = 0; i < tree.length - 1; i++) {
    const level = tree[i];
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;

    if (siblingIndex < level.length) {
      proof.push(level[siblingIndex]);
    }

    index = Math.floor(index / 2);
  }

  return proof;
}
