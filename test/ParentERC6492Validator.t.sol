// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {ParentERC6492Validator} from "../contracts/ParentERC6492Validator.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ParentERC6492ValidatorTest is Test {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    ParentERC6492Validator public validator;

    // Test accounts
    address public childAccount;
    address public parentEOA;
    uint256 public parentPrivateKey;
    address public entryPoint;

    // Test constants
    bytes32 public constant TEST_SCOPE = keccak256("TEST_SCOPE");
    uint256 public constant INITIAL_NONCE = 0;

    function setUp() public {
        validator = new ParentERC6492Validator();

        // Create test accounts
        parentPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        parentEOA = vm.addr(parentPrivateKey);
        childAccount = makeAddr("child");
        // Must use the actual EntryPoint v0.7 address since the contract uses it as a constant
        entryPoint = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

        // Install the validator on the child account
        vm.prank(childAccount);
        validator.onInstall(abi.encode(parentEOA, INITIAL_NONCE, TEST_SCOPE));
    }

    // ============ Installation Tests ============

    function test_onInstall_success() public view {
        assertEq(validator.parentOf(childAccount), parentEOA);
        assertEq(validator.nonceOf(childAccount), INITIAL_NONCE);
        assertEq(validator.scopeOf(childAccount), TEST_SCOPE);
        assertTrue(validator.isInitialized(childAccount));
    }

    function test_onInstall_revert_alreadyInitialized() public {
        vm.prank(childAccount);
        vm.expectRevert(ParentERC6492Validator.AlreadyInitialized.selector);
        validator.onInstall(abi.encode(parentEOA, INITIAL_NONCE, TEST_SCOPE));
    }

    function test_onInstall_revert_invalidParent() public {
        address newChild = makeAddr("newChild");
        vm.prank(newChild);
        vm.expectRevert(ParentERC6492Validator.InvalidParent.selector);
        validator.onInstall(abi.encode(address(0), INITIAL_NONCE, TEST_SCOPE));
    }

    function test_onUninstall_success() public {
        vm.prank(childAccount);
        validator.onUninstall("");

        assertEq(validator.parentOf(childAccount), address(0));
        assertEq(validator.nonceOf(childAccount), 0);
        assertEq(validator.scopeOf(childAccount), bytes32(0));
        assertFalse(validator.isInitialized(childAccount));
    }

    function test_isModuleType() public view {
        assertTrue(validator.isModuleType(1)); // VALIDATOR = 1
        assertFalse(validator.isModuleType(0));
        assertFalse(validator.isModuleType(2));
    }

    // ============ Hash Computation Tests ============

    function test_computeLeafHash() public view {
        uint256 chainId = 1;
        bytes32 userOpHash = keccak256("userOp");

        bytes32 leaf = validator.computeLeafHash(chainId, childAccount, entryPoint, userOpHash);

        bytes32 expectedLeaf = keccak256(
            abi.encode(validator.LEAF_TYPEHASH(), chainId, childAccount, entryPoint, userOpHash)
        );

        assertEq(leaf, expectedLeaf);
    }

    function test_computeApprovalHash() public view {
        bytes32 merkleRoot = keccak256("merkleRoot");
        uint256 nonce = 0;
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, nonce, validUntil, TEST_SCOPE);

        bytes32 expectedHash = keccak256(
            abi.encode(validator.APPROVAL_TYPEHASH(), childAccount, merkleRoot, nonce, validUntil, TEST_SCOPE)
        );

        assertEq(approvalHash, expectedHash);
    }

    // ============ Merkle Verification Tests ============

    function test_validateUserOp_singleChain() public {
        // Create a single-chain scenario (merkle tree with one leaf)
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        // Compute the leaf
        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);

        // For single leaf, the merkle root is the leaf itself
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        // Compute approval hash
        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, TEST_SCOPE);

        // Sign with parent EOA
        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        // Build the approval struct
        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: parentSig,
            scope: TEST_SCOPE
        });

        // Build the UserOp
        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        // Validate
        vm.prank(entryPoint);
        uint256 validationData = validator.validateUserOp(userOp, userOpHash);

        // Check validation passed (validUntil packed in result, validAfter = 0)
        uint48 returnedValidUntil = uint48(validationData >> 48);
        uint48 returnedValidAfter = uint48(validationData);
        assertEq(returnedValidUntil, validUntil);
        assertEq(returnedValidAfter, 0);

        // Check nonce was incremented
        assertEq(validator.nonceOf(childAccount), INITIAL_NONCE + 1);
    }

    function test_validateUserOp_multiChain() public {
        // Create a multi-chain scenario with 2 leaves
        bytes32 userOpHash1 = keccak256("userOp1");
        bytes32 userOpHash2 = keccak256("userOp2");
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        // Compute leaves
        bytes32 leaf1 = validator.computeLeafHash(1, childAccount, entryPoint, userOpHash1); // Chain 1
        bytes32 leaf2 = validator.computeLeafHash(2, childAccount, entryPoint, userOpHash2); // Chain 2

        // Build merkle tree (simple 2-leaf tree)
        // Sort leaves for consistent tree construction
        bytes32 leftLeaf;
        bytes32 rightLeaf;
        if (uint256(leaf1) < uint256(leaf2)) {
            leftLeaf = leaf1;
            rightLeaf = leaf2;
        } else {
            leftLeaf = leaf2;
            rightLeaf = leaf1;
        }

        bytes32 merkleRoot = keccak256(abi.encodePacked(leftLeaf, rightLeaf));

        // Proof for leaf1 (sibling is leaf2)
        bytes32[] memory proofForLeaf1 = new bytes32[](1);
        proofForLeaf1[0] = leaf2;

        // Set chainId to 1 for this test
        vm.chainId(1);

        // Compute approval hash
        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, TEST_SCOPE);

        // Sign with parent EOA
        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        // Build the approval struct for chain 1
        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: proofForLeaf1,
            parentSig6492: parentSig,
            scope: TEST_SCOPE
        });

        // Build the UserOp
        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        // Validate
        vm.prank(entryPoint);
        uint256 validationData = validator.validateUserOp(userOp, userOpHash1);

        // Check validation passed
        uint48 returnedValidUntil = uint48(validationData >> 48);
        assertEq(returnedValidUntil, validUntil);
    }

    // ============ Failure Tests ============

    function test_validateUserOp_revert_notInitialized() public {
        address uninitializedChild = makeAddr("uninitializedChild");
        bytes32 userOpHash = keccak256("userOp");

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: uninitializedChild,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });

        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.NotInitialized.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    function test_validateUserOp_revert_invalidNonce() public {
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, 999, validUntil, TEST_SCOPE); // Wrong nonce

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: 999, // Wrong nonce
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: parentSig,
            scope: TEST_SCOPE
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.InvalidNonce.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    function test_validateUserOp_revert_expiredApproval() public {
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp - 1); // Already expired

        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, TEST_SCOPE);

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: parentSig,
            scope: TEST_SCOPE
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.ExpiredApproval.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    function test_validateUserOp_revert_scopeMismatch() public {
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);
        bytes32 wrongScope = keccak256("WRONG_SCOPE");

        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, wrongScope);

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: parentSig,
            scope: wrongScope
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.ScopeMismatch.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    function test_validateUserOp_revert_invalidMerkleProof() public {
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;

        // Wrong proof
        bytes32[] memory wrongProof = new bytes32[](1);
        wrongProof[0] = keccak256("wrong");

        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, TEST_SCOPE);

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: wrongProof,
            parentSig6492: parentSig,
            scope: TEST_SCOPE
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.InvalidMerkleProof.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    function test_validateUserOp_revert_invalidSignature() public {
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        // Sign with wrong key
        uint256 wrongKey = 0xdeadbeef;
        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, TEST_SCOPE);
        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: wrongSig,
            scope: TEST_SCOPE
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.InvalidSignature.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    function test_validateUserOp_revert_replayAttack() public {
        // First, do a valid validation
        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);

        bytes32 leaf = validator.computeLeafHash(block.chainid, childAccount, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        bytes32 approvalHash =
            validator.computeApprovalHash(childAccount, merkleRoot, INITIAL_NONCE, validUntil, TEST_SCOPE);

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: INITIAL_NONCE,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: parentSig,
            scope: TEST_SCOPE
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: childAccount,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        // First validation succeeds
        vm.prank(entryPoint);
        validator.validateUserOp(userOp, userOpHash);

        // Second validation with same nonce should fail
        vm.prank(entryPoint);
        vm.expectRevert(ParentERC6492Validator.InvalidNonce.selector);
        validator.validateUserOp(userOp, userOpHash);
    }

    // ============ Scope Tests ============

    function test_validateUserOp_anyScope() public {
        // Create a child with no scope restriction (bytes32(0))
        address anyChild = makeAddr("anyChild");
        vm.prank(anyChild);
        validator.onInstall(abi.encode(parentEOA, 0, bytes32(0)));

        bytes32 userOpHash = keccak256("userOp");
        uint48 validUntil = uint48(block.timestamp + 1 hours);
        bytes32 randomScope = keccak256("RANDOM_SCOPE");

        bytes32 leaf = validator.computeLeafHash(block.chainid, anyChild, entryPoint, userOpHash);
        bytes32 merkleRoot = leaf;
        bytes32[] memory merkleProof = new bytes32[](0);

        bytes32 approvalHash = validator.computeApprovalHash(anyChild, merkleRoot, 0, validUntil, randomScope);

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory parentSig = abi.encodePacked(r, s, v);

        ParentERC6492Validator.MultiChainApproval memory approval = ParentERC6492Validator.MultiChainApproval({
            approvalNonce: 0,
            validUntil: validUntil,
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            parentSig6492: parentSig,
            scope: randomScope
        });

        ParentERC6492Validator.PackedUserOperation memory userOp = ParentERC6492Validator.PackedUserOperation({
            sender: anyChild,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: abi.encode(approval)
        });

        // Should succeed with any scope when allowedScope is bytes32(0)
        vm.prank(entryPoint);
        validator.validateUserOp(userOp, userOpHash);
    }

    // ============ ERC-1271 Tests ============

    function test_isValidSignatureWithSender_validEOASignature() public view {
        bytes32 testHash = keccak256("test message");
        bytes32 ethSignedHash = testHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(parentPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        bytes4 result = validator.isValidSignatureWithSender(childAccount, testHash, signature);
        assertEq(result, bytes4(0x1626ba7e)); // ERC1271_MAGIC
    }

    function test_isValidSignatureWithSender_invalidSignature() public view {
        bytes32 testHash = keccak256("test message");
        uint256 wrongKey = 0xdeadbeef;
        bytes32 ethSignedHash = testHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        bytes4 result = validator.isValidSignatureWithSender(childAccount, testHash, wrongSig);
        assertEq(result, bytes4(0xffffffff));
    }

    function test_isValidSignatureWithSender_notInitialized() public view {
        address uninitializedChild = address(0xdead);
        bytes32 testHash = keccak256("test message");
        bytes memory signature = "";

        bytes4 result = validator.isValidSignatureWithSender(uninitializedChild, testHash, signature);
        assertEq(result, bytes4(0xffffffff));
    }
}
