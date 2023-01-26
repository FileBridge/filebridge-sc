import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, network } from "hardhat"
import {
    DAIToken,
    FileCoinBridgeDAI,
    FileswapV2Factory,
    FileswapV2Router02,
    WFil,
} from "../../typechain-types"
import { expect } from "chai"

const chainId = network.config.chainId

const amountOfDai = ethers.utils.parseEther("1000000")
if (chainId != 31337) {
    describe.skip
} else {
    describe("DAI Token Unit Tests", function () {
        let mockDaiToken: DAIToken,
            fileCoinBridgeDAI: FileCoinBridgeDAI,
            fileswapV2Factory: FileswapV2Factory,
            fileswapV2Router02: FileswapV2Router02,
            wFil: WFil,
            deployer: SignerWithAddress,
            guardian: SignerWithAddress

        beforeEach(async function () {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            guardian = accounts[1]
            await deployments.fixture(["all"])
            mockDaiToken = await ethers.getContract("DAIToken", deployer)
            fileCoinBridgeDAI = await ethers.getContract(
                "FileCoinBridgeDAI",
                deployer
            )
            fileswapV2Factory = await ethers.getContract(
                "FileswapV2Factory",
                deployer
            )
            fileswapV2Router02 = await ethers.getContract(
                "FileswapV2Router02",
                deployer
            )
            wFil = await ethers.getContract("WFil", deployer)

            await mockDaiToken.mint(deployer.address, amountOfDai.mul(2))
            await mockDaiToken.approve(fileCoinBridgeDAI.address, amountOfDai)
            await mockDaiToken.approve(fileswapV2Router02.address, amountOfDai)
            await fileCoinBridgeDAI.deposit(amountOfDai)
            await fileCoinBridgeDAI.approve(
                fileswapV2Router02.address,
                amountOfDai
            )
        })

        it("Create pair function works correctly", async () => {
            expect(
                await fileswapV2Factory.createPair(
                    mockDaiToken.address,
                    fileCoinBridgeDAI.address
                )
            ).to.emit("FileswapV2Factory", "PairCreated")
            const allPairsLength = await fileswapV2Factory.allPairsLength()

            expect(allPairsLength).to.eq(1)
        })

        it.only("Correctly add liquidity", async () => {
            const lastBlock = await ethers.provider.getBlock("latest")
            const deadline = lastBlock.timestamp + 0.5 * 3600

            await fileswapV2Router02.addLiquidity(
                fileCoinBridgeDAI.address,
                mockDaiToken.address,
                amountOfDai,
                amountOfDai,
                amountOfDai,
                amountOfDai,
                deployer.address,
                deadline
            )
        })
    })
}
