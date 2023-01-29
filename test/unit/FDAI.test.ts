import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { network, ethers, deployments } from "hardhat"
import { expect } from "chai"
import { FToken, Token } from "../../typechain-types"
import {
    buildDomainSeparator,
    buildStructHashPermit,
    toTypedDataHash,
} from "../../helper_functions/EIP712-helper"

const abiCoder = new ethers.utils.AbiCoder()

// const chainId = network.config.chainId
const chainId = network.config.chainId

if (chainId != 31337) {
    describe.skip
} else {
    describe("FDAI Token Unit Tests", function () {
        let fileToken: FToken,
            mockToken: Token,
            deployer: SignerWithAddress,
            acc1: SignerWithAddress,
            acc2: SignerWithAddress,
            _TYPE_HASH: string,
            _HASHED_NAME: string,
            _HASHED_VERSION: string,
            domainSeperator: string,
            _PERMIT_TYPE_HASH: string
        beforeEach(async function () {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            acc1 = accounts[1]
            acc2 = accounts[2]
            await deployments.fixture(["all"])
            fileToken = await ethers.getContract("FToken", deployer)

            mockToken = await ethers.getContract("Token", deployer)
            await mockToken.mint(
                deployer.address,
                ethers.utils.parseEther("1000000")
            )
            await mockToken.approve(
                fileToken.address,
                ethers.utils.parseEther("1000000")
            )

            // EIP712 part
            const contractName: string = await fileToken.name(),
                version: string = "1"
            _TYPE_HASH = ethers.utils.keccak256(
                ethers.utils.hexlify(
                    ethers.utils.toUtf8Bytes(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    )
                )
            )
            _PERMIT_TYPE_HASH = ethers.utils.keccak256(
                ethers.utils.hexlify(
                    ethers.utils.toUtf8Bytes(
                        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                    )
                )
            )
            _HASHED_NAME = ethers.utils.keccak256(
                ethers.utils.hexlify(ethers.utils.toUtf8Bytes(contractName))
            )
            _HASHED_VERSION = ethers.utils.keccak256(
                ethers.utils.hexlify(ethers.utils.toUtf8Bytes(version))
            )
            domainSeperator = buildDomainSeparator(
                _TYPE_HASH,
                _HASHED_NAME,
                _HASHED_VERSION,
                fileToken.address
            )
        })

        describe("Constructor", async () => {
            describe("ERC20", function () {
                it("Sets the name correctly", async () => {
                    const name = await fileToken.name()
                    const expectedName = "FILE DAI TOKEN"
                    expect(name).to.eq(expectedName)
                })

                it("Sets the symbol correctly", async () => {
                    const symbol = await fileToken.symbol()
                    const expectedSymbol = "FDAI"
                    expect(symbol).to.eq(expectedSymbol)
                })

                it("Checks if the token has 18 decimals", async () => {
                    const decimals = await fileToken.decimals()
                    expect(decimals).to.eq(18)
                })

                it("Checks if the totalSupply is equal to zero", async () => {
                    const totalSupply = (
                        await fileToken.totalSupply()
                    ).toString()
                    expect(totalSupply).to.eq("0")
                })
            })

            describe("ERC20 Permit", function () {
                it("Sets domain seperator correctly", async () => {
                    const domainSeperatorFromContract =
                        await fileToken.DOMAIN_SEPARATOR()
                    expect(domainSeperatorFromContract).to.eq(domainSeperator)
                })
            })
        })

        // describe("mint function", function () {
        //     it("It mints token to acc1 account", async () => {
        //         await fileToken.mint(acc1.address, 1000)
        //         const acc1Balance = await fileToken.balanceOf(
        //             acc1.address
        //         )
        //         expect(acc1Balance.toString()).to.eq("1000")
        //     })

        //     it("Changes total supply currectly", async () => {
        //         await fileToken.mint(acc1.address, 1000)
        //         const totalSupply = (
        //             await fileToken.totalSupply()
        //         ).toString()
        //         expect(totalSupply).to.eq("1000")
        //     })

        //     it("Emit Transfer event from address 0 to account 1 1000 token", async () => {
        //         await expect(fileToken.mint(acc1.address, 1000))
        //             .to.emit(fileToken, "Transfer")
        //             .withArgs(ethers.constants.AddressZero, acc1.address, 1000)
        //     })
        // })

        describe("ERC20", function () {
            describe("transfer function", function () {
                beforeEach(async () => {
                    await fileToken.deposit(1000)
                })

                it("transfer money from deployer to account 1", async () => {
                    await fileToken.transfer(acc1.address, 1000)
                    const acc1Balance = await fileToken.balanceOf(acc1.address)
                    expect(acc1Balance.toString()).to.eq("1000")
                })

                it("It revert if caller doesn't have enough balance", async () => {
                    await expect(
                        fileToken.connect(acc1).transfer(deployer.address, 1000)
                    ).to.be.revertedWith(
                        "ERC20: transfer amount exceeds balance"
                    )
                })

                it("It revert if transfer money to address zero", async () => {
                    await expect(
                        fileToken.transfer(ethers.constants.AddressZero, 1000)
                    ).to.be.revertedWith("ERC20: transfer to the zero address")
                })
            })

            describe("approve function", function () {
                beforeEach(async () => {
                    await fileToken.deposit(1000)
                })

                it("approve account 1 to spend on behalf of deployer", async () => {
                    await fileToken.approve(acc1.address, 1000)
                    const account1Allowance = await fileToken.allowance(
                        deployer.address,
                        acc1.address
                    )
                    expect(account1Allowance.toString(), "1000")
                })

                it("It revert if approve address zero to spend on behalf of deployer", async () => {
                    await expect(
                        fileToken.approve(ethers.constants.AddressZero, 1000)
                    ).to.be.revertedWith("ERC20: approve to the zero address")
                })

                it("emit Approval event from address 0 to account 1 1000 token", async () => {
                    await expect(fileToken.approve(acc1.address, 1000))
                        .to.emit(fileToken, "Approval")
                        .withArgs(deployer.address, acc1.address, 1000)
                })
            })

            describe("transferFrom function", function () {
                beforeEach(async () => {
                    await fileToken.deposit(1000)
                    await fileToken.approve(acc1.address, 1000)
                })

                it("transfer 1000 token from deployer to account 1", async () => {
                    await fileToken
                        .connect(acc1)
                        .transferFrom(deployer.address, acc1.address, 1000)
                    const acc1Balance = await fileToken.balanceOf(acc1.address)
                    expect(acc1Balance.toString(), "1000")
                })

                it("it reverts if the transfer amount is more than allowance", async () => {
                    await expect(
                        fileToken.transferFrom(
                            deployer.address,
                            acc1.address,
                            2000
                        )
                    ).to.be.revertedWith("ERC20: insufficient allowance")
                })

                it("reduce the allowance of acccount 1 when transfer money", async () => {
                    await fileToken
                        .connect(acc1)
                        .transferFrom(deployer.address, acc1.address, 1000)
                    const account1Allowance = await fileToken.allowance(
                        deployer.address,
                        acc1.address
                    )
                    expect(account1Allowance.toString(), "0")
                })
            })

            describe("increaseAllowance function", function () {
                it("increase the allowance of account 1 to 2000", async () => {
                    await fileToken.increaseAllowance(acc1.address, 2000)
                    const account1Allowance = await fileToken.allowance(
                        deployer.address,
                        acc1.address
                    )
                    expect(account1Allowance.toString(), "2000")
                })
            })

            describe("decreaseAllowance function", function () {
                it("decrease the allowance of account 1 to 1000", async () => {
                    await fileToken.increaseAllowance(acc1.address, 2000)
                    await fileToken.decreaseAllowance(acc1.address, 1000)
                    const account1Allowance = await fileToken.allowance(
                        deployer.address,
                        acc1.address
                    )
                    expect(account1Allowance.toString(), "1000")
                })
            })
        })

        describe("ERC20Permit", function () {
            describe("Permit function", async () => {
                let hashPermit: string, deadline: string
                beforeEach(async () => {
                    deadline = (
                        (await ethers.provider.getBlock("latest")).timestamp +
                        100
                    ).toString()

                    const nonce = (
                        await fileToken.nonces(acc1.address)
                    ).toString()

                    const structHash = buildStructHashPermit(
                        _PERMIT_TYPE_HASH,
                        acc1.address,
                        acc2.address,
                        "1000",
                        nonce,
                        deadline
                    )
                    hashPermit = toTypedDataHash(domainSeperator, structHash)

                    await fileToken.deposit(1000)
                })

                it("Correctly approve from deployer, message signed by acc1", async () => {
                    const signingKey = new ethers.utils.SigningKey(
                        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
                    )

                    const sig = signingKey.signDigest(hashPermit)
                    await fileToken.permit(
                        acc1.address,
                        acc2.address,
                        1000,
                        deadline,
                        sig.v,
                        sig.r,
                        sig.s
                    )
                    const expectedAllowance = await fileToken.allowance(
                        acc1.address,
                        acc2.address
                    )
                    expect(expectedAllowance.toString()).to.eq("1000")
                })
            })
        })
    })
}
