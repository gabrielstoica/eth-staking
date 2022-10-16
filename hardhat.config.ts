import { HardhatUserConfig } from "hardhat/config";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import { NetworkUserConfig } from "hardhat/types";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

const INFURA_API_KEY: string | undefined = process.env.INFURA_API_KEY;
if (!INFURA_API_KEY) {
  throw new Error("Infura API Key is missing from the .env file. Aborting...");
}

const MNEMONIC: string = process.env.MNEMONIC || "";
if (!MNEMONIC) {
  throw new Error("Mnemonic is missing from the .env file. Aborting...");
}

const chainsConfig = {
  goerli: {
    chainId: 5,
    rpcURL: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
  },
  hardhat: {
    chainId: 31337,
    rpcURL: "",
  },
};

function getChainConfig(chainAbbreviation: keyof typeof chainsConfig): NetworkUserConfig {
  const chainConfig = chainsConfig[chainAbbreviation];
  return {
    accounts: {
      count: 10,
      mnemonic: MNEMONIC,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainConfig.chainId,
    url: chainConfig.rpcURL,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: { goerli: process.env.ETHERSCAN_API_KEY || "" },
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      forking: {
        url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      },
    },
    goerli: getChainConfig("goerli"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: "0.8.17",
};

export default config;
