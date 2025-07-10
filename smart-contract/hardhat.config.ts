import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
      {
        version: "0.8.24",
      },
    ],
  },
  networks: {
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || "",
  },
  sourcify: {
    enabled: true
  }
};

export default config;
