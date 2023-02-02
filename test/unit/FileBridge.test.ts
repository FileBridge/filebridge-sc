import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, network } from "hardhat"
import {
    Token,
    FileBridge,
    FToken,
    FileswapV2Factory,
    FileswapV2Router02,
    WFil,
} from "../../typechain-types"
import { expect } from "chai"
import { sign } from "crypto"

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
            mockToken: Token,
            fileToken: FToken,
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
            await fileToken.deposit(amountOfDai)
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
                        mockToken.address,
                        fileToken.address
                    )
                ).to.emit("FileBridge", "TokenAddedToList")

                const expectedWToken = await fileBridge.tokenToWTokenMap(
                    mockToken.address
                )

                expect(expectedWToken).to.eq(fileToken.address)
            })

            it("Gives error when token already exists", async () => {
                await fileBridge.addWToken(mockToken.address, fileToken.address)
                await expect(
                    fileBridge.addWToken(mockToken.address, deployer.address)
                ).to.revertedWithCustomError(fileBridge, "TOKEN_EXIST")
            })

            it("Correctly remove token from acception token mapping", async () => {
                await fileBridge.addWToken(mockToken.address, fileToken.address)
                expect(
                    await fileBridge.removeWToken(mockToken.address)
                ).to.emit("FileBridge", "TokenRemovedFromList")

                const expectedWToken = await fileBridge.tokenToWTokenMap(
                    mockToken.address
                )

                expect(expectedWToken).to.eq(ethers.constants.AddressZero)
            })

            it("Gives error when token doesn't exists", async () => {
                await expect(
                    fileBridge.removeWToken(mockToken.address)
                ).to.revertedWithCustomError(fileBridge, "TOKEN_DOESNT_EXIST")
            })

            it("Correctly change token in acception token mapping", async () => {
                await fileBridge.addWToken(mockToken.address, fileToken.address)
                expect(
                    await fileBridge.changeWToken(
                        mockToken.address,
                        deployer.address
                    )
                ).to.emit("FileBridge", "TokenRemovedFromList")

                const expectedWToken = await fileBridge.tokenToWTokenMap(
                    mockToken.address
                )

                expect(expectedWToken).to.eq(deployer.address)
            })

            it("Gives error when token doesn't exists", async () => {
                await expect(
                    fileBridge.changeWToken(
                        mockToken.address,
                        fileToken.address
                    )
                ).to.revertedWithCustomError(fileBridge, "TOKEN_DOESNT_EXIST")
            })
        })

        describe("depositToken functions control", function () {
            beforeEach(async () => {
                await mockToken.approve(fileBridge.address, amountOfDai)
                await fileBridge.addWToken(mockToken.address, fileToken.address)
            })
            it("emits event correctly", async () => {
                expect(
                    await fileBridge.depositToken(
                        deployer.address,
                        1,
                        mockToken.address,
                        amountOfDai
                    )
                ).to.emit("FileBridge", "TokenDeposit")
            })

            it("Transfer Token correctly", async () => {
                await fileBridge.depositToken(
                    deployer.address,
                    1,
                    mockToken.address,
                    amountOfDai
                )

                const expectedContractBalance = await fileToken.balanceOf(
                    fileBridge.address
                )

                expect(expectedContractBalance).to.eq(0)

                const expectedFTokenBalance = await mockToken.balanceOf(
                    fileToken.address
                )
                expect(expectedFTokenBalance).to.eq(amountOfDai.mul(2))
            })
        })

        describe("redeemToken functions control", function () {
            const signingKey = new ethers.utils.SigningKey(
                "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
            )

            beforeEach(async () => {
                await mockToken.approve(fileBridge.address, amountOfDai)
                await fileBridge.addWToken(mockToken.address, fileToken.address)

                await fileBridge.depositToken(
                    deployer.address,
                    1,
                    mockToken.address,
                    amountOfDai
                )
            })

            it("Correctly readeem token", async () => {
                const nonce = await fileBridge.nonces(deployer.address)
                const hash = await fileBridge.redeemTokenHashGenerator(
                    deployer.address,
                    31337,
                    mockToken.address,
                    amountOfDai,
                    nonce
                )

                const sig = signingKey.signDigest(hash)

                await fileBridge.redeemToken(
                    deployer.address,
                    31337,
                    mockToken.address,
                    amountOfDai,
                    guardian.address,
                    sig.r,
                    sig._vs
                )
            })
        })
    })
}
