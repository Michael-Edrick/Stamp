import { ethers } from "hardhat";

async function main() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  console.log("Deploying MockUSDC...");
  const mockUSDC = await MockERC20.deploy();
  await mockUSDC.waitForDeployment();

  const contractAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 