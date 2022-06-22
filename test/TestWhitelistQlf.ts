import { ethers, upgrades } from "hardhat";
import { Signer, Contract } from "ethers";
import MockDate from "mockdate";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
const { expect } = use(chaiAsPromised);
import { takeSnapshot, revertToSnapShot } from "./helper";

import { WhitelistQlf } from "../types";
import jsonABI from "../artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json";

describe("WhitelistQlf", () => {
  let snapshotId: string;

  let signers: Signer[];
  let user_0: Signer;
  let user_1: Signer;
  let contractCreator: Signer;

  let contract: WhitelistQlf;

  before(async () => {
    signers = await ethers.getSigners();
    contractCreator = signers[0];
    user_0 = signers[1];
    user_1 = signers[2];

    const factory = await ethers.getContractFactory("WhitelistQlf");
    const proxy = await upgrades.deployProxy(factory, []);
    contract = new ethers.Contract(proxy.address, jsonABI.abi, contractCreator) as WhitelistQlf;
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

  it("Should initialize work", async () => {
    // should not be able to call it again
    await expect(contract.connect(contractCreator).initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
    await expect(contract.connect(user_0).initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
    await expect(contract.connect(user_1).initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );

    const owner = await contract.owner();
    expect(owner).to.be.eq(await contractCreator.getAddress());

    const version = await contract.version();
    expect(version).to.be.eq(1);
  });

  it("Should whitelist work", async () => {
    expect(await contract.white_list(await user_0.getAddress())).to.be.eq(false);
    expect(await contract.white_list(await user_1.getAddress())).to.be.eq(false);
    {
      const result = await contract.is_qualified(await user_0.getAddress(), []);
      expect(result.qualified).to.be.eq(false);
      expect(result.error_msg).to.be.eq("not whitelisted");
    }
    {
      const result = await contract.is_qualified(await user_1.getAddress(), []);
      expect(result.qualified).to.be.eq(false);
      expect(result.error_msg).to.be.eq("not whitelisted");
    }
    // add
    await expect(contract.connect(user_0).addWhitelist([await user_0.getAddress()])).to.be.revertedWith("not admin");
    await contract.connect(contractCreator).addWhitelist([await user_0.getAddress()]);
    expect(await contract.white_list(await user_0.getAddress())).to.be.eq(true);
    expect(await contract.white_list(await user_1.getAddress())).to.be.eq(false);
    {
      const result = await contract.is_qualified(await user_0.getAddress(), []);
      expect(result.qualified).to.be.eq(true);
    }
    {
      const result = await contract.is_qualified(await user_1.getAddress(), []);
      expect(result.qualified).to.be.eq(false);
      expect(result.error_msg).to.be.eq("not whitelisted");
    }
    // remove
    await expect(contract.connect(user_0).removeWhitelist([await user_0.getAddress()])).to.be.revertedWith("not admin");
    await contract.connect(contractCreator).removeWhitelist([await user_0.getAddress()]);
    expect(await contract.white_list(await user_0.getAddress())).to.be.eq(false);
    expect(await contract.white_list(await user_1.getAddress())).to.be.eq(false);
    {
      const result = await contract.is_qualified(await user_0.getAddress(), []);
      expect(result.qualified).to.be.eq(false);
      expect(result.error_msg).to.be.eq("not whitelisted");
    }
    {
      const result = await contract.is_qualified(await user_1.getAddress(), []);
      expect(result.qualified).to.be.eq(false);
      expect(result.error_msg).to.be.eq("not whitelisted");
    }
  });

  it("Should addAdmin/addWhitelist work", async () => {
    let user_test = signers[4];
    expect(await contract.white_list(await user_1.getAddress())).to.be.eq(false);
    expect(await contract.admin(await user_1.getAddress())).to.be.eq(false);
    {
      const result = await contract.is_qualified(await user_test.getAddress(), []);
      expect(result.qualified).to.be.eq(false);
    }
    await expect(contract.connect(user_1).addAdmin([await user_test.getAddress()])).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await contract.connect(contractCreator).addAdmin([await user_1.getAddress()]);
    expect(await contract.admin(await user_1.getAddress())).to.be.eq(true);
    await contract.connect(user_1).addWhitelist([await user_test.getAddress()]);
    expect(await contract.white_list(await user_test.getAddress())).to.be.eq(true);
    {
      const result = await contract.is_qualified(await user_test.getAddress(), []);
      expect(result.qualified).to.be.eq(true);
    }
  });
});
