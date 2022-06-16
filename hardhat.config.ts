import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-solhint";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import { task } from "hardhat/config";
import { generateMerkleTree } from "./scripts/generate";
import { rawData } from "./scripts/rawData";
import { promises as fs } from "fs";
import "hardhat-abi-exporter";

task("generate_merkle_tree", "Generate MerkleTree", async (taskArguments, hre) => {
  const templateReal = generateMerkleTree(rawData);
  await fs.writeFile("./dist/merkle_tree.js", templateReal);
  console.log("test/merkle_tree.js generated");
});

import {
  getHardhatNetworkConfig,
  HardhatSolidityConfig,
  HardhatGasReporterConfig,
  EtherscanConfig,
} from "./SmartContractProjectConfig/config";

const networks = getHardhatNetworkConfig();
const solidity = HardhatSolidityConfig;
const gasReporter = HardhatGasReporterConfig;
const etherscan = EtherscanConfig;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks,
  mocha: {
    timeout: 1000000,
  },
  solidity,
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  etherscan,
  gasReporter,
  abiExporter: {
    path: "./abi",
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [
      "MaskEnumerableNFT",
      "MaskHolderQlf",
      "MaskNonEnumerableNFT",
      "MerkleProofQlf",
      "MysteryBox",
      "SigVerifyQlf",
      "WhitelistQlf",
    ],
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
  },
};
