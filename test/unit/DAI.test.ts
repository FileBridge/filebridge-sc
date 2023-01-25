import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, network } from "hardhat"
import { DAIToken, FileCoinBridgeDAI } from "../../typechain-types"
import { expect } from "chai"

const chainId = network.config.chainId

if (chainId != 31337) {
    describe.skip
} else {
    describe.only("DAI Token Unit Tests", function () {
        let mockDaiToken: DAIToken,
            fileCoinBridgeDAI: FileCoinBridgeDAI,
            deployer: SignerWithAddress

        beforeEach(async function () {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            await deployments.fixture(["all"])
            mockDaiToken = await ethers.getContract("DAIToken", deployer)
            fileCoinBridgeDAI = await ethers.getContract(
                "FileCoinBridgeDAI",
                deployer
            )
        })

        it(`Corrctly mint 1000000 token to deployer`, async () => {
            const deployerBalance = await mockDaiToken.balanceOf(
                deployer.address
            )
            expect(deployerBalance).to.eq(ethers.utils.parseEther("1000000"))
        })

        it("Correctly mint FDAI when depositing DAI", async () => {
            const amountBig = ethers.utils.parseEther("1000")
            await mockDaiToken.approve(fileCoinBridgeDAI.address, amountBig)
            await fileCoinBridgeDAI.deposit(amountBig)
            const balanceDAI = await mockDaiToken.balanceOf(deployer.address)
            const balanceFDAI = await fileCoinBridgeDAI.balanceOf(
                deployer.address
            )
            expect(balanceDAI).to.eq(ethers.utils.parseEther("999000"))
            expect(balanceFDAI).to.eq(amountBig)
        })

        it("Correctly burn FDAI when withdrawing DAI", async () => {
            const amountBig = ethers.utils.parseEther("1000")
            await mockDaiToken.approve(fileCoinBridgeDAI.address, amountBig)
            await fileCoinBridgeDAI.deposit(amountBig)
            await fileCoinBridgeDAI.approve(
                fileCoinBridgeDAI.address,
                amountBig
            )
            await fileCoinBridgeDAI.withdraw(amountBig)

            const balanceDAI = await mockDaiToken.balanceOf(deployer.address)
            const balanceFDAI = await fileCoinBridgeDAI.balanceOf(
                deployer.address
            )
            expect(balanceDAI).to.eq(ethers.utils.parseEther("1000000"))
            expect(balanceFDAI).to.eq(0)
        })
    })
}
