import { ethers, waffle, upgrades } from "hardhat";
import { BigNumber, Signer } from "ethers";
import MockDate from "mockdate";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { last, differenceWith } from "lodash";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

import { advanceBlock, advanceTimeAndBlock, takeSnapshot, revertToSnapShot } from "./helper";
import {
  MaskNFTInitParameters,
  openBoxParameters,
  MaxNumberOfNFT,
  seconds_in_a_day,
  holderMinAmount,
  generateCreateBoxPara,
  addTxParameters,
  TxParameter,
} from "./constants";

import { TestToken, MysteryBox, MaskEnumerableNFT, MaskNonEnumerableNFT, Mask721A } from "../types";
import TestTokenArtifact from "../artifacts/contracts/test/test_token.sol/TestToken.json";
import MysteryBoxArtifact from "../artifacts/contracts/MysteryBox.sol/MysteryBox.json";
import EnumerableNftTokenABI from "../artifacts/contracts/test/MaskEnumerableNFT.sol/MaskEnumerableNFT.json";
import nonEnumerableNftTokenABI from "../artifacts/contracts/test/MaskNonEnumerableNFT.sol/MaskNonEnumerableNFT.json";

const interfaceABI = new ethers.utils.Interface(MysteryBoxArtifact.abi);

describe("MysteryBoxSales", () => {
  const network = "mainnet";
  const maskNftPara = MaskNFTInitParameters[network];
  const createBoxPara = generateCreateBoxPara(network);
  let sell_all_box_id: BigNumber;
  let not_sell_all_box_id: BigNumber;
  let not_sell_all_nft_id_list: BigNumber[] = [];

  const txParameters: TxParameter = {
    gasLimit: BigNumber.from(6e6),
    value: createBoxPara.payment[0][1],
  };

  let signers: Signer[];
  let contractCreator: Signer;
  let snapshotId: string;

  let user_1: Signer;
  let user_2: Signer;
  let user_3: Signer;

  let testTokenContract: TestToken;
  let testMaskTokenContract: TestToken;

  let mask721ANFTContract: Mask721A;
  let mbContract: MysteryBox;
  let enumerableNftContract: MaskEnumerableNFT;
  let nonEnumerableNftContract: MaskNonEnumerableNFT;

  // 1 billion tokens, typical decimal 18
  const testTokenMintAmount = ethers.utils.parseUnits("1", 27);
  const transferAmount = ethers.utils.parseUnits("1", 26);

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    // these are whitelisted `box creator`
    user_1 = signers[1];
    user_2 = signers[2];
    user_3 = signers[3];

    testTokenContract = (await deployContract(contractCreator, TestTokenArtifact, [
      "TestToken",
      "TEST",
      testTokenMintAmount,
    ])) as TestToken;
    testMaskTokenContract = (await deployContract(contractCreator, TestTokenArtifact, [
      "MaskToken",
      "MASK",
      testTokenMintAmount,
    ])) as TestToken;

    {
      const factory = await ethers.getContractFactory("Mask721A");
      const Mask721A = (await factory.deploy(maskNftPara.name, maskNftPara.symbol, maskNftPara.baseURI)) as Mask721A;
      mask721ANFTContract = await Mask721A.deployed();
    }
    // first is ETH: address(0)
    createBoxPara.payment.push([testTokenContract.address, createBoxPara.payment[0][1]]);
    {
      const factory = await ethers.getContractFactory("MaskEnumerableNFT");
      const proxy = await upgrades.deployProxy(factory, [...Object.values(maskNftPara)]);
      enumerableNftContract = new ethers.Contract(
        proxy.address,
        EnumerableNftTokenABI.abi,
        contractCreator,
      ) as MaskEnumerableNFT;
    }
    {
      const factory = await ethers.getContractFactory("MaskNonEnumerableNFT");
      const proxy = await upgrades.deployProxy(factory, [...Object.values(maskNftPara)]);
      nonEnumerableNftContract = new ethers.Contract(
        proxy.address,
        nonEnumerableNftTokenABI.abi,
        contractCreator,
      ) as MaskNonEnumerableNFT;
    }
    {
      const factory = await ethers.getContractFactory("MysteryBox");
      const proxy = await upgrades.deployProxy(factory, []);
      mbContract = new ethers.Contract(proxy.address, MysteryBoxArtifact.abi, contractCreator) as MysteryBox;
    }
    await mbContract.addWhitelist([await user_1.getAddress(), await user_2.getAddress(), await user_3.getAddress()]);
    await testTokenContract.transfer(await user_2.getAddress(), transferAmount);
    await testTokenContract.connect(user_2).approve(mbContract.address, transferAmount);

    createBoxPara.nft_address = enumerableNftContract.address;
    // mint 100 NFT for testing
    await enumerableNftContract.connect(user_1).mint(50);
    await enumerableNftContract.connect(user_1).mint(50);
    await enumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);

    {
      const parameter = { ...createBoxPara, sell_all: true };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
      const result = last(logs)!.args;
      sell_all_box_id = result.box_id;
      openBoxParameters.box_id = sell_all_box_id;
    }
    {
      const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
      // half of the NFT ids owned
      for (let i = 0; i < nftBalance.toNumber(); i += 2) {
        const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), i);
        not_sell_all_nft_id_list.push(nftId);
      }
      const parameter = { ...createBoxPara, sell_all: false, nft_id_list: not_sell_all_nft_id_list };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
      const result = last(logs)!.args;
      not_sell_all_box_id = result.box_id;
    }
    for (let i = 0; i < 256; i++) {
      await advanceBlock();
    }
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
    MockDate.set(Date.now());
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
    // We also need to reset the "real time" (as what we do for evm)
    MockDate.reset();
  });

  it("Should getNftListForSale work", async () => {
    let nft_id_list: BigNumber[] = [];
    const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
    // half of the NFT ids owned
    for (let i = 0; i < nftBalance.toNumber(); i++) {
      const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), i);
      nft_id_list.push(nftId);
    }
    const nftList = await mbContract.getNftListForSale(sell_all_box_id, 0, nftBalance);
    expect(nftList).to.eql(nft_id_list);
    {
      // buy some NFT(s)
      const parameters = { ...openBoxParameters, amount: MaxNumberOfNFT };
      const tx_parameters = {
        value: txParameters.value.mul(parameters.amount),
      };
      await mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters)));
    }
    const newNftList = await mbContract.getNftListForSale(sell_all_box_id, 0, nftBalance);
    expect(newNftList.length).to.be.eq(nftList.length - MaxNumberOfNFT);

    const purchaseList = await mbContract.getPurchasedNft(sell_all_box_id, await user_2.getAddress());
    expect(purchaseList.length).to.be.eq(MaxNumberOfNFT);
    {
      const mergedList = newNftList.concat(purchaseList);
      const difference = differenceWith(nftList, mergedList, (nftValue, mergedValue) => nftValue.eq(mergedValue));
      expect(difference.length).to.be.eq(0);
    }
    {
      const emptyNftList = await mbContract.getNftListForSale(sell_all_box_id, nftBalance, nftBalance);
      expect(emptyNftList.length).to.be.eq(0);
    }
  });

  it('Should sell "sell_all_box_id" NFT work', async () => {
    const totalNFT = await enumerableNftContract.balanceOf(await user_1.getAddress());
    for (let i = 5; i <= 9; ++i) {
      expect((await enumerableNftContract.balanceOf(await signers[i].getAddress())).eq(0)).to.be.true;
    }
    const contractEthBalanceBeforeOpen = await ethers.provider.getBalance(mbContract.address);
    const user_8_EthBalance = await ethers.provider.getBalance(await signers[8].getAddress());
    const user_9_EthBalance = await ethers.provider.getBalance(await signers[9].getAddress());
    const open_parameters = { ...openBoxParameters };
    {
      open_parameters.amount = MaxNumberOfNFT;
      const tx_parameters = {
        value: txParameters.value.mul(open_parameters.amount),
      };
      for (let i = 5; i <= 8; ++i) {
        await mbContract
          .connect(signers[i])
          .openBox.apply(null, Object.values(addTxParameters(open_parameters, tx_parameters)));
      }
      await expect(mbContract.connect(user_1).claimPayment([open_parameters.box_id])).to.be.revertedWith(
        "not expired/sold-out",
      );
      await mbContract
        .connect(signers[9])
        .openBox.apply(null, Object.values(addTxParameters(open_parameters, tx_parameters)));
      await expect(
        mbContract
          .connect(signers[10])
          .openBox.apply(null, Object.values(addTxParameters(open_parameters, tx_parameters))),
      ).to.be.revertedWith("no NFT left");
      for (let i = 5; i <= 8; ++i) {
        expect((await enumerableNftContract.balanceOf(await signers[i].getAddress())).eq(MaxNumberOfNFT)).to.be.true;
      }
      const remainingNFT = totalNFT.sub(MaxNumberOfNFT * 4);
      expect((await enumerableNftContract.balanceOf(await signers[9].getAddress())).eq(remainingNFT)).to.be.true;

      const user_8_EthBalanceAfter = await ethers.provider.getBalance(await signers[8].getAddress());
      const user_9_EthBalanceAfter = await ethers.provider.getBalance(await signers[9].getAddress());
      expect(user_8_EthBalance.gt(user_8_EthBalanceAfter.add(tx_parameters.value))).to.be.true;
      // test ETH refund
      expect(user_9_EthBalanceAfter.gt(user_9_EthBalance.sub(tx_parameters.value))).to.be.true;
    }
    const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
    const totalPaymentEth = txParameters.value.mul(totalNFT);
    expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(totalPaymentEth))).to.be.true;
    {
      const boxInfo = await mbContract.getBoxInfo(sell_all_box_id);
      const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
      expect(boxInfo)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(boxInfo).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
      expect(boxInfo).to.have.property("name").that.to.be.eq(createBoxPara.name);
      expect(boxInfo).to.have.property("personal_limit").that.to.be.eq(createBoxPara.personal_limit);

      expect(boxStatus).to.have.property("payment");
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([totalPaymentEth, BigNumber.from(0)]);
      expect(boxStatus).to.have.property("started").that.to.be.eq(true);
      expect(boxStatus).to.have.property("expired").that.to.be.eq(false);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(0)).to.be.true;
      expect(boxStatus.total.eq(totalNFT)).to.be.true;
    }
    await mbContract.connect(user_1).claimPayment([open_parameters.box_id]);
    {
      const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
      expect(boxStatus).to.have.property("payment");
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([BigNumber.from(0), BigNumber.from(0)]);
    }
  });

  it("Should support lots of NFT", async () => {
    for (let i = 0; i < 18; i++) {
      await enumerableNftContract.connect(user_1).mint(50);
    }
    let id_list: BigNumber[] = [];
    let box_id;
    {
      const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
      // all the NFT ids owned, total 1000 NFT(s)
      for (let i = 0; i < nftBalance.toNumber(); i++) {
        const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), i);
        id_list.push(nftId);
      }
      const parameter = { ...createBoxPara, personal_limit: 255, sell_all: false, nft_id_list: id_list };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));

      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
      const result = last(logs)!.args;
      expect(result)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(result).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
      expect(result).to.have.property("name").that.to.be.eq(parameter.name);
      expect(result).to.have.property("start_time").that.to.be.eq(parameter.start_time);
      expect(result).to.have.property("end_time").that.to.be.eq(parameter.end_time);
      expect(result).to.have.property("sell_all").that.to.be.eq(parameter.sell_all);
      expect(result).to.have.property("box_id");
      box_id = result.box_id;

      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(id_list.length)).to.be.true;
      expect(boxStatus.total.eq(id_list.length)).to.be.true;
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);

      const nftList = await mbContract.getNftListForSale(box_id, 0, parameter.nft_id_list.length);
      expect(nftList).to.eql(parameter.nft_id_list);
    }
    // mint another 1000 NFT(s)
    for (let i = 0; i < 20; i++) {
      await enumerableNftContract.connect(user_1).mint(50);
    }
    let id_list_batch_2: BigNumber[] = [];
    {
      const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
      // all the NFT ids owned, total 1000 NFT(s)
      for (let i = id_list.length; i < nftBalance.toNumber(); i++) {
        const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), i);
        id_list_batch_2.push(nftId);
      }
      await mbContract.connect(user_1).addNftIntoBox(box_id, id_list_batch_2);
      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(id_list.length + id_list_batch_2.length)).to.be.true;
      expect(boxStatus.total.eq(id_list.length + id_list_batch_2.length)).to.be.true;
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);

      const nftList = await mbContract.getNftListForSale(box_id, id_list.length, id_list_batch_2.length);
      expect(nftList).to.eql(id_list_batch_2);
    }
    const nftBalance_before_batch_3 = await enumerableNftContract.balanceOf(await user_1.getAddress());
    // mint another 1000 NFT(s)
    for (let i = 0; i < 20; i++) {
      await enumerableNftContract.connect(user_1).mint(50);
    }
    let id_list_batch_3: BigNumber[] = [];
    {
      const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
      // all the NFT ids owned, total 1000 NFT(s)
      for (let i = nftBalance_before_batch_3; i < nftBalance; i = i.add(1)) {
        const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), i);
        id_list_batch_3.push(nftId);
      }
      await mbContract.connect(user_1).addNftIntoBox(box_id, id_list_batch_3);
      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(nftBalance_before_batch_3.add(id_list_batch_3.length))).to.be.true;
      expect(boxStatus.total.eq(nftBalance_before_batch_3.add(id_list_batch_3.length))).to.be.true;
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);

      const nftList = await mbContract.getNftListForSale(box_id, nftBalance_before_batch_3, id_list_batch_3.length);
      expect(nftList).to.eql(id_list_batch_3);
    }
    {
      const nftBalance_before = await enumerableNftContract.balanceOf(await user_1.getAddress());
      const buy_batch = 255;
      // buy 255 NFT(s)
      const parameters = { ...openBoxParameters, box_id: box_id, amount: buy_batch };
      const tx_parameters = {
        value: txParameters.value.mul(parameters.amount),
      };
      await mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters)));
      const user_2_balance = await enumerableNftContract.balanceOf(await user_2.getAddress());
      const nftBalance_after = await enumerableNftContract.balanceOf(await user_1.getAddress());

      expect(user_2_balance.eq(255)).to.be.true;
      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(nftBalance_before.sub(buy_batch))).to.be.true;
      expect(boxStatus.remaining.eq(nftBalance_after)).to.be.true;
    }
  });

  it('Should sell "not_sell_all" enumerableNftContract work', async () => {
    const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
    expect(boxStatus).to.have.property("remaining");
    const totalNFT = boxStatus.remaining;
    for (let i = 5; i <= 8; ++i) {
      await testTokenContract.transfer(await signers[i].getAddress(), transferAmount);
      await testTokenContract.connect(signers[i]).approve(mbContract.address, transferAmount);
    }
    const contractTokenBalanceBefore = await testTokenContract.balanceOf(mbContract.address);
    const parameters = {
      ...openBoxParameters,
      amount: MaxNumberOfNFT,
      payment_token_index: 1,
      box_id: not_sell_all_box_id,
    };
    for (let i = 5; i <= 7; ++i) {
      expect((await enumerableNftContract.balanceOf(await signers[i].getAddress())).eq(0)).to.be.true;
      await mbContract.connect(signers[i]).openBox.apply(null, Object.values(parameters));
    }
    {
      await expect(mbContract.connect(signers[8]).openBox.apply(null, Object.values(parameters))).to.be.revertedWith(
        "no NFT left",
      );
      expect((await enumerableNftContract.balanceOf(await signers[5].getAddress())).eq(MaxNumberOfNFT)).to.be.true;
      expect((await enumerableNftContract.balanceOf(await signers[6].getAddress())).eq(MaxNumberOfNFT)).to.be.true;
      const remainingNFT = totalNFT.sub(MaxNumberOfNFT * 2);
      expect((await enumerableNftContract.balanceOf(await signers[7].getAddress())).eq(remainingNFT)).to.be.true;
    }
    // sold out, validate payment token amount
    const paymentTokenAAmount = createBoxPara.payment[0][1].mul(totalNFT);
    const contractTokenBalanceAfter = await testTokenContract.balanceOf(mbContract.address);
    expect(contractTokenBalanceAfter.eq(contractTokenBalanceBefore.add(paymentTokenAAmount))).to.be.true;
    {
      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      expect(boxStatus).to.have.property("payment");
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([BigNumber.from(0), paymentTokenAAmount]);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(0)).to.be.true;
      expect(boxStatus.total.eq(not_sell_all_nft_id_list.length)).to.be.true;
    }
  });

  it('Should sell "not_sell_all" nonEnumerableNftContract work', async () => {
    let box_id;
    const total = 50;
    {
      await nonEnumerableNftContract.connect(user_1).mint(total);
      await nonEnumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);
      const nftBalance = await nonEnumerableNftContract.balanceOf(await user_1.getAddress());
      expect(total).to.be.eq(nftBalance);

      let id_list: number[] = [];
      for (let i = 0; i < nftBalance.toNumber(); i++) {
        id_list.push(i);
      }
      const parameter = {
        ...createBoxPara,
        nft_address: nonEnumerableNftContract.address,
        sell_all: false,
        nft_id_list: id_list,
      };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
      const result = last(logs)!.args;
      expect(result)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(result).to.have.property("nft_address").that.to.be.eq(nonEnumerableNftContract.address);
      expect(result).to.have.property("name").that.to.be.eq(parameter.name);
      expect(result).to.have.property("start_time").that.to.be.eq(parameter.start_time);
      expect(result).to.have.property("end_time").that.to.be.eq(parameter.end_time);
      expect(result).to.have.property("sell_all").that.to.be.eq(parameter.sell_all);
      expect(result).to.have.property("box_id");
      box_id = result.box_id;
    }

    const boxStatus = await mbContract.getBoxStatus(box_id);
    expect(boxStatus).to.have.property("remaining");
    expect(total).to.be.eq(boxStatus.remaining);
    const totalNFT = boxStatus.remaining;
    for (let i = 5; i <= 8; ++i) {
      await testTokenContract.transfer(await signers[i].getAddress(), transferAmount);
      await testTokenContract.connect(signers[i]).approve(mbContract.address, transferAmount);
    }
    const contractTokenBalanceBefore = await testTokenContract.balanceOf(mbContract.address);
    const parameters = { ...openBoxParameters, amount: MaxNumberOfNFT, payment_token_index: 1, box_id: box_id };
    for (let i = 5; i <= 7; ++i) {
      expect((await nonEnumerableNftContract.balanceOf(await signers[i].getAddress())).eq(0)).to.be.true;
      await mbContract.connect(signers[i]).openBox.apply(null, Object.values(parameters));
    }
    {
      await expect(mbContract.connect(signers[8]).openBox.apply(null, Object.values(parameters))).to.be.revertedWith(
        "no NFT left",
      );
      expect((await nonEnumerableNftContract.balanceOf(await signers[5].getAddress())).eq(MaxNumberOfNFT)).to.be.true;
      expect((await nonEnumerableNftContract.balanceOf(await signers[6].getAddress())).eq(MaxNumberOfNFT)).to.be.true;
      const remainingNFT = totalNFT.sub(MaxNumberOfNFT * 2);
      expect((await nonEnumerableNftContract.balanceOf(await signers[7].getAddress())).eq(remainingNFT)).to.be.true;
    }
    // sold out, validate payment token amount
    const paymentTokenAAmount = createBoxPara.payment[0][1].mul(totalNFT);
    const contractTokenBalanceAfter = await testTokenContract.balanceOf(mbContract.address);
    expect(contractTokenBalanceAfter.eq(contractTokenBalanceBefore.add(paymentTokenAAmount))).to.be.true;
    {
      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("payment");
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([BigNumber.from(0), paymentTokenAAmount]);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(0)).to.be.true;
      expect(boxStatus.total.eq(totalNFT)).to.be.true;
    }
  });

  it('Should work if "NFT tokens transferred elsewhere"', async () => {
    const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
    expect(boxStatus).to.have.property("remaining");
    expect(boxStatus.remaining.eq(not_sell_all_nft_id_list.length)).to.be.true;

    // transfer NFT(s) elsewhere, remaining random number of NFT(s)
    const max = MaxNumberOfNFT / 2;
    const remain = Math.floor(Math.random() * max);
    // console.log(remain);
    for (let i = remain; i < not_sell_all_nft_id_list.length; i++) {
      await enumerableNftContract
        .connect(user_1)
        .transferFrom(await user_1.getAddress(), await user_2.getAddress(), not_sell_all_nft_id_list[i]);
    }
    const testAccount = signers[5];
    await testTokenContract.transfer(await testAccount.getAddress(), transferAmount);
    await testTokenContract.connect(testAccount).approve(mbContract.address, transferAmount);
    const parameters = { ...openBoxParameters, amount: max, payment_token_index: 1, box_id: not_sell_all_box_id };

    while (true) {
      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      if (boxStatus.remaining.eq(0)) {
        break;
      }

      await mbContract.connect(testAccount).openBox.apply(null, Object.values(parameters));
      {
        const logs = await mbContract.queryFilter(mbContract.filters.OpenSuccess());
        const result = last(logs)!.args;
        expect(result).to.have.property("amount");
      }
    }
    expect((await enumerableNftContract.balanceOf(await testAccount.getAddress())).eq(remain)).to.be.true;
  });

  it("Should 721A NFT work", async () => {
    let box_id;
    const contractEthBalanceBeforeOpen = await ethers.provider.getBalance(mbContract.address);
    const userEthBalanceBeforeOpen = await ethers.provider.getBalance(await user_2.getAddress());
    const batch = await mask721ANFTContract.BATCH_SIZE();
    await mask721ANFTContract.connect(user_1).mint(batch);
    const totalNFT = await mask721ANFTContract.balanceOf(await user_1.getAddress());
    expect(totalNFT.eq(batch)).to.be.true;
    expect((await mask721ANFTContract.balanceOf(await signers[5].getAddress())).eq(0)).to.be.true;
    await mask721ANFTContract.connect(user_1).setApprovalForAll(mbContract.address, true);
    {
      const parameter = { ...createBoxPara, nft_address: mask721ANFTContract.address, sell_all: true };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
      const result = last(logs)!.args;
      expect(result)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(result).to.have.property("nft_address").that.to.be.eq(mask721ANFTContract.address);
      expect(result).to.have.property("name").that.to.be.eq(parameter.name);
      expect(result).to.have.property("start_time").that.to.be.eq(parameter.start_time);
      expect(result).to.have.property("end_time").that.to.be.eq(parameter.end_time);
      expect(result).to.have.property("sell_all").that.to.be.eq(parameter.sell_all);
      expect(result).to.have.property("box_id");
      box_id = result.box_id;
    }
    const parameters = { ...openBoxParameters, box_id: box_id, amount: batch.toNumber() };
    const tx_parameters = {
      value: txParameters.value.mul(parameters.amount),
    };
    await mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters)));
    {
      const paymentEth = tx_parameters.value;
      const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
      const userEthBalanceAfterOpen = await ethers.provider.getBalance(await user_2.getAddress());
      expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(paymentEth))).to.be.true;
      expect(userEthBalanceBeforeOpen.gt(userEthBalanceAfterOpen.add(paymentEth))).to.be.true;
      const user_nft_balance = await mask721ANFTContract.balanceOf(await user_2.getAddress());
      expect(totalNFT.eq(user_nft_balance)).to.be.true;
      const owner_nft_balance = await mask721ANFTContract.balanceOf(await user_1.getAddress());
      expect(owner_nft_balance.eq(0)).to.be.true;
    }
    await expect(
      mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters))),
    ).to.be.revertedWith("no NFT left");
    {
      const boxInfo = await mbContract.getBoxInfo(parameters.box_id);
      const boxStatus = await mbContract.getBoxStatus(parameters.box_id);
      expect(boxInfo)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(boxInfo).to.have.property("nft_address").that.to.be.eq(mask721ANFTContract.address);
      expect(boxInfo).to.have.property("name").that.to.be.eq(createBoxPara.name);
      expect(boxStatus).to.have.property("started").that.to.be.eq(true);
      expect(boxStatus).to.have.property("expired").that.to.be.eq(false);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(0)).to.be.true;
      expect(boxStatus.total.eq(totalNFT)).to.be.true;
    }
  });

  it("Should claimPayment reject invalid parameters", async () => {
    await expect(mbContract.connect(user_2).claimPayment([sell_all_box_id])).to.be.revertedWith("not owner");
    await expect(mbContract.connect(user_2).claimPayment([not_sell_all_box_id])).to.be.revertedWith("not owner");
  });

  it("Should claimPayment work", async () => {
    {
      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([BigNumber.from(0), BigNumber.from(0)]);
    }
    const tx_parameters = {
      value: txParameters.value,
    };
    const open_parameters = { ...openBoxParameters, box_id: not_sell_all_box_id };
    await mbContract
      .connect(user_2)
      .openBox.apply(null, Object.values(addTxParameters(open_parameters, tx_parameters)));
    const paymentEthAmount = createBoxPara.payment[0][1];
    const paymentTokenAAmount = createBoxPara.payment[1][1];
    {
      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([paymentEthAmount, BigNumber.from(0)]);
    }
    open_parameters.payment_token_index = 1;
    await mbContract.connect(user_2).openBox.apply(null, Object.values(open_parameters));
    {
      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([paymentEthAmount, paymentTokenAAmount]);
    }
    {
      const sell_all_open_parameters = { ...openBoxParameters, box_id: sell_all_box_id };
      await mbContract
        .connect(user_2)
        .openBox.apply(null, Object.values(addTxParameters(sell_all_open_parameters, tx_parameters)));
      {
        const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
        expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([paymentEthAmount, paymentTokenAAmount]);
      }
      {
        const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
        expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([paymentEthAmount, BigNumber.from(0)]);
      }
    }
    // ETH balance before
    const authorEthBalanceBeforeClaim = await ethers.provider.getBalance(await user_1.getAddress());
    const contractEthBalanceBeforeClaim = await ethers.provider.getBalance(mbContract.address);
    // token A balance before
    const authorTokenABalanceBeforeClaim = await testTokenContract.balanceOf(await user_1.getAddress());
    const contractTokenABalanceBeforeClaim = await testTokenContract.balanceOf(mbContract.address);
    await expect(mbContract.connect(user_1).claimPayment([not_sell_all_box_id])).to.be.revertedWith(
      "not expired/sold-out",
    );
    await expect(mbContract.connect(user_2).claimPayment([not_sell_all_box_id])).to.be.revertedWith("not owner");

    await advanceTimeAndBlock(seconds_in_a_day * 90);
    await mbContract.connect(user_1).claimPayment([not_sell_all_box_id]);
    {
      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      // `claimPayment` can only claim payment in one of the boxes
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([BigNumber.from(0), BigNumber.from(0)]);
    }
    const authorEthBalanceAfterClaim = await ethers.provider.getBalance(await user_1.getAddress());
    const contractEthBalanceAfterClaim = await ethers.provider.getBalance(mbContract.address);
    // token A balance after
    const authorTokenABalanceAfterClaim = await testTokenContract.balanceOf(await user_1.getAddress());
    const contractTokenABalanceAfterClaim = await testTokenContract.balanceOf(mbContract.address);
    // assume `gas consumption` is less than `paymentEthAmount`
    expect(authorEthBalanceAfterClaim.gt(authorEthBalanceBeforeClaim)).to.be.true;
    expect(contractEthBalanceBeforeClaim.eq(contractEthBalanceAfterClaim.add(paymentEthAmount))).to.be.true;
    expect(authorTokenABalanceAfterClaim.eq(authorTokenABalanceBeforeClaim.add(paymentTokenAAmount))).to.be.true;
    expect(contractTokenABalanceBeforeClaim.eq(contractTokenABalanceAfterClaim.add(paymentTokenAAmount))).to.be.true;
    {
      const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
      // `claimPayment` can only claim payment in one of the boxes
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([paymentEthAmount, BigNumber.from(0)]);
    }
    await mbContract.connect(user_1).claimPayment([not_sell_all_box_id]);
    {
      const authorEthBalanceAfterClaimAgain = await ethers.provider.getBalance(await user_1.getAddress());
      const contractEthBalanceAfterClaimAgain = await ethers.provider.getBalance(mbContract.address);
      expect(authorEthBalanceAfterClaim.gt(authorEthBalanceAfterClaimAgain)).to.be.true;
      expect(contractEthBalanceAfterClaim.eq(contractEthBalanceAfterClaimAgain)).to.be.true;

      // token A balance after
      const authorTokenABalanceAfterClaimAgain = await testTokenContract.balanceOf(await user_1.getAddress());
      const contractTokenABalanceAfterClaimAgain = await testTokenContract.balanceOf(mbContract.address);
      expect(authorTokenABalanceAfterClaim.eq(authorTokenABalanceAfterClaimAgain)).to.be.true;
      expect(contractTokenABalanceAfterClaim.eq(contractTokenABalanceAfterClaimAgain)).to.be.true;
    }
    {
      const contractEthBalance = await ethers.provider.getBalance(mbContract.address);
      expect(contractEthBalance.gt(0)).to.be.true;
    }
  });

  it("Should MaskHolder work", async () => {
    expect((await testMaskTokenContract.balanceOf(await contractCreator.getAddress())).gt(0)).to.be.true;
    expect((await testMaskTokenContract.balanceOf(await user_1.getAddress())).eq(0)).to.be.true;

    const open_parameters = { ...openBoxParameters };
    {
      const parameter = {
        ...createBoxPara,
        holder_token_addr: testMaskTokenContract.address,
        sell_all: true,
        holder_min_token_amount: holderMinAmount,
      };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
      const result = last(logs)!.args;
      open_parameters.box_id = result.box_id;
    }
    await expect(
      mbContract.connect(user_1).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters))),
    ).to.be.revertedWith("not holding enough token");

    // transfer
    await testMaskTokenContract.transfer(await user_1.getAddress(), holderMinAmount);
    await mbContract.connect(user_1).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters)));

    const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
    expect(boxInfo).to.have.property("holder_min_token_amount");
    expect(boxInfo.holder_min_token_amount.eq(holderMinAmount)).to.be.true;
    expect(boxInfo).to.have.property("holder_token_addr");
    expect(boxInfo.holder_token_addr).to.be.eq(testMaskTokenContract.address);
  });
});
