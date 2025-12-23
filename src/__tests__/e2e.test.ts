/**
 * End-to-End Test for ParentERC6492Validator
 *
 * This test proves that the ParentERC6492Validator works by:
 * 1. Deploy ParentERC6492Validator contract
 * 2. Create a parent Kernel account (the authorizing account)
 * 3. Create a child Kernel account WITH ParentValidator as sudo from the start
 * 4. Execute REAL transactions on the child using parent approval
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
  type Chain,
  parseEther,
  formatEther,
  pad,
  concat,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { VALIDATOR_ABI, VALIDATOR_BYTECODE } from "../abi.js";
import { toParentValidator } from "../toParentValidator.js";

// ============ Configuration ============

const ENTRYPOINT_ADDRESS_V07 =
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

const ENTRY_POINT = {
  address: ENTRYPOINT_ADDRESS_V07,
  version: "0.7" as const,
};
const KERNEL_VERSION = "0.3.1" as const;

// Default scope (0 = any operation allowed)
const DEFAULT_SCOPE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;

// Null address for test transactions
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

// ============ Environment Variables ============

function getEnvVars() {
  const privateKey = process.env.PRIVATE_KEY as Hex;
  const zerodevProjectId = process.env.ZERODEV_PROJECT_ID;
  const baseSepoliaRpc =
    process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  if (!zerodevProjectId) {
    throw new Error("ZERODEV_PROJECT_ID is required");
  }

  return {
    privateKey,
    zerodevProjectId,
    baseSepoliaRpc,
  };
}

// ============ Utilities ============

async function deployValidator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  chain: Chain
): Promise<Address> {
  console.log(`  Deploying ParentERC6492Validator...`);

  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet client must have an account");
  }

  const hash = await walletClient.deployContract({
    abi: VALIDATOR_ABI,
    bytecode: VALIDATOR_BYTECODE as Hex,
    account,
    chain,
  });

  console.log(`    TX: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress || receipt.status !== "success") {
    throw new Error(`Deployment failed`);
  }

  // Wait for RPC sync
  await new Promise((r) => setTimeout(r, 2000));

  const code = await publicClient.getCode({ address: receipt.contractAddress });
  if (!code || code === "0x") {
    throw new Error(`No bytecode at deployed address`);
  }

  console.log(`    Deployed: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

// ============ Main Test ============

async function main() {
  console.log("=".repeat(70));
  console.log("ParentERC6492Validator E2E Test");
  console.log("Executing Real Transactions with Parent Approval");
  console.log("=".repeat(70));
  console.log();

  const env = getEnvVars();
  const ownerSigner = privateKeyToAccount(env.privateKey);

  console.log(`Owner EOA: ${ownerSigner.address}`);
  console.log();

  // ============ Setup ============
  const chain = baseSepolia;
  const bundlerUrl = `https://rpc.zerodev.app/api/v3/${env.zerodevProjectId}/chain/${chain.id}`;

  const publicClient = createPublicClient({
    chain,
    transport: http(env.baseSepoliaRpc),
  }) as PublicClient;

  const walletClient = createWalletClient({
    chain,
    transport: http(env.baseSepoliaRpc),
    account: ownerSigner,
  }) as WalletClient;

  // Check balance
  const balance = await publicClient.getBalance({
    address: ownerSigner.address,
  });
  console.log(`EOA Balance: ${formatEther(balance)} ETH`);

  // Note: We need at least 0.000001 ETH to deploy the validator
  // If you have a validator already deployed with the CURRENT bytecode, you can set it here
  // const DEPLOYED_VALIDATOR = "0x..." as Address; // Uncomment and set to reuse

  // ============ Step 1: Deploy ParentERC6492Validator ============
  console.log("\n--- Step 1: Deploy ParentERC6492Validator ---");

  if (balance < parseEther("0.000001")) {
    throw new Error(
      "Insufficient balance to deploy validator (need at least 0.000001 ETH)"
    );
  }

  const validatorAddress = await deployValidator(
    walletClient,
    publicClient,
    chain
  );

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

  console.log(`  Parent Account: ${parentAccount.address}`);

  const parentClient = createKernelAccountClient({
    account: parentAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: createZeroDevPaymasterClient({
      chain,
      transport: http(bundlerUrl),
    }),
  });

  // Deploy parent if needed
  const parentCode = await publicClient.getCode({
    address: parentAccount.address,
  });
  if (!parentCode || parentCode === "0x") {
    console.log("  Deploying parent account...");
    const hash = await parentClient.sendTransaction({
      to: ownerSigner.address,
      value: 0n,
      data: "0x",
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✓ Parent deployed!");
  } else {
    console.log("  ✓ Parent already deployed.");
  }

  // ============ Step 3: Create ParentValidator for Child ============
  console.log("\n--- Step 3: Create ParentValidator for Child ---");

  // Create our parent validator - this will be the SUDO validator for the child
  // For this test, we use the EOA directly as the parent (simpler flow)
  // The contract also supports smart account parents via ERC-1271/ERC-6492
  const parentValidator = await toParentValidator({
    validatorAddress,
    parentAddress: ownerSigner.address, // Use EOA as parent for simpler signing
    parentSigner: ownerSigner,
    publicClient,
    chainId: chain.id,
    scope: DEFAULT_SCOPE,
  });

  console.log(`  ParentValidator created`);
  console.log(`    Contract: ${validatorAddress}`);
  console.log(`    Parent EOA: ${ownerSigner.address}`);

  // ============ Step 4: Create Child Account with ParentValidator as Sudo ============
  console.log("\n--- Step 4: Create Child Account with ParentValidator ---");

  const childIndex = BigInt(Math.floor(Math.random() * 1_000_000_000));
  console.log(`  Child index for this test: ${childIndex}`);

  // Create the child account with ParentValidator as the sudo validator
  const childAccount = await createKernelAccount(publicClient, {
    entryPoint: ENTRY_POINT,
    plugins: {
      sudo: parentValidator as any, // Cast needed due to strict typing
    },
    index: childIndex,
    kernelVersion: KERNEL_VERSION,
  });

  console.log(`  Child Account: ${childAccount.address}`);

  // Use paymaster for gas sponsorship. The gas estimation marker in the contract
  // allows getStubSignature to return a dummy signature that passes validation
  // during gas estimation (when the bundler modifies the userOp). Actual execution
  // uses the real signed signature from signUserOperation.
  const childClient = createKernelAccountClient({
    account: childAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: createZeroDevPaymasterClient({
      chain,
      transport: http(bundlerUrl),
    }),
  });

  // ============ Step 5: Check Child Account Balance ============
  console.log("\n--- Step 5: Check Child Account Balance ---");

  const childBalance = await publicClient.getBalance({
    address: childAccount.address,
  });
  console.log(`  Child balance: ${formatEther(childBalance)} ETH`);
  console.log(
    "  ✓ Using paymaster for gas sponsorship (no pre-funding needed)"
  );

  // ============ Step 6: Check Child Deployment ============
  console.log("\n--- Step 6: Check Child Deployment ---");

  const childCode = await publicClient.getCode({
    address: childAccount.address,
  });

  if (!childCode || childCode === "0x") {
    console.log("  Child account not deployed yet.");
    console.log("  First transaction will deploy it...");
  } else {
    console.log("  ✓ Child already deployed.");
  }

  // ============ Step 7: Execute Transaction with Parent Approval ============
  console.log("\n--- Step 7: Execute Transaction with Parent Approval ---");
  console.log("  Sending 0 ETH to null address (0x000...000)");
  console.log("  The child's UserOp will be signed by the PARENT");
  console.log();

  const txHash = await childClient.sendTransaction({
    to: NULL_ADDRESS,
    value: 0n,
    data: "0x",
  });

  console.log(`  ✓ Transaction submitted!`);
  console.log(`    TX Hash: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(`Transaction failed with status: ${receipt.status}`);
  }

  console.log(`  ✓ Transaction confirmed!`);
  console.log(`    Block: ${receipt.blockNumber}`);
  console.log(`    Gas Used: ${receipt.gasUsed}`);

  // ============ Step 8: Verify Validator State ============
  console.log("\n--- Step 8: Verify Validator State ---");

  const isInitialized = await publicClient.readContract({
    address: validatorAddress,
    abi: VALIDATOR_ABI,
    functionName: "isInitialized",
    args: [childAccount.address],
  });

  if (!isInitialized) {
    throw new Error("Validator should be initialized after transaction");
  }

  console.log(`  ✓ Validator initialized: ${isInitialized}`);

  const registeredParent = await publicClient.readContract({
    address: validatorAddress,
    abi: VALIDATOR_ABI,
    functionName: "parentOf",
    args: [childAccount.address],
  });

  if (registeredParent !== ownerSigner.address) {
    throw new Error(`Wrong parent registered: ${registeredParent}`);
  }

  console.log(`  ✓ Registered parent: ${registeredParent}`);

  const currentNonce = await publicClient.readContract({
    address: validatorAddress,
    abi: VALIDATOR_ABI,
    functionName: "nonceOf",
    args: [childAccount.address],
  });

  console.log(`  ✓ Current nonce: ${currentNonce}`);

  // ============ Step 9: Execute Another Transaction ============
  console.log("\n--- Step 9: Execute Second Transaction ---");
  console.log("  Proving the system works consistently...");

  const txHash2 = await childClient.sendTransaction({
    to: NULL_ADDRESS,
    value: 0n,
    data: "0x",
  });

  console.log(`  ✓ Second TX submitted: ${txHash2}`);

  const receipt2 = await publicClient.waitForTransactionReceipt({
    hash: txHash2,
  });

  if (receipt2.status !== "success") {
    throw new Error(
      `Second transaction failed with status: ${receipt2.status}`
    );
  }

  console.log(`  ✓ Second transaction confirmed!`);
  console.log(`    Block: ${receipt2.blockNumber}`);

  // Verify nonce incremented
  const finalNonce = await publicClient.readContract({
    address: validatorAddress,
    abi: VALIDATOR_ABI,
    functionName: "nonceOf",
    args: [childAccount.address],
  });

  console.log(`  ✓ Final nonce: ${finalNonce}`);

  if (finalNonce !== currentNonce + 1n) {
    throw new Error(
      `Nonce should have incremented. Expected ${
        currentNonce + 1n
      }, got ${finalNonce}`
    );
  }

  // ============ Summary ============
  console.log("\n" + "=".repeat(70));
  console.log("E2E Test Summary - ALL PASSED");
  console.log("=".repeat(70));
  console.log();
  console.log("Deployed Contracts:");
  console.log(`  ParentERC6492Validator: ${validatorAddress}`);
  console.log();
  console.log("Accounts:");
  console.log(`  Parent Account: ${parentAccount.address}`);
  console.log(`  Child Account: ${childAccount.address}`);
  console.log();
  console.log("Transactions Executed:");
  console.log(`  TX 1: ${txHash}`);
  console.log(`  TX 2: ${txHash2}`);
  console.log();
  console.log("Verified:");
  console.log("  ✓ ParentERC6492Validator deployed");
  console.log("  ✓ Child account created with ParentValidator as sudo");
  console.log("  ✓ Transaction 1 executed with parent approval");
  console.log("  ✓ Transaction 2 executed with parent approval");
  console.log("  ✓ Validator state correct (parent, nonce)");
  console.log();
  console.log("KEY ACHIEVEMENT:");
  console.log("  → Child account operations authorized by PARENT signature!");
  console.log("  → Real transactions executed on Base Sepolia testnet!");
}

// Run the test
main()
  .then(() => {
    console.log("\n✓ E2E test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Test FAILED:", error.message || error);
    process.exit(1);
  });
