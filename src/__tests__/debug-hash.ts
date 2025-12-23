/**
 * Debug script to verify hash computation matches between TypeScript and Solidity
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { VALIDATOR_ABI, VALIDATOR_BYTECODE } from "../abi.js";
import { computeLeafHash, LEAF_TYPEHASH } from "../multichain.js";

async function main() {
  const privateKey = process.env.PRIVATE_KEY as Hex;
  if (!privateKey) throw new Error("PRIVATE_KEY required");

  const ownerSigner = privateKeyToAccount(privateKey);
  const chain = baseSepolia;

  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  });

  const walletClient = createWalletClient({
    chain,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
    account: ownerSigner,
  });

  // Deploy validator
  console.log("Deploying validator...");
  const hash = await walletClient.deployContract({
    abi: VALIDATOR_ABI,
    bytecode: VALIDATOR_BYTECODE as Hex,
    account: ownerSigner,
    chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("Deployment failed");
  const validatorAddress = receipt.contractAddress;
  console.log(`Deployed at: ${validatorAddress}`);

  // Wait for RPC sync
  await new Promise(r => setTimeout(r, 2000));

  // Test values
  const testChainId = 84532n; // Base Sepolia
  const testChild = "0x1234567890123456789012345678901234567890" as Address;
  const testEntryPoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;
  const testUserOpHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;

  // Compute in TypeScript
  const tsLeafHash = computeLeafHash(
    Number(testChainId),
    testChild,
    testEntryPoint,
    testUserOpHash
  );
  console.log(`\nTypeScript LEAF_TYPEHASH: ${LEAF_TYPEHASH}`);
  console.log(`TypeScript computeLeafHash: ${tsLeafHash}`);

  // Read LEAF_TYPEHASH from contract
  const contractLeafTypeHash = await publicClient.readContract({
    address: validatorAddress,
    abi: VALIDATOR_ABI,
    functionName: "LEAF_TYPEHASH",
  });
  console.log(`\nContract LEAF_TYPEHASH: ${contractLeafTypeHash}`);

  // Compute in Solidity
  const solidityLeafHash = await publicClient.readContract({
    address: validatorAddress,
    abi: VALIDATOR_ABI,
    functionName: "computeLeafHash",
    args: [testChainId, testChild, testEntryPoint, testUserOpHash],
  });
  console.log(`Contract computeLeafHash: ${solidityLeafHash}`);

  // Compare
  if (tsLeafHash === solidityLeafHash) {
    console.log("\n✓ Leaf hash computation MATCHES!");
  } else {
    console.log("\n✗ Leaf hash computation MISMATCH!");
    console.log("  This explains why Merkle proof verification fails.");
  }

  // Check if LEAF_TYPEHASH matches
  if (LEAF_TYPEHASH === contractLeafTypeHash) {
    console.log("✓ LEAF_TYPEHASH MATCHES!");
  } else {
    console.log("✗ LEAF_TYPEHASH MISMATCH!");
  }
}

main().catch(console.error);
