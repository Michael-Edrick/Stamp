import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // We are using our own MockUSDC token for this project.
  const usdcTokenAddress = "0x6051912FC68729aa994989C8B23666AFfC890204";

  const messageEscrow = await ethers.deployContract("MessageEscrow", [usdcTokenAddress]);

  await messageEscrow.waitForDeployment();

  console.log(
    `MessageEscrow contract deployed to: ${await messageEscrow.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 