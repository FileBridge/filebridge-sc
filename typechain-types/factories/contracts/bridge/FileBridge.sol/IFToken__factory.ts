/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IFToken,
  IFTokenInterface,
} from "../../../../contracts/bridge/FileBridge.sol/IFToken";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class IFToken__factory {
  static readonly abi = _abi;
  static createInterface(): IFTokenInterface {
    return new utils.Interface(_abi) as IFTokenInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IFToken {
    return new Contract(address, _abi, signerOrProvider) as IFToken;
  }
}