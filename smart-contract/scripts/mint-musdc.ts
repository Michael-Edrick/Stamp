const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const recipientAddress = "0xff67A96C8E55B43c08bbe9e5F2f1225771C3fe50"; // Your wallet address
  const mockUsdcAddress = "0x6051912FC68729aa994989C8B23666AFfC890204"; // The mUSDC token contract

  console.log("Minting mUSDC to:", recipientAddress);

  const mockUsdc = await ethers.getContractAt("MockERC20", mockUsdcAddress, deployer);

  const amount = ethers.parseUnits("1000", 18); // Minting 1000 mUSDC

  const tx = await mockUsdc.mint(recipientAddress, amount);
  await tx.wait();

  console.log(`Successfully minted 1000 mUSDC to ${recipientAddress}`);
  
  const balance = await mockUsdc.balanceOf(recipientAddress);
  console.log(`New balance: ${ethers.formatUnits(balance, 18)} mUSDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 