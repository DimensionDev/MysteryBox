const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const helper = require('./helper');
const { soliditySha3 } = require('web3-utils');

let snapshotId;
let mockLinkAccessorApp;
let linkAccessorApp;
let linkTokenApp;
let contractCreator;
let fake_vrf_coordinator;
let user_0;

const {
    NftCtorParameters,
    NftMintParameters,
    LinkAccessorCtorParameters,
    MysteryboxCtorParameters,
} = require('./constants');

describe('LinkAccessor', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        fake_vrf_coordinator = signers[1];
        user_0 = signers[2];

        {
            const factory = await ethers.getContractFactory('MockLinkToken');
            const deploy = await factory.deploy();
            linkTokenApp = await deploy.deployed();
        }

        {
            LinkAccessorCtorParameters.link = linkTokenApp.address;
            LinkAccessorCtorParameters.vrfCoordinator = fake_vrf_coordinator.address;
            const factory = await ethers.getContractFactory('MockLinkAccessor');
            const deploy = await factory.deploy(...Object.values(LinkAccessorCtorParameters));
            mockLinkAccessorApp = await deploy.deployed();
        }
        {
            LinkAccessorCtorParameters.link = linkTokenApp.address;
            LinkAccessorCtorParameters.vrfCoordinator = fake_vrf_coordinator.address;
            const factory = await ethers.getContractFactory('LinkAccessor');
            const deploy = await factory.deploy(...Object.values(LinkAccessorCtorParameters));
            linkAccessorApp = await deploy.deployed();
        }
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
        // Others will be tested in `TestMysteryBox.js`
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
