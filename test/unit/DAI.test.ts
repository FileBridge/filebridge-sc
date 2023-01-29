import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { deployments, ethers, network } from "hardhat"
import { Token, FToken } from "../../typechain-types"
import { expect } from "chai"

const chainId = network.config.chainId

if (chainId != 31337) {
    describe.skip
} else {
    describe("DAI Token Unit Tests", function () {
        let mockToken: Token, fileToken: FToken, deployer: SignerWithAddress

        beforeEach(async function () {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            await deployments.fixture(["all"])
            mockToken = await ethers.getContract("Token", deployer)
            fileToken = await ethers.getContract("FToken", deployer)
        })

        it(`Corrctly mint 1000000 token to deployer`, async () => {
            const txResponse = await mockToken.mint(
                deployer.address,
                ethers.utils.parseEther("1000000")
            )
            const deployerBalance = await mockToken.balanceOf(deployer.address)
            expect(deployerBalance).to.eq(ethers.utils.parseEther("1000000"))
        })

        it("Correctly mint FDAI when depositing DAI", async () => {
            const amountBig = ethers.utils.parseEther("1000")
            await mockToken.mint(
                deployer.address,
                ethers.utils.parseEther("1000000")
            )
            await mockToken.approve(fileToken.address, amountBig)
            await fileToken.deposit(amountBig)
            const balanceDAI = await mockToken.balanceOf(deployer.address)
            const balanceFDAI = await fileToken.balanceOf(deployer.address)
            expect(balanceDAI).to.eq(ethers.utils.parseEther("999000"))
            expect(balanceFDAI).to.eq(amountBig)
        })

        it("Correctly burn FDAI when withdrawing DAI", async () => {
            const amountBig = ethers.utils.parseEther("1000")
            await mockToken.mint(
                deployer.address,
                ethers.utils.parseEther("1000000")
            )
            await mockToken.approve(fileToken.address, amountBig)
            await fileToken.deposit(amountBig)
            await fileToken.approve(fileToken.address, amountBig)
            await fileToken.withdraw(amountBig)

            const balanceDAI = await mockToken.balanceOf(deployer.address)
            const balanceFDAI = await fileToken.balanceOf(deployer.address)
            expect(balanceDAI).to.eq(ethers.utils.parseEther("1000000"))
            expect(balanceFDAI).to.eq(0)
        })
    })
}
