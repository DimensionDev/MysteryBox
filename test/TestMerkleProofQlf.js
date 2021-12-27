const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const helper = require('./helper');
const abiCoder = new ethers.utils.AbiCoder();

let snapshotId;
let contract;
let contractCreator;
let user_0;
let user_1;
let user_0_index;
let user_1_index;

const proofs = require('../dist/proofs.json');
const jsonABI = require('../artifacts/contracts/MerkleProofQlf.sol/MerkleProofQlf.json');

describe('MerkleProofQlf', () => {
    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        user_0 = signers[1];
        user_1 = signers[2];

        user_0_index = proofs.leaves.length;
        user_1_index = proofs.leaves.length;
        for (let i = 0; i < proofs.leaves.length; i++) {
            if (proofs.leaves[i].address == user_0.address) {
                user_0_index = i;
            }
            if (proofs.leaves[i].address == user_1.address) {
                user_1_index = i;
            }
        }
        expect(user_0_index < proofs.leaves.length).to.be.true;
        expect(user_1_index < proofs.leaves.length).to.be.true;

        const factory = await ethers.getContractFactory('MerkleProofQlf');
        const proxy = await upgrades.deployProxy(factory, [proofs.merkleRoot]);
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
    });

    it('Should signature verification work', async () => {
        await expect(contract.is_qualified(user_1.address, [])).to.be.rejectedWith(Error);
        {
            const proof = abiCoder.encode(['uint256', 'bytes32[]'], [user_0_index, proofs.leaves[user_0_index].proof]);
            {
                const result = await contract.is_qualified(user_0.address, proof);
                expect(result.qualified).to.be.eq(true);
            }
            {
                const result = await contract.is_qualified(user_1.address, proof);
                expect(result.qualified).to.be.eq(false);
                expect(result.error_msg).to.be.eq('not qualified');
            }
        }
        {
            const proof = abiCoder.encode(['uint256', 'bytes32[]'], [user_1_index, proofs.leaves[user_1_index].proof]);
            const result = await contract.is_qualified(user_1.address, proof);
            expect(result.qualified).to.be.eq(true);
        }
    });

    it('Should set_merkle_root work', async () => {
        const invalid_root = '0x1234567833dc44ce38f1024d3ea7d861f13ac29112db0e5b9814c54b12345678';
        {
            const proof = abiCoder.encode(['uint256', 'bytes32[]'], [user_1_index, proofs.leaves[user_1_index].proof]);
            const result = await contract.is_qualified(user_1.address, proof);
            expect(result.qualified).to.be.eq(true);
        }
        await expect(contract.connect(user_1).set_merkle_root(invalid_root)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await contract.connect(contractCreator).set_merkle_root(invalid_root);
        {
            const proof = abiCoder.encode(['uint256', 'bytes32[]'], [user_1_index, proofs.leaves[user_1_index].proof]);
            const result = await contract.is_qualified(user_1.address, proof);
            expect(result.qualified).to.be.eq(false);
            expect(result.error_msg).to.be.eq('not qualified');
        }
    });
});
