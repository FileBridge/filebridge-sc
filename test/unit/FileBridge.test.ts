import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, network } from "hardhat"
import {
    DAIToken,
    FileBridge,
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
    describe("File Bridge Unit Tests", function () {
        let fileBridge: FileBridge,
            deployer: SignerWithAddress,
            guardian: SignerWithAddress,
            GOVERNANCE_ROLE: string,
            DEFAULT_ADMIN_ROLE: string,
            mockDaiToken: DAIToken,
            fileCoinBridgeDAI: FileCoinBridgeDAI,
            fileswapV2Factory: FileswapV2Factory,
            fileswapV2Router02: FileswapV2Router02,
            wFil: WFil

        beforeEach(async function () {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            guardian = accounts[1]
            await deployments.fixture(["all"])
            fileBridge = await ethers.getContract("FileBridge", deployer)
            GOVERNANCE_ROLE = await fileBridge.GOVERNANCE_ROLE()
            DEFAULT_ADMIN_ROLE = await fileBridge.DEFAULT_ADMIN_ROLE()
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
            await fileCoinBridgeDAI.deposit(amountOfDai)
        })

        it("Initialize correctly", async () => {
            const expectedGovernor = await fileBridge.hasRole(
                    GOVERNANCE_ROLE,
                    deployer.address
                ),
                expectedAdmin = await fileBridge.hasRole(
                    DEFAULT_ADMIN_ROLE,
                    deployer.address
                )

            expect(expectedGovernor).to.eq(true)
            expect(expectedAdmin).to.eq(true)
        })

        describe("wrapped token functions", function () {
            it("Correctly add token to acception token mapping", async () => {
                expect(
                    await fileBridge.addWToken(
                        mockDaiToken.address,
                        fileCoinBridgeDAI.address
                    )
                ).to.emit("FileBridge", "TokenAddedToList")

                const expectedWToken = await fileBridge.tokenToWTokenMap(
                    mockDaiToken.address
                )

                expect(expectedWToken).to.eq(fileCoinBridgeDAI.address)
            })

            it("Gives error when token already exists", async () => {
                await fileBridge.addWToken(
                    mockDaiToken.address,
                    fileCoinBridgeDAI.address
                )
                await expect(
                    fileBridge.addWToken(mockDaiToken.address, deployer.address)
                ).to.revertedWithCustomError(fileBridge, "TOKEN_EXIST")
            })

            it("Correctly remove token from acception token mapping", async () => {
                await fileBridge.addWToken(
                    mockDaiToken.address,
                    fileCoinBridgeDAI.address
                )
                expect(
                    await fileBridge.removeWToken(mockDaiToken.address)
                ).to.emit("FileBridge", "TokenRemovedFromList")

                const expectedWToken = await fileBridge.tokenToWTokenMap(
                    mockDaiToken.address
                )

                expect(expectedWToken).to.eq(ethers.constants.AddressZero)
            })

            it("Gives error when token doesn't exists", async () => {
                await expect(
                    fileBridge.removeWToken(mockDaiToken.address)
                ).to.revertedWithCustomError(fileBridge, "TOKEN_DOESNT_EXIST")
            })

            it("Correctly change token in acception token mapping", async () => {
                await fileBridge.addWToken(
                    mockDaiToken.address,
                    fileCoinBridgeDAI.address
                )
                expect(
                    await fileBridge.changeWToken(
                        mockDaiToken.address,
                        deployer.address
                    )
                ).to.emit("FileBridge", "TokenRemovedFromList")

                const expectedWToken = await fileBridge.tokenToWTokenMap(
                    mockDaiToken.address
                )

                expect(expectedWToken).to.eq(deployer.address)
            })

            it("Gives error when token doesn't exists", async () => {
                await expect(
                    fileBridge.changeWToken(
                        mockDaiToken.address,
                        fileCoinBridgeDAI.address
                    )
                ).to.revertedWithCustomError(fileBridge, "TOKEN_DOESNT_EXIST")
            })
        })

        describe("depositToken functions control", function () {
            beforeEach(async () => {
                await mockDaiToken.approve(fileBridge.address, amountOfDai)
                await fileBridge.addWToken(
                    mockDaiToken.address,
                    fileCoinBridgeDAI.address
                )
            })
            it("emits event correctly", async () => {
                expect(
                    await fileBridge.depositToken(
                        deployer.address,
                        1,
                        mockDaiToken.address,
                        amountOfDai
                    )
                ).to.emit("FileBridge", "TokenDeposit")
            })

            it("Transfer Token correctly", async () => {
                await fileBridge.depositToken(
                    deployer.address,
                    1,
                    mockDaiToken.address,
                    amountOfDai
                )

                const expectedContractBalance =
                    await fileCoinBridgeDAI.balanceOf(fileBridge.address)

                expect(expectedContractBalance).to.eq(amountOfDai)
            })
        })
    })
}
