import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error("Please set your DEPLOYER_PRIVATE_KEY in a .env file");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);

  console.log(`The deployer address is: ${wallet.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 