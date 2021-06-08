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

const { NftCtorParameters, NftMintParameters } = require('./constants');

const nftJsonABI = require('../artifacts/contracts/MysteryBoxNFT.sol/MysteryBoxNFT.json');

describe('MysteryBoxNFT', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        admin_0 = signers[1];
        admin_1 = signers[2];
        user_0 = signers[3];
        user_1 = signers[4];

        const factory = await ethers.getContractFactory('MysteryBoxNFT');
        const proxy = await upgrades.deployProxy(factory, [...Object.values(NftCtorParameters)]);
        contract = new ethers.Contract(proxy.address, nftJsonABI.abi, contractCreator);
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
        // should not be able to call it again
        await expect(
            contract.connect(contractCreator).initialize(...Object.values(NftCtorParameters)),
        ).to.be.rejectedWith(Error);

        await expect(contract.connect(admin_0).initialize(...Object.values(NftCtorParameters))).to.be.rejectedWith(
            Error,
        );
        await expect(contract.connect(admin_1).initialize(...Object.values(NftCtorParameters))).to.be.rejectedWith(
            Error,
        );

        const owner = await contract.owner();
        expect(owner).to.be.eq(contractCreator.address);

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
        await expect(contract.connect(admin_0).addAdmin(admin_0.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await expect(contract.connect(admin_1).addAdmin(admin_1.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).addAdmin(admin_0.address);
        await contract.connect(contractCreator).addAdmin(admin_1.address);
        {
            expect(await contract.admin(admin_0.address)).to.be.eq(true);
            expect(await contract.admin(admin_1.address)).to.be.eq(true);
        }
        await expect(contract.connect(admin_0).revokeAdmin(admin_1.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
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
        const totalSupply = await contract.totalSupply();
        expect(totalSupply.toString()).to.be.eq('1');
        // ERC721Enumerable test
        const tokenId = await contract.tokenOfOwnerByIndex(admin_0.address, 0);
        expect(tokenId.toString()).to.be.eq(NftMintParameters.id);
    });

    it('Should setName work', async () => {
        {
            const name = await contract.name();
            expect(name).to.be.eq(NftCtorParameters.name);
        }

        const newName = 'MASK NFT';
        await expect(contract.connect(admin_0).setName(newName)).to.be.rejectedWith('Ownable: caller is not the owner');
        await contract.connect(contractCreator).setName(newName);

        {
            const name = await contract.name();
            expect(name).to.be.eq(newName);
        }
    });

    it('Should setSymbol work', async () => {
        {
            const symbol = await contract.symbol();
            expect(symbol).to.be.eq(NftCtorParameters.symbol);
        }

        const newSymbol = 'MASK_NFT';
        await expect(contract.connect(admin_0).setSymbol(newSymbol)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).setSymbol(newSymbol);

        {
            const symbol = await contract.symbol();
            expect(symbol).to.be.eq(newSymbol);
        }
    });
});
