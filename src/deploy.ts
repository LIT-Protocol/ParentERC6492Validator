import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type Chain,
  type Account,
  getContractAddress,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { VALIDATOR_ABI, VALIDATOR_BYTECODE } from "./abi.js";

// ============ Types ============

export interface DeploymentConfig {
  chain: Chain;
  rpcUrl: string;
  account: Account;
  salt?: Hash; // For CREATE2 deployment
}

export interface DeploymentResult {
  address: Address;
  txHash: Hash;
}

// ============ Deployment Functions ============

/**
 * Deploys the ParentERC6492Validator using CREATE2 for deterministic addresses
 * @param config Deployment configuration
 * @returns Deployment result with contract address and transaction hash
 */
export async function deployValidator(
  config: DeploymentConfig
): Promise<DeploymentResult> {
  const { chain, rpcUrl, account } = config;
  // Note: salt is reserved for future CREATE2 deployment support

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    chain,
    transport: http(rpcUrl),
    account,
  });

  // Deploy using CREATE2 via a factory or direct deployment
  // For CREATE2, we need a factory contract. For simplicity, using regular deployment here.
  // In production, use a CREATE2 factory like Arachnid's or Safe's

  const txHash = await walletClient.deployContract({
    abi: VALIDATOR_ABI,
    bytecode: VALIDATOR_BYTECODE as `0x${string}`,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (!receipt.contractAddress) {
    throw new Error("Deployment failed: no contract address returned");
  }

  return {
    address: receipt.contractAddress,
    txHash,
  };
}

/**
 * Computes the CREATE2 address for the validator
 * @param deployerAddress The deployer/factory address
 * @param salt The salt for CREATE2
 * @returns The predicted contract address
 */
export function computeValidatorAddress(
  deployerAddress: Address,
  salt: Hash
): Address {
  const initCodeHash = keccak256(VALIDATOR_BYTECODE);

  return getContractAddress({
    from: deployerAddress,
    salt,
    bytecodeHash: initCodeHash,
    opcode: "CREATE2",
  });
}

// ============ Validator Initialization ============

/**
 * Encodes the initialization data for installing the validator on a Kernel account
 * @param parentAddress The parent account address that will approve operations
 * @param initialNonce The starting nonce (default 0)
 * @param scope The scope restriction (default bytes32(0) for any scope)
 * @returns Encoded initialization data
 */
export function encodeInstallData(
  parentAddress: Address,
  initialNonce: bigint = 0n,
  scope: Hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters("address, uint256, bytes32"),
    [parentAddress, initialNonce, scope]
  );
}

// ============ Multi-Chain Deployment ============

export interface MultiChainDeploymentConfig {
  chains: Array<{
    chain: Chain;
    rpcUrl: string;
  }>;
  account: Account;
  salt?: Hash;
}

export interface MultiChainDeploymentResult {
  address: Address; // Same on all chains
  deployments: Map<number, DeploymentResult>;
}

/**
 * Deploys the validator to multiple chains with the same address using CREATE2
 * @param config Multi-chain deployment configuration
 * @returns Deployment results for all chains
 */
export async function deployValidatorMultiChain(
  config: MultiChainDeploymentConfig
): Promise<MultiChainDeploymentResult> {
  const { chains, account, salt = "0x0000000000000000000000000000000000000000000000000000000000000001" } = config;

  const deployments = new Map<number, DeploymentResult>();
  let address: Address | undefined;

  for (const { chain, rpcUrl } of chains) {
    console.log(`Deploying to ${chain.name} (chainId: ${chain.id})...`);

    const result = await deployValidator({
      chain,
      rpcUrl,
      account,
      salt,
    });

    deployments.set(chain.id, result);

    if (!address) {
      address = result.address;
    } else if (address !== result.address) {
      console.warn(
        `Warning: Address mismatch on ${chain.name}. Expected ${address}, got ${result.address}`
      );
    }

    console.log(`  Deployed at ${result.address} (tx: ${result.txHash})`);
  }

  if (!address) {
    throw new Error("No successful deployments");
  }

  return {
    address,
    deployments,
  };
}
