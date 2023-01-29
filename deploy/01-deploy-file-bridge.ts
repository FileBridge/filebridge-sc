import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"
import { FileBridge } from "../typechain-types"

const deployFileBridge: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts } = hre,
        { deploy, log } = deployments

    const { deployer, guardian } = await getNamedAccounts()
    log(`The deployer address is: ${deployer}`)

    const chainId = network.config.chainId

    let args: any = [] // the second address to be fixed fileBridge address
    log("Deploying FileBridge and waiting for confirmations...")
    let gasData = await ethers.provider.getFeeData()
    const fileBridge = await deploy("FileBridge", {
        from: deployer,
        log: true,
        maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
        args: args,
        waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
    })

    const fileBridgeContract = (await ethers.getContract(
        "FileBridge",
        deployer
    )) as FileBridge

    await fileBridgeContract.initialize(deployer, [deployer], 1)

    log(`FileBridge deployed at ${fileBridge.address}`)
    log("__________________________________________________")

    if (chainId != 31337 && chainId != 3141 && process.env.ETHERSCAN_API_KEY) {
        // verify the code
        await verify(fileBridge.address, args)
    }
}

export default deployFileBridge

deployFileBridge.tags = ["all", "fileBridge"]
