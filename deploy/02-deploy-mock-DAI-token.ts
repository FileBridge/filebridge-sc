import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import verify from "../utils/verify"

const deployToken: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { deployments, network, getNamedAccounts, ethers } = hre,
        { deploy, log } = deployments,
        chainId = network.config.chainId
    if (
        chainId === 31337 ||
        chainId === 5 ||
        chainId === 80001 ||
        chainId === 3141
    ) {
        const { deployer } = await getNamedAccounts()
        log(`The deployer address is: ${deployer}`)

        const name = "DAI TOKEN",
            symbol = "DAI"

        let args: any = [name, symbol]
        log(`Deploying ${name} and waiting for confirmations...`)

        // Geting gas price data
        let gasData = await ethers.provider.getFeeData()
        const mockToken = await deploy("Token", {
            from: deployer,
            log: true,
            maxPriorityFeePerGas: gasData.maxPriorityFeePerGas!,
            args: args,
            waitConfirmations: chainId === 31337 || chainId === 3141 ? 1 : 5,
        })

        log(`${name} deployed at ${mockToken.address}`)
        log("__________________________________________________")

        if (
            chainId != 31337 &&
            chainId != 3141 &&
            process.env.ETHERSCAN_API_KEY
        ) {
            // verify the code
            await verify(mockToken.address, args)
        }
    }
}

export default deployToken

deployToken.tags = ["all", "mockToken"]
