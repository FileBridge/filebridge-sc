import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import * as readline from "readline"
import {
    FileBridge,
    FileswapV2Factory,
    FileswapV2Router02,
    FToken,
    Token,
    WFil,
} from "../typechain-types"

let fileBridge: FileBridge,
    deployer: SignerWithAddress,
    guardian: SignerWithAddress,
    GOVERNANCE_ROLE: string,
    DEFAULT_ADMIN_ROLE: string,
    mockTokens: any = {},
    fileTokens: any = {},
    fileswapV2Factory: FileswapV2Factory,
    fileswapV2Router02: FileswapV2Router02,
    wFil: WFil,
    { deploy } = deployments,
    chainId = network.config.chainId

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
    await deployments.fixture(["all"])
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
    deployer = accounts[0]
    guardian = accounts[1]
}

async function mainMenu(rl: readline.Interface) {
    menuOptions(rl)
}

function menuOptions(rl: readline.Interface) {
    console.log("__________________________________________________")
    rl.question(
        "Select operation: \n Options: \n [0]: Exit \n [1]: Clear console \n [2]: Check mock Tokens \n [3]: Check file wrapped FTokens \n [4]: deploy mock Token \n [5]: deploy file wrapped Token \n [6]: mint Token \n [7]: deposit token and mint wrapped FToken \n",
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

                default:
                    throw new Error("Invalid option")
            }
        }
    )
}

async function checkMockToken() {
    let counter = 1
    for (let key in mockTokens) {
        console.log(`Token number ${counter} \n`)
        console.log(`Symbol\t${mockTokens[key]["symbol"]}`)
        console.log(`Name\t${mockTokens[key]["name"]}`)
        console.log(`Address\t${mockTokens[key]["address"]}\n`)
        counter += 1
    }
}
async function checkfileToken() {
    let counter = 1
    for (let key in fileTokens) {
        console.log(`Token number ${counter} \n`)
        console.log(`Symbol\t${fileTokens[key]["symbol"]}`)
        console.log(`Name\t${fileTokens[key]["name"]}`)
        console.log(`Address\t${fileTokens[key]["address"]}\n`)
        counter += 1
    }
}

async function deployMockToken(name: string, symbol: string) {
    const args = [name, symbol]

    console.log(`Deploying ${name} and waiting for confirmations...`)

    const _mockToken = await deploy("Token", {
        from: deployer.address,
        log: true,
        maxPriorityFeePerGas: (
            await ethers.provider.getFeeData()
        ).maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: 1,
    })

    mockTokens[symbol] = {
        name: name,
        symbol: symbol,
        address: _mockToken.address,
    }

    console.log(`${name} deployed at ${_mockToken.address}`)
    console.log("__________________________________________________")
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
    const amountBigInWei = ethers.utils.parseEther(amountInEther.toString())

    to = to.length === 0 ? deployer.address : to

    let tokenSymbol: string

    if (token.length === 42) {
        for (let key in fileTokens) {
            if (fileTokens[key]["address"] === token) {
                tokenSymbol = fileTokens[key]["symbol"]
                break
            }
        }
    } else {
        tokenSymbol = token
    }

    console.log(
        `Minting ${amountInEther} (${mockTokens[tokenSymbol!]["name"]}) to ${
            mockTokens[tokenSymbol!]["address"]
        } and waiting for confirmations...`
    )

    const mockToken = (await ethers.getContractAt(
        "Token",
        mockTokens[tokenSymbol!]["address"],
        deployer
    )) as Token

    let txResponse = await mockToken.mint(to, amountBigInWei, {
        maxPriorityFeePerGas: (
            await ethers.provider.getFeeData()
        ).maxPriorityFeePerGas!,
    })
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
        for (let key in fileTokens) {
            if (fileTokens[key]["address"] === token) {
                tokenSymbol = fileTokens[key]["symbol"]
                break
            }
        }
    } else {
        tokenSymbol = token
    }

    const FToken: FToken = await ethers.getContractAt(
        "FToken",
        fileTokens[tokenSymbol!]["address"],
        deployer
    )

    const mockToken = (await ethers.getContractAt(
        "Token",
        mockTokens[tokenSymbol!.slice(1)]["address"],
        deployer
    )) as Token

    console.log(
        `Approving ${amountInEther} (${
            mockTokens[tokenSymbol!.slice(1)]["name"]
        }) and waiting for confirmations...`
    )

    let txResponse = await mockToken.approve(FToken.address, amountBigInWei, {
        maxPriorityFeePerGas: (
            await ethers.provider.getFeeData()
        ).maxPriorityFeePerGas!,
    })
    console.log(`tx submitted: ${txResponse.hash}`)
    let txReveipt = await txResponse.wait()
    console.log(
        `Confirmed! Number of confirmations: ${txReveipt.confirmations}\n`
    )

    console.log(
        `Depositing ${amountInEther} (${
            fileTokens[tokenSymbol!]["name"]
        }) and waiting for confirmations...`
    )
    txResponse = await FToken.deposit(amountBigInWei, {
        maxPriorityFeePerGas: (
            await ethers.provider.getFeeData()
        ).maxPriorityFeePerGas!,
    })
    console.log(`tx submitted: ${txResponse.hash}`)
    txReveipt = await txResponse.wait()
    console.log(
        `Confirmed! Number of confirmations: ${txReveipt.confirmations}\n`
    )
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
