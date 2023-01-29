import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

const deployFileToken: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts } = hre,
        { deploy, log } = deployments

    const { deployer, guardian } = await getNamedAccounts()
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    const mockToken = await ethers.getContract("Token"),
        fileBridge = await ethers.getContract("FileBridge"),
        name = "FILE DAI TOKEN",
        symbol = "FDAI"
    let args: any = [mockToken.address, fileBridge.address, name, symbol] // the second address to be fixed fileBridge address
    log(`Deploying ${name} and waiting for confirmations...`)
    let gasData = await ethers.provider.getFeeData()
    const fileToken = await deploy("FToken", {
        from: deployer,
        log: true,
        maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
    })

    log(`${name} deployed at ${fileToken.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && chainId != 3141 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(fileToken.address, args)
    }
}

export default deployFileToken

deployFileToken.tags = ["all", "fileToken"]
