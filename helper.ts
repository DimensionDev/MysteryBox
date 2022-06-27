import { providers, utils, Wallet, Contract, BigNumber } from "ethers";
import * as readline from "readline";
import * as fs from "fs";
import { getGasPrice } from "./utils";
import { generateCreateBoxPara, openBoxParameters, seconds_in_a_day } from "./test/constants";

import { project_secret } from "./project.secret";

// TODO: organize these into a config file
import MysteryBoxArtifact from "./abi/MysteryBox.json";
let MysteryBoxAddress: string;
let MysteryBoxApp: Contract;

import NFTArtifact from "./abi/MaskEnumerableNFT.json";
let NFTAddress: string;
let NFTApp: Contract;

// rinkeby
const whitelistContractAddr = "0x50eCEebb7360Efb93094dDEA692e04274E548b1d";
import whitelistArtifact from "./abi/WhitelistQlf.json";

let whitelistApp: Contract;
let NetworkProvider: providers.Provider;
let adminWallet: Wallet;
let testWallet_0: Wallet;
let testWallet_1: Wallet;

// const network = 'rinkeby';
let network = "matic_mainnet";

const transactionParameters = {
  gasLimit: BigNumber.from(6000000),
  gasPrice: utils.parseUnits("1", "gwei"),
};

const txParameters = {
  gasLimit: BigNumber.from(6000000),
  value: BigNumber.from(0),
};

const createBoxParameter = generateCreateBoxPara(network);

async function isContractAddress(addr) {
  {
    const mainnetProvider = new providers.JsonRpcProvider(
      "https://mainnet.infura.io/v3/" + project_secret.infura_project_id,
    );
    const code = await mainnetProvider.getCode(addr);
    if (code != "0x") {
      console.log(addr + " is a contract, ETH");
      return true;
    }
  }
  {
    const bscProvider = new providers.JsonRpcProvider("https://bsc-dataseed1.binance.org:443");
    const code = await bscProvider.getCode(addr);
    if (code != "0x") {
      console.log(addr + " is a contract, ETH");
      return true;
    }
  }
  {
    const polygonProvider = new providers.JsonRpcProvider("https://polygon-rpc.com/");
    const code = await polygonProvider.getCode(addr);
    if (code != "0x") {
      console.log(addr + " is a contract, ETH");
      return true;
    }
  }
  return false;
}

async function readFirstColumn(filePath, result) {
  const readInterface = readline.createInterface({
    input: fs.createReadStream(filePath),
    // output: process.stdout,
    // TODO: `console` option not found in `readline.createInterface`
    // console: false,
  });
  let lines: string[] = [];
  for await (const line of readInterface) {
    lines.push(line);
  }
  // console.log('total: ' + lines.length);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const words = line.split(" ");
    result.push(words[0]);
  }
}

async function main() {
  if (network === "mainnet") {
    // set gas price carefully, it is expensive.
    // transactionParameters.nonce = 3440;
    // console.log("Force Nonce: " + transactionParameters.nonce);
    // transactionParameters.gasPrice = utils.parseUnits('25', 'gwei');
    const gasPriceList = await getGasPrice(false);
    console.log("Ethereum standard gas price: " + utils.formatUnits(gasPriceList.standard, "gwei") + " Gwei");
    transactionParameters.gasPrice = gasPriceList.standard;
    /*
        NetworkProvider = new providers.JsonRpcProvider(
            'https://mainnet.infura.io/v3/' + project_secret.infura_project_id,
        );
        */
    NetworkProvider = new providers.WebSocketProvider(
      "wss://ropsten.infura.io/ws/v3/" + project_secret.infura_project_id,
    );
  } else if (network === "rinkeby") {
    {
      const deploymentInfo = require("./.openzeppelin/rinkeby.json");
      if (deploymentInfo.proxies.length < 1) {
        throw "project not deployed properly";
      }
      NFTAddress = "0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8";
      const lastOne = deploymentInfo.proxies.length - 1;
      MysteryBoxAddress = deploymentInfo.proxies[lastOne].address;
    }
    NetworkProvider = new providers.JsonRpcProvider("https://rinkeby.infura.io/v3/" + project_secret.infura_project_id);
  } else if (network === "matic_mainnet") {
    {
      const deploymentInfo = require("./.openzeppelin/unknown-31337.json");
      if (deploymentInfo.proxies.length < 1) {
        throw "project not deployed properly";
      }
      NFTAddress = "0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78";
      const lastOne = deploymentInfo.proxies.length - 1;
      MysteryBoxAddress = deploymentInfo.proxies[lastOne].address;
    }
    NetworkProvider = new providers.JsonRpcProvider("https://polygon-rpc.com/");
  } else {
    //
    NetworkProvider = new providers.JsonRpcProvider("https://xxxx.infura.io/v3/" + project_secret.infura_project_id);
  }
  adminWallet = new Wallet(project_secret.test_private_key[0], NetworkProvider);
  testWallet_0 = new Wallet(project_secret.test_private_key[1], NetworkProvider);
  testWallet_1 = new Wallet(project_secret.test_private_key[2], NetworkProvider);

  MysteryBoxApp = new Contract(MysteryBoxAddress, MysteryBoxArtifact, adminWallet);

  NFTApp = new Contract(NFTAddress, NFTArtifact, adminWallet);
  whitelistApp = new Contract(whitelistContractAddr, whitelistArtifact, adminWallet);

  console.log("MysteryBoxAddress: " + MysteryBoxAddress);
  console.log("network: " + network + " adminWallet address: " + adminWallet.address);
  console.log("network: " + network + " testWallet_0 address: " + testWallet_0.address);
  console.log("network: " + network + " testWallet_1 address: " + testWallet_1.address);

  const action = process.argv[2];
  if (action === "create") {
    const isApproved = await NFTApp.isApprovedForAll(testWallet_0.address, MysteryBoxApp.address);
    if (!isApproved) {
      const tx = await NFTApp.connect(testWallet_0).setApprovalForAll(MysteryBoxApp.address, true);
      await tx.wait();
    }
    const tx = await MysteryBoxApp.connect(testWallet_0).createBox(...Object.values(createBoxParameter));
    await tx.wait();
  } else if (action === "open") {
    const box_id = BigNumber.from(process.argv[3]);
    openBoxParameters.box_id = box_id;
    txParameters.value = createBoxParameter.payment[0][1];
    const tx = await MysteryBoxApp.connect(testWallet_1).openBox(...Object.values(openBoxParameters), txParameters);
    await tx.wait();
  } else if (action === "test") {
    {
      const info = await MysteryBoxApp.getBoxInfo(1);
      console.log(JSON.stringify(info, null, 2));
    }
  } else if (action === "addAdmin") {
    const adminList = [
      "0x3A6690B247b467243F4C2F61Dd4100e18a336990",
      "0x67fA392717324B63Cb3793860eA099C1436e6458",
      "0xaa0065375E1194d45Ede6804AA9d7e01a326aaDD",
      "0x790116d0685eB197B886DAcAD9C247f785987A4a",
      "0x67fA392717324B63Cb3793860eA099C1436e6458",
      "0x13Fe3f4F1385F9CF4C7bC766F1E9B5AF028f9B73",
    ];
    const tx = await MysteryBoxApp.connect(adminWallet).addAdmin(adminList);
    const receipt = await tx.wait();
  } else if (action === "removeAdmin") {
    const adminList = ["0xD5C2c5f2E10802846bbD86C5Fd8438b7CA4Ff83A"];
    const tx = await MysteryBoxApp.connect(adminWallet).removeAdmin(adminList);
    const receipt = await tx.wait();
  } else if (action === "set_mask_addr") {
    const mask_addr = "0x46eD2e50A9f27de0dC47b04E7580E8E91fCE7246";
    const tx = await MysteryBoxApp.connect(adminWallet).setMaskTokenAddr(mask_addr);
    await tx.wait();
  } else if (action === "create_invalid") {
    const now = Math.floor(new Date().getTime() / 1000);
    if (true) {
      createBoxParameter.start_time = now + 120 * seconds_in_a_day;
      const tx = await MysteryBoxApp.connect(testWallet_0).createBox(...Object.values(createBoxParameter));
      const receipt = await tx.wait();
      console.log(receipt);
    }
    if (true) {
      createBoxParameter.start_time = 0;
      createBoxParameter.end_time = now + 60;
      const tx = await MysteryBoxApp.connect(testWallet_0).createBox(...Object.values(createBoxParameter));
      const receipt = await tx.wait();
      console.log(receipt);
    }
  } else if (action === "open_invalid") {
    txParameters.value = createBoxParameter.payment[0][1];
    openBoxParameters.box_id = BigNumber.from(3);
    const tx = await MysteryBoxApp.connect(testWallet_1).openBox(...Object.values(openBoxParameters), txParameters);
    await tx.wait();
  } else if (action === "set_resource") {
    const resource_list = [
      "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json",
      "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/gif.json",
      "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/mp4.json",
    ];
    for (let i = 0; i < resource_list.length; i++) {
      console.log("setting: " + i + " URI: " + resource_list[i]);
      const tx = await NFTApp.set_resource(i, resource_list[i]);
      await tx.wait();
    }
  } else if (action === "write_whitelist") {
    const batch_number = 450;
    const wallet_list = [];
    const whitelist_file = "./scripts/mask_holder.txt";
    await readFirstColumn(whitelist_file, wallet_list);
    const blacklist = [];
    const blacklist_file = "./scripts/blacklist.txt";
    await readFirstColumn(blacklist_file, blacklist);
    // console.log(blacklist);

    let whitelist = [];
    console.log("total: " + wallet_list.length);
    for (let i = 0; i < wallet_list.length; i++) {
      const addr = wallet_list[i];
      if (blacklist_file.indexOf(addr) >= 0) {
        console.log(addr + " in blacklist");
        continue;
      }
      // const whitelisted = await whitelistApp.white_list(addr);
      // if (whitelisted) {
      //   console.log(addr + " whitelisted already");
      //   continue;
      // }
      whitelist.push(addr);
      if (whitelist.length >= batch_number) {
        console.log("Writing: " + whitelist.length + " addresses");
        const tx = await whitelistApp.add_white_list(whitelist);
        await tx.wait();
        whitelist = [];
        console.log("whitelist writing done!!");
      }
    }
    console.log("Writing: " + whitelist.length + " addresses");
    const tx = await whitelistApp.add_white_list(whitelist);
    await tx.wait();
  } else if (action === "check_whitelist") {
    const wallet_list = [];
    const whitelist_file = "./scripts/mask_holder.txt";
    await readFirstColumn(whitelist_file, wallet_list);
    const blacklist = [];
    const blacklist_file = "./scripts/blacklist.txt";
    await readFirstColumn(blacklist_file, blacklist);
    // console.log(blacklist);

    const whitelist = [];
    console.log("total: " + wallet_list.length);
    for (let i = 0; i < wallet_list.length; i++) {
      const addr = wallet_list[i];
      if (blacklist_file.indexOf(addr) >= 0) {
        // console.log(addr + ' in blacklist');
        continue;
      }
      const whitelisted = await whitelistApp.white_list(addr);
      console.log("checking: " + addr);
      if (!whitelisted) {
        console.log(addr + " NOT whitelisted");
      }
    }
  } else {
    throw "unknown command option";
  }
}

main().then(function () {});
