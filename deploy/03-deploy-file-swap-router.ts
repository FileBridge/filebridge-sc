import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

const deployFileswapRouter: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts } = hre,
        { deploy, log } = deployments

    const { deployer } = await getNamedAccounts()
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    const fileswapV2Factory = await ethers.getContract("FileswapV2Factory")
    const wFil = await ethers.getContract("WFil")

    let args: any = [fileswapV2Factory.address, wFil.address]
    log("Deploying FileswapV2Router02 and waiting for confirmations...")
    let gasData = await ethers.provider.getFeeData()
    const fileswapV2Router02 = await deploy("FileswapV2Router02", {
        from: deployer,
        log: true,
        maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
    })

    log(`FileswapV2Router02 deployed at ${fileswapV2Router02.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && chainId != 3141 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(fileswapV2Router02.address, args)
    }
}

export default deployFileswapRouter

deployFileswapRouter.tags = ["all", "fileswapV2Router02"]
