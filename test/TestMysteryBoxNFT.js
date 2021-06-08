const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
const assert = chai.assert;
chai.use(require('chai-as-promised'));
const helper = require('./helper');

const transactionParameters = {
    // gasLimit: 300000,
    // gasPrice: ethers.utils.parseUnits('100', 'gwei'),
};

const jsonABI = require('../artifacts/contracts/MysteryBoxNFT.sol/MysteryBoxNFT.json');
const interface = new ethers.utils.Interface(jsonABI.abi);

let snapshotId;
let contract;
let contractCreator;
let admin_0;
let admin_1;
let user_0;
let user_1;

const {
    NftCtorParameters,
    NftMintParameters,
    LinkAccessorCtorParameters,
    MysteryboxCtorParameters,
} = require('./constants');

describe('MysteryBoxNFT', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        admin_0 = signers[1];
        admin_1 = signers[2];
        user_0 = signers[3];
        user_1 = signers[4];

        const factory = await ethers.getContractFactory('MysteryBoxNFT');
        const deploy = await factory.deploy(...Object.values(NftCtorParameters));
        contract = await deploy.deployed();
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

    it('Should NFT name and symbol initialized properly in contract creator', async () => {
        const name = await contract.name();
        expect(name).to.be.eq(NftCtorParameters.name);
        const symbol = await contract.symbol();
        expect(symbol).to.be.eq(NftCtorParameters.symbol);
    });

    it('Should Admin work', async () => {
        {
            expect(await contract.admin(admin_0.address)).to.be.eq(false);
            expect(await contract.admin(admin_1.address)).to.be.eq(false);
        }
        await expect(contract.connect(admin_0).addAdmin(admin_0.address)).to.be.rejectedWith(Error);
        await expect(contract.connect(admin_1).addAdmin(admin_1.address)).to.be.rejectedWith(Error);
        await contract.connect(contractCreator).addAdmin(admin_0.address);
        await contract.connect(contractCreator).addAdmin(admin_1.address);
        {
            expect(await contract.admin(admin_0.address)).to.be.eq(true);
            expect(await contract.admin(admin_1.address)).to.be.eq(true);
        }
        await expect(contract.connect(admin_0).revokeAdmin(admin_1.address)).to.be.rejectedWith(Error);
        await contract.connect(contractCreator).revokeAdmin(admin_1.address);
        {
            expect(await contract.admin(admin_0.address)).to.be.eq(true);
            expect(await contract.admin(admin_1.address)).to.be.eq(false);
        }
    });

    it('Should mintNFT work', async () => {
        NftMintParameters.recipient = admin_0.address;
        const nftBalanceBeforeMint = await contract.balanceOf(admin_0.address);
        {
            await expect(contract.connect(admin_0).mintNFT(...Object.values(NftMintParameters))).to.be.rejectedWith(
                Error,
            );
        }
        await contract.connect(contractCreator).addAdmin(admin_0.address);
        await contract.connect(admin_0).mintNFT(...Object.values(NftMintParameters));
        const nftBalanceAfterMint = await contract.balanceOf(admin_0.address);
        assert.isTrue(nftBalanceAfterMint.eq(nftBalanceBeforeMint.add(1)));
        {
            // validate `Transfer` event
            const logs = await ethers.provider.getLogs(contract.filters.Transfer());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('from');
            expect(result).to.have.property('to').that.to.be.eq(admin_0.address);
            expect(result).to.have.property('tokenId');
            const owner = await contract.ownerOf(result.tokenId);
            assert.equal(owner, admin_0.address);
        }
    });
});
