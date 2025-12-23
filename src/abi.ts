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

export const VALIDATOR_BYTECODE = "0x608080604052346015576111c6908161001a8239f35b5f80fdfe60806040526004361015610011575f80fd5b5f3560e01c80634dbac2ce1461012457806365a724971461011f57806365e9542d1461011a5780636d61fe70146101155780637b1e11e6146101105780638a91b0e31461010b5780639700320314610106578063aab86bea14610101578063b87cc76b146100fc578063c4d043c5146100f7578063cf5e0611146100f2578063d60b347f146100ed578063dff658be146100e8578063ecd05961146100e3578063ed2a2d64146100de578063ee08388e146100d95763f551e2ee146100d4575f80fd5b610879565b610837565b6107fc565b6107db565b6107c0565b61077c565b610736565b6106e0565b61067b565b61061c565b61039a565b610334565b6102fa565b610219565b61019c565b610162565b3461015e575f36600319011261015e5760206040517f64926492649264926492649264926492649264926492649264926492649264928152f35b5f80fd5b3461015e575f36600319011261015e5760206040517f22c4ae6149ae3c864b926ef20b459db1adeedc7563d24eb27386e7ef583490978152f35b3461015e575f36600319011261015e57604051630b135d3f60e11b8152602090f35b9181601f8401121561015e578235916001600160401b03831161015e576020838186019501011161015e57565b602060031982011261015e57600435906001600160401b03821161015e57610215916004016101be565b9091565b3461015e57610227366101eb565b335f908152602081905260409020549091906001600160a01b03166102ec57610252918101906108d9565b6001600160a01b039092169182156102dd57335f8181526020818152604080832080546001600160a01b0319166001600160a01b03989098169788179055600182528083208690556002825291829020849055815195865285019390935291830152907f6c237f7827accf09abfb16a3f7708cd355fed6fe05cfc7cbe00fed8854d2d3ee90606090a2005b630bea7bb360e31b5f5260045ffd5b62dc149f60e41b5f5260045ffd5b3461015e575f36600319011261015e5760206040517f910d65064d2d2881b13277b3cb4f6e910c447e7d534db998d817fc46298c841a8152f35b3461015e57610342366101eb565b5050335f9081526020818152604080832080546001600160a01b0319169055600182528083208390556002909152812055337f8542f07efccd0c3cda31b784e4230bb229a0fd4c566cc725db514300e2f6df885f80a2005b3461015e57604036600319011261015e576004356001600160401b03811161015e5780600401610120600319833603011261015e57602435906103dc816108fd565b906104066103f98360018060a01b03165f525f60205260405f2090565b546001600160a01b031690565b936001600160a01b038516156105fc5761042e9161010461042892019061090a565b90610b01565b80516001600160a01b0383165f90815260016020526040902091949154036105ed576020840192610473610468855165ffffffffffff1690565b65ffffffffffff1690565b42116105de576001600160a01b0383165f9081526002602052604090205480151590816105cf575b506105c0576104ac90338446610bd5565b6104c96104c56060870151926040880193845190610c3d565b1590565b6105b157610503916104f86104c5925187516104eb885165ffffffffffff1690565b9060a08a01519288610c8e565b608087015191610cf7565b6105a25761046861058e92610588927f2af71f10069c28afc67c3752e87e0e4616a97948d33c8f404a856c0c334b3e016105798761054461059e9951610950565b6001600160a01b0385165f90815260016020526040902055516040519081526001600160a01b03909316929081906020820190565b0390a25165ffffffffffff1690565b60301b90565b6040519081529081906020820190565b0390f35b638baa579f60e01b5f5260045ffd5b63582f497d60e11b5f5260045ffd5b6301cf7dc760e71b5f5260045ffd5b905060a086015114155f61049b565b63050a19db60e51b5f5260045ffd5b633ab3447f60e11b5f5260045ffd5b6321c4e35760e21b5f5260045ffd5b6001600160a01b0381160361015e57565b3461015e57602036600319011261015e576004356106398161060b565b60018060a01b03165f526002602052602060405f2054604051908152f35b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b3461015e57602036600319011261015e576004356106988161060b565b6001600160a01b039081165f9081526020818152604091829020548251931683820152825261059e91906106cc9082610997565b604051918291602083526020830190610657565b3461015e57608036600319011261015e57602061071b6004356024356107058161060b565b604435906107128261060b565b60643592610bd5565b604051908152f35b359065ffffffffffff8216820361015e57565b3461015e5760a036600319011261015e576004356107538161060b565b6024356044359160643565ffffffffffff8116810361015e5760209361071b9360843593610c8e565b3461015e57602036600319011261015e576004356107998161060b565b6001600160a01b039081165f90815260208181526040918290205491519190921615158152f35b3461015e575f36600319011261015e57602060405160018152f35b3461015e57602036600319011261015e576020600435600160405191148152f35b3461015e57602036600319011261015e576004356108198161060b565b60018060a01b03165f526001602052602060405f2054604051908152f35b3461015e57602036600319011261015e576004356108548161060b565b6001600160a01b039081165f9081526020818152604091829020549151919092168152f35b3461015e57606036600319011261015e576004356108968161060b565b6044356024356001600160401b03821161015e576020926108be6108c69336906004016101be565b929091610a1a565b6040516001600160e01b03199091168152f35b9081606091031261015e5780356108ef8161060b565b916040602083013592013590565b356109078161060b565b90565b903590601e198136030182121561015e57018035906001600160401b03821161015e5760200191813603831361015e57565b634e487b7160e01b5f52601160045260245ffd5b906001820180921161095e57565b61093c565b634e487b7160e01b5f52604160045260245ffd5b60c081019081106001600160401b0382111761099257604052565b610963565b90601f801991011681019081106001600160401b0382111761099257604052565b604051906109c760c083610997565b565b6001600160401b03811161099257601f01601f191660200190565b9291926109f0826109c9565b916109fe6040519384610997565b82948184528183011161015e578281602093845f960137010152565b6001600160a01b039081165f9081526020819052604090205492939216918215610a6e57610a5393610a4d9136916109e4565b91610cf7565b610a63576001600160e01b031990565b630b135d3f60e11b90565b506001600160e01b03199392505050565b9080601f8301121561015e578135916001600160401b038311610992578260051b9060405193610ab26020840186610997565b845260208085019282010192831161015e57602001905b828210610ad65750505090565b8135815260209182019101610ac9565b9080601f8301121561015e57816020610907933591016109e4565b905f60a0604051610b1181610977565b82815282602082015282604082015260608082015260606080820152015281019060208183031261015e578035906001600160401b03821161015e57019060c08282031261015e57610b616109b8565b9180358352610b7260208201610723565b60208401526040810135604084015260608101356001600160401b03811161015e5782610ba0918301610a7f565b606084015260808101356001600160401b03811161015e5760a092610bc6918301610ae6565b6080840152013560a082015290565b9290916040519260208401947f910d65064d2d2881b13277b3cb4f6e910c447e7d534db998d817fc46298c841a8652604085015260018060a01b0316606084015260018060a01b0316608083015260a082015260a08152610c3760c082610997565b51902090565b929091905f915b8451831015610c865760208360051b86010151908181105f14610c75575f52602052600160405f205b920191610c44565b905f52602052600160405f20610c6d565b915092501490565b93919265ffffffffffff91936040519460208601967f22c4ae6149ae3c864b926ef20b459db1adeedc7563d24eb27386e7ef58349097885260018060a01b03166040870152606086015260808501521660a083015260c082015260c08152610c3760e082610997565b919081516020811015610d67575b50823b610d5e57610d4d9291610d44917f19457468657265756d205369676e6564204d6573736167653a0a3332000000005f52601c52603c5f2061102f565b90939193611087565b6001600160a01b0391821691161490565b61090792610f68565b8201517f649264926492649264926492649264926492649264926492649264926492649214610d96575f610d05565b61090792610e5e565b908151811015610db0570160200190565b634e487b7160e01b5f52603260045260245ffd5b81601f8201121561015e57805190610ddb826109c9565b92610de96040519485610997565b8284526020838301011161015e57815f9260208093018386015e8301015290565b9160608383031261015e578251610e208161060b565b9260208101516001600160401b03811161015e5783610e40918301610dc4565b9260408201516001600160401b03811161015e576109079201610dc4565b8251601f198101949293929190851161095e57610e93610e7d866109c9565b95610e8b6040519788610997565b8087526109c9565b602086019490601f19013686375f5b8651811015610edc5780610ec9610ebb60019388610d9f565b516001600160f81b03191690565b5f1a610ed5828a610d9f565b5301610ea2565b509250926020610ef192958051010190610e0a565b9291843b610f0e57610907946001600160a01b0390911690611000565b505061090792610f68565b3d15610f43573d90610f2a826109c9565b91610f386040519384610997565b82523d5f602084013e565b606090565b9081602091031261015e57516001600160e01b03198116810361015e5790565b5f9291610f9e610fac85946040519283916020830195630b135d3f60e11b87526024840152604060448401526064830190610657565b03601f198101835282610997565b51915afa610fb8610f19565b9080610ff4575b610fc857505f90565b8051630b135d3f60e11b916001600160e01b031991610fef91602091810182019101610f48565b161490565b50600481511015610fbf565b93929190843b610f0e57815f929160208493519201905afa50611021610f19565b50823b610d5e575050505f90565b815191906041830361105f576110589250602082015190606060408401519301515f1a90611103565b9192909190565b50505f9160029190565b6004111561107357565b634e487b7160e01b5f52602160045260245ffd5b61109081611069565b80611099575050565b6110a281611069565b600181036110b95763f645eedf60e01b5f5260045ffd5b6110c281611069565b600281036110dd575063fce698f760e01b5f5260045260245ffd5b806110e9600392611069565b146110f15750565b6335e2f38360e21b5f5260045260245ffd5b91907f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08411611185579160209360809260ff5f9560405194855216868401526040830152606082015282805260015afa1561117a575f516001600160a01b0381161561117057905f905f90565b505f906001905f90565b6040513d5f823e3d90fd5b5050505f916003919056fea2646970667358221220339b56bef9b77f2d1a99fba003f34eb02eaed8d80b0c0a25ba5518557ea9a01c64736f6c634300081b0033" as const;
