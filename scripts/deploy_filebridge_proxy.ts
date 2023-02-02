import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers, upgrades } from "hardhat"

let deployer: SignerWithAddress

async function main () {
    const fileBridge = await ethers.getContractFactory('FileBridge');
    console.log("Deploying....");

    const fileBridgeProxy = await upgrades.deployProxy(fileBridge);
    await fileBridgeProxy.deployed();

    console.log("FileBridge deployed to:", fileBridgeProxy.address);

}

main();