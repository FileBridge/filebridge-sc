import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

const deployFileswapLibrary: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts } = hre,
        { deploy, log } = deployments

    const { deployer } = await getNamedAccounts()
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    let args: any = []
    log("Deploying FileswapV2Library and waiting for confirmations...")
    let gasData = await ethers.provider.getFeeData()
    const fileswapV2Library = await deploy("FileswapV2Library", {
        from: deployer,
        log: true,
        maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
    })

    log(`FileswapV2Library deployed at ${fileswapV2Library.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && chainId != 3141 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(fileswapV2Library.address, args)
    }
}

export default deployFileswapLibrary

deployFileswapLibrary.tags = ["all", "FileswapV2Library"]
