import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // We are using our own MockUSDC token for this project.
  const usdcTokenAddress = "0x6051912FC68729aa994989C8B23666AFfC890204";

  // Platform fee configuration
  const platformFeeWallet = process.env.PLATFORM_FEE_WALLET || "0x19f45792DC4237019A09033d9e226Dd4f5250312";
  const platformFeePercentage = 10;

  console.log("Platform fee wallet:", platformFeeWallet);
  console.log("Platform fee percentage:", platformFeePercentage);

  const messageEscrow = await ethers.deployContract("MessageEscrow", [usdcTokenAddress, platformFeeWallet, platformFeePercentage]);

  await messageEscrow.waitForDeployment();

  console.log(
    `MessageEscrow contract deployed to: ${await messageEscrow.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 