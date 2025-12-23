/**
 * Debug script to verify userOpHash computation matches EntryPoint
 */

import {
  type Address,
  type Hash,
  type Hex,
  encodeAbiParameters,
  encodePacked,
  keccak256,
  parseAbiParameters,
  concat,
} from "viem";
import { getUserOperationHash } from "viem/account-abstraction";

// Sample userOp that matches what we see in the test
const sampleUserOp = {
  sender: "0xc808514C81883381f8AD9c968987c84EB710118F" as Address,
  nonce: 610691891751989207504506305568379820699205042976296306292510643409911808n,
  factory: "0xd703aaE79538628d27099B8c4f621bE4CCd142d5" as Address,
  factoryData: "0xc5265d5d000000000000000000000000aac5d4240af87249b3f71bc8e4a2cae074a3e419000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002bc00000000000000000000000000000000000000000000000000000000000001643c3b752b01587bd23adbdaea6677c5d759f4aacd00d625a5a60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000b23589b5d0b3f6750fec388a0e61da68c12909c9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as Hex,
  callData: "0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as Hex,
  callGasLimit: 0n,
  verificationGasLimit: 0n,
  preVerificationGas: 0n,
  maxFeePerGas: 1302000n,
  maxPriorityFeePerGas: 1050000n,
  signature: "0x" as Hex,
};

const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;
const chainId = 84532;

// Method 1: Use viem's getUserOperationHash
const viemHash = getUserOperationHash({
  userOperation: sampleUserOp,
  entryPointAddress,
  entryPointVersion: "0.7",
  chainId,
});
console.log("viem's getUserOperationHash:", viemHash);

// Method 2: Manual computation following ERC-4337 v0.7 spec (exactly as EntryPoint does it)
function packUserOp07Manual(userOp: typeof sampleUserOp): Hex {
  // Pack initCode: factory + factoryData if factory exists
  const initCode = userOp.factory
    ? concat([userOp.factory, userOp.factoryData || "0x"])
    : "0x" as Hex;

  // Pack accountGasLimits: bytes32 = (verificationGasLimit << 128) | callGasLimit
  const accountGasLimits = (userOp.verificationGasLimit << 128n) | userOp.callGasLimit;

  // Pack gasFees: bytes32 = (maxPriorityFeePerGas << 128) | maxFeePerGas
  const gasFees = (userOp.maxPriorityFeePerGas << 128n) | userOp.maxFeePerGas;

  // Pack paymasterAndData: paymaster + paymasterVerificationGasLimit + paymasterPostOpGasLimit + paymasterData
  const paymasterAndData = "0x" as Hex; // No paymaster in our test

  // EntryPoint uses abi.encode which packs everything as 32-byte words
  // The order is: sender, nonce, keccak256(initCode), keccak256(callData), accountGasLimits, preVerificationGas, gasFees, keccak256(paymasterAndData)
  return encodeAbiParameters(
    parseAbiParameters("address, uint256, bytes32, bytes32, bytes32, uint256, bytes32, bytes32"),
    [
      userOp.sender,
      userOp.nonce,
      keccak256(initCode),
      keccak256(userOp.callData),
      ("0x" + accountGasLimits.toString(16).padStart(64, "0")) as Hash, // Convert uint256 to bytes32
      userOp.preVerificationGas,
      ("0x" + gasFees.toString(16).padStart(64, "0")) as Hash, // Convert uint256 to bytes32
      keccak256(paymasterAndData),
    ]
  );
}

// The packed data is hashed, then hashed again with entryPoint and chainId
const packedData = packUserOp07Manual(sampleUserOp);
const packedHash = keccak256(packedData);

const manualHash = keccak256(
  encodeAbiParameters(
    parseAbiParameters("bytes32, address, uint256"),
    [packedHash, entryPointAddress, BigInt(chainId)]
  )
);
console.log("Manual computation:", manualHash);

// Compare
if (viemHash === manualHash) {
  console.log("\n✓ Hash computations MATCH!");
} else {
  console.log("\n✗ Hash computations DIFFER!");
  console.log("  This might explain the merkle proof failure.");
  console.log("  Check if EntryPoint uses a different packing method.");
}

// Also print intermediate values for debugging
console.log("\nIntermediate values:");
console.log("  initCode hash:", keccak256(concat([sampleUserOp.factory!, sampleUserOp.factoryData || "0x"])));
console.log("  callData hash:", keccak256(sampleUserOp.callData));
console.log("  packedData hash:", packedHash);
