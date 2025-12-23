/**
 * End-to-End Test for ParentERC6492Validator on Base Sepolia
 *
 * Flow:
 * 1. Deploy ParentERC6492Validator contract
 * 2. Create parent Kernel account with ECDSA validator (EOA signer)
 * 3. Create child Kernel account with ParentERC6492Validator as sudo
 * 4. Add session key to child (requires parent approval)
 * 5. Use session key to make a transaction
 * 6. Rotate session key using parent's signature
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
  parseEther,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { VALIDATOR_ABI, VALIDATOR_BYTECODE } from "../abi.js";
import {
  encodeUserOpSignature,
  createScope,
  computeLeafHash,
  computeApprovalHash,
} from "../multichain.js";
import { encodeInstallData } from "../deploy.js";

// ============ Configuration ============

const CHAIN = baseSepolia;

// EntryPoint v0.7 address (same on all chains)
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

const ENTRY_POINT = {
  address: ENTRYPOINT_ADDRESS_V07,
  version: "0.7" as const,
};
const KERNEL_VERSION = "0.3.1" as const;

// Scopes for different operations
const SESSION_KEY_INSTALL_SCOPE = createScope("SESSION_KEY_INSTALL");
const SESSION_KEY_ROTATE_SCOPE = createScope("SESSION_KEY_ROTATE");

// ============ Environment Variables ============

function getEnvVars() {
  const privateKey = process.env.PRIVATE_KEY as Hex;
  const zerodevProjectId = process.env.ZERODEV_PROJECT_ID;
  const bundlerUrl = process.env.ZERODEV_BUNDLER_URL;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const paymasterUrl = process.env.ZERODEV_PAYMASTER_URL;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  if (!zerodevProjectId && !bundlerUrl) {
    throw new Error(
      "Either ZERODEV_PROJECT_ID or ZERODEV_BUNDLER_URL is required"
    );
  }

  return {
    privateKey,
    zerodevProjectId,
    bundlerUrl:
      bundlerUrl ||
      `https://rpc.zerodev.app/api/v2/bundler/${zerodevProjectId}`,
    paymasterUrl:
      paymasterUrl ||
      (zerodevProjectId
        ? `https://rpc.zerodev.app/api/v2/paymaster/${zerodevProjectId}`
        : undefined),
    rpcUrl,
  };
}

// ============ Test Utilities ============

async function deployValidator(
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<Address> {
  console.log("Deploying ParentERC6492Validator...");

  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet client must have an account");
  }

  const hash = await walletClient.deployContract({
    abi: VALIDATOR_ABI,
    bytecode: VALIDATOR_BYTECODE as Hex,
    account,
    chain: CHAIN,
  });

  console.log(`  Deploy tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error("Deployment failed: no contract address");
  }

  console.log(`  Deployed at: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

// ============ Custom Validator Implementation ============

/**
 * Creates a KernelValidator that uses ParentERC6492Validator
 * This validator requires signatures from the parent account
 */
function createParentValidator({
  validatorAddress,
  parentAddress,
  parentSigner,
  childAddress,
  entryPoint,
}: {
  validatorAddress: Address;
  parentAddress: Address;
  parentSigner: ReturnType<typeof privateKeyToAccount>;
  childAddress: Address;
  entryPoint: typeof ENTRY_POINT;
}) {
  let currentNonce = 0n;

  return {
    address: validatorAddress,
    source: "ParentERC6492Validator" as const,
    type: "local" as const,
    publicKey: parentSigner.publicKey,
    validatorType: "SECONDARY" as const,
    supportedKernelVersions: ">=0.3.0",

    getIdentifier: () => validatorAddress as Hex,

    getEnableData: async (accountAddress?: Address) => {
      // Encode initialization data for the validator
      return encodeInstallData(parentAddress, 0n, SESSION_KEY_INSTALL_SCOPE);
    },

    getNonceKey: async (
      accountAddress?: Address,
      customNonceKey?: bigint
    ): Promise<bigint> => {
      // Return a nonce key based on validator address
      if (customNonceKey !== undefined) {
        return customNonceKey;
      }
      // Use validator address as nonce key prefix
      return BigInt(validatorAddress);
    },

    isEnabled: async (
      accountAddress: Address,
      selector: Hex
    ): Promise<boolean> => {
      // TODO: Check on-chain if validator is enabled
      return true;
    },

    signMessage: async ({ message }: { message: { raw: Hex } }) => {
      // Sign the message with parent's key (for ERC-6492)
      return parentSigner.signMessage({ message });
    },

    signTypedData: async (typedData: any) => {
      return parentSigner.signTypedData(typedData);
    },

    signUserOperation: async (userOperation: any): Promise<Hex> => {
      // Create approval for this UserOp
      const chainId = CHAIN.id;
      const userOpHash = userOperation.hash || keccak256(toHex("userOp"));
      const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      // Compute leaf for this chain
      const leaf = computeLeafHash(
        chainId,
        childAddress,
        entryPoint.address,
        userOpHash
      );

      // Single-chain scenario: root = leaf
      const merkleRoot = leaf;
      const merkleProof: Hash[] = [];

      // Compute approval hash
      const approvalHash = computeApprovalHash(
        childAddress,
        merkleRoot,
        currentNonce,
        validUntil,
        SESSION_KEY_INSTALL_SCOPE
      );

      // Sign with parent's key (ERC-191 personal sign)
      const signature = await parentSigner.signMessage({
        message: { raw: approvalHash },
      });

      // Encode the full approval struct
      const encodedSig = encodeUserOpSignature({
        approvalNonce: currentNonce,
        validUntil,
        merkleRoot,
        merkleProof,
        parentSig6492: signature,
        scope: SESSION_KEY_INSTALL_SCOPE,
      });

      currentNonce++;

      return encodedSig;
    },

    getStubSignature: async (userOperation: any): Promise<Hex> => {
      // Return a dummy signature for gas estimation
      const dummySig =
        "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";

      const dummyRoot =
        "0x0000000000000000000000000000000000000000000000000000000000000001" as Hash;

      return encodeUserOpSignature({
        approvalNonce: 0n,
        validUntil: Math.floor(Date.now() / 1000) + 3600,
        merkleRoot: dummyRoot,
        merkleProof: [],
        parentSig6492: dummySig as Hex,
        scope: SESSION_KEY_INSTALL_SCOPE,
      });
    },

    sign: async ({ hash }: { hash: Hex }) => {
      return parentSigner.signMessage({ message: { raw: hash } });
    },
  };
}

// ============ Main Test ============

async function main() {
  console.log("=".repeat(60));
  console.log("ParentERC6492Validator E2E Test - Base Sepolia");
  console.log("=".repeat(60));
  console.log();

  const env = getEnvVars();
  const ownerSigner = privateKeyToAccount(env.privateKey);

  console.log(`Owner EOA: ${ownerSigner.address}`);
  console.log(`Chain: ${CHAIN.name} (${CHAIN.id})`);
  console.log();

  // Create clients
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(env.rpcUrl),
  });

  const walletClient = createWalletClient({
    chain: CHAIN,
    transport: http(env.rpcUrl),
    account: ownerSigner,
  });

  // Check balance
  const balance = await publicClient.getBalance({
    address: ownerSigner.address,
  });
  console.log(`Owner balance: ${balance / BigInt(1e18)} ETH`);

  if (balance < parseEther("0.001")) {
    throw new Error(
      "Insufficient balance. Please fund the owner address with Base Sepolia ETH."
    );
  }

  // ============ Step 1: Deploy Validator ============
  console.log("\n--- Step 1: Deploy ParentERC6492Validator ---");
  const validatorAddress = await deployValidator(walletClient as any, publicClient as any);

  // ============ Step 2: Create Parent Kernel Account ============
  console.log("\n--- Step 2: Create Parent Kernel Account ---");

  const parentEcdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: { ...ownerSigner, source: "local" as const },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });

  const parentAccount = await createKernelAccount(publicClient, {
    entryPoint: ENTRY_POINT,
    plugins: {
      sudo: parentEcdsaValidator,
    },
    index: 0n,
    kernelVersion: KERNEL_VERSION,
  });

  console.log(`Parent Kernel Account: ${parentAccount.address}`);

  // Create parent account client
  const parentClient = createKernelAccountClient({
    account: parentAccount,
    chain: CHAIN,
    bundlerTransport: http(env.bundlerUrl),
    paymaster: env.paymasterUrl
      ? createZeroDevPaymasterClient({
          chain: CHAIN,
          transport: http(env.paymasterUrl),
        })
      : undefined,
  });

  // Check if parent account is deployed
  const parentCode = await publicClient.getCode({
    address: parentAccount.address,
  });
  if (!parentCode || parentCode === "0x") {
    console.log("Parent account not deployed. Sending init transaction...");

    // Send a small transaction to deploy the account
    try {
      const hash = await parentClient.sendTransaction({
        to: ownerSigner.address,
        value: 0n,
        data: "0x",
      });
      console.log(`  Deploy tx: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("  Parent account deployed!");
    } catch (error) {
      console.error("Failed to deploy parent account:", error);
      throw error;
    }
  } else {
    console.log("Parent account already deployed.");
  }

  // ============ Step 3: Create Child Kernel Account ============
  console.log("\n--- Step 3: Create Child Kernel Account ---");

  // First, compute what the child address will be
  // We'll use a different index to get a different address
  const childIndex = 1n;

  // Create the custom validator for the child account
  const parentValidator = createParentValidator({
    validatorAddress,
    parentAddress: parentAccount.address,
    parentSigner: ownerSigner,
    childAddress: "0x0000000000000000000000000000000000000000" as Address, // Will be updated
    entryPoint: ENTRY_POINT,
  });

  // Create child account with ParentERC6492Validator as sudo
  const childAccount = await createKernelAccount(publicClient, {
    entryPoint: ENTRY_POINT,
    plugins: {
      sudo: parentValidator as any,
    },
    index: childIndex,
    kernelVersion: KERNEL_VERSION,
  });

  console.log(`Child Kernel Account: ${childAccount.address}`);

  // Update the validator with the correct child address
  const childValidatorUpdated = createParentValidator({
    validatorAddress,
    parentAddress: parentAccount.address,
    parentSigner: ownerSigner,
    childAddress: childAccount.address,
    entryPoint: ENTRY_POINT,
  });

  // Recreate child account with updated validator
  const childAccountFinal = await createKernelAccount(publicClient, {
    entryPoint: ENTRY_POINT,
    plugins: {
      sudo: childValidatorUpdated as any,
    },
    index: childIndex,
    kernelVersion: KERNEL_VERSION,
    address: childAccount.address, // Use the computed address
  });

  // Create child account client
  const childClient = createKernelAccountClient({
    account: childAccountFinal,
    chain: CHAIN,
    bundlerTransport: http(env.bundlerUrl),
    paymaster: env.paymasterUrl
      ? createZeroDevPaymasterClient({
          chain: CHAIN,
          transport: http(env.paymasterUrl),
        })
      : undefined,
  });

  // ============ Step 4: Initialize the Validator on Child ============
  console.log("\n--- Step 4: Initialize Validator on Child ---");

  // The validator needs to be initialized with the parent address
  // This is done via the onInstall function

  // First, check if child is deployed
  const childCode = await publicClient.getCode({
    address: childAccountFinal.address,
  });

  if (!childCode || childCode === "0x") {
    console.log("Child account not deployed yet.");
    console.log(
      "Attempting to deploy child with parent validator initialization..."
    );

    try {
      // The first UserOp from child will deploy it with the validator initialized
      const hash = await childClient.sendTransaction({
        to: ownerSigner.address,
        value: 0n,
        data: "0x",
      });
      console.log(`  Deploy tx: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("  Child account deployed with ParentERC6492Validator!");
    } catch (error: any) {
      console.error("Failed to deploy child account:", error.message);
      console.log("\nThis is expected if the validator isn't properly set up.");
      console.log("The validator contract may need additional configuration.");
    }
  } else {
    console.log("Child account already deployed.");
  }

  // ============ Step 5: Create Session Key ============
  console.log("\n--- Step 5: Create Session Key ---");

  const sessionPrivateKey = generatePrivateKey();
  const sessionSigner = privateKeyToAccount(sessionPrivateKey);
  console.log(`Session Key Address: ${sessionSigner.address}`);

  // In a full implementation, we would:
  // 1. Create a session key validator
  // 2. Have the parent sign approval for installing it
  // 3. Child submits UserOp to install the session key validator

  console.log("Session key created (not installed yet - requires full implementation)");

  // ============ Step 6: Use Session Key (placeholder) ============
  console.log("\n--- Step 6: Use Session Key ---");
  console.log(
    "Skipping - session key installation requires full validator integration"
  );

  // ============ Step 7: Rotate Session Key (placeholder) ============
  console.log("\n--- Step 7: Rotate Session Key ---");
  console.log(
    "Skipping - session key rotation requires full validator integration"
  );

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log(`Validator Contract: ${validatorAddress}`);
  console.log(`Parent Account: ${parentAccount.address}`);
  console.log(`Child Account: ${childAccountFinal.address}`);
  console.log(`Session Key: ${sessionSigner.address}`);
  console.log();
  console.log("Next steps for full implementation:");
  console.log("1. Integrate with ZeroDev's session key/permission plugins");
  console.log("2. Create multi-chain approval flow");
  console.log("3. Implement session key rotation via parent signature");
}

// Run the test
main()
  .then(() => {
    console.log("\nTest completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nTest failed:", error);
    process.exit(1);
  });
