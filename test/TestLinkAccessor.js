const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const helper = require('./helper');
const { soliditySha3 } = require('web3-utils');

let snapshotId;
let mockLinkAccessorApp;
let linkAccessorApp;
let contractCreator;
let fake_vrf_coordinator;
let user_0;
let LinkTokenApp;

const { ZeroAddress, LinkAccessorCtorParameters, DrawTxParameters } = require('./constants');
const ERC20Artifact = require('../node_modules/@openzeppelin/contracts/build/contracts/ERC20.json');
const { ChainlinkVRFConfig } = require('../SmartContractProjectConfig/config.js');

describe('LinkAccessor', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        fake_vrf_coordinator = signers[1];
        user_0 = signers[2];
        {
            LinkAccessorCtorParameters.vrfCoordinator = fake_vrf_coordinator.address;
            const factory = await ethers.getContractFactory('MockLinkAccessor');
            const deploy = await factory.deploy(...Object.values(LinkAccessorCtorParameters));
            mockLinkAccessorApp = await deploy.deployed();
        }
        {
            LinkAccessorCtorParameters.vrfCoordinator = fake_vrf_coordinator.address;
            const factory = await ethers.getContractFactory('LinkAccessor');
            const deploy = await factory.deploy(...Object.values(LinkAccessorCtorParameters));
            linkAccessorApp = await deploy.deployed();
        }
        LinkTokenApp = new ethers.Contract(ChainlinkVRFConfig.mainnet.LinkAddress, ERC20Artifact.abi, contractCreator);
        await linkAccessorApp.setMysteryBox(contractCreator.address);
    });

    beforeEach(async () => {
        snapshotId = await helper.takeSnapshot();
        MockDate.set(Date.now());
    });

    afterEach(async () => {
        await helper.revertToSnapShot(snapshotId);
        // We also need to reset the "real time" (as what we do for evm)
        MockDate.reset();
    });

    it('Should LinkAccessor initialized properly in mockLinkAccessorApp creator', async () => {
        const keyHash = await mockLinkAccessorApp.keyHash();
        expect(keyHash.toString().toUpperCase()).to.be.eq(
            LinkAccessorCtorParameters.linkKeyHash.toString().toUpperCase(),
        );

        const fee = await mockLinkAccessorApp.fee();
        expect(fee.eq(LinkAccessorCtorParameters.fee)).to.be.true;

        const mysteryBox = await mockLinkAccessorApp.mysteryBox();
        expect(mysteryBox).to.be.eq(LinkAccessorCtorParameters.mysteryBox);

        const randomNumber = await mockLinkAccessorApp.randomNumber();
        expect(randomNumber.eq(0)).to.be.true;
    });

    it('Should getRandomNumber work', async () => {
        await expect(mockLinkAccessorApp.getRandomNumber()).to.be.rejectedWith(Error);
        await expect(linkAccessorApp.getRandomNumber()).to.be.rejectedWith(Error);

        await expect(linkAccessorApp.connect(user_0).getRandomNumber()).to.be.rejectedWith(Error);
        {
            const txParameters = JSON.parse(JSON.stringify(DrawTxParameters));
            // a very small amount of ETH
            txParameters.value = ethers.utils.parseUnits('0.00002', 'ether');
            await expect(linkAccessorApp.getRandomNumber(txParameters)).to.be.rejectedWith('not enough $LINK');
        }
        expect((await LinkTokenApp.balanceOf(linkAccessorApp.address)).eq(0)).to.be.true;
        await linkAccessorApp.getRandomNumber(DrawTxParameters);
        // assume `ETH fee` > `$LINK token fee`
        const balance = await LinkTokenApp.balanceOf(linkAccessorApp.address);
        expect((await LinkTokenApp.balanceOf(linkAccessorApp.address)).gt(0)).to.be.true;
    });

    it('Should MockLinkAccessor::fulfillRandomness work', async () => {
        const fakeRequestId = LinkAccessorCtorParameters.linkKeyHash;
        const fakeRand = LinkAccessorCtorParameters.link;
        // fulfillRandomness is `internal`, we need to call `rawFulfillRandomness` instead.
        // Only `vrfCoordinator` can call `rawFulfillRandomness`
        await expect(mockLinkAccessorApp.rawFulfillRandomness(fakeRequestId, fakeRand)).to.be.rejectedWith(
            'Only VRFCoordinator can fulfill',
        );

        // `fake_vrf_coordinator` is a fake `vrfCoordinator`
        await mockLinkAccessorApp.connect(fake_vrf_coordinator).rawFulfillRandomness(fakeRequestId, fakeRand);
        const randomNumber = await mockLinkAccessorApp.randomNumber();
        expect(randomNumber.eq(fakeRand)).to.be.true;

        // Others will be tested in `TestMysteryBox.js`
    });

    it('Should LinkAccessor::fulfillRandomness work', async () => {
        await linkAccessorApp.setMysteryBox(ZeroAddress);
        const fakeRequestId = LinkAccessorCtorParameters.linkKeyHash;
        const fakeRand = LinkAccessorCtorParameters.link;
        // fulfillRandomness is `internal`, we need to call `rawFulfillRandomness` instead.
        // Only `vrfCoordinator` can call `rawFulfillRandomness`
        await expect(linkAccessorApp.rawFulfillRandomness(fakeRequestId, fakeRand)).to.be.rejectedWith(
            'Only VRFCoordinator can fulfill',
        );

        // `fake_vrf_coordinator` is a fake `vrfCoordinator`
        await linkAccessorApp.connect(fake_vrf_coordinator).rawFulfillRandomness(fakeRequestId, fakeRand);
    });

    // TODO
    it('Should $LINK token swap work', async () => {});

    // TODO
    it('Should transfer work', async () => {
        {
            const txParameters = JSON.parse(JSON.stringify(DrawTxParameters));
            txParameters.value = ethers.utils.parseUnits('1', 'ether');
            await linkAccessorApp.getRandomNumber(DrawTxParameters);
            // TODO check balance of $LINK
            await linkAccessorApp.getRandomNumber(DrawTxParameters);
        }
    });

    // TODO
    it('Should sendRandomNumber work', async () => {
        const fakeRequestId = LinkAccessorCtorParameters.linkKeyHash;
        const fakeRand = LinkAccessorCtorParameters.link;

        await expect(mockLinkAccessorApp.connect(user_0).sendRandomNumber(fakeRequestId, fakeRand)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mockLinkAccessorApp.connect(contractCreator).sendRandomNumber(fakeRequestId, fakeRand);
    });

    it('Should setFee work', async () => {
        expect((await mockLinkAccessorApp.fee()).eq(LinkAccessorCtorParameters.fee)).to.be.true;
        const newFee = LinkAccessorCtorParameters.fee.mul(2);
        await expect(mockLinkAccessorApp.connect(user_0).setFee(newFee)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mockLinkAccessorApp.connect(contractCreator).setFee(newFee);
        expect((await mockLinkAccessorApp.fee()).eq(newFee)).to.be.true;
    });

    it('Should setKeyHash work', async () => {
        {
            const keyHash = await mockLinkAccessorApp.keyHash();
            expect(keyHash.toString().toUpperCase()).to.be.eq(
                LinkAccessorCtorParameters.linkKeyHash.toString().toUpperCase(),
            );
        }
        const newKeyHash = soliditySha3(user_0.address);
        expect(newKeyHash.toString().toUpperCase()).to.be.not.equal(
            LinkAccessorCtorParameters.linkKeyHash.toString().toUpperCase(),
        );
        await expect(mockLinkAccessorApp.connect(user_0).setKeyHash(newKeyHash)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mockLinkAccessorApp.connect(contractCreator).setKeyHash(newKeyHash);
        {
            const keyHash = await mockLinkAccessorApp.keyHash();
            expect(keyHash.toString().toUpperCase()).to.be.eq(newKeyHash.toString().toUpperCase());
        }
    });

    it('Should setMysteryBox work', async () => {
        await expect(mockLinkAccessorApp.connect(user_0).setMysteryBox(user_0.address)).to.be.rejectedWith(Error);
        await mockLinkAccessorApp.connect(contractCreator).setMysteryBox(user_0.address);
        const mysteryBox = await mockLinkAccessorApp.mysteryBox();
        expect(mysteryBox).to.be.eq(user_0.address);
    });
});
