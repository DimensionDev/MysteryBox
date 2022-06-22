import { ethers, waffle, upgrades } from "hardhat";
import { BigNumber, Signer } from "ethers";
import MockDate from "mockdate";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { last } from "lodash";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;

import { advanceBlock, advanceTimeAndBlock, takeSnapshot, revertToSnapShot } from "./helper";
import {
  MaskNFTInitParameters,
  openBoxParameters,
  MaxNumberOfNFT,
  seconds_in_a_day,
  generateCreateBoxPara,
  addTxParameters,
  TxParameter,
} from "./constants";

import { TestToken, MysteryBox, MaskEnumerableNFT, MaskNonEnumerableNFT } from "../types";

import TestTokenArtifact from "../artifacts/contracts/test/test_token.sol/TestToken.json";
import MysteryBoxArtifact from "../artifacts/contracts/MysteryBox.sol/MysteryBox.json";
import EnumerableNftTokenABI from "../artifacts/contracts/test/MaskEnumerableNFT.sol/MaskEnumerableNFT.json";
import nonEnumerableNftTokenABI from "../artifacts/contracts/test/MaskNonEnumerableNFT.sol/MaskNonEnumerableNFT.json";

describe("MysteryBoxBasicInteractions", () => {
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

  let testTokenAContract: TestToken;
  let testTokenBContract: TestToken;
  let testTokenCContract: TestToken;

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

    testTokenAContract = (await deployContract(contractCreator, TestTokenArtifact, [
      "TestTokenA",
      "TESTA",
      testTokenMintAmount,
    ])) as TestToken;
    testTokenBContract = (await deployContract(contractCreator, TestTokenArtifact, [
      "TestTokenB",
      "TESTB",
      testTokenMintAmount,
    ])) as TestToken;
    testTokenCContract = (await deployContract(contractCreator, TestTokenArtifact, [
      "TestTokenC",
      "TESTC",
      testTokenMintAmount,
    ])) as TestToken;

    // first is ETH: address(0)
    createBoxPara.payment.push([testTokenAContract.address, createBoxPara.payment[0][1]]);
    createBoxPara.payment.push([testTokenBContract.address, createBoxPara.payment[0][1]]);
    createBoxPara.payment.push([testTokenCContract.address, createBoxPara.payment[0][1]]);
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
    await testTokenAContract.transfer(await user_2.getAddress(), transferAmount);
    await testTokenAContract.connect(user_2).approve(mbContract.address, transferAmount);

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
      expect(result)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(result).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
      expect(result).to.have.property("name").that.to.be.eq(parameter.name);
      expect(result).to.have.property("start_time").that.to.be.eq(parameter.start_time);
      expect(result).to.have.property("end_time").that.to.be.eq(parameter.end_time);
      expect(result).to.have.property("sell_all").that.to.be.eq(parameter.sell_all);
      expect(result).to.have.property("box_id");
      sell_all_box_id = result.box_id;
    }
    openBoxParameters.box_id = sell_all_box_id;
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
      expect(result)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(result).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
      expect(result).to.have.property("name").that.to.be.eq(parameter.name);
      expect(result).to.have.property("start_time").that.to.be.eq(parameter.start_time);
      expect(result).to.have.property("end_time").that.to.be.eq(parameter.end_time);
      expect(result).to.have.property("sell_all").that.to.be.eq(parameter.sell_all);
      expect(result).to.have.property("box_id");
      not_sell_all_box_id = result.box_id;

      const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(not_sell_all_nft_id_list.length)).to.be.true;
      expect(boxStatus.total.eq(not_sell_all_nft_id_list.length)).to.be.true;
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);

      const nftList = await mbContract.getNftListForSale(not_sell_all_box_id, 0, parameter.nft_id_list.length);
      expect(nftList).to.eql(parameter.nft_id_list);
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

  it("Should variables initialized properly in contract creator", async () => {
    const owner = await mbContract.owner();
    expect(owner).to.be.eq(await contractCreator.getAddress());
  });

  it("Should not be able to call initialize", async () => {
    await expect(mbContract.connect(contractCreator).initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
    await expect(mbContract.connect(user_1).initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
    await expect(mbContract.connect(user_2).initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("Should addNftIntoBox work", async () => {
    // mint 10 NFT for testing
    const mintNftAmount = 10;
    await enumerableNftContract.connect(user_2).mint(mintNftAmount);
    await enumerableNftContract.connect(user_2).setApprovalForAll(mbContract.address, true);
    const nftBalance = await enumerableNftContract.balanceOf(await user_2.getAddress());
    expect(nftBalance.eq(mintNftAmount)).to.be.true;

    let nft_id_list: BigNumber[] = [];
    // half of the NFT ids owned
    for (let i = 0; i < mintNftAmount / 2; i++) {
      const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_2.getAddress(), i);
      nft_id_list.push(nftId);
    }
    let box_id;
    {
      const parameter = { ...createBoxPara, sell_all: false, nft_id_list: nft_id_list };
      await mbContract.connect(user_2).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());

      const result = last(logs)!.args;
      expect(result).to.have.property("box_id");
      box_id = result.box_id;
    }
    {
      const nftList = await mbContract.getNftListForSale(box_id, 0, mintNftAmount);
      expect(nftList).to.eql(nft_id_list);

      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(nft_id_list.length)).to.be.true;
      expect(boxStatus.total.eq(nft_id_list.length)).to.be.true;
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);
    }

    let append_nft_id_list: BigNumber[] = [];
    for (let i = mintNftAmount / 2; i < mintNftAmount; i++) {
      const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_2.getAddress(), i);
      append_nft_id_list.push(nftId);
    }
    await expect(mbContract.connect(user_2).addNftIntoBox(sell_all_box_id, [])).to.be.revertedWith("not box owner");
    await expect(mbContract.connect(user_1).addNftIntoBox(sell_all_box_id, [])).to.be.revertedWith(
      "can not add for sell_all",
    );
    await expect(mbContract.connect(user_1).addNftIntoBox(box_id, append_nft_id_list)).to.be.revertedWith(
      "not box owner",
    );

    {
      // try adding 'NFT id' he/she does not own
      let invalid_nft_id: BigNumber[] = [];
      const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
      expect(nftBalance.gt(0)).to.be.true;
      const nftId = await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), 0);
      invalid_nft_id.push(nftId);
      await expect(mbContract.connect(user_2).addNftIntoBox(box_id, invalid_nft_id)).to.be.revertedWith(
        "not nft owner",
      );
    }
    await mbContract.connect(user_2).addNftIntoBox(box_id, append_nft_id_list);
    {
      const final_nft_id_list = nft_id_list.concat(append_nft_id_list);
      const nftList = await mbContract.getNftListForSale(box_id, 0, mintNftAmount);
      expect(nftList).to.eql(final_nft_id_list);
      const boxStatus = await mbContract.getBoxStatus(box_id);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(final_nft_id_list.length)).to.be.true;
      expect(boxStatus.total.eq(final_nft_id_list.length)).to.be.true;
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);
    }
  });

  it("Should cancelBox work", async () => {
    {
      const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
      expect(boxStatus).to.have.property("started").that.to.be.eq(true);
      expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);
      await expect(mbContract.connect(user_2).cancelBox(sell_all_box_id)).to.be.revertedWith("not box owner");
      await expect(mbContract.connect(user_1).cancelBox(sell_all_box_id)).to.be.revertedWith("sale started");
    }
    {
      const now = Math.floor(new Date().getTime() / 1000);
      const parameter = { ...createBoxPara, start_time: now + seconds_in_a_day };
      await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
      const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());

      const result = last(logs)!.args;

      const open_parameter = { ...openBoxParameters, box_id: result.box_id };
      {
        const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
        expect(boxStatus).to.have.property("started").that.to.be.eq(false);
        expect(boxStatus).to.have.property("canceled").that.to.be.eq(false);
      }
      await expect(mbContract.connect(user_2).cancelBox(open_parameter.box_id)).to.be.revertedWith("not box owner");
      await mbContract.connect(user_1).cancelBox(open_parameter.box_id);
      await expect(mbContract.connect(user_1).cancelBox(open_parameter.box_id)).to.be.revertedWith(
        "sale canceled already",
      );
      {
        const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
        expect(boxStatus).to.have.property("started").that.to.be.eq(false);
        expect(boxStatus).to.have.property("canceled").that.to.be.eq(true);
      }
      await advanceTimeAndBlock(seconds_in_a_day);
      await expect(
        mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameter, txParameters))),
      ).to.be.revertedWith("sale canceled");
    }
  });

  it("Should not be able to openBox if not-started", async () => {
    const now = Math.floor(new Date().getTime() / 1000);
    const parameter = { ...createBoxPara, start_time: now + seconds_in_a_day };
    await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
    const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());

    const result = last(logs)!.args;
    const open_parameter = { ...openBoxParameters, box_id: result.box_id };
    {
      const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
      expect(boxStatus).to.have.property("started").that.to.be.eq(false);
    }
    await expect(
      mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameter, txParameters))),
    ).to.be.revertedWith("not started");
  });

  it("Should openBox & getBoxInfo work", async () => {
    const expectedRemaining = await enumerableNftContract.balanceOf(await user_1.getAddress());
    const userNftBalance = await enumerableNftContract.balanceOf(await user_2.getAddress());
    {
      const boxInfo = await mbContract.getBoxInfo(sell_all_box_id);
      expect(boxInfo)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(boxInfo).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
      expect(boxInfo).to.have.property("name").that.to.be.eq(createBoxPara.name);
      expect(boxInfo).to.have.property("personal_limit").that.to.be.eq(createBoxPara.personal_limit);
      expect(boxInfo).to.have.property("qualification").that.to.be.eq(createBoxPara.qualification);
      expect(boxInfo).to.have.property("qualification_data").that.to.be.eq(createBoxPara.qualification_data);

      const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
      expect(boxStatus).to.have.property("payment");
      expect(boxStatus.payment.map((info) => info.token_addr)).to.eql([
        createBoxPara.payment[0][0],
        createBoxPara.payment[1][0],
        createBoxPara.payment[2][0],
        createBoxPara.payment[3][0],
      ]);
      expect(boxStatus.payment.map((info) => info.price)).to.eql([
        createBoxPara.payment[0][1],
        createBoxPara.payment[1][1],
        createBoxPara.payment[2][1],
        createBoxPara.payment[3][1],
      ]);
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
      ]);
      expect(boxStatus).to.have.property("started").that.to.be.eq(true);
      expect(boxStatus).to.have.property("expired").that.to.be.eq(false);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(expectedRemaining)).to.be.true;
      expect(boxStatus.total.eq(expectedRemaining)).to.be.true;
    }
    const tx_parameters = {
      value: txParameters.value,
    };
    await mbContract
      .connect(user_2)
      .openBox.apply(null, Object.values(addTxParameters(openBoxParameters, tx_parameters)));
    {
      const newUserNftBalance = await enumerableNftContract.balanceOf(await user_2.getAddress());
      expect(newUserNftBalance.eq(userNftBalance.add(1))).to.be.true;
      {
        const logs = await enumerableNftContract.queryFilter(enumerableNftContract.filters.Transfer());
        const result = last(logs)!.args;
        expect(result)
          .to.have.property("from")
          .that.to.be.eq(await user_1.getAddress());
        expect(result)
          .to.have.property("to")
          .that.to.be.eq(await user_2.getAddress());
        expect(result).to.have.property("tokenId");
      }
      {
        const logs = await mbContract.queryFilter(mbContract.filters.OpenSuccess());
        const result = last(logs)!.args;
        expect(result).to.have.property("box_id");
        expect(result.box_id.eq(openBoxParameters.box_id)).to.be.true;
        expect(result)
          .to.have.property("customer")
          .that.to.be.eq(await user_2.getAddress());
        expect(result).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
        expect(result).to.have.property("amount");
        expect(result.amount.eq(openBoxParameters.amount)).to.be.true;
      }
    }
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
      expect(boxStatus.payment.map((info) => info.token_addr)).to.eql([
        createBoxPara.payment[0][0],
        createBoxPara.payment[1][0],
        createBoxPara.payment[2][0],
        createBoxPara.payment[3][0],
      ]);
      expect(boxStatus.payment.map((info) => info.price)).to.eql([
        createBoxPara.payment[0][1],
        createBoxPara.payment[1][1],
        createBoxPara.payment[2][1],
        createBoxPara.payment[3][1],
      ]);
      expect(boxStatus.payment.map((info) => info.receivable_amount)).to.eql([
        createBoxPara.payment[0][1],
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
      ]);
      expect(boxStatus).to.have.property("started").that.to.be.eq(true);
      expect(boxStatus).to.have.property("expired").that.to.be.eq(false);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(expectedRemaining.sub(1))).to.be.true;
      expect(boxStatus.total.eq(expectedRemaining)).to.be.true;
    }
  });

  it("Should not openBox expired boxes", async () => {
    const now = Math.floor(new Date().getTime() / 1000);
    const parameter = { ...createBoxPara, end_time: now + seconds_in_a_day / 2 };
    // to pass `createBox` validation
    await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
    const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());

    const result = last(logs)!.args;

    const open_parameter = { ...openBoxParameters, box_id: result.box_id };
    await advanceTimeAndBlock(seconds_in_a_day);
    await expect(
      mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameter, txParameters))),
    ).to.be.revertedWith("expired");
    {
      const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
      expect(boxStatus).to.have.property("expired").that.to.be.eq(true);
    }
  });

  it("Should createBox reject invalid parameters", async () => {
    {
      const invalidParameter = { ...createBoxPara, end_time: 0 };
      await expect(
        mbContract.connect(user_1).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("invalid end time");
    }
    {
      const invalidParameter = { ...createBoxPara, payment: [] };
      await expect(
        mbContract.connect(user_1).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("invalid payment");
    }
    {
      await nonEnumerableNftContract.connect(user_1).mint(50);
      await nonEnumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);
      const invalidParameter = { ...createBoxPara, nft_address: nonEnumerableNftContract.address, sell_all: true };
      await expect(
        mbContract.connect(user_1).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("not enumerable nft");
    }
    {
      const invalidParameter = { ...createBoxPara, sell_all: false, nft_id_list: [] };
      await expect(
        mbContract.connect(user_1).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("empty nft list");
    }
    {
      await enumerableNftContract.connect(user_2).mint(50);
      const invalidParameter = { ...createBoxPara, sell_all: true };
      await expect(
        mbContract.connect(user_2).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("not ApprovedForAll");
    }
    {
      const invalidParameter = { ...createBoxPara, sell_all: true };
      await enumerableNftContract.connect(user_3).setApprovalForAll(mbContract.address, true);
      await expect(
        mbContract.connect(user_3).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("no nft owned");
    }
    {
      const user_0_NftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
      expect(user_0_NftBalance.gt(0)).to.be.true;
      const user_1_NftBalance = await enumerableNftContract.balanceOf(await user_2.getAddress());
      expect(user_1_NftBalance.gt(0)).to.be.true;
      let nft_id_list: BigNumber[] = [];
      nft_id_list.push(await enumerableNftContract.tokenOfOwnerByIndex(await user_1.getAddress(), 0));
      nft_id_list.push(await enumerableNftContract.tokenOfOwnerByIndex(await user_2.getAddress(), 0));
      const invalidParameter = { ...createBoxPara, sell_all: false, nft_id_list: nft_id_list };
      await expect(
        mbContract.connect(user_1).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.revertedWith("now owner");
    }
    {
      let payment = createBoxPara.payment;
      payment.push([await user_2.getAddress(), createBoxPara.payment[0][1]]);
      const invalidParameter = {
        ...createBoxPara,
        payment: payment,
      };
      await expect(
        mbContract.connect(user_1).createBox.apply(null, Object.values(invalidParameter)),
      ).to.be.rejectedWith(Error);
    }
  });

  it("Should openBox reject invalid parameters", async () => {
    {
      const invalidParameter = { ...openBoxParameters, payment_token_index: 1 };
      await testTokenAContract.connect(user_3).approve(mbContract.address, transferAmount);
      await expect(mbContract.connect(user_3).openBox.apply(null, Object.values(invalidParameter))).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );
      await testTokenAContract.connect(user_3).approve(mbContract.address, 0);
      await testTokenAContract.transfer(await user_3.getAddress(), transferAmount);
      await expect(mbContract.connect(user_3).openBox.apply(null, Object.values(invalidParameter))).to.be.revertedWith(
        "ERC20: insufficient allowance",
      );
    }
    {
      const invalidParameter = { ...openBoxParameters, amount: MaxNumberOfNFT + 1 };
      await expect(mbContract.connect(user_3).openBox.apply(null, Object.values(invalidParameter))).to.be.revertedWith(
        "exceeds personal limit",
      );
    }
    {
      const invalidParameter = { ...openBoxParameters, payment_token_index: createBoxPara.payment.length };
      await expect(mbContract.connect(user_3).openBox.apply(null, Object.values(invalidParameter))).to.be.revertedWith(
        "invalid payment token",
      );
    }
    {
      const tx_parameters: TxParameter = {
        value: BigNumber.from(0),
      };
      await expect(
        mbContract
          .connect(user_3)
          .openBox.apply(null, Object.values(addTxParameters(openBoxParameters, tx_parameters))),
      ).to.be.revertedWith("not enough ETH");
    }
  });

  it("Should personal limit work", async () => {
    const nftBalance = await enumerableNftContract.balanceOf(await user_1.getAddress());
    const contractEthBalanceBeforeOpen = await ethers.provider.getBalance(mbContract.address);
    const userEthBalanceBeforeOpen = await ethers.provider.getBalance(await user_2.getAddress());
    const parameters = { ...openBoxParameters, amount: MaxNumberOfNFT / 2 };
    const tx_parameters: TxParameter = {
      value: txParameters.value.mul(parameters.amount),
    };
    await mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters)));
    {
      const paymentEth = tx_parameters.value;
      const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
      const userEthBalanceAfterOpen = await ethers.provider.getBalance(await user_2.getAddress());
      expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(paymentEth))).to.be.true;
      expect(userEthBalanceBeforeOpen.gt(userEthBalanceAfterOpen.add(paymentEth))).to.be.true;
    }
    await mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters)));
    {
      const paymentEth = tx_parameters.value.mul(2);
      const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
      const userEthBalanceAfterOpen = await ethers.provider.getBalance(await user_2.getAddress());
      expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(paymentEth))).to.be.true;
      expect(userEthBalanceBeforeOpen.gt(userEthBalanceAfterOpen.add(paymentEth))).to.be.true;
    }
    await expect(
      mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(parameters, tx_parameters))),
    ).to.be.revertedWith("exceeds personal limit");
    {
      const boxInfo = await mbContract.getBoxInfo(parameters.box_id);
      const boxStatus = await mbContract.getBoxStatus(parameters.box_id);
      expect(boxInfo)
        .to.have.property("creator")
        .that.to.be.eq(await user_1.getAddress());
      expect(boxInfo).to.have.property("nft_address").that.to.be.eq(enumerableNftContract.address);
      expect(boxInfo).to.have.property("name").that.to.be.eq(createBoxPara.name);
      expect(boxStatus).to.have.property("started").that.to.be.eq(true);
      expect(boxStatus).to.have.property("expired").that.to.be.eq(false);
      expect(boxStatus).to.have.property("remaining");
      expect(boxStatus.remaining.eq(nftBalance.sub(MaxNumberOfNFT))).to.be.true;
      expect(boxStatus.total.eq(nftBalance)).to.be.true;
    }
  });
});
