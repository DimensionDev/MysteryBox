const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
const assert = chai.assert;
chai.use(require('chai-as-promised'));
const helper = require('./helper');

let snapshotId;
let contract;
let contractCreator;
let user_0;
let user_1;

const jsonABI = require('../artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json');

describe('WhitelistQlf', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        user_0 = signers[1];
        user_1 = signers[2];

        const factory = await ethers.getContractFactory('WhitelistQlf');
        const proxy = await upgrades.deployProxy(factory, []);
        contract = new ethers.Contract(proxy.address, jsonABI.abi, contractCreator);
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

    it('Should initialize work', async () => {
        // should not be able to call it again
        await expect(contract.connect(contractCreator).initialize()).to.be.rejectedWith(Error);

        await expect(contract.connect(user_0).initialize()).to.be.rejectedWith(Error);
        await expect(contract.connect(user_1).initialize()).to.be.rejectedWith(Error);

        const owner = await contract.owner();
        expect(owner).to.be.eq(contractCreator.address);

        const version = await contract.version();
        expect(version.toString()).to.be.eq('1');
    });

    it('Should white list work', async () => {
        expect(await contract.whilte_list(user_0.address)).to.be.eq(false);
        expect(await contract.whilte_list(user_1.address)).to.be.eq(false);
        {
            const result = await contract.is_qualified(user_0.address, []);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not whitelisted');
        }
        {
            const result = await contract.is_qualified(user_1.address, []);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not whitelisted');
        }
        // add
        await expect(contract.connect(user_0).add_white_list([user_0.address])).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).add_white_list([user_0.address]);
        expect(await contract.whilte_list(user_0.address)).to.be.eq(true);
        expect(await contract.whilte_list(user_1.address)).to.be.eq(false);
        {
            const result = await contract.is_qualified(user_0.address, []);
            expect(result.qualified).to.be.eq(true);
        }
        {
            const result = await contract.is_qualified(user_1.address, []);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not whitelisted');
        }
        // remove
        await expect(contract.connect(user_0).remove_white_list([user_0.address])).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).remove_white_list([user_0.address]);
        expect(await contract.whilte_list(user_0.address)).to.be.eq(false);
        expect(await contract.whilte_list(user_1.address)).to.be.eq(false);
        {
            const result = await contract.is_qualified(user_0.address, []);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not whitelisted');
        }
        {
            const result = await contract.is_qualified(user_1.address, []);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not whitelisted');
        }
    });
});
