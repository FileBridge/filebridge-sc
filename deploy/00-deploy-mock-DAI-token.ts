import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DAIToken } from "../typechain-types"
import verify from "../utils/verify"

const deployMockDaiToken: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts, ethers } = hre,
        { deploy, log } = deployments,
        chainId = network.config.chainId
    if (chainId === 31337) {
        const { deployer } = await getNamedAccounts()
        log(`The deployer address is: ${deployer}`)

        let args: any = []
        log("Deploying mock DAI token and waiting for confirmations...")
        const mockDaiToken = await deploy("DAIToken", {
            from: deployer,
            log: true,
            args: args,
            waitConfirmations: chainId === 31337 ? 1 : 7,
        })

        log(`DAI token deployed at ${mockDaiToken.address}`)
        log("__________________________________________________")

        log(`Minting 1000000 Dai for ${deployer}`)
        const mockDaiTokenContract = (await ethers.getContract(
            "DAIToken",
            deployer
        )) as DAIToken
        const txResponse = await mockDaiTokenContract.mint(
            deployer,
            ethers.utils.parseEther("1000000")
        )
        await txResponse.wait()
        log(`1000000 Dai minted for ${deployer}`)
        log("__________________________________________________")

        if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
            // verify the code
            await verify(mockDaiToken.address, args)
        }
    }
}

export default deployMockDaiToken

deployMockDaiToken.tags = ["all", "mockDaiToken"]
