import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, network } from "hardhat"
import {
    Token,
    FToken,
    FileswapV2Factory,
    FileswapV2Router02,
    WFil,
    FileswapV2Pair,
} from "../../typechain-types"
import { expect } from "chai"

const chainId = network.config.chainId

const amountOfDai = ethers.utils.parseEther("1000000")
if (chainId != 31337) {
    describe.skip
} else {
    describe("Swap Unit Tests", function () {
        let mockToken: Token,
            fileToken: FToken,
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
            mockToken = await ethers.getContract("Token", deployer)
            fileToken = await ethers.getContract("FToken", deployer)
            fileswapV2Factory = await ethers.getContract(
                "FileswapV2Factory",
                deployer
            )
            fileswapV2Router02 = await ethers.getContract(
                "FileswapV2Router02",
                deployer
            )
            wFil = await ethers.getContract("WFil", deployer)

            await mockToken.mint(deployer.address, amountOfDai.mul(2))
            await mockToken.approve(fileToken.address, amountOfDai)
            await mockToken.approve(fileswapV2Router02.address, amountOfDai)
            await fileToken.deposit(amountOfDai)
            await fileToken.approve(fileswapV2Router02.address, amountOfDai)
        })

        it("Create pair function works correctly", async () => {
            expect(
                await fileswapV2Factory.createPair(
                    mockToken.address,
                    fileToken.address
                )
            ).to.emit("FileswapV2Factory", "PairCreated")
            const allPairsLength = await fileswapV2Factory.allPairsLength()

            expect(allPairsLength).to.eq(1)
        })

        it("Correctly add liquidity", async () => {
            const lastBlock = await ethers.provider.getBlock("latest")
            const deadline = lastBlock.timestamp + 0.5 * 3600

            await fileswapV2Router02.addLiquidity(
                fileToken.address,
                mockToken.address,
                amountOfDai,
                amountOfDai,
                amountOfDai,
                amountOfDai,
                deployer.address,
                deadline
            )
            const pairAddress = await fileswapV2Factory.getPair(
                    fileToken.address,
                    mockToken.address
                ),
                pair = (await ethers.getContractAt(
                    "FileswapV2Pair",
                    pairAddress
                )) as FileswapV2Pair,
                lpBalance = await pair.balanceOf(deployer.address)
            expect(lpBalance).to.eq(amountOfDai.sub(1000)) // MINIMUM_LIQUIDITY

            const daiBalance = await mockToken.balanceOf(pairAddress)
            const fDaiBalance = await fileToken.balanceOf(pairAddress)
            expect(daiBalance).to.eq(amountOfDai)
            expect(fDaiBalance).to.eq(amountOfDai)
        })

        it("Correctly swap exact token for token", async () => {
            const lastBlock = await ethers.provider.getBlock("latest")
            const deadline = lastBlock.timestamp + 0.5 * 3600
            await fileswapV2Router02.addLiquidity(
                fileToken.address,
                mockToken.address,
                amountOfDai,
                amountOfDai,
                amountOfDai,
                amountOfDai,
                deployer.address,
                deadline
            )

            // lets swap 1000 Dai for Fdai
            const amountDaiIn = ethers.utils.parseEther("1000")
            await mockToken.mint(deployer.address, amountDaiIn)
            await mockToken.approve(fileswapV2Router02.address, amountDaiIn)

            const pairAddress = await fileswapV2Factory.getPair(
                    fileToken.address,
                    mockToken.address
                ),
                pair = (await ethers.getContractAt(
                    "FileswapV2Pair",
                    pairAddress
                )) as FileswapV2Pair
            const [reserveIn, reserveOut] = await pair.getReserves()

            const expectedFdaiRecieved = await fileswapV2Router02.getAmountOut(
                amountDaiIn,
                reserveIn,
                reserveOut
            )

            await fileswapV2Router02.swapExactTokensForTokens(
                amountDaiIn,
                expectedFdaiRecieved,
                [mockToken.address, fileToken.address],
                deployer.address,
                deadline
            )

            const daiBalance = await mockToken.balanceOf(deployer.address)
            const fDaiBalance = await fileToken.balanceOf(deployer.address)
            expect(daiBalance).to.eq(0)
            expect(fDaiBalance).to.eq(expectedFdaiRecieved)
        })
    })
}
