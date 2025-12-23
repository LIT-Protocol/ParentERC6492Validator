export {
  // Types
  type ChainConfig,
  type MultiChainApprovalParams,
  type MultiChainApprovalResult,
  type PerChainData,
  type SignedMultiChainApproval,
  // Constants
  LEAF_TYPEHASH,
  APPROVAL_TYPEHASH,
  ERC6492_MAGIC,
  // Core functions
  computeLeafHash,
  computeApprovalHash,
  buildMerkleTree,
  prepareMultiChainApproval,
  encodeUserOpSignature,
  getDummySignature,
  // ERC-6492 utilities
  wrapSignatureWith6492,
  isERC6492Signature,
  // Helper functions
  createScope,
  validateChainConfigs,
} from "./multichain.js";

export { VALIDATOR_ABI, VALIDATOR_BYTECODE } from "./abi.js";

export {
  // Types
  type DeploymentConfig,
  type DeploymentResult,
  type MultiChainDeploymentConfig,
  type MultiChainDeploymentResult,
  // Functions
  deployValidator,
  computeValidatorAddress,
  encodeInstallData,
  deployValidatorMultiChain,
} from "./deploy.js";

export {
  // Types
  type ParentValidatorConfig,
  type ParentValidator,
  type MultiChainApprovalParams as ValidatorMultiChainApprovalParams,
  type MultiChainApprovalResult as ValidatorMultiChainApprovalResult,
  // Functions
  toParentValidator,
  createMultiChainApproval,
} from "./toParentValidator.js";
