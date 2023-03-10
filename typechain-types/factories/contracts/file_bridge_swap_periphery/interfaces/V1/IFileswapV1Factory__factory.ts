/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IFileswapV1Factory,
  IFileswapV1FactoryInterface,
} from "../../../../../contracts/file_bridge_swap_periphery/interfaces/V1/IFileswapV1Factory";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "getExchange",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class IFileswapV1Factory__factory {
  static readonly abi = _abi;
  static createInterface(): IFileswapV1FactoryInterface {
    return new utils.Interface(_abi) as IFileswapV1FactoryInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IFileswapV1Factory {
    return new Contract(address, _abi, signerOrProvider) as IFileswapV1Factory;
  }
}
