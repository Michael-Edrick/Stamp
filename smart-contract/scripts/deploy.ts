import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // You will need to replace this with the actual address of the USDC token on the network you deploy to.
  // For Base Sepolia, the USDC address is 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  // For Base Mainnet, the USDC address is 0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913
  const usdcTokenAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Default to Base Sepolia USDC

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