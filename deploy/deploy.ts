import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { config as envConfig } from "dotenv";

import { MaskNFTInitParameters, holderMinAmount } from "../test/constants";
import { getContractAddress } from "../SmartContractProjectConfig/config";

const ADDRESS_TABLE_PATH = path.resolve(__dirname, "..", "contract-addresses.csv");
envConfig({ path: path.resolve(__dirname, "./.env") });

interface IDeployedContractAddress {
  MaskEnumerableNFT: string;
  MysteryBox: string;
  WhitelistQlf: string;
  SigVerifyQlf: string;
}
type DeployedContractAddress = Record<string, IDeployedContractAddress>;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = hre.hardhatArguments.network ?? "rinkeby";
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let MaskNftParameter = MaskNFTInitParameters[network];
  if (typeof MaskNftParameter === "undefined") {
    MaskNftParameter = MaskNFTInitParameters["mainnet"];
  }
  const deployedContractAddress = await loadDeployedAddress();

  const doDeployment = true;
  const doVerify = false;

  const deployMysteryBox = false;
  const deployMaskEnumerableNFT = false;
  const deployWhitelistQlf = false;
  const deploySigVerifyQlf = false;
  const deployMaskHolderQlf = false;
  const deployMerkleProofQlf = false;

  const upgradeMysteryBox = false;
  const upgradeMaskEnumerableNFT = false;
  const upgradeWhitelistQlf = false;

  if (doDeployment) {
    if (deployMysteryBox) {
      await deployContract("MysteryBox");
    }
    if (deployMaskEnumerableNFT) {
      await deployContract("MaskEnumerableNFT", [...Object.values(MaskNftParameter)]);
    }
    if (deployWhitelistQlf) {
      await deployContract("WhitelistQlf");
    }
    if (deploySigVerifyQlf) {
      await deployContract("SigVerifyQlf");
    }
    if (deployMaskHolderQlf) {
      await deployContract("MaskHolderQlf", [getContractAddress[network].MaskTokenAddress, holderMinAmount]);
    }
    if (deployMerkleProofQlf) {
      const tx = await deploy("MerkleProofQlf", {
        from: deployer,
        args: [],
        log: true,
      });
      console.log(tx.address);
    }
  } else {
    if (upgradeMysteryBox) {
      await upgradeContract("MysteryBox");
    }
    if (upgradeMaskEnumerableNFT) {
      await upgradeContract("MaskEnumerableNFT");
    }
    if (upgradeWhitelistQlf) {
      await upgradeContract("WhitelistQlf");
    }
  }

  async function deployContract(contractName: string, parameters?: any[]) {
    const impl = await ethers.getContractFactory(contractName);
    const proxy = await upgrades.deployProxy(impl, parameters);
    await proxy.deployed();
    console.log(contractName + " proxy: " + proxy.address);

    const admin = await upgrades.admin.getInstance();
    const impl_addr = await admin.getProxyImplementation(proxy.address);
    console.log("Implementation address: ", impl_addr);
    if (doVerify)
      await hre.run("verify:verify", {
        address: impl_addr,
        constructorArguments: [],
      });
  }

  async function upgradeContract(contractName: string) {
    if (deployedContractAddress[network][contractName] == "")
      throw contractName + " hasn't been deployed on this chain before";
    let impl = await ethers.getContractFactory(contractName);
    const instance = await upgrades.upgradeProxy(deployedContractAddress[network][contractName], impl);
    await instance.deployTransaction.wait();
    const admin = await upgrades.admin.getInstance();
    impl = await admin.getProxyImplementation(deployedContractAddress[network][contractName]);
    console.log(impl);
    // example: `npx hardhat verify --network rinkeby 0x8974Ce3955eE1306bA89687C558B6fC1E5be777B`
    if (doVerify)
      await hre.run("verify:verify", {
        address: impl,
        constructorArguments: [],
      });
  }
};

async function loadDeployedAddress(): Promise<DeployedContractAddress> {
  const data = await fs.readFile(ADDRESS_TABLE_PATH, "utf-8");
  const columns = [
    "Chain",
    "MysteryBox",
    "MaskTestNFT",
    "WhitelistQlf",
    "SigVerifyQlf",
    "MaskHolderQlf",
    "MerkleProofQlf",
  ];
  const records = parse(data, { delimiter: ",", columns, from: 2 });
  let deployedContract: DeployedContractAddress = {};
  for (const { Chain, MysteryBox, MaskTestNFT, WhitelistQlf, SigVerifyQlf } of records) {
    let contractInfo = {
      MysteryBox,
      MaskEnumerableNFT: MaskTestNFT,
      WhitelistQlf,
      SigVerifyQlf,
    };
    deployedContract[Chain.toLowerCase()] = contractInfo;
  }
  return deployedContract;
}

func.tags = ["MysteryBox"];

module.exports = func;
