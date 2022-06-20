import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { config as envConfig } from "dotenv";

const { MaskNFTInitParameters, holderMinAmount } = require("../test/constants");

const { ContractAddressConfig } = require("../SmartContractProjectConfig/config");
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
      const impl = await ethers.getContractFactory("MysteryBox");
      const proxy = await upgrades.deployProxy(impl, []);
      await proxy.deployed();
      console.log("MysteryBox proxy: " + proxy.address);

      const admin = await upgrades.admin.getInstance();
      const impl_addr = await admin.getProxyImplementation(proxy.address);
      console.log("Implementation address: ", impl_addr);
      if (doVerify)
        await hre.run("verify:verify", {
          address: impl_addr,
          constructorArguments: [],
        });
    }
    if (deployMaskEnumerableNFT) {
      const impl = await ethers.getContractFactory("MaskEnumerableNFT");
      const proxy = await upgrades.deployProxy(impl, [...Object.values(MaskNftParameter)]);
      await proxy.deployed();
      console.log("MaskEnumerableNFT proxy: " + proxy.address);

      const admin = await upgrades.admin.getInstance();
      const impl_addr = await admin.getProxyImplementation(proxy.address);
      console.log("Implementation address: ", impl_addr);
      if (doVerify)
        await hre.run("verify:verify", {
          address: impl_addr,
          constructorArguments: [],
        });
    }
    if (deployWhitelistQlf) {
      const impl = await ethers.getContractFactory("WhitelistQlf");
      const proxy = await upgrades.deployProxy(impl, []);
      await proxy.deployed();
      console.log("WhitelistQlf proxy: " + proxy.address);
      const admin = await upgrades.admin.getInstance();
      const impl_addr = await admin.getProxyImplementation(proxy.address);
      if (doVerify)
        await hre.run("verify:verify", {
          address: impl_addr,
          constructorArguments: [],
        });
    }
    if (deploySigVerifyQlf) {
      const impl = await ethers.getContractFactory("SigVerifyQlf");
      const proxy = await upgrades.deployProxy(impl, []);
      await proxy.deployed();
      console.log("SigVerifyQlf proxy: " + proxy.address);
      const admin = await upgrades.admin.getInstance();
      const impl_addr = await admin.getProxyImplementation(proxy.address);
      if (doVerify)
        await hre.run("verify:verify", {
          address: impl_addr,
          constructorArguments: [],
        });
    }
    if (deployMaskHolderQlf) {
      const impl = await ethers.getContractFactory("MaskHolderQlf");
      const proxy = await upgrades.deployProxy(impl, [
        ContractAddressConfig[network].MaskTokenAddress,
        holderMinAmount,
      ]);
      await proxy.deployed();
      console.log("MaskHolderQlf proxy: " + proxy.address);
      const admin = await upgrades.admin.getInstance();
      const impl_addr = await admin.getProxyImplementation(proxy.address);
      if (doVerify)
        await hre.run("verify:verify", {
          address: impl_addr,
          constructorArguments: [],
        });
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
      // upgrade contract
      if (deployedContractAddress[network].MysteryBox == "")
        throw "MysteryBox hasn't been deployed on this chain before";
      const implMysteryBox = await ethers.getContractFactory("MysteryBox");
      const instance = await upgrades.upgradeProxy(deployedContractAddress[network].MysteryBox, implMysteryBox);
      await instance.deployTransaction.wait();
      const admin = await upgrades.admin.getInstance();
      const impl = await admin.getProxyImplementation(deployedContractAddress[network].MysteryBox);
      // example: `npx hardhat verify --network rinkeby 0x8974Ce3955eE1306bA89687C558B6fC1E5be777B`
      await hre.run("verify:verify", {
        address: impl,
        constructorArguments: [],
      });
    }
    if (upgradeMaskEnumerableNFT) {
      // upgrade contract
      if (deployedContractAddress[network].MaskEnumerableNFT == "")
        throw "MaskEnumerableNFT hasn't been deployed on this chain before";
      const implMysteryBox = await ethers.getContractFactory("MaskEnumerableNFT");
      const instance = await upgrades.upgradeProxy(deployedContractAddress[network].MaskEnumerableNFT, implMysteryBox);
      await instance.deployTransaction.wait();
      const admin = await upgrades.admin.getInstance();
      const impl = await admin.getProxyImplementation(deployedContractAddress[network].MaskEnumerableNFT);
      await hre.run("verify:verify", {
        address: impl,
        constructorArguments: [],
      });
    }
    if (upgradeWhitelistQlf) {
      // upgrade contract
      if (deployedContractAddress[network].WhitelistQlf == "")
        throw "WhitelistQlf hasn't been deployed on this chain before";
      const implWhitelistQlf = await ethers.getContractFactory("WhitelistQlf");
      const instance = await upgrades.upgradeProxy(deployedContractAddress[network].WhitelistQlf, implWhitelistQlf);
      await instance.deployTransaction.wait();
      const admin = await upgrades.admin.getInstance();
      const impl = await admin.getProxyImplementation(deployedContractAddress[network].WhitelistQlf);
      await hre.run("verify:verify", {
        address: impl,
        constructorArguments: [],
      });
    }
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
