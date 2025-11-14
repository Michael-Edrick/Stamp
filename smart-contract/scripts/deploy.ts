import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Deploying on network:", network.name);

  // Environment-aware configuration
  const networkConfig = {
    "base-sepolia": {
      usdcTokenAddress: process.env.SEPOLIA_MOCK_USDC_ADDRESS,
      comment: "Using MockUSDC for Base Sepolia."
    },
    "base-mainnet": {
      usdcTokenAddress: process.env.MAINNET_USDC_ADDRESS,
      comment: "Using official USDC for Base Mainnet."
    }
  };

  const config = networkConfig[network.name as keyof typeof networkConfig];
  if (!config) {
    throw new Error(`Configuration for network '${network.name}' not found.`);
  }
  if (!config.usdcTokenAddress) {
    throw new Error(`USDC token address for network '${network.name}' is not defined in your .env file.`);
  }

  console.log(config.comment);
  
  // Platform fee configuration
  const platformFeeWallet = process.env.PLATFORM_FEE_WALLET || "0x19f45792DC4237019A09033d9e226Dd4f5250312";
  const platformFeePercentage = 10;

  console.log("Using USDC Address:", config.usdcTokenAddress);
  console.log("Platform fee wallet:", platformFeeWallet);
  console.log("Platform fee percentage:", platformFeePercentage);

  const messageEscrow = await ethers.deployContract("MessageEscrow", [config.usdcTokenAddress, platformFeeWallet, platformFeePercentage]);

  await messageEscrow.waitForDeployment();

  console.log(
    `MessageEscrow contract deployed to: ${await messageEscrow.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 