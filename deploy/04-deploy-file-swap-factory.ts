import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"
import { FileswapV2Factory } from "../typechain-types"

const deployFileswapFactory: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts } = hre,
        { deploy, log } = deployments

    const { deployer } = await getNamedAccounts()
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    let args: any = [deployer]
    log("Deploying FileswapFactory and waiting for confirmations...")
    let gasData = await ethers.provider.getFeeData()
    const fileswapV2Factory = await deploy("FileswapV2Factory", {
        from: deployer,
        log: true,
        maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
    })

    const fileswapV2FactoryContract = (await ethers.getContract(
        "FileswapV2Factory",
        deployer
    )) as FileswapV2Factory
    await fileswapV2FactoryContract.setFeeTo(deployer)

    log(`FileswapFactory deployed at ${fileswapV2Factory.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && chainId != 3141 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(fileswapV2Factory.address, args)
    }
}

export default deployFileswapFactory

deployFileswapFactory.tags = ["all", "fileswapV2Factory"]
