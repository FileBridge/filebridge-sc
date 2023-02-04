import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "hardhat-deploy"
import "solidity-coverage"
import "@openzeppelin/hardhat-upgrades"
import "hardhat-tracer"
// import { ethers } from "ethers"
// import fs from "fs-extra"

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL!,
    MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL!,
    HYPERSPACE_RPC_URL = process.env.HYPERSPACE_RPC_URL!

// Etherscan and Coinmarketcap API key import
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key"

// Wallet import
const wallet1: string = process.env.WALLET1!,
    wallet2: string = process.env.WALLET2!,
    wallet3: string = process.env.WALLET3!

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.10",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                },
            },
            {
                version: "0.5.16",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                },
            },
            {
                version: "0.6.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                },
            },
            {
                version: "0.4.24",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                },
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // forking: {
            //     url: MUMBAI_RPC_URL,
            //     // blockNumber: 3627190,
            // },
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [wallet1, wallet2, wallet3],
            chainId: 5,
        },
        mumbai: {
            url: MUMBAI_RPC_URL,
            accounts: [wallet1, wallet2, wallet3],
            chainId: 80001,
        },
        hyperspace: {
            url: HYPERSPACE_RPC_URL,
            accounts: [wallet1, wallet2, wallet3],

            chainId: 3141,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            chainId: 31337,
        },
    },
    gasReporter: {
        // enabled: true,
        // outputFile: "gas-report.txt",
        // noColors: true,
        currency: "USD",
        // coinmarketcap: COINMARKETCAP_API_KEY,
        // token: "ETH",
    },
    namedAccounts: {
        deployer: {
            default: 2,
            31337: 0,
        },
        guardian: {
            default: 1,
            31337: 1,
        },
        client: {
            default: 0,
            31337: 2,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
}

export default config
