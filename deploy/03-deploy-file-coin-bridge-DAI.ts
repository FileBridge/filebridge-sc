import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

const deployFileCoinBridgeDai: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts } = hre,
        { deploy, log } = deployments

    const { deployer, guardian } = await getNamedAccounts()
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    const mockDaiToken = await ethers.getContract("DAIToken")
    const fileBridge = await ethers.getContract("FileBridge")
    let args: any = [mockDaiToken.address, fileBridge.address] // the second address to be fixed fileBridge address
    log("Deploying FDAI and waiting for confirmations...")
    let gasData = await ethers.provider.getFeeData()
    const fileCoinBridgeDAI = await deploy("FileCoinBridgeDAI", {
        from: deployer,
        log: true,
        maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
    })

    log(`FDAI deployed at ${fileCoinBridgeDAI.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && chainId != 3141 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(fileCoinBridgeDAI.address, args)
    }
}

export default deployFileCoinBridgeDai

deployFileCoinBridgeDai.tags = ["all", "fileCoinBridgeDAI"]
