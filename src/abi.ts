export const VALIDATOR_ABI = [
  {
    "type": "function",
    "name": "APPROVAL_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ERC1271_MAGIC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ERC6492_MAGIC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "LEAF_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_TYPE_VALIDATOR",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "computeApprovalHash",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "merkleRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "validUntil",
        "type": "uint48",
        "internalType": "uint48"
      },
      {
        "name": "scope",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "computeLeafHash",
    "inputs": [
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "child",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "entryPoint",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "userOpHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getEnableData",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isInitialized",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isModuleType",
    "inputs": [
      {
        "name": "typeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "isValidSignatureWithSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "hash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonceOf",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "onInstall",
    "inputs": [
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "onUninstall",
    "inputs": [
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "parentOf",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "parent",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "scopeOf",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "allowedScope",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "validateUserOp",
    "inputs": [
      {
        "name": "userOp",
        "type": "tuple",
        "internalType": "struct ParentERC6492Validator.PackedUserOperation",
        "components": [
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "initCode",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "callData",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "accountGasLimits",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "preVerificationGas",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "gasFees",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "paymasterAndData",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "signature",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "userOpHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "validationData",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ModuleInstalled",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "parent",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "initialNonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "scope",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ModuleUninstalled",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NonceUsed",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ParentSet",
    "inputs": [
      {
        "name": "child",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "parent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyInitialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ExpiredApproval",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidMerkleProof",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidNonce",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidParent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ScopeMismatch",
    "inputs": []
  }
] as const;

export const VALIDATOR_BYTECODE = "0x608080604052346015576112e7908161001a8239f35b5f80fdfe60806040526004361015610011575f80fd5b5f3560e01c806320364ebb146101445780634dbac2ce1461013f57806365a724971461013a57806365e9542d146101355780636d61fe70146101305780637b1e11e61461012b5780638a91b0e3146101265780639700320314610121578063aab86bea1461011c578063b87cc76b14610117578063c4d043c514610112578063cf5e06111461010d578063d60b347f14610108578063dff658be14610103578063e3ffec89146100fe578063ecd05961146100f9578063ed2a2d64146100f4578063ee08388e146100ef5763f551e2ee146100ea575f80fd5b610722565b6106e0565b6106a5565b610684575b61065b565b610640565b6105fc565b6105b6565b610508565b61049f565b610440565b6103e4565b61037e565b610344565b610263565b6101e6565b6101ac565b610172565b3461016e575f36600319011261016e5760206040516f71727de22e5e9d8baf0edac6f37da0328152f35b5f80fd5b3461016e575f36600319011261016e5760206040517f64926492649264926492649264926492649264926492649264926492649264928152f35b3461016e575f36600319011261016e5760206040517f22c4ae6149ae3c864b926ef20b459db1adeedc7563d24eb27386e7ef583490978152f35b3461016e575f36600319011261016e57604051630b135d3f60e11b8152602090f35b9181601f8401121561016e578235916001600160401b03831161016e576020838186019501011161016e57565b602060031982011261016e57600435906001600160401b03821161016e5761025f91600401610208565b9091565b3461016e5761027136610235565b335f908152602081905260409020549091906001600160a01b03166103365761029c91810190610782565b6001600160a01b0390921691821561032757335f8181526020818152604080832080546001600160a01b0319166001600160a01b03989098169788179055600182528083208690556002825291829020849055815195865285019390935291830152907f6c237f7827accf09abfb16a3f7708cd355fed6fe05cfc7cbe00fed8854d2d3ee90606090a2005b630bea7bb360e31b5f5260045ffd5b62dc149f60e41b5f5260045ffd5b3461016e575f36600319011261016e5760206040517f910d65064d2d2881b13277b3cb4f6e910c447e7d534db998d817fc46298c841a8152f35b3461016e5761038c36610235565b5050335f9081526020818152604080832080546001600160a01b0319169055600182528083208390556002909152812055337f8542f07efccd0c3cda31b784e4230bb229a0fd4c566cc725db514300e2f6df885f80a2005b3461016e57604036600319011261016e576004356001600160401b03811161016e57610120600319823603011261016e576104276020916024359060040161080c565b604051908152f35b6001600160a01b0381160361016e57565b3461016e57602036600319011261016e5760043561045d8161042f565b60018060a01b03165f526002602052602060405f2054604051908152f35b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b3461016e57602036600319011261016e576004356104bc8161042f565b6001600160a01b039081165f9081526020818152604091829020548251931683820152825261050491906104f09082610a8d565b60405191829160208352602083019061047b565b0390f35b3461016e57608036600319011261016e57602060043560243561052a8161042f565b6044356105368161042f565b6064359060405192858401947f910d65064d2d2881b13277b3cb4f6e910c447e7d534db998d817fc46298c841a8652604085015260018060a01b0316606084015260018060a01b0316608083015260a082015260a0815261059860c082610a8d565b519020604051908152f35b359065ffffffffffff8216820361016e57565b3461016e5760a036600319011261016e576004356105d38161042f565b6024356044359160643565ffffffffffff8116810361016e576020936104279360843593610daf565b3461016e57602036600319011261016e576004356106198161042f565b6001600160a01b039081165f90815260208181526040918290205491519190921615158152f35b3461016e575f36600319011261016e57602060405160018152f35b3461016e575f36600319011261016e5760405160ff67676173657374696760c01b018152602090f35b3461016e57602036600319011261016e576020600435600160405191148152f35b3461016e57602036600319011261016e576004356106c28161042f565b60018060a01b03165f526001602052602060405f2054604051908152f35b3461016e57602036600319011261016e576004356106fd8161042f565b6001600160a01b039081165f9081526020818152604091829020549151919092168152f35b3461016e57606036600319011261016e5760043561073f8161042f565b6044356024356001600160401b03821161016e5760209261076761076f933690600401610208565b929091610b10565b6040516001600160e01b03199091168152f35b9081606091031261016e5780356107988161042f565b916040602083013592013590565b356107b08161042f565b90565b903590601e198136030182121561016e57018035906001600160401b03821161016e5760200191813603831361016e57565b634e487b7160e01b5f52601160045260245ffd5b906001820180921161080757565b6107e5565b610815816107a6565b9061083f6108328360018060a01b03165f525f60205260405f2090565b546001600160a01b031690565b906001600160a01b03821615610a4a5761010081019061086861086283836107b3565b90610b75565b610a355761087f91610879916107b3565b90610c1b565b80516001600160a01b0384165f9081526001602052604090209192915403610a265760208201936108c46108b9865165ffffffffffff1690565b65ffffffffffff1690565b4211610a17576001600160a01b0384165f908152600260205260409020548015159081610a08575b506109f9576108fc908446610cef565b6109196109156060850151926040860193845190610d5e565b1590565b6109ea57610953916109486109159251855161093b895165ffffffffffff1690565b9060a08801519289610daf565b608085015191610e18565b6109db576107b0926109d5927f2af71f10069c28afc67c3752e87e0e4616a97948d33c8f404a856c0c334b3e016109c6846109916108b996516107f9565b6001600160a01b0385165f90815260016020526040902055516040519081526001600160a01b03909316929081906020820190565b0390a25165ffffffffffff1690565b60301b90565b638baa579f60e01b5f5260045ffd5b63582f497d60e11b5f5260045ffd5b6301cf7dc760e71b5f5260045ffd5b905060a084015114155f6108ec565b63050a19db60e51b5f5260045ffd5b633ab3447f60e11b5f5260045ffd5b50505050506bffffffffffff00000000000090565b6321c4e35760e21b5f5260045ffd5b634e487b7160e01b5f52604160045260245ffd5b60c081019081106001600160401b03821117610a8857604052565b610a59565b90601f801991011681019081106001600160401b03821117610a8857604052565b60405190610abd60c083610a8d565b565b6001600160401b038111610a8857601f01601f191660200190565b929192610ae682610abf565b91610af46040519384610a8d565b82948184528183011161016e578281602093845f960137010152565b6001600160a01b039081165f9081526020819052604090205492939216918215610b6457610b4993610b43913691610ada565b91610e18565b610b59576001600160e01b031990565b630b135d3f60e11b90565b506001600160e01b03199392505050565b90608011610b94576060013560ff67676173657374696760c01b011490565b505f90565b9080601f8301121561016e578135916001600160401b038311610a88578260051b9060405193610bcc6020840186610a8d565b845260208085019282010192831161016e57602001905b828210610bf05750505090565b8135815260209182019101610be3565b9080601f8301121561016e578160206107b093359101610ada565b905f60a0604051610c2b81610a6d565b82815282602082015282604082015260608082015260606080820152015281019060208183031261016e578035906001600160401b03821161016e57019060c08282031261016e57610c7b610aae565b9180358352610c8c602082016105a3565b60208401526040810135604084015260608101356001600160401b03811161016e5782610cba918301610b99565b606084015260808101356001600160401b03811161016e5760a092610ce0918301610c00565b6080840152013560a082015290565b916040519160208301937f910d65064d2d2881b13277b3cb4f6e910c447e7d534db998d817fc46298c841a8552604084015260018060a01b031660608301526f71727de22e5e9d8baf0edac6f37da032608083015260a082015260a08152610d5860c082610a8d565b51902090565b929091905f915b8451831015610da75760208360051b86010151908181105f14610d96575f52602052600160405f205b920191610d65565b905f52602052600160405f20610d8e565b915092501490565b93919265ffffffffffff91936040519460208601967f22c4ae6149ae3c864b926ef20b459db1adeedc7563d24eb27386e7ef58349097885260018060a01b03166040870152606086015260808501521660a083015260c082015260c08152610d5860e082610a8d565b919081516020811015610e88575b50823b610e7f57610e6e9291610e65917f19457468657265756d205369676e6564204d6573736167653a0a3332000000005f52601c52603c5f20611150565b909391936111a8565b6001600160a01b0391821691161490565b6107b092611089565b8201517f649264926492649264926492649264926492649264926492649264926492649214610eb7575f610e26565b6107b092610f7f565b908151811015610ed1570160200190565b634e487b7160e01b5f52603260045260245ffd5b81601f8201121561016e57805190610efc82610abf565b92610f0a6040519485610a8d565b8284526020838301011161016e57815f9260208093018386015e8301015290565b9160608383031261016e578251610f418161042f565b9260208101516001600160401b03811161016e5783610f61918301610ee5565b9260408201516001600160401b03811161016e576107b09201610ee5565b8251601f198101949293929190851161080757610fb4610f9e86610abf565b95610fac6040519788610a8d565b808752610abf565b602086019490601f19013686375f5b8651811015610ffd5780610fea610fdc60019388610ec0565b516001600160f81b03191690565b5f1a610ff6828a610ec0565b5301610fc3565b50925092602061101292958051010190610f2b565b9291843b61102f576107b0946001600160a01b0390911690611121565b50506107b092611089565b3d15611064573d9061104b82610abf565b916110596040519384610a8d565b82523d5f602084013e565b606090565b9081602091031261016e57516001600160e01b03198116810361016e5790565b5f92916110bf6110cd85946040519283916020830195630b135d3f60e11b8752602484015260406044840152606483019061047b565b03601f198101835282610a8d565b51915afa6110d961103a565b9080611115575b6110e957505f90565b8051630b135d3f60e11b916001600160e01b03199161111091602091810182019101611069565b161490565b506004815110156110e0565b93929190843b61102f57815f929160208493519201905afa5061114261103a565b50823b610e7f575050505f90565b8151919060418303611180576111799250602082015190606060408401519301515f1a90611224565b9192909190565b50505f9160029190565b6004111561119457565b634e487b7160e01b5f52602160045260245ffd5b6111b18161118a565b806111ba575050565b6111c38161118a565b600181036111da5763f645eedf60e01b5f5260045ffd5b6111e38161118a565b600281036111fe575063fce698f760e01b5f5260045260245ffd5b8061120a60039261118a565b146112125750565b6335e2f38360e21b5f5260045260245ffd5b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a084116112a6579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa1561129b575f516001600160a01b0381161561129157905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f916003919056fea2646970667358221220db2a23455c3c192527047de706e083a4a251959d782d260460cda8f135b091d864736f6c634300081b0033" as const;
