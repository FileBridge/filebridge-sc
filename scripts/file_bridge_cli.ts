import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import * as readline from "readline"
import {
    FileBridge,
    FileswapV2Factory,
    FileswapV2Pair,
    FileswapV2Router02,
    FToken,
    Token,
    WFil,
} from "../typechain-types"

import fs from "fs"

import fileSwapAddressesJson from "../helper_functions/JSON/fileswap-addresses.json"
import fileSwapTokensJson from "../helper_functions/JSON/mockTokens.json"
import { DeployResult } from "hardhat-deploy/dist/types"
import { TransactionReceipt } from "@ethersproject/providers"

const chainMapping: any = {
    5: "goerli",
    80001: "mumbai",
    3141: "hyperspace",
}

let fileBridge: FileBridge,
    deployer: SignerWithAddress,
    guardian: SignerWithAddress,
    client: SignerWithAddress,
    GOVERNANCE_ROLE: string,
    DEFAULT_ADMIN_ROLE: string,
    mockTokens: any = {},
    fileTokens: any = {},
    fileswapV2Factory: FileswapV2Factory,
    fileswapV2Router02: FileswapV2Router02,
    wFil: WFil,
    { deploy } = deployments,
    chainId = network.config.chainId!

async function main() {
    await initContracts()
    await initAccounts()
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    mainMenu(rl)
}

async function initContracts() {
    if (chainId === 31337) {
        await deployments.fixture(["all"])
    }
    fileBridge = await ethers.getContract("FileBridge", deployer)
    const mockToken = (await ethers.getContract("Token")) as Token,
        fileToken = (await ethers.getContract("FToken")) as FToken

    mockTokens["DAI"] = {
        name: await mockToken.name(),
        symbol: await mockToken.symbol(),
        address: mockToken.address,
    }
    fileTokens["FDAI"] = {
        name: await fileToken.name(),
        symbol: await fileToken.symbol(),
        address: fileToken.address,
    }
    wFil = await ethers.getContract("WFil")
    fileswapV2Factory = await ethers.getContract("FileswapV2Factory")
    fileswapV2Router02 = await ethers.getContract("FileswapV2Router02")
}

async function initAccounts() {
    const accounts = await ethers.getSigners()
    if (chainId === 31337) {
        deployer = accounts[0]
        guardian = accounts[1]
        client = accounts[2]
    } else {
        deployer = accounts[2]
        guardian = accounts[1]
        client = accounts[0]
    }
}

async function mainMenu(rl: readline.Interface) {
    menuOptions(rl)
}

function menuOptions(rl: readline.Interface) {
    console.log("__________________________________________________")
    rl.question(
        "Select operation: \n Options: \n [0]: Exit \n [1]: Clear console \n [2]: Check mock Tokens \n [3]: Check file wrapped FTokens \n [4]: deploy mock Token \n [5]: deploy file wrapped Token \n [6]: mint Token \n [7]: deposit token and mint wrapped FToken \n [8]: check balances \n [9]: deposit Token \n [10]: redeem Token \n [11]: add liquidity \n [12]: swap \n",
        async (answer: string) => {
            console.log(`Selected: ${answer}`)
            console.log("__________________________________________________\n")

            const option = Number(answer)
            switch (option) {
                case 0:
                    rl.close()
                    return
                case 1:
                    console.clear()
                    mainMenu(rl)
                    break
                case 2:
                    await checkMockToken()
                    mainMenu(rl)
                    break
                case 3:
                    await checkfileToken()
                    mainMenu(rl)
                    break

                // deployMockToken(name: string, symbol: string)
                case 4:
                    rl.question("Input name\n", async (name: string) => {
                        rl.question(
                            "Input symbol\n",
                            async (symbol: string) => {
                                try {
                                    await deployMockToken(name, symbol)
                                } catch (error) {
                                    console.log("error\n")
                                    console.log({ error })
                                }
                                mainMenu(rl)
                            }
                        )
                    })
                    break
                case 5:
                    rl.question("Input name\n", async (name: string) => {
                        rl.question(
                            "Input symbol\n",
                            async (symbol: string) => {
                                rl.question(
                                    "Input token address\n",
                                    async (tokenAddress: string) => {
                                        try {
                                            await deployFileToken(
                                                name,
                                                symbol,
                                                tokenAddress
                                            )
                                        } catch (error) {
                                            console.log("error\n")
                                            console.log({ error })
                                        }
                                        mainMenu(rl)
                                    }
                                )
                            }
                        )
                    })
                    break
                case 6:
                    rl.question(
                        "Input token name or address\n",
                        async (token: string) => {
                            rl.question(
                                "Input destination address (leave empty for deployer address)\n",
                                async (to: string) => {
                                    rl.question(
                                        "Input amount in Ether\n",
                                        async (amountInEther: string) => {
                                            try {
                                                await mintToken(
                                                    token,
                                                    to,
                                                    Number(amountInEther)
                                                )
                                            } catch (error) {
                                                console.log("error\n")
                                                console.log({ error })
                                            }
                                            mainMenu(rl)
                                        }
                                    )
                                }
                            )
                        }
                    )
                    break
                case 7:
                    rl.question(
                        "Input token name or address\n",
                        async (token: string) => {
                            rl.question(
                                "Input amount in Ether\n",
                                async (amountInEther: string) => {
                                    try {
                                        await depositAndMint(
                                            token,
                                            Number(amountInEther)
                                        )
                                    } catch (error) {
                                        console.log("error\n")
                                        console.log({ error })
                                    }
                                    mainMenu(rl)
                                }
                            )
                        }
                    )
                    break
                case 8:
                    rl.question(
                        "Input the address\n",
                        async (owner: string) => {
                            try {
                                await checkBalances(owner)
                            } catch (error) {
                                console.log("error\n")
                                console.log({ error })
                            }
                            mainMenu(rl)
                        }
                    )
                    break
                case 9:
                    rl.question("Input the address\n", async (to: string) => {
                        rl.question(
                            "Input the chainID\n",
                            async (chainId: string) => {
                                rl.question(
                                    "Input token name or address\n",
                                    async (token: string) => {
                                        rl.question(
                                            "Input amount in Ether\n",
                                            async (amountInEther: string) => {
                                                try {
                                                    await depositToken(
                                                        to,
                                                        Number(chainId),
                                                        token,
                                                        Number(amountInEther)
                                                    )
                                                } catch (error) {
                                                    console.log("error\n")
                                                    console.log({ error })
                                                }
                                                mainMenu(rl)
                                            }
                                        )
                                    }
                                )
                            }
                        )
                    })
                    break
                case 10:
                    rl.question(
                        "Input token name or address\n",
                        async (token: string) => {
                            rl.question(
                                "Input the address\n",
                                async (to: string) => {
                                    rl.question(
                                        "Input the des chain id\n",
                                        async (_chainId: string) => {
                                            rl.question(
                                                "Input amount in Ether\n",
                                                async (
                                                    amountInEther: string
                                                ) => {
                                                    try {
                                                        await redeemToken(
                                                            token,
                                                            to,
                                                            Number(_chainId),
                                                            Number(
                                                                amountInEther
                                                            )
                                                        )
                                                    } catch (error) {
                                                        console.log("error\n")
                                                        console.log({ error })
                                                    }
                                                    mainMenu(rl)
                                                }
                                            )
                                        }
                                    )
                                }
                            )
                        }
                    )
                    break
                case 11:
                    rl.question("Ready ????\n", async (token: string) => {
                        try {
                            await addLiquidityFileSwap()
                        } catch (error) {
                            console.log("error\n")
                            console.log({ error })
                        }
                        mainMenu(rl)
                    })
                    break
                case 12:
                    rl.question(
                        "Input token in address ????\n",
                        async (tokenIn: string) => {
                            rl.question(
                                "Input token out address ????\n",
                                async (tokenOut: string) => {
                                    rl.question(
                                        "Input amount in Ether\n",
                                        async (amountInEther: string) => {
                                            try {
                                                await swap(
                                                    tokenIn,
                                                    tokenOut,
                                                    Number(amountInEther)
                                                )
                                            } catch (error) {
                                                console.log("error\n")
                                                console.log({ error })
                                            }
                                            mainMenu(rl)
                                        }
                                    )
                                }
                            )
                        }
                    )
                    break
                default:
                    throw new Error("Invalid option")
            }
        }
    )
}

async function checkMockToken() {
    let counter = 1
    const chain = chainMapping[chainId]
    let fileSwapTokens: any = fileSwapTokensJson
    const _mockTokens = fileSwapTokens[chain]
    for (let key in _mockTokens) {
        console.log(`Token number ${counter} \n`)
        console.log(`Symbol\t${mockTokens[key]["symbol"]}`)
        console.log(`Name\t${mockTokens[key]["name"]}`)
        console.log(`Address\t${mockTokens[key]["address"]}\n`)
        counter += 1
    }
}
async function checkfileToken() {
    let counter = 1
    const chain = chainMapping[chainId]
    let fileSwapTokens: any = fileSwapTokensJson
    const _mockTokens = fileSwapTokens[chain]
    for (let key in _mockTokens) {
        console.log(`Token number ${counter} \n`)
        console.log(`Symbol\t${fileTokens[key]["symbol"]}`)
        console.log(`Name\t${fileTokens[key]["name"]}`)
        console.log(`Address\t${fileTokens[key]["address"]}\n`)
        counter += 1
    }
}

async function deployMockToken(name: string, symbol: string) {
    let exchangeConstruct: any = fileSwapAddressesJson
    const args = [name, symbol]

    console.log(`Deploying ${name} and waiting for confirmations...`)
    let _mockToken: DeployResult
    if (chainId === 3141) {
        _mockToken = await deploy("Token", {
            from: deployer.address,
            log: true,
            maxPriorityFeePerGas: (
                await ethers.provider.getFeeData()
            ).maxPriorityFeePerGas!,
            args: args,
            waitConfirmations: 1,
        })
    } else {
        _mockToken = await deploy("Token", {
            from: deployer.address,
            log: true,
            args: args,
            waitConfirmations: 1,
        })
    }

    const chain = chainMapping[chainId]
    exchangeConstruct[chain][symbol] = _mockToken.address

    mockTokens[symbol] = {
        name: name,
        symbol: symbol,
        address: _mockToken.address,
    }

    console.log(`${name} deployed at ${_mockToken.address}`)
    console.log("__________________________________________________")

    /* __________ export to Json parts __________ */
    const jsonDataString = JSON.stringify(exchangeConstruct)
    fs.writeFileSync(
        "./helper_functions/JSON/fileswap-addresses.json",
        jsonDataString,
        {
            encoding: "utf8",
        }
    )
}

async function deployFileToken(
    name: string,
    symbol: string,
    tokenAddress: string,
    fileBridgeAddress: string = fileBridge.address
) {
    const args = [tokenAddress, fileBridgeAddress, name, symbol]

    console.log(`Deploying ${name} and waiting for confirmations...`)

    const _fileToken = await deploy("FToken", {
        from: deployer.address,
        log: true,
        maxPriorityFeePerGas: (
            await ethers.provider.getFeeData()
        ).maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: 1,
    })

    fileTokens[symbol] = {
        name: name,
        symbol: symbol,
        address: _fileToken.address,
    }

    console.log(`${name} deployed at ${_fileToken.address}`)
    console.log("__________________________________________________")
}

async function mintToken(token: string, to: string, amountInEther: number) {
    let exchangeConstruct: any = fileSwapAddressesJson
    const amountBigInWei = ethers.utils.parseEther(amountInEther.toString())

    to = to.length === 0 ? deployer.address : to

    const chain = chainMapping[chainId] as string

    let tokenAddress: string

    if (token.length === 42) {
        tokenAddress = token
    } else {
        for (let key in exchangeConstruct[chain]) {
            if (key === token) {
                tokenAddress = exchangeConstruct[chain][key]
                break
            }
        }
    }

    console.log(
        `Minting ${amountInEther} ${tokenAddress!} and waiting for confirmations...`
    )

    const mockToken = (await ethers.getContractAt(
        "Token",
        tokenAddress!,
        deployer
    )) as Token
    let txResponse: ContractTransaction
    if (chainId === 3141) {
        txResponse = await mockToken.mint(to, amountBigInWei, {
            maxPriorityFeePerGas: (
                await ethers.provider.getFeeData()
            ).maxPriorityFeePerGas!,
        })
    } else {
        txResponse = await mockToken.mint(to, amountBigInWei)
    }
    console.log(`tx submitted: ${txResponse.hash}`)
    let txReveipt = await txResponse.wait()
    console.log(
        `Confirmed! Number of confirmations: ${txReveipt.confirmations}\n`
    )
}

/**
 * @param token token address or token symbol of wrapped token
 * @param amountInEther amount to be deposited in Ether
 */
async function depositAndMint(token: string, amountInEther: number) {
    const amountBigInWei = ethers.utils.parseEther(amountInEther.toString())

    let tokenSymbol: string

    if (token.length === 42) {
        for (let key in mockTokens) {
            if (mockTokens[key]["address"] === token) {
                tokenSymbol = mockTokens[key]["symbol"]
                break
            }
        }
    } else {
        tokenSymbol = token
    }

    const FToken: FToken = await ethers.getContractAt(
        "FToken",
        fileTokens[`F${tokenSymbol!}`]["address"],
        client
    )

    const mockToken = (await ethers.getContractAt(
        "Token",
        mockTokens[tokenSymbol!]["address"],
        client
    )) as Token

    console.log(
        `Approving ${amountInEther} (${
            mockTokens[tokenSymbol!]["name"]
        }) and waiting for confirmations...`
    )

    let txResponse: ContractTransaction
    if (chainId === 3141) {
        txResponse = await mockToken.approve(FToken.address, amountBigInWei, {
            maxPriorityFeePerGas: (
                await ethers.provider.getFeeData()
            ).maxPriorityFeePerGas!,
        })
    } else {
        txResponse = await mockToken.approve(FToken.address, amountBigInWei)
    }

    console.log(`tx submitted: ${txResponse.hash}`)
    let txReveipt = await txResponse.wait()
    console.log(
        `Confirmed! Number of confirmations: ${txReveipt.confirmations}\n`
    )

    console.log(
        `Depositing ${amountInEther} (${
            fileTokens[`F${tokenSymbol!}`]["name"]
        }) and waiting for confirmations...`
    )

    if (chainId === 3141) {
        txResponse = await FToken.deposit(amountBigInWei, {
            maxPriorityFeePerGas: (
                await ethers.provider.getFeeData()
            ).maxPriorityFeePerGas!,
        })
    } else {
        txResponse = await FToken.deposit(amountBigInWei)
    }
    console.log(`tx submitted: ${txResponse.hash}`)
    txReveipt = await txResponse.wait()
    console.log(
        `Confirmed! Number of confirmations: ${txReveipt.confirmations}\n`
    )
}

async function depositToken(
    to: string,
    _chainId: number,
    token: string,
    amountInEther: number
) {
    const amountBigInWei = ethers.utils.parseEther(amountInEther.toString())
    const chain = chainMapping[chainId]
    let fileSwapTokens: any = fileSwapTokensJson
    const _mockTokens = fileSwapTokens[chain]

    let tokenSymbol: string

    if (token.length === 42) {
        for (let key in _mockTokens) {
            if (_mockTokens[key]["address"] === token) {
                tokenSymbol = _mockTokens[key]["symbol"]
                break
            }
        }
    } else {
        tokenSymbol = token
    }

    const { client } = await getNamedAccounts()

    const fileBridge = (await ethers.getContract(
            "FileBridge",
            client
        )) as FileBridge,
        mockToken = (await ethers.getContractAt(
            "Token",
            _mockTokens[tokenSymbol!]["address"],
            client
        )) as Token

    console.log(
        `Approving ${amountInEther} (${
            _mockTokens[`${tokenSymbol!}`]["name"]
        }) and waiting for confirmations...`
    )
    let txResponse: ContractTransaction
    if (chainId === 3141) {
        txResponse = await mockToken.approve(
            fileBridge.address,
            amountBigInWei,
            {
                maxPriorityFeePerGas: (
                    await ethers.provider.getFeeData()
                ).maxPriorityFeePerGas!,
            }
        )
    } else {
        txResponse = await mockToken.approve(fileBridge.address, amountBigInWei)
    }
    console.log(`Sent with hash: ${txResponse.hash}`)
    let txReceipt = await txResponse.wait()
    console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

    console.log(
        `Depositing ${amountInEther} (${
            _mockTokens[`${tokenSymbol!}`]["name"]
        }) and waiting for confirmations...`
    )

    if (chainId === 3141) {
        txResponse = await fileBridge.depositToken(
            to,
            _chainId,
            _mockTokens[tokenSymbol!]["address"],
            amountBigInWei,
            {
                maxPriorityFeePerGas: (
                    await ethers.provider.getFeeData()
                ).maxPriorityFeePerGas!,
            }
        )
    } else {
        txResponse = await fileBridge.depositToken(
            to,
            _chainId,
            _mockTokens[tokenSymbol!]["address"],
            amountBigInWei
        )
    }
    console.log(`Sent with hash: ${txResponse.hash}`)
    txReceipt = await txResponse.wait()
    console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)
}

async function redeemToken(
    token: string,
    to: string,
    _chainId: number,
    amountInEther: number
) {
    const amountBigInWei = ethers.utils.parseEther(amountInEther.toString())

    const chain = chainMapping[chainId]
    let fileSwapTokens: any = fileSwapTokensJson
    const _mockTokens = fileSwapTokens[chain]

    let tokenSymbol: string

    if (token.length === 42) {
        for (let key in _mockTokens) {
            if (_mockTokens[key]["address"] === token) {
                tokenSymbol = _mockTokens[key]["symbol"]
                break
            }
        }
    } else {
        tokenSymbol = token
    }
    const signingKey = new ethers.utils.SigningKey(process.env.WALLET2!)

    const { deployer, guardian } = await getNamedAccounts()

    const fileBridge = (await ethers.getContract(
            "FileBridge",
            deployer
        )) as FileBridge,
        mockToken = (await ethers.getContractAt(
            "Token",
            _mockTokens[tokenSymbol!]["address"],
            client
        )) as Token

    const nonce = await fileBridge.nonces(guardian)
    const hash = await fileBridge.redeemTokenHashGenerator(
        to,
        _chainId,
        mockToken.address,
        amountBigInWei,
        nonce
    )

    const sig = signingKey.signDigest(hash)

    let txResponse: ContractTransaction
    if (chainId === 3141) {
        txResponse = await fileBridge.redeemToken(
            to,
            _chainId,
            mockToken.address,
            amountBigInWei,
            guardian,
            sig.r,
            sig._vs,
            {
                maxPriorityFeePerGas: (
                    await ethers.provider.getFeeData()
                ).maxPriorityFeePerGas!,
            }
        )
    } else {
        txResponse = await fileBridge.redeemToken(
            to,
            _chainId,
            mockToken.address,
            amountBigInWei,
            guardian,
            sig.r,
            sig._vs
        )
    }
    console.log(`Sent with hash: ${txResponse.hash}`)
    const txReceipt = await txResponse.wait()
    console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)
}

async function checkBalances(owner: string) {
    let _token: Token, balance: BigNumber
    const chain = chainMapping[chainId]
    let fileSwapTokens: any = fileSwapTokensJson
    const _mockTokens = fileSwapTokens[chain]

    for (let key in _mockTokens) {
        _token = await ethers.getContractAt(
            "Token",
            _mockTokens[key]["address"]
        )
        balance = await _token.balanceOf(owner)
        console.log(
            `The address has ${ethers.utils
                .formatEther(balance)
                .toString()} Ether balance of (${_mockTokens[key]["name"]})`
        )
    }

    for (let key in fileTokens) {
        _token = await ethers.getContractAt(
            "FToken",
            fileTokens[key]["address"]
        )
        balance = await _token.balanceOf(owner)
        console.log(
            `The address has ${ethers.utils
                .formatEther(balance)
                .toString()} Ether balance of (${fileTokens[key]["name"]})`
        )
    }
}

async function addLiquidityFileSwap() {
    const chain = chainMapping[chainId]
    let fileSwapTokens: any = fileSwapTokensJson
    const _mockTokens = fileSwapTokens[chain]

    const amountOfBTC = ethers.utils.parseEther("10"),
        amountOfETH = ethers.utils.parseEther("100"),
        amountOfDAIPERBTC = ethers.utils.parseEther("232000"),
        amountOfDAIPerETH = ethers.utils.parseEther("165200"),
        amountOfMatic = ethers.utils.parseEther("119000"),
        amountOfDAIPERMatic = ethers.utils.parseEther("100000")

    const mockWBTC: Token = await ethers.getContractAt(
            "Token",
            _mockTokens["WBTC"]["address"],
            deployer
        ),
        mockWETH: Token = await ethers.getContractAt(
            "Token",
            _mockTokens["WETH"]["address"],
            deployer
        ),
        mockDAI: Token = await ethers.getContractAt(
            "Token",
            _mockTokens["DAI"]["address"],
            deployer
        ),
        mockMatic: Token = await ethers.getContractAt(
            "Token",
            _mockTokens["WMATIC"]["address"],
            deployer
        )

    let txResponse: ContractTransaction
    let txReceipt: ContractReceipt

    if (chainId === 3141) {
        // console.log(`Approving WBTC and waiting for confirmations`)

        // txResponse = await mockWBTC.approve(
        //     fileswapV2Router02.address,
        //     amountOfBTC,
        //     {
        //         maxPriorityFeePerGas: (
        //             await ethers.provider.getFeeData()
        //         ).maxPriorityFeePerGas!,
        //     }
        // )
        // console.log(`Sent with hash: ${txResponse.hash}`)
        // txReceipt = await txResponse.wait()
        // console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        console.log(`Approving WMATIC and waiting for confirmations`)

        txResponse = await mockMatic.approve(
            fileswapV2Router02.address,
            amountOfMatic,
            {
                maxPriorityFeePerGas: (
                    await ethers.provider.getFeeData()
                ).maxPriorityFeePerGas!,
            }
        )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        console.log(`Approving DAI and waiting for confirmations`)

        txResponse = await mockDAI.approve(
            fileswapV2Router02.address,
            amountOfDAIPERMatic,
            {
                maxPriorityFeePerGas: (
                    await ethers.provider.getFeeData()
                ).maxPriorityFeePerGas!,
            }
        )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        console.log(
            `Adding DAI/Matic to liquidity pool and waiting for confirmations`
        )
        let deadline = (
            (await ethers.provider.getBlock("latest")).timestamp + 100
        ).toString()

        txResponse = await fileswapV2Router02
            .connect(deployer)
            .addLiquidity(
                mockMatic.address,
                mockDAI.address,
                amountOfMatic,
                amountOfDAIPERMatic,
                amountOfMatic,
                amountOfDAIPERMatic,
                deployer.address,
                deadline,
                {
                    maxPriorityFeePerGas: (
                        await ethers.provider.getFeeData()
                    ).maxPriorityFeePerGas!,
                }
            )

        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        // console.log(
        //     `Adding DAI/ETH to liquidity pool and waiting for confirmations`
        // )
        // deadline = (
        //     (await ethers.provider.getBlock("latest")).timestamp + 100
        // ).toString()

        // txResponse = await fileswapV2Router02
        //     .connect(deployer)
        //     .addLiquidity(
        //         mockWETH.address,
        //         mockDAI.address,
        //         amountOfETH,
        //         amountOfDAIPerETH,
        //         0,
        //         0,
        //         deployer.address,
        //         deadline,
        //         {
        //             maxPriorityFeePerGas: (
        //                 await ethers.provider.getFeeData()
        //             ).maxPriorityFeePerGas!,
        //         }
        //     )

        // console.log(`Sent with hash: ${txResponse.hash}`)
        // txReceipt = await txResponse.wait()
        // console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)
    } else {
        // console.log(`Approving WBTC and waiting for confirmations`)

        // txResponse = await mockWBTC.approve(
        //     fileswapV2Router02.address,
        //     amountOfBTC,
        //     {
        //         maxPriorityFeePerGas: (
        //             await ethers.provider.getFeeData()
        //         ).maxPriorityFeePerGas!,
        //     }
        // )
        // console.log(`Sent with hash: ${txResponse.hash}`)
        // txReceipt = await txResponse.wait()
        // console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        console.log(`Approving WMATIC and waiting for confirmations`)

        txResponse = await mockMatic.approve(
            fileswapV2Router02.address,
            amountOfMatic
        )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        console.log(`Approving DAI and waiting for confirmations`)

        txResponse = await mockDAI.approve(
            fileswapV2Router02.address,
            amountOfDAIPERMatic
        )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        console.log(
            `Adding DAI/Matic to liquidity pool and waiting for confirmations`
        )
        let deadline = (
            (await ethers.provider.getBlock("latest")).timestamp + 100
        ).toString()

        txResponse = await fileswapV2Router02
            .connect(deployer)
            .addLiquidity(
                mockMatic.address,
                mockDAI.address,
                amountOfMatic,
                amountOfDAIPERMatic,
                amountOfMatic,
                amountOfDAIPERMatic,
                deployer.address,
                deadline
            )

        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* -----------------------------------------------------------*/

        // console.log(
        //     `Adding DAI/ETH to liquidity pool and waiting for confirmations`
        // )
        // deadline = (
        //     (await ethers.provider.getBlock("latest")).timestamp + 100
        // ).toString()

        // txResponse = await fileswapV2Router02
        //     .connect(deployer)
        //     .addLiquidity(
        //         mockWETH.address,
        //         mockDAI.address,
        //         amountOfETH,
        //         amountOfDAIPerETH,
        //         0,
        //         0,
        //         deployer.address,
        //         deadline,
        //         {
        //             maxPriorityFeePerGas: (
        //                 await ethers.provider.getFeeData()
        //             ).maxPriorityFeePerGas!,
        //         }
        //     )

        // console.log(`Sent with hash: ${txResponse.hash}`)
        // txReceipt = await txResponse.wait()
        // console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)
    }
}

async function swap(tokenIn: string, tokenOut: string, amountInEther: number) {
    const amountInWei = ethers.utils.parseEther(amountInEther.toString())

    const tokenInContract: Token = await ethers.getContractAt(
        "Token",
        tokenIn,
        client
    )

    let txResponse: ContractTransaction, txReceipt: TransactionReceipt

    const pairAddress = await fileswapV2Factory.getPair(tokenIn, tokenOut),
        pair = (await ethers.getContractAt(
            "FileswapV2Pair",
            pairAddress
        )) as FileswapV2Pair
    const token0 = await pair.token0()
    let reserveIn: BigNumber, reserveOut: BigNumber
    if (token0 === tokenIn) {
        ;[reserveIn, reserveOut] = await pair.getReserves()
    } else {
        ;[reserveOut, reserveIn] = await pair.getReserves()
    }

    if (chainId === 3141) {
        console.log(`Approving ${tokenIn} and waiting for confirmations ..`)

        txResponse = await tokenInContract.approve(
            fileswapV2Router02.address,
            amountInWei,
            {
                maxPriorityFeePerGas: (
                    await ethers.provider.getFeeData()
                ).maxPriorityFeePerGas!,
            }
        )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* ---------------------------------------- */

        console.log(`Swapping and waiting for confirmations ..`)

        const amountOut = await fileswapV2Router02.getAmountOut(
            amountInWei,
            reserveIn,
            reserveOut
        )
        let deadline = (
            (await ethers.provider.getBlock("latest")).timestamp + 1000
        ).toString()

        txResponse = await fileswapV2Router02
            .connect(client)
            .swapExactTokensForTokens(
                amountOut,
                amountOut,
                [tokenIn, tokenOut],
                client.address,
                deadline,
                {
                    maxPriorityFeePerGas: (
                        await ethers.provider.getFeeData()
                    ).maxPriorityFeePerGas!,
                }
            )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)
    } else {
        console.log(`Approving ${tokenIn} and waiting for confirmations ..`)

        txResponse = await tokenInContract.approve(
            fileswapV2Router02.address,
            amountInWei
        )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)

        /* ---------------------------------------- */

        console.log(`Swapping and waiting for confirmations ..`)

        const amountOut = await fileswapV2Router02.getAmountOut(
            amountInWei,
            reserveIn,
            reserveOut
        )

        let deadline = (
            (await ethers.provider.getBlock("latest")).timestamp + 1000
        ).toString()

        txResponse = await fileswapV2Router02
            .connect(client)
            .swapExactTokensForTokens(
                amountInWei,
                0,
                [tokenIn, tokenOut],
                client.address,
                deadline
            )
        console.log(`Sent with hash: ${txResponse.hash}`)
        txReceipt = await txResponse.wait()
        console.log(`Confirmed with ${txReceipt.confirmations} confirmations!`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
