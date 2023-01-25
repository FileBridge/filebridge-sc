/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IFileswapV2Callee,
  IFileswapV2CalleeInterface,
} from "../../../../contracts/file_bridge_swap/interfaces/IFileswapV2Callee";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "FileswapV2Call",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class IFileswapV2Callee__factory {
  static readonly abi = _abi;
  static createInterface(): IFileswapV2CalleeInterface {
    return new utils.Interface(_abi) as IFileswapV2CalleeInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IFileswapV2Callee {
    return new Contract(address, _abi, signerOrProvider) as IFileswapV2Callee;
  }
}
