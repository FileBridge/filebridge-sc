import { ethers, getNamedAccounts } from "hardhat"
import { FileBridge, Token } from "../typechain-types"

async function main() {
    const signingKey = new ethers.utils.SigningKey(process.env.WALLET2!)

    const { deployer, guardian } = await getNamedAccounts()

    const fileBridge = (await ethers.getContract(
            "FileBridge",
            deployer
        )) as FileBridge,
        mockToken = (await ethers.getContract("Token")) as Token

    const frontEndWAllet = "0x36140eee3893c84886edc687d598dbd7cccd5534"

    const nonce = await fileBridge.nonces(guardian)
    const hash = await fileBridge.redeemTokenHashGenerator(
        frontEndWAllet,
        80001,
        mockToken.address,
        ethers.utils.parseEther("1"),
        nonce
    )

    const sig = signingKey.signDigest(hash)

    const txResponse = await fileBridge.redeemToken(
        frontEndWAllet,
        80001,
        mockToken.address,
        ethers.utils.parseEther("1"),
        guardian,
        sig.r,
        sig._vs
    )
    return txResponse
}

main().then((txResponse) => {
    console.log(`Sent with hash: ${txResponse.hash}`)
})
