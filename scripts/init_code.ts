// Init code hash calculator

import { bytecode as bytecode_File } from "../artifacts/contracts/file_bridge_swap_core/FileswapV2Pair.sol/FileswapV2Pair.json"
import { bytecode } from "@uniswap/v2-core/build/UniswapV2Pair.json"
import { keccak256 } from "@ethersproject/solidity"

// console.log(bytecode)
const COMPUTED_INIT_CODE_HASH_File = keccak256(["bytes"], [`${bytecode_File}`])
const COMPUTED_INIT_CODE_HASH = keccak256(["bytes"], [`0x${bytecode}`])
console.log(COMPUTED_INIT_CODE_HASH_File)
console.log(COMPUTED_INIT_CODE_HASH)
