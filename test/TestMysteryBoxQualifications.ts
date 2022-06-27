import { ethers, waffle, upgrades } from "hardhat";
import { BigNumber, Signer, utils } from "ethers";
import MockDate from "mockdate";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { last } from "lodash";
const { expect } = use(chaiAsPromised);
const { deployContract } = waffle;
import proofs from "../dist/proofs.json";

import { advanceBlock, takeSnapshot, revertToSnapShot } from "./helper";
import {
  MaskNFTInitParameters,
  openBoxParameters,
  holderMinAmount,
  generateCreateBoxPara,
  addTxParameters,
  TxParameter,
} from "./constants";

import {
  TestToken,
  MysteryBox,
  MaskEnumerableNFT,
  WhitelistQlf,
  SigVerifyQlf,
  MaskHolderQlf,
  MerkleProofQlf,
} from "../types";

import TestTokenArtifact from "../artifacts/contracts/test/test_token.sol/TestToken.json";
import MysteryBoxArtifact from "../artifacts/contracts/MysteryBox.sol/MysteryBox.json";
import EnumerableNftTokenABI from "../artifacts/contracts/test/MaskEnumerableNFT.sol/MaskEnumerableNFT.json";
import qlfMaskHolderJsonABI from "../artifacts/contracts/MaskHolderQlf.sol/MaskHolderQlf.json";
import qlfWhitelistJsonABI from "../artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json";

const interfaceABI = new ethers.utils.Interface(MysteryBoxArtifact.abi);

describe("MysteryBoxQualifications", () => {
  const network = "mainnet";
  const maskNftPara = MaskNFTInitParameters[network];
  const createBoxPara = generateCreateBoxPara(network);

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
  let verifier: Signer;
  let abiCoder: utils.AbiCoder;

  let testTokenContract: TestToken;
  let testMaskTokenContract: TestToken;

  let mbContract: MysteryBox;
  let whitelistQlfContract: WhitelistQlf;
  let sigVerifyQlfContract: SigVerifyQlf;
  let maskHolderQlfContract: MaskHolderQlf;
  let merkleRootQlfContract: MerkleProofQlf;
  let enumerableNftContract: MaskEnumerableNFT;

  // 1 billion tokens, typical decimal 18
  const testTokenMintAmount = ethers.utils.parseUnits("1", 27);
  const transferAmount = ethers.utils.parseUnits("1", 26);

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    // these are whitelisted `box creator`
    user_1 = signers[1];
    user_2 = signers[2];
    verifier = signers[3];
    abiCoder = new utils.AbiCoder();

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
      const factory = await ethers.getContractFactory("WhitelistQlf");
      const proxy = await upgrades.deployProxy(factory, []);
      whitelistQlfContract = new ethers.Contract(
        proxy.address,
        qlfWhitelistJsonABI.abi,
        contractCreator,
      ) as WhitelistQlf;
    }
    {
      const factory = await ethers.getContractFactory("SigVerifyQlf");
      const SigVerifyQlf = await factory.deploy();
      sigVerifyQlfContract = (await SigVerifyQlf.deployed()) as SigVerifyQlf;
    }
    {
      const factory = await ethers.getContractFactory("MaskHolderQlf");
      const proxy = await upgrades.deployProxy(factory, [testMaskTokenContract.address, holderMinAmount]);
      maskHolderQlfContract = new ethers.Contract(
        proxy.address,
        qlfMaskHolderJsonABI.abi,
        contractCreator,
      ) as MaskHolderQlf;
    }
    {
      const factory = await ethers.getContractFactory("MerkleProofQlf");
      const MerkleProofQlf = await factory.deploy();
      merkleRootQlfContract = (await MerkleProofQlf.deployed()) as MerkleProofQlf;
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
      const factory = await ethers.getContractFactory("MysteryBox");
      const proxy = await upgrades.deployProxy(factory, []);
      mbContract = new ethers.Contract(proxy.address, MysteryBoxArtifact.abi, contractCreator) as MysteryBox;
    }
    await mbContract.addWhitelist([await user_1.getAddress(), await user_2.getAddress()]);
    await testTokenContract.transfer(await user_2.getAddress(), transferAmount);
    await testTokenContract.connect(user_2).approve(mbContract.address, transferAmount);

    createBoxPara.nft_address = enumerableNftContract.address;
    // mint 100 NFT for testing
    await enumerableNftContract.connect(user_1).mint(50);
    await enumerableNftContract.connect(user_1).mint(50);
    await enumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);

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

  it("Should addAdmin/addWhitelist work", async () => {
    let user_test = signers[4];
    await enumerableNftContract.connect(user_test).mint(10);
    await enumerableNftContract.connect(user_test).setApprovalForAll(mbContract.address, true);
    const parameter = { ...createBoxPara, sell_all: true };

    expect(await mbContract.whitelist(await user_1.getAddress())).to.be.eq(true);
    expect(await mbContract.admin(await user_1.getAddress())).to.be.eq(false);
    await expect(mbContract.connect(user_1).addAdmin([await user_test.getAddress()])).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(mbContract.connect(user_1).addWhitelist([await user_test.getAddress()])).to.be.revertedWith(
      "not admin",
    );
    await expect(mbContract.connect(user_test).createBox.apply(null, Object.values(parameter))).to.be.revertedWith(
      "not whitelisted",
    );
    expect(await mbContract.whitelist(await user_test.getAddress())).to.be.eq(false);
    expect(await mbContract.admin(await user_test.getAddress())).to.be.eq(false);
    await mbContract.connect(contractCreator).addAdmin([await user_1.getAddress()]);
    expect(await mbContract.admin(await user_1.getAddress())).to.be.eq(true);
    await mbContract.connect(user_1).addWhitelist([await user_test.getAddress()]);
    expect(await mbContract.whitelist(await user_test.getAddress())).to.be.eq(true);
    await expect(mbContract.connect(user_1).addAdmin([await user_test.getAddress()])).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await mbContract.connect(user_test).createBox.apply(null, Object.values(parameter));

    await expect(mbContract.connect(user_test).removeWhitelist([await user_test.getAddress()])).to.be.revertedWith(
      "not admin",
    );
    await mbContract.connect(user_1).removeWhitelist([await user_test.getAddress()]);
    expect(await mbContract.whitelist(await user_test.getAddress())).to.be.eq(false);
    await expect(mbContract.connect(user_test).createBox.apply(null, Object.values(parameter))).to.be.revertedWith(
      "not whitelisted",
    );

    await mbContract.connect(contractCreator).removeAdmin([await user_1.getAddress()]);
    expect(await mbContract.admin(await user_1.getAddress())).to.be.eq(false);
    await expect(mbContract.connect(user_1).addWhitelist([await user_test.getAddress()])).to.be.revertedWith(
      "not admin",
    );
  });

  it("Should whitelist qualification work", async () => {
    const parameter = { ...createBoxPara, sell_all: true, qualification: whitelistQlfContract.address };
    await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
    const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
    const result = last(logs)!.args;
    const open_parameters = { ...openBoxParameters, box_id: result.box_id };
    await whitelistQlfContract.addWhitelist([await user_1.getAddress()]);
    await mbContract.connect(user_1).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters)));
    await expect(
      mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters))),
    ).to.be.revertedWith("not whitelisted");
    const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
    expect(boxInfo).to.have.property("qualification").that.to.be.eq(whitelistQlfContract.address);
  });

  it("Should signature verification qualification work", async () => {
    // convert address to bytes32
    const qualification_data = utils.hexZeroPad(await verifier.getAddress(), 32);
    const parameter = {
      ...createBoxPara,
      sell_all: true,
      qualification: sigVerifyQlfContract.address,
      qualification_data: qualification_data,
    };

    await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
    const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
    const result = last(logs)!.args;
    const open_parameters = { ...openBoxParameters, box_id: result.box_id };
    {
      const msg_hash = utils.keccak256(await user_1.getAddress());
      const signature = await verifier.signMessage(ethers.utils.arrayify(msg_hash));
      open_parameters.proof = signature;
      await mbContract
        .connect(user_1)
        .openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters)));
      await expect(
        mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters))),
      ).to.be.revertedWith("not qualified");
    }
    const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
    expect(boxInfo).to.have.property("qualification").that.to.be.eq(sigVerifyQlfContract.address);
  });

  it("Should merkle root qualification work", async () => {
    const parameter = {
      ...createBoxPara,
      sell_all: true,
      qualification: merkleRootQlfContract.address,
      qualification_data: proofs.merkleRoot,
    };

    await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
    const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
    const result = last(logs)!.args;
    const open_parameters = { ...openBoxParameters, box_id: result.box_id };
    {
      const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
      expect(boxInfo).to.have.property("qualification").that.to.be.eq(merkleRootQlfContract.address);
      expect(boxInfo).to.have.property("qualification_data").that.to.be.eq(proofs.merkleRoot);
    }
    {
      let user_1_index = proofs.leaves.length;
      for (let i = 0; i < proofs.leaves.length; i++) {
        if (proofs.leaves[i].address === (await user_1.getAddress())) {
          user_1_index = i;
        }
      }
      expect(user_1_index < proofs.leaves.length).to.be.true;
      const proof = abiCoder.encode(["bytes32[]"], [proofs.leaves[user_1_index].proof]);
      open_parameters.proof = proof;
      await mbContract
        .connect(user_1)
        .openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters)));
      await expect(
        mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters))),
      ).to.be.revertedWith("not qualified");
    }
    {
      let user_2_index = proofs.leaves.length;
      for (let i = 0; i < proofs.leaves.length; i++) {
        if (proofs.leaves[i].address === (await user_2.getAddress())) {
          user_2_index = i;
        }
      }
      expect(user_2_index < proofs.leaves.length).to.be.true;

      const proof = abiCoder.encode(["bytes32[]"], [proofs.leaves[user_2_index].proof]);
      open_parameters.proof = proof;
      await expect(
        mbContract.connect(user_2).setQualificationData(open_parameters.box_id, createBoxPara.qualification_data),
      ).to.be.revertedWith("not box owner");
      await mbContract.connect(user_1).setQualificationData(open_parameters.box_id, createBoxPara.qualification_data);
      {
        const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
        expect(boxInfo).to.have.property("qualification_data").that.to.be.eq(createBoxPara.qualification_data);
      }
      await expect(
        mbContract.connect(user_2).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters))),
      ).to.be.revertedWith("not qualified");
      await mbContract.connect(user_1).setQualificationData(open_parameters.box_id, proofs.merkleRoot);
      {
        const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
        expect(boxInfo).to.have.property("qualification_data").that.to.be.eq(proofs.merkleRoot);
      }
      await mbContract
        .connect(user_2)
        .openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters)));
    }
  });

  it("Should MaskHolderQlf qualification work", async () => {
    expect((await testMaskTokenContract.balanceOf(await contractCreator.getAddress())).gt(0)).to.be.true;
    expect((await testMaskTokenContract.balanceOf(await user_1.getAddress())).eq(0)).to.be.true;

    const parameter = { ...createBoxPara, sell_all: true, qualification: maskHolderQlfContract.address };
    await mbContract.connect(user_1).createBox.apply(null, Object.values(parameter));
    const logs = await mbContract.queryFilter(mbContract.filters.CreationSuccess());
    const result = last(logs)!.args;
    const open_parameters = { ...openBoxParameters, box_id: result.box_id };
    await expect(
      mbContract.connect(user_1).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters))),
    ).to.be.revertedWith("not holding enough token");

    // transfer
    await testMaskTokenContract.transfer(await user_1.getAddress(), holderMinAmount);
    await mbContract.connect(user_1).openBox.apply(null, Object.values(addTxParameters(open_parameters, txParameters)));

    const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
    expect(boxInfo).to.have.property("qualification").that.to.be.eq(maskHolderQlfContract.address);
  });

  it("Should transferOwnership work", async () => {
    await expect(mbContract.connect(user_1).transferOwnership(await user_1.getAddress())).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await mbContract.connect(contractCreator).transferOwnership(await user_1.getAddress());
    const owner = await mbContract.owner();
    expect(owner).to.be.eq(await user_1.getAddress());
  });
});
