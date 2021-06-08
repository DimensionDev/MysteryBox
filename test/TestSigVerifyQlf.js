const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const helper = require('./helper');
const { soliditySha3 } = require('web3-utils');

let snapshotId;
let contract;
let contractCreator;
let user_0;
let user_1;

const { qualification_project_name } = require('./constants');

const jsonABI = require('../artifacts/contracts/SigVerifyQlf.sol/SigVerifyQlf.json');

describe('SigVerifyQlf', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        user_0 = signers[1];
        user_1 = signers[2];

        const factory = await ethers.getContractFactory('SigVerifyQlf');
        const proxy = await upgrades.deployProxy(factory, [qualification_project_name, user_0.address]);
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
        expect(version.toString()).to.be.eq('2');
    });

    it('Should signature verification work', async () => {
        await expect(contract.is_qualified(user_1.address, [])).to.be.rejectedWith('ECDSA: invalid signature length');
        {
            const msg_hash = soliditySha3(qualification_project_name, user_0.address);
            const signature = await user_0.signMessage(ethers.utils.arrayify(msg_hash));
            const result = await contract.is_qualified(user_0.address, signature);
            expect(result.qualified).to.be.eq(true);
        }
        {
            const msg_hash = soliditySha3(qualification_project_name, user_0.address);
            const signature = await user_1.signMessage(ethers.utils.arrayify(msg_hash));
            const result = await contract.is_qualified(user_0.address, signature);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not qualified');
        }
        await contract.connect(contractCreator).set_verifier(user_1.address);
        {
            const msg_hash = soliditySha3(qualification_project_name, user_0.address);
            const signature = await user_1.signMessage(ethers.utils.arrayify(msg_hash));
            const result = await contract.is_qualified(user_0.address, signature);
            expect(result.qualified).to.be.eq(true);
        }
    });

    it('Should set_verifier work', async () => {
        expect(await contract.verifier()).to.be.eq(user_0.address);

        const new_project = 'MASK_NFT';
        await expect(contract.connect(user_0).set_verifier(user_1.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).set_verifier(user_1.address);

        expect(await contract.verifier()).to.be.eq(user_1.address);
    });

    it('Should set_project work', async () => {
        expect(await contract.project()).to.be.eq(qualification_project_name);

        const new_project = 'MASK_NFT';
        await expect(contract.connect(user_0).set_project(new_project)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).set_project(new_project);

        expect(await contract.project()).to.be.eq(new_project);
    });
});
