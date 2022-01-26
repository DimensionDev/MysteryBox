const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
const helper = require('./helper');
const { soliditySha3 } = require('web3-utils');
const abiCoder = new ethers.utils.AbiCoder();

chai.use(require('chai-as-promised'));

const jsonABI = require('../artifacts/contracts/MysteryBox.sol/MysteryBox.json');
const interface = new ethers.utils.Interface(jsonABI.abi);

const EnumerableNftTokenABI = require('../artifacts/contracts/test/MaskEnumerableNFT.sol/MaskEnumerableNFT.json');
const EnumerableNftInterface = new ethers.utils.Interface(EnumerableNftTokenABI.abi);

const nonEnumerableNftTokenABI = require('../artifacts/contracts/test/MaskNonEnumerableNFT.sol/MaskNonEnumerableNFT.json');

const qlfWhiltelistJsonABI = require('../artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json');
const qlfSigVerifyJsonABI = require('../artifacts/contracts/SigVerifyQlf.sol/SigVerifyQlf.json');
const qlfMaskHolderJsonABI = require('../artifacts/contracts/MaskHolderQlf.sol/MaskHolderQlf.json');

let snapshotId;
let mbContract;
let enumerableNftContract;
let nonEnumerableNftContract;
let mask721ANFTContract;

let testTokenAContract;
let testTokenBContract;
let testTokenCContract;
let testMaskTokenContract;

let contractCreator;
let user_1;
let user_2;
let user_3;

let whitelistQlfContract;
let sigVerifyQlfContract;
let maskHolderQlfContract;
let merkleRootQlfContract;

const {
    MaskNFTInitParameters,
    CreateBoxParameters,
    openBoxParameters,
    MaxNumberOfNFT,
    qualification_project_name,
    seconds_in_a_day,
    holderMinAmount,
} = require('./constants');

const network = 'mainnet';
const maskNftPara = MaskNFTInitParameters[network];
const createBoxPara = CreateBoxParameters[network];
let sell_all_box_id;
let not_sell_all_box_id;
const not_sell_all_nft_id_list = [];
const proofs = require('../dist/proofs.json');

const txParameters = {
    gasLimit: 6000000,
    value: createBoxPara.payment[0][1],
};

describe('MysteryBox', () => {
    // 1 billion tokens, typical decimal 18
    const testTokenMintAmount = ethers.utils.parseUnits('1000000000', 18).toString();
    const transferAmount = ethers.utils.parseUnits('100000000', 18).toString();

    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        // these are whitelisted `box creator`
        user_1 = signers[1];
        user_2 = signers[2];
        user_3 = signers[3];
        verifier = signers[4];

        const TestTokenA = await ethers.getContractFactory('TestTokenA');
        const testTokenA = await TestTokenA.deploy(testTokenMintAmount);
        testTokenAContract = await testTokenA.deployed();

        const TestTokenB = await ethers.getContractFactory('TestTokenB');
        const testTokenB = await TestTokenB.deploy(testTokenMintAmount);
        testTokenBContract = await testTokenB.deployed();

        const TestTokenC = await ethers.getContractFactory('TestTokenC');
        const testTokenC = await TestTokenC.deploy(testTokenMintAmount);
        testTokenCContract = await testTokenC.deployed();

        const MaskTestToken = await ethers.getContractFactory('TestTokenC');
        const maskToken = await MaskTestToken.deploy(testTokenMintAmount);
        testMaskTokenContract = await maskToken.deployed();
        {
            const factory = await ethers.getContractFactory('WhitelistQlf');
            const proxy = await upgrades.deployProxy(factory, []);
            whitelistQlfContract = new ethers.Contract(proxy.address, qlfWhiltelistJsonABI.abi, contractCreator);
        }
        {
            const factory = await ethers.getContractFactory('SigVerifyQlf');
            const proxy = await upgrades.deployProxy(factory, [qualification_project_name, verifier.address]);
            sigVerifyQlfContract = new ethers.Contract(proxy.address, qlfSigVerifyJsonABI.abi, contractCreator);
        }
        {
            const factory = await ethers.getContractFactory('MaskHolderQlf');
            const proxy = await upgrades.deployProxy(factory, [testMaskTokenContract.address, holderMinAmount]);
            maskHolderQlfContract = new ethers.Contract(proxy.address, qlfMaskHolderJsonABI.abi, contractCreator);
        }
        {
            const factory = await ethers.getContractFactory('MerkleProofQlf');
            const MerkleProofQlf = await factory.deploy();
            merkleRootQlfContract = await MerkleProofQlf.deployed();
        }
        {
            const factory = await ethers.getContractFactory('Mask721A');
            const Mask721A = await factory.deploy(maskNftPara.name, maskNftPara.symbol, maskNftPara.baseURI);
            mask721ANFTContract = await Mask721A.deployed();
        }
        // first is ETH: address(0)
        createBoxPara.payment.push([testTokenAContract.address, createBoxPara.payment[0][1]]);
        createBoxPara.payment.push([testTokenBContract.address, createBoxPara.payment[0][1]]);
        createBoxPara.payment.push([testTokenCContract.address, createBoxPara.payment[0][1]]);
        {
            const factory = await ethers.getContractFactory('MaskEnumerableNFT');
            const proxy = await upgrades.deployProxy(factory, [...Object.values(maskNftPara)]);
            enumerableNftContract = new ethers.Contract(proxy.address, EnumerableNftTokenABI.abi, contractCreator);
        }
        {
            const factory = await ethers.getContractFactory('MaskNonEnumerableNFT');
            const proxy = await upgrades.deployProxy(factory, [...Object.values(maskNftPara)]);
            nonEnumerableNftContract = new ethers.Contract(
                proxy.address,
                nonEnumerableNftTokenABI.abi,
                contractCreator,
            );
        }
        {
            const factory = await ethers.getContractFactory('MysteryBox');
            const proxy = await upgrades.deployProxy(factory, []);
            mbContract = new ethers.Contract(proxy.address, jsonABI.abi, contractCreator);
        }
        await mbContract.addWhitelist([user_1.address, user_2.address, user_3.address]);
        await testTokenAContract.transfer(user_2.address, transferAmount);
        await testTokenAContract.connect(user_2).approve(mbContract.address, transferAmount);

        createBoxPara.nft_address = enumerableNftContract.address;
        // mint 100 NFT for testing
        await enumerableNftContract.connect(user_1).mint(50);
        await enumerableNftContract.connect(user_1).mint(50);
        await enumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);

        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = true;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(result).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(result).to.have.property('name').that.to.be.eq(parameter.name);
            expect(result).to.have.property('start_time').that.to.be.eq(parameter.start_time);
            expect(result).to.have.property('end_time').that.to.be.eq(parameter.end_time);
            expect(result).to.have.property('sell_all').that.to.be.eq(parameter.sell_all);
            expect(result).to.have.property('box_id');
            sell_all_box_id = result.box_id;
        }
        openBoxParameters.box_id = sell_all_box_id;
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = false;
            const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
            // half of the NFT ids owned
            for (let i = 0; i < nftBalance; i += 2) {
                const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, i);
                not_sell_all_nft_id_list.push(nftId);
            }
            parameter.nft_id_list = not_sell_all_nft_id_list;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(result).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(result).to.have.property('name').that.to.be.eq(parameter.name);
            expect(result).to.have.property('start_time').that.to.be.eq(parameter.start_time);
            expect(result).to.have.property('end_time').that.to.be.eq(parameter.end_time);
            expect(result).to.have.property('sell_all').that.to.be.eq(parameter.sell_all);
            expect(result).to.have.property('box_id');
            not_sell_all_box_id = result.box_id;

            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(not_sell_all_nft_id_list.length)).to.be.true;
            expect(boxStatus.total.eq(not_sell_all_nft_id_list.length)).to.be.true;
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);

            const nftList = await mbContract.getNftListForSale(not_sell_all_box_id, 0, parameter.nft_id_list.length);
            expect(nftList.map((id) => id.toString())).to.eql(parameter.nft_id_list.map((id) => id.toString()));
        }
        for (let i = 0; i < 256; i++) {
            await helper.advanceBlock();
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

    it('Should variables initialized properly in contract creator', async () => {
        const owner = await mbContract.owner();
        expect(owner).to.be.eq(contractCreator.address);
    });

    it('Should addNftIntoBox work', async () => {
        // mint 10 NFT for testing
        const mintNftAmount = 10;
        await enumerableNftContract.connect(user_2).mint(mintNftAmount);
        await enumerableNftContract.connect(user_2).setApprovalForAll(mbContract.address, true);
        const nftBalance = await enumerableNftContract.balanceOf(user_2.address);
        expect(nftBalance.eq(mintNftAmount)).to.be.true;

        const nft_id_list = [];
        // half of the NFT ids owned
        for (let i = 0; i < mintNftAmount / 2; i++) {
            const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_2.address, i);
            nft_id_list.push(nftId);
        }
        let box_id;
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = false;
            parameter.nft_id_list = nft_id_list;
            await mbContract.connect(user_2).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('box_id');
            box_id = result.box_id;
        }
        {
            const nftList = await mbContract.getNftListForSale(box_id, 0, mintNftAmount);
            expect(nftList.map((id) => id.toString())).to.eql(nft_id_list.map((id) => id.toString()));

            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(nft_id_list.length)).to.be.true;
            expect(boxStatus.total.eq(nft_id_list.length)).to.be.true;
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);
        }

        const append_nft_id_list = [];
        for (let i = mintNftAmount / 2; i < mintNftAmount; i++) {
            const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_2.address, i);
            append_nft_id_list.push(nftId);
        }
        await expect(mbContract.connect(user_2).addNftIntoBox(sell_all_box_id, [])).to.be.rejectedWith('not box owner');
        await expect(mbContract.connect(user_1).addNftIntoBox(sell_all_box_id, [])).to.be.rejectedWith(
            'can not add for sell_all',
        );
        await expect(mbContract.connect(user_1).addNftIntoBox(box_id, append_nft_id_list)).to.be.rejectedWith(
            'not box owner',
        );

        {
            // try adding 'NFT id' he/she does not own
            const invalid_nft_id = [];
            const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
            expect(nftBalance.gt(0)).to.be.true;
            const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, 0);
            invalid_nft_id.push(nftId);
            await expect(mbContract.connect(user_2).addNftIntoBox(box_id, invalid_nft_id)).to.be.rejectedWith(
                'not nft owner',
            );
        }
        await mbContract.connect(user_2).addNftIntoBox(box_id, append_nft_id_list);
        {
            const final_nft_id_list = nft_id_list.concat(append_nft_id_list);
            const nftList = await mbContract.getNftListForSale(box_id, 0, mintNftAmount);
            expect(nftList.map((id) => id.toString())).to.eql(final_nft_id_list.map((id) => id.toString()));
            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(final_nft_id_list.length)).to.be.true;
            expect(boxStatus.total.eq(final_nft_id_list.length)).to.be.true;
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);
        }
    });

    it('Should cancelBox work', async () => {
        {
            const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
            expect(boxStatus).to.have.property('started').that.to.be.eq(true);
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);
            await expect(mbContract.connect(user_2).cancelBox(sell_all_box_id)).to.be.rejectedWith('not box owner');
            await expect(mbContract.connect(user_1).cancelBox(sell_all_box_id)).to.be.rejectedWith('sale started');
        }
        {
            const open_parameter = JSON.parse(JSON.stringify(openBoxParameters));
            const now = Math.floor(new Date().getTime() / 1000);
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.start_time = now + seconds_in_a_day;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameter.box_id = result.box_id;
            {
                const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
                expect(boxStatus).to.have.property('started').that.to.be.eq(false);
                expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);
            }
            await expect(mbContract.connect(user_2).cancelBox(open_parameter.box_id)).to.be.rejectedWith(
                'not box owner',
            );
            await mbContract.connect(user_1).cancelBox(open_parameter.box_id);
            await expect(mbContract.connect(user_1).cancelBox(open_parameter.box_id)).to.be.rejectedWith(
                'sale canceled already',
            );
            {
                const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
                expect(boxStatus).to.have.property('started').that.to.be.eq(false);
                expect(boxStatus).to.have.property('canceled').that.to.be.eq(true);
            }
            await helper.advanceTimeAndBlock(seconds_in_a_day);
            await expect(
                mbContract.connect(user_2).openBox(...Object.values(open_parameter), txParameters),
            ).to.be.rejectedWith('sale canceled');
        }
    });

    it('Should getNftListForSale work', async () => {
        const nft_id_list = [];
        const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
        // half of the NFT ids owned
        for (let i = 0; i < nftBalance; i++) {
            const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, i);
            nft_id_list.push(nftId);
        }
        const nftList = await mbContract.getNftListForSale(sell_all_box_id, 0, nftBalance);
        expect(nftList.map((id) => id.toString())).to.eql(nft_id_list.map((id) => id.toString()));
        {
            // buy some NFT(s)
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.amount = MaxNumberOfNFT;
            const tx_parameters = {
                value: txParameters.value.mul(parameters.amount),
            };
            await mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters);
        }
        const newNftList = await mbContract.getNftListForSale(sell_all_box_id, 0, nftBalance);
        expect(newNftList.length).to.be.eq(nftList.length - MaxNumberOfNFT);

        const purchaseList = await mbContract.getPurchasedNft(sell_all_box_id, user_2.address);
        expect(purchaseList.length).to.be.eq(MaxNumberOfNFT);
        {
            const nftListStr = nftList.map((id) => id.toString());
            const newNftListStr = newNftList.map((id) => id.toString());
            const purchaseListStr = purchaseList.map((id) => id.toString());
            const mergedList = newNftListStr.concat(purchaseListStr);
            expect(nftListStr.sort()).to.eql(mergedList.sort());
        }
        {
            const emptyNftList = await mbContract.getNftListForSale(sell_all_box_id, nftBalance, nftBalance);
            expect(emptyNftList.length).to.be.eq(0);
        }
    });

    it('Should not be able to openBox if not-started', async () => {
        const open_parameter = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const now = Math.floor(new Date().getTime() / 1000);
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.start_time = now + seconds_in_a_day;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameter.box_id = result.box_id;
        }
        {
            const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
            expect(boxStatus).to.have.property('started').that.to.be.eq(false);
        }
        await expect(
            mbContract.connect(user_2).openBox(...Object.values(open_parameter), txParameters),
        ).to.be.rejectedWith('not started');
    });

    it('Should openBox & getBoxInfo work', async () => {
        const expectedRemaining = await enumerableNftContract.balanceOf(user_1.address);
        const userNftBalance = await enumerableNftContract.balanceOf(user_2.address);
        {
            const boxInfo = await mbContract.getBoxInfo(sell_all_box_id);
            expect(boxInfo).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(boxInfo).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(boxInfo).to.have.property('name').that.to.be.eq(createBoxPara.name);
            expect(boxInfo).to.have.property('personal_limit').that.to.be.eq(createBoxPara.personal_limit);
            expect(boxInfo).to.have.property('qualification').that.to.be.eq(createBoxPara.qualification);
            expect(boxInfo).to.have.property('qualification_data').that.to.be.eq(createBoxPara.qualification_data);

            const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
            expect(boxStatus).to.have.property('payment');
            expect(boxStatus.payment.map((info) => info.token_addr.toString())).to.eql([
                createBoxPara.payment[0][0].toString(),
                createBoxPara.payment[1][0].toString(),
                createBoxPara.payment[2][0].toString(),
                createBoxPara.payment[3][0].toString(),
            ]);
            expect(boxStatus.payment.map((info) => info.price.toString())).to.eql([
                createBoxPara.payment[0][1].toString(),
                createBoxPara.payment[1][1].toString(),
                createBoxPara.payment[2][1].toString(),
                createBoxPara.payment[3][1].toString(),
            ]);
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
            expect(boxStatus).to.have.property('started').that.to.be.eq(true);
            expect(boxStatus).to.have.property('expired').that.to.be.eq(false);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(expectedRemaining)).to.be.true;
            expect(boxStatus.total.eq(expectedRemaining)).to.be.true;
        }
        const tx_parameters = {
            value: txParameters.value,
        };
        await mbContract.connect(user_2).openBox(...Object.values(openBoxParameters), tx_parameters);
        if (true) {
            const newUserNftBalance = await enumerableNftContract.balanceOf(user_2.address);
            expect(newUserNftBalance.eq(userNftBalance.add(1))).to.be.true;
            {
                const logs = await ethers.provider.getLogs(enumerableNftContract.filters.Transfer());
                const parsedLog = EnumerableNftInterface.parseLog(logs[0]);
                const result = parsedLog.args;
                expect(result).to.have.property('from').that.to.be.eq(user_1.address);
                expect(result).to.have.property('to').that.to.be.eq(user_2.address);
                expect(result).to.have.property('tokenId');
            }
            {
                const logs = await ethers.provider.getLogs(mbContract.filters.OpenSuccess());
                const parsedLog = interface.parseLog(logs[0]);
                const result = parsedLog.args;
                expect(result).to.have.property('box_id');
                expect(result.box_id.eq(openBoxParameters.box_id)).to.be.true;
                expect(result).to.have.property('customer').that.to.be.eq(user_2.address);
                expect(result).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
                expect(result).to.have.property('amount');
                expect(result.amount.eq(openBoxParameters.amount)).to.be.true;
            }
        }
        {
            const boxInfo = await mbContract.getBoxInfo(sell_all_box_id);
            const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
            expect(boxInfo).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(boxInfo).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(boxInfo).to.have.property('name').that.to.be.eq(createBoxPara.name);
            expect(boxInfo).to.have.property('personal_limit').that.to.be.eq(createBoxPara.personal_limit);

            expect(boxStatus).to.have.property('payment');
            expect(boxStatus.payment.map((info) => info.token_addr.toString())).to.eql([
                createBoxPara.payment[0][0].toString(),
                createBoxPara.payment[1][0].toString(),
                createBoxPara.payment[2][0].toString(),
                createBoxPara.payment[3][0].toString(),
            ]);
            expect(boxStatus.payment.map((info) => info.price.toString())).to.eql([
                createBoxPara.payment[0][1].toString(),
                createBoxPara.payment[1][1].toString(),
                createBoxPara.payment[2][1].toString(),
                createBoxPara.payment[3][1].toString(),
            ]);
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                createBoxPara.payment[0][1].toString(),
                '0',
                '0',
                '0',
            ]);
            expect(boxStatus).to.have.property('started').that.to.be.eq(true);
            expect(boxStatus).to.have.property('expired').that.to.be.eq(false);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(expectedRemaining.sub(1))).to.be.true;
            expect(boxStatus.total.eq(expectedRemaining)).to.be.true;
        }
    });

    it('Should not openBox expired boxes', async () => {
        const open_parameter = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const now = Math.floor(new Date().getTime() / 1000);
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            // to pass `createBox` validation
            parameter.end_time = now + seconds_in_a_day / 2;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameter.box_id = result.box_id;
        }
        await helper.advanceTimeAndBlock(seconds_in_a_day);
        await expect(
            mbContract.connect(user_2).openBox(...Object.values(open_parameter), txParameters),
        ).to.be.rejectedWith('expired');
        {
            const boxStatus = await mbContract.getBoxStatus(open_parameter.box_id);
            expect(boxStatus).to.have.property('expired').that.to.be.eq(true);
        }
    });

    it('Should createBox reject invalid parameters', async () => {
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.end_time = 0;
            await expect(mbContract.connect(user_1).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'invalid end time',
            );
        }
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.payment = [];
            await expect(mbContract.connect(user_1).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'invalid payment',
            );
        }
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.payment.push([user_2.address, createBoxPara.payment[0][1]]);
            await expect(mbContract.connect(user_1).createBox(...Object.values(parameter))).to.be.rejectedWith(Error);
        }
        {
            await nonEnumerableNftContract.connect(user_1).mint(50);
            await nonEnumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.nft_address = nonEnumerableNftContract.address;
            parameter.sell_all = true;
            await expect(mbContract.connect(user_1).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'not enumerable nft',
            );
        }
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = false;
            parameter.nft_id_list = [];
            await expect(mbContract.connect(user_1).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'empty nft list',
            );
        }
        {
            await enumerableNftContract.connect(user_2).mint(50);
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = true;
            await expect(mbContract.connect(user_2).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'not ApprovedForAll',
            );
        }
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            await enumerableNftContract.connect(user_3).setApprovalForAll(mbContract.address, true);
            parameter.sell_all = true;
            await expect(mbContract.connect(user_3).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'no nft owned',
            );
        }
        {
            const user_0_NftBalance = await enumerableNftContract.balanceOf(user_1.address);
            expect(user_0_NftBalance.gt(0)).to.be.true;
            const user_1_NftBalance = await enumerableNftContract.balanceOf(user_2.address);
            expect(user_1_NftBalance.gt(0)).to.be.true;
            const nft_id_list = [];
            nft_id_list.push(await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, 0));
            nft_id_list.push(await enumerableNftContract.tokenOfOwnerByIndex(user_2.address, 0));
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = false;
            parameter.nft_id_list = nft_id_list;
            await expect(mbContract.connect(user_1).createBox(...Object.values(parameter))).to.be.rejectedWith(
                'now owner',
            );
        }
    });

    it('Should openBox reject invalid parameters', async () => {
        {
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.payment_token_index = 1;
            await expect(mbContract.connect(user_3).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'ERC20: transfer amount exceeds balance',
            );
            await testTokenAContract.transfer(user_3.address, transferAmount);
            await expect(mbContract.connect(user_3).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'ERC20: transfer amount exceeds allowance',
            );
        }
        {
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.amount = MaxNumberOfNFT + 1;
            await expect(mbContract.connect(user_3).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'exceeds personal limit',
            );
        }
        {
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.payment_token_index = createBoxPara.payment.length;
            await expect(mbContract.connect(user_3).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'invalid payment token',
            );
        }
        {
            const tx_parameters = {
                value: 0,
            };
            await expect(
                mbContract.connect(user_3).openBox(...Object.values(openBoxParameters), tx_parameters),
            ).to.be.rejectedWith('not enough ETH');
        }
    });

    it('Should personal limit work', async () => {
        const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
        const contractEthBalanceBeforeOpen = await ethers.provider.getBalance(mbContract.address);
        const userEthBalanceBeforeOpen = await ethers.provider.getBalance(user_2.address);
        const parameters = JSON.parse(JSON.stringify(openBoxParameters));
        parameters.amount = MaxNumberOfNFT / 2;
        const tx_parameters = {
            value: txParameters.value.mul(parameters.amount),
        };
        await mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters);
        {
            const paymentEth = tx_parameters.value;
            const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
            const userEthBalanceAfterOpen = await ethers.provider.getBalance(user_2.address);
            expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(paymentEth))).to.be.true;
            expect(userEthBalanceBeforeOpen.gt(userEthBalanceAfterOpen.add(paymentEth))).to.be.true;
        }
        await mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters);
        {
            const paymentEth = tx_parameters.value.mul(2);
            const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
            const userEthBalanceAfterOpen = await ethers.provider.getBalance(user_2.address);
            expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(paymentEth))).to.be.true;
            expect(userEthBalanceBeforeOpen.gt(userEthBalanceAfterOpen.add(paymentEth))).to.be.true;
        }
        await expect(
            mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters),
        ).to.be.rejectedWith('exceeds personal limit');
        {
            const boxInfo = await mbContract.getBoxInfo(parameters.box_id);
            const boxStatus = await mbContract.getBoxStatus(parameters.box_id);
            expect(boxInfo).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(boxInfo).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(boxInfo).to.have.property('name').that.to.be.eq(createBoxPara.name);
            expect(boxStatus).to.have.property('started').that.to.be.eq(true);
            expect(boxStatus).to.have.property('expired').that.to.be.eq(false);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(nftBalance.sub(MaxNumberOfNFT))).to.be.true;
            expect(boxStatus.total.eq(nftBalance)).to.be.true;
        }
    });

    it('Should sell "sell_all_box_id" NFT work', async () => {
        const totalNFT = await enumerableNftContract.balanceOf(user_1.address);
        expect((await enumerableNftContract.balanceOf(signers[5].address)).eq(0)).to.be.true;
        expect((await enumerableNftContract.balanceOf(signers[6].address)).eq(0)).to.be.true;
        expect((await enumerableNftContract.balanceOf(signers[7].address)).eq(0)).to.be.true;
        expect((await enumerableNftContract.balanceOf(signers[8].address)).eq(0)).to.be.true;
        expect((await enumerableNftContract.balanceOf(signers[9].address)).eq(0)).to.be.true;

        const contractEthBalanceBeforeOpen = await ethers.provider.getBalance(mbContract.address);
        const user_8_EthBalance = await ethers.provider.getBalance(signers[8].address);
        const user_9_EthBalance = await ethers.provider.getBalance(signers[9].address);
        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        {
            open_parameters.amount = MaxNumberOfNFT;
            const tx_parameters = {
                value: txParameters.value.mul(open_parameters.amount),
            };
            await mbContract.connect(signers[5]).openBox(...Object.values(open_parameters), tx_parameters);
            await mbContract.connect(signers[6]).openBox(...Object.values(open_parameters), tx_parameters);
            await mbContract.connect(signers[7]).openBox(...Object.values(open_parameters), tx_parameters);
            await mbContract.connect(signers[8]).openBox(...Object.values(open_parameters), tx_parameters);
            await expect(mbContract.connect(user_1).claimPayment([open_parameters.box_id])).to.be.rejectedWith(
                'not expired/sold-out',
            );
            await mbContract.connect(signers[9]).openBox(...Object.values(open_parameters), tx_parameters);
            await expect(
                mbContract.connect(signers[10]).openBox(...Object.values(open_parameters), tx_parameters),
            ).to.be.rejectedWith('no NFT left');
            expect((await enumerableNftContract.balanceOf(signers[5].address)).eq(MaxNumberOfNFT)).to.be.true;
            expect((await enumerableNftContract.balanceOf(signers[6].address)).eq(MaxNumberOfNFT)).to.be.true;
            expect((await enumerableNftContract.balanceOf(signers[7].address)).eq(MaxNumberOfNFT)).to.be.true;
            expect((await enumerableNftContract.balanceOf(signers[8].address)).eq(MaxNumberOfNFT)).to.be.true;
            const remainingNFT = totalNFT.sub(MaxNumberOfNFT * 4);
            expect((await enumerableNftContract.balanceOf(signers[9].address)).eq(remainingNFT)).to.be.true;

            const user_8_EthBalanceAfter = await ethers.provider.getBalance(signers[8].address);
            const user_9_EthBalanceAfter = await ethers.provider.getBalance(signers[9].address);
            expect(user_8_EthBalance.gt(user_8_EthBalanceAfter.add(tx_parameters.value))).to.be.true;
            // test ETH refund
            expect(user_9_EthBalanceAfter.gt(user_9_EthBalance.sub(tx_parameters.value))).to.be.true;
        }
        const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
        const totalPaymentEth = txParameters.value.mul(totalNFT);
        expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(totalPaymentEth))).to.be.true;
        {
            const boxInfo = await mbContract.getBoxInfo(sell_all_box_id);
            const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
            expect(boxInfo).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(boxInfo).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(boxInfo).to.have.property('name').that.to.be.eq(createBoxPara.name);
            expect(boxInfo).to.have.property('personal_limit').that.to.be.eq(createBoxPara.personal_limit);

            expect(boxStatus).to.have.property('payment');
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                totalPaymentEth.toString(),
                '0',
                '0',
                '0',
            ]);
            expect(boxStatus).to.have.property('started').that.to.be.eq(true);
            expect(boxStatus).to.have.property('expired').that.to.be.eq(false);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(0)).to.be.true;
            expect(boxStatus.total.eq(totalNFT)).to.be.true;
        }
        await mbContract.connect(user_1).claimPayment([open_parameters.box_id]);
        {
            const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
            expect(boxStatus).to.have.property('payment');
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
        }
    });

    it('Should support lots of NFT', async () => {
        for (let i = 0; i < 18; i++) {
            await enumerableNftContract.connect(user_1).mint(50);
        }
        const id_list = [];
        let box_id;
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.personal_limit = 255;
            parameter.sell_all = false;
            const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
            // all the NFT ids owned, total 1000 NFT(s)
            for (let i = 0; i < nftBalance; i++) {
                const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, i);
                id_list.push(nftId);
            }
            parameter.nft_id_list = id_list;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));

            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(result).to.have.property('nft_address').that.to.be.eq(enumerableNftContract.address);
            expect(result).to.have.property('name').that.to.be.eq(parameter.name);
            expect(result).to.have.property('start_time').that.to.be.eq(parameter.start_time);
            expect(result).to.have.property('end_time').that.to.be.eq(parameter.end_time);
            expect(result).to.have.property('sell_all').that.to.be.eq(parameter.sell_all);
            expect(result).to.have.property('box_id');
            box_id = result.box_id;

            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(id_list.length)).to.be.true;
            expect(boxStatus.total.eq(id_list.length)).to.be.true;
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);

            const nftList = await mbContract.getNftListForSale(box_id, 0, parameter.nft_id_list.length);
            expect(nftList.map((id) => id.toString())).to.eql(parameter.nft_id_list.map((id) => id.toString()));
        }
        // mint another 1000 NFT(s)
        for (let i = 0; i < 20; i++) {
            await enumerableNftContract.connect(user_1).mint(50);
        }
        const id_list_batch_2 = [];
        {
            const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
            // all the NFT ids owned, total 1000 NFT(s)
            for (let i = id_list.length; i < nftBalance; i++) {
                const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, i);
                id_list_batch_2.push(nftId);
            }
            await mbContract.connect(user_1).addNftIntoBox(box_id, id_list_batch_2);
            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(id_list.length + id_list_batch_2.length)).to.be.true;
            expect(boxStatus.total.eq(id_list.length + id_list_batch_2.length)).to.be.true;
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);

            const nftList = await mbContract.getNftListForSale(box_id, id_list.length, id_list_batch_2.length);
            expect(nftList.map((id) => id.toString())).to.eql(id_list_batch_2.map((id) => id.toString()));
        }
        const nftBalance_before_batch_3 = await enumerableNftContract.balanceOf(user_1.address);
        // mint another 1000 NFT(s)
        for (let i = 0; i < 20; i++) {
            await enumerableNftContract.connect(user_1).mint(50);
        }
        const id_list_batch_3 = [];
        {
            const nftBalance = await enumerableNftContract.balanceOf(user_1.address);
            // all the NFT ids owned, total 1000 NFT(s)
            for (let i = nftBalance_before_batch_3; i < nftBalance; i++) {
                const nftId = await enumerableNftContract.tokenOfOwnerByIndex(user_1.address, i);
                id_list_batch_3.push(nftId);
            }
            await mbContract.connect(user_1).addNftIntoBox(box_id, id_list_batch_3);
            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(nftBalance_before_batch_3.add(id_list_batch_3.length))).to.be.true;
            expect(boxStatus.total.eq(nftBalance_before_batch_3.add(id_list_batch_3.length))).to.be.true;
            expect(boxStatus).to.have.property('canceled').that.to.be.eq(false);

            const nftList = await mbContract.getNftListForSale(
                box_id,
                nftBalance_before_batch_3,
                id_list_batch_3.length,
            );
            expect(nftList.map((id) => id.toString())).to.eql(id_list_batch_3.map((id) => id.toString()));
        }
        {
            const nftBalance_before = await enumerableNftContract.balanceOf(user_1.address);
            const buy_batch = 255;
            // buy 255 NFT(s)
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.box_id = box_id;
            parameters.amount = buy_batch;
            const tx_parameters = {
                value: txParameters.value.mul(parameters.amount),
            };
            await mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters);
            const user_2_balance = await enumerableNftContract.balanceOf(user_2.address);
            const nftBalance_after = await enumerableNftContract.balanceOf(user_1.address);

            expect(user_2_balance.eq(255)).to.be.true;
            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(nftBalance_before.sub(buy_batch))).to.be.true;
            expect(boxStatus.remaining.eq(nftBalance_after)).to.be.true;
        }
    });

    it('Should sell "not_sell_all" enumerableNftContract work', async () => {
        const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
        expect(boxStatus).to.have.property('remaining');
        const totalNFT = boxStatus.remaining;
        {
            await testTokenAContract.transfer(signers[5].address, transferAmount);
            await testTokenAContract.connect(signers[5]).approve(mbContract.address, transferAmount);
            await testTokenAContract.transfer(signers[6].address, transferAmount);
            await testTokenAContract.connect(signers[6]).approve(mbContract.address, transferAmount);
            await testTokenAContract.transfer(signers[7].address, transferAmount);
            await testTokenAContract.connect(signers[7]).approve(mbContract.address, transferAmount);
            await testTokenAContract.transfer(signers[8].address, transferAmount);
            await testTokenAContract.connect(signers[8]).approve(mbContract.address, transferAmount);
        }
        const contractTokenBalanceBefore = await testTokenAContract.balanceOf(mbContract.address);
        {
            expect((await enumerableNftContract.balanceOf(signers[5].address)).eq(0)).to.be.true;
            expect((await enumerableNftContract.balanceOf(signers[6].address)).eq(0)).to.be.true;
            expect((await enumerableNftContract.balanceOf(signers[7].address)).eq(0)).to.be.true;
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.amount = MaxNumberOfNFT;
            parameters.payment_token_index = 1;
            parameters.box_id = not_sell_all_box_id;
            await mbContract.connect(signers[5]).openBox(...Object.values(parameters));
            await mbContract.connect(signers[6]).openBox(...Object.values(parameters));
            await mbContract.connect(signers[7]).openBox(...Object.values(parameters));
            await expect(mbContract.connect(signers[8]).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'no NFT left',
            );
            expect((await enumerableNftContract.balanceOf(signers[5].address)).eq(MaxNumberOfNFT)).to.be.true;
            expect((await enumerableNftContract.balanceOf(signers[6].address)).eq(MaxNumberOfNFT)).to.be.true;
            const remainingNFT = totalNFT.sub(MaxNumberOfNFT * 2);
            expect((await enumerableNftContract.balanceOf(signers[7].address)).eq(remainingNFT)).to.be.true;
        }
        // sold out, validate payment token amount
        const paymentTokenAAmount = createBoxPara.payment[0][1].mul(totalNFT);
        const contractTokenBalanceAfter = await testTokenAContract.balanceOf(mbContract.address);
        expect(contractTokenBalanceAfter.eq(contractTokenBalanceBefore.add(paymentTokenAAmount))).to.be.true;
        {
            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            expect(boxStatus).to.have.property('payment');
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                '0',
                paymentTokenAAmount.toString(),
                '0',
                '0',
            ]);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(0)).to.be.true;
            expect(boxStatus.total.eq(not_sell_all_nft_id_list.length)).to.be.true;
        }
    });

    it('Should sell "not_sell_all" nonEnumerableNftContract work', async () => {
        let box_id;
        const total = 50;
        {
            await nonEnumerableNftContract.connect(user_1).mint(total);
            await nonEnumerableNftContract.connect(user_1).setApprovalForAll(mbContract.address, true);
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.nft_address = nonEnumerableNftContract.address;
            parameter.sell_all = false;
            const nftBalance = await nonEnumerableNftContract.balanceOf(user_1.address);
            expect(total.toString()).to.be.eq(nftBalance.toString());

            const id_list = [];
            for (let i = 0; i < nftBalance; i++) {
                id_list.push(i);
            }
            parameter.nft_id_list = id_list;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(result).to.have.property('nft_address').that.to.be.eq(nonEnumerableNftContract.address);
            expect(result).to.have.property('name').that.to.be.eq(parameter.name);
            expect(result).to.have.property('start_time').that.to.be.eq(parameter.start_time);
            expect(result).to.have.property('end_time').that.to.be.eq(parameter.end_time);
            expect(result).to.have.property('sell_all').that.to.be.eq(parameter.sell_all);
            expect(result).to.have.property('box_id');
            box_id = result.box_id;
        }

        const boxStatus = await mbContract.getBoxStatus(box_id);
        expect(boxStatus).to.have.property('remaining');
        expect(total.toString()).to.be.eq(boxStatus.remaining.toString());
        const totalNFT = boxStatus.remaining;
        {
            await testTokenAContract.transfer(signers[5].address, transferAmount);
            await testTokenAContract.connect(signers[5]).approve(mbContract.address, transferAmount);
            await testTokenAContract.transfer(signers[6].address, transferAmount);
            await testTokenAContract.connect(signers[6]).approve(mbContract.address, transferAmount);
            await testTokenAContract.transfer(signers[7].address, transferAmount);
            await testTokenAContract.connect(signers[7]).approve(mbContract.address, transferAmount);
            await testTokenAContract.transfer(signers[8].address, transferAmount);
            await testTokenAContract.connect(signers[8]).approve(mbContract.address, transferAmount);
        }
        const contractTokenBalanceBefore = await testTokenAContract.balanceOf(mbContract.address);
        {
            expect((await nonEnumerableNftContract.balanceOf(signers[5].address)).eq(0)).to.be.true;
            expect((await nonEnumerableNftContract.balanceOf(signers[6].address)).eq(0)).to.be.true;
            expect((await nonEnumerableNftContract.balanceOf(signers[7].address)).eq(0)).to.be.true;
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters.amount = MaxNumberOfNFT;
            parameters.payment_token_index = 1;
            parameters.box_id = box_id;
            await mbContract.connect(signers[5]).openBox(...Object.values(parameters));
            await mbContract.connect(signers[6]).openBox(...Object.values(parameters));
            await mbContract.connect(signers[7]).openBox(...Object.values(parameters));
            await expect(mbContract.connect(signers[8]).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'no NFT left',
            );
            expect((await nonEnumerableNftContract.balanceOf(signers[5].address)).eq(MaxNumberOfNFT)).to.be.true;
            expect((await nonEnumerableNftContract.balanceOf(signers[6].address)).eq(MaxNumberOfNFT)).to.be.true;
            const remainingNFT = totalNFT.sub(MaxNumberOfNFT * 2);
            expect((await nonEnumerableNftContract.balanceOf(signers[7].address)).eq(remainingNFT)).to.be.true;
        }
        // sold out, validate payment token amount
        const paymentTokenAAmount = createBoxPara.payment[0][1].mul(totalNFT);
        const contractTokenBalanceAfter = await testTokenAContract.balanceOf(mbContract.address);
        expect(contractTokenBalanceAfter.eq(contractTokenBalanceBefore.add(paymentTokenAAmount))).to.be.true;
        {
            const boxStatus = await mbContract.getBoxStatus(box_id);
            expect(boxStatus).to.have.property('payment');
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                '0',
                paymentTokenAAmount.toString(),
                '0',
                '0',
            ]);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(0)).to.be.true;
            expect(boxStatus.total.eq(totalNFT)).to.be.true;
        }
    });

    it('Should work if "NFT tokens transfered elsewhere"', async () => {
        const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
        expect(boxStatus).to.have.property('remaining');
        expect(boxStatus.remaining.eq(not_sell_all_nft_id_list.length)).to.be.true;

        // transfer NFT(s) elsewhere, remaining random numebr of NFT(s)
        const max = MaxNumberOfNFT / 2;
        const remain = Math.floor(Math.random() * max);
        // console.log(remain);
        for (let i = remain; i < not_sell_all_nft_id_list.length; i++) {
            await enumerableNftContract
                .connect(user_1)
                .transferFrom(user_1.address, user_2.address, not_sell_all_nft_id_list[i]);
        }
        const testAccount = signers[5];
        await testTokenAContract.transfer(testAccount.address, transferAmount);
        await testTokenAContract.connect(testAccount).approve(mbContract.address, transferAmount);
        const parameters = JSON.parse(JSON.stringify(openBoxParameters));
        parameters.amount = max;
        parameters.payment_token_index = 1;
        parameters.box_id = not_sell_all_box_id;

        while (true) {
            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            if (boxStatus.remaining.eq(0)) {
                break;
            }

            await mbContract.connect(testAccount).openBox(...Object.values(parameters));
            {
                const logs = await ethers.provider.getLogs(mbContract.filters.OpenSuccess());
                const parsedLog = interface.parseLog(logs[0]);
                const result = parsedLog.args;
                expect(result).to.have.property('amount');
                // console.log("amount: " + result.amount.toString());
            }
        }
        expect((await enumerableNftContract.balanceOf(testAccount.address)).eq(remain)).to.be.true;
    });

    it('Should 721A NFT work', async () => {
        let box_id;
        const contractEthBalanceBeforeOpen = await ethers.provider.getBalance(mbContract.address);
        const userEthBalanceBeforeOpen = await ethers.provider.getBalance(user_2.address);
        const batch = await mask721ANFTContract.BATCH_SIZE();
        await mask721ANFTContract.connect(user_1).mint(batch);
        const totalNFT = await mask721ANFTContract.balanceOf(user_1.address);
        expect(totalNFT.eq(batch)).to.be.true;
        expect((await mask721ANFTContract.balanceOf(signers[5].address)).eq(0)).to.be.true;
        await mask721ANFTContract.connect(user_1).setApprovalForAll(mbContract.address, true);
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.nft_address = mask721ANFTContract.address;
            parameter.sell_all = true;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(result).to.have.property('nft_address').that.to.be.eq(mask721ANFTContract.address);
            expect(result).to.have.property('name').that.to.be.eq(parameter.name);
            expect(result).to.have.property('start_time').that.to.be.eq(parameter.start_time);
            expect(result).to.have.property('end_time').that.to.be.eq(parameter.end_time);
            expect(result).to.have.property('sell_all').that.to.be.eq(parameter.sell_all);
            expect(result).to.have.property('box_id');
            box_id = result.box_id;
        }
        const parameters = JSON.parse(JSON.stringify(openBoxParameters));
        parameters.box_id = box_id;
        parameters.amount = batch;
        const tx_parameters = {
            value: txParameters.value.mul(parameters.amount),
        };
        await mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters);
        {
            const paymentEth = tx_parameters.value;
            const contractEthBalanceAfterOpen = await ethers.provider.getBalance(mbContract.address);
            const userEthBalanceAfterOpen = await ethers.provider.getBalance(user_2.address);
            expect(contractEthBalanceAfterOpen.eq(contractEthBalanceBeforeOpen.add(paymentEth))).to.be.true;
            expect(userEthBalanceBeforeOpen.gt(userEthBalanceAfterOpen.add(paymentEth))).to.be.true;
            const user_nft_balance = await mask721ANFTContract.balanceOf(user_2.address);
            expect(totalNFT.eq(user_nft_balance)).to.be.true;
            const owner_nft_balance = await mask721ANFTContract.balanceOf(user_1.address);
            expect(owner_nft_balance.eq(0)).to.be.true;
        }
        await expect(
            mbContract.connect(user_2).openBox(...Object.values(parameters), tx_parameters),
        ).to.be.rejectedWith('no NFT left');
        {
            const boxInfo = await mbContract.getBoxInfo(parameters.box_id);
            const boxStatus = await mbContract.getBoxStatus(parameters.box_id);
            expect(boxInfo).to.have.property('creator').that.to.be.eq(user_1.address);
            expect(boxInfo).to.have.property('nft_address').that.to.be.eq(mask721ANFTContract.address);
            expect(boxInfo).to.have.property('name').that.to.be.eq(createBoxPara.name);
            expect(boxStatus).to.have.property('started').that.to.be.eq(true);
            expect(boxStatus).to.have.property('expired').that.to.be.eq(false);
            expect(boxStatus).to.have.property('remaining');
            expect(boxStatus.remaining.eq(0)).to.be.true;
            expect(boxStatus.total.eq(totalNFT)).to.be.true;
        }

    });

    it('Should claimPayment reject invalid parameters', async () => {
        await expect(mbContract.connect(user_2).claimPayment([sell_all_box_id])).to.be.rejectedWith('not owner');
        await expect(mbContract.connect(user_2).claimPayment([not_sell_all_box_id])).to.be.rejectedWith('not owner');
    });

    it('Should claimPayment work', async () => {
        {
            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
        }
        const tx_parameters = {
            value: txParameters.value,
        };
        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        open_parameters.box_id = not_sell_all_box_id;
        await mbContract.connect(user_2).openBox(...Object.values(open_parameters), tx_parameters);
        const paymentEthAmount = createBoxPara.payment[0][1];
        const paymentTokenAAmount = createBoxPara.payment[1][1];
        {
            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                paymentEthAmount.toString(),
                '0',
                '0',
                '0',
            ]);
        }
        open_parameters.payment_token_index = 1;
        await mbContract.connect(user_2).openBox(...Object.values(open_parameters));
        {
            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                paymentEthAmount.toString(),
                paymentTokenAAmount.toString(),
                '0',
                '0',
            ]);
        }
        {
            const sell_all_open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
            sell_all_open_parameters.box_id = sell_all_box_id;
            await mbContract.connect(user_2).openBox(...Object.values(sell_all_open_parameters), tx_parameters);
            {
                const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
                expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                    paymentEthAmount.toString(),
                    paymentTokenAAmount.toString(),
                    '0',
                    '0',
                ]);
            }
            {
                const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
                expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                    paymentEthAmount.toString(),
                    '0',
                    '0',
                    '0',
                ]);
            }
        }
        // ETH balance before
        const authorEthBalanceBeforeClaim = await ethers.provider.getBalance(user_1.address);
        const contractEthBalanceBeforeClaim = await ethers.provider.getBalance(mbContract.address);
        // token A balance before
        const authorTokenABalanceBeforeClaim = await testTokenAContract.balanceOf(user_1.address);
        const contractTokenABalanceBeforeClaim = await testTokenAContract.balanceOf(mbContract.address);
        await expect(mbContract.connect(user_1).claimPayment([not_sell_all_box_id])).to.be.rejectedWith(
            'not expired/sold-out',
        );
        await expect(mbContract.connect(user_2).claimPayment([not_sell_all_box_id])).to.be.rejectedWith('not owner');

        await helper.advanceTimeAndBlock(seconds_in_a_day * 90);
        await mbContract.connect(user_1).claimPayment([not_sell_all_box_id]);
        {
            const boxStatus = await mbContract.getBoxStatus(not_sell_all_box_id);
            // `claimPayment` can only claim payment in one of the boxes
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
        }
        const authorEthBalanceAfterClaim = await ethers.provider.getBalance(user_1.address);
        const contractEthBalanceAfterClaim = await ethers.provider.getBalance(mbContract.address);
        // token A balance after
        const authorTokenABalanceAfterClaim = await testTokenAContract.balanceOf(user_1.address);
        const contractTokenABalanceAfterClaim = await testTokenAContract.balanceOf(mbContract.address);
        // assume `gas consumption` is less than `paymentEthAmount`
        expect(authorEthBalanceAfterClaim.gt(authorEthBalanceBeforeClaim)).to.be.true;
        expect(contractEthBalanceBeforeClaim.eq(contractEthBalanceAfterClaim.add(paymentEthAmount))).to.be.true;
        expect(authorTokenABalanceAfterClaim.eq(authorTokenABalanceBeforeClaim.add(paymentTokenAAmount))).to.be.true;
        expect(contractTokenABalanceBeforeClaim.eq(contractTokenABalanceAfterClaim.add(paymentTokenAAmount))).to.be
            .true;
        {
            const boxStatus = await mbContract.getBoxStatus(sell_all_box_id);
            // `claimPayment` can only claim payment in one of the boxes
            expect(boxStatus.payment.map((info) => info.receivable_amount.toString())).to.eql([
                paymentEthAmount.toString(),
                '0',
                '0',
                '0',
            ]);
        }
        await mbContract.connect(user_1).claimPayment([not_sell_all_box_id]);
        {
            const authorEthBalanceAfterClaimAgain = await ethers.provider.getBalance(user_1.address);
            const contractEthBalanceAfterClaimAgain = await ethers.provider.getBalance(mbContract.address);
            expect(authorEthBalanceAfterClaim.gt(authorEthBalanceAfterClaimAgain)).to.be.true;
            expect(contractEthBalanceAfterClaim.eq(contractEthBalanceAfterClaimAgain)).to.be.true;

            // token A balance after
            const authorTokenABalanceAfterClaimAgain = await testTokenAContract.balanceOf(user_1.address);
            const contractTokenABalanceAfterClaimAgain = await testTokenAContract.balanceOf(mbContract.address);
            expect(authorTokenABalanceAfterClaim.eq(authorTokenABalanceAfterClaimAgain)).to.be.true;
            expect(contractTokenABalanceAfterClaim.eq(contractTokenABalanceAfterClaimAgain)).to.be.true;
        }
        {
            const contractEthBalance = await ethers.provider.getBalance(mbContract.address);
            expect(contractEthBalance.gt(0)).to.be.true;
        }
    });

    it('Should MaskHolder work', async () => {
        expect((await testMaskTokenContract.balanceOf(contractCreator.address)).gt(0)).to.be.true;
        expect((await testMaskTokenContract.balanceOf(user_1.address)).eq(0)).to.be.true;

        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.holder_token_addr = testMaskTokenContract.address;
            parameter.sell_all = true;
            parameter.holder_min_token_amount = holderMinAmount;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameters.box_id = result.box_id;
        }
        await expect(
            mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters),
        ).to.be.rejectedWith('not holding enough token');

        // transfer
        await testMaskTokenContract.transfer(user_1.address, holderMinAmount);
        await mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters);

        const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
        expect(boxInfo).to.have.property('holder_min_token_amount');
        expect(boxInfo.holder_min_token_amount.eq(holderMinAmount)).to.be.true;
        expect(boxInfo).to.have.property('holder_token_addr');
        expect(boxInfo.holder_token_addr).to.be.eq(testMaskTokenContract.address);
    });

    it('Should addAdmin/addWhitelist work', async () => {
        let user_test = signers[4];
        await enumerableNftContract.connect(user_test).mint(10);
        await enumerableNftContract.connect(user_test).setApprovalForAll(mbContract.address, true);
        const parameter = JSON.parse(JSON.stringify(createBoxPara));
        parameter.sell_all = true;

        expect(await mbContract.whitelist(user_1.address)).to.be.eq(true);
        expect(await mbContract.admin(user_1.address)).to.be.eq(false);
        await expect(mbContract.connect(user_1).addAdmin([user_test.address])).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await expect(mbContract.connect(user_1).addWhitelist([user_test.address])).to.be.rejectedWith('not admin');
        await expect(mbContract.connect(user_test).createBox(...Object.values(parameter))).to.be.rejectedWith(
            'not whitelisted',
        );
        expect(await mbContract.whitelist(user_test.address)).to.be.eq(false);
        expect(await mbContract.admin(user_test.address)).to.be.eq(false);
        await mbContract.connect(contractCreator).addAdmin([user_1.address]);
        expect(await mbContract.admin(user_1.address)).to.be.eq(true);
        await mbContract.connect(user_1).addWhitelist([user_test.address]);
        expect(await mbContract.whitelist(user_test.address)).to.be.eq(true);
        await expect(mbContract.connect(user_1).addAdmin([user_test.address])).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(user_test).createBox(...Object.values(parameter));

        await expect(mbContract.connect(user_test).removeWhitelist([user_test.address])).to.be.rejectedWith(
            'not admin',
        );
        await mbContract.connect(user_1).removeWhitelist([user_test.address]);
        expect(await mbContract.whitelist(user_test.address)).to.be.eq(false);
        await expect(mbContract.connect(user_test).createBox(...Object.values(parameter))).to.be.rejectedWith(
            'not whitelisted',
        );

        await mbContract.connect(contractCreator).removeAdmin([user_1.address]);
        expect(await mbContract.admin(user_1.address)).to.be.eq(false);
        await expect(mbContract.connect(user_1).addWhitelist([user_test.address])).to.be.rejectedWith('not admin');
    });

    it('Should whitelist qualification work', async () => {
        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = true;
            parameter.qualification = whitelistQlfContract.address;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameters.box_id = result.box_id;
        }
        await whitelistQlfContract.addWhitelist([user_1.address]);
        await mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters);
        await expect(
            mbContract.connect(user_2).openBox(...Object.values(open_parameters), txParameters),
        ).to.be.rejectedWith('not whitelisted');

        const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
        expect(boxInfo).to.have.property('qualification').that.to.be.eq(whitelistQlfContract.address);
    });

    /*
    it('Should signature verification qualification work', async () => {
        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = true;
            parameter.qualification = sigVerifyQlfContract.address;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameters.box_id = result.box_id;
        }
        {
            const msg_hash = soliditySha3(qualification_project_name, user_1.address);
            const signature = await verifier.signMessage(ethers.utils.arrayify(msg_hash));
            open_parameters.proof = signature;
            await mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters);
            await expect(
                mbContract.connect(user_2).openBox(...Object.values(open_parameters), txParameters),
            ).to.be.rejectedWith('not qualified');
        }
        const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
        expect(boxInfo).to.have.property('qualification').that.to.be.eq(sigVerifyQlfContract.address);
    });
    */

    it('Should merkle root qualification work', async () => {
        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = true;
            parameter.qualification = merkleRootQlfContract.address;
            parameter.qualification_data = proofs.merkleRoot;

            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameters.box_id = result.box_id;
        }
        {
            const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
            expect(boxInfo).to.have.property('qualification').that.to.be.eq(merkleRootQlfContract.address);
            expect(boxInfo).to.have.property('qualification_data').that.to.be.eq(proofs.merkleRoot);
        }
        {
            let user_1_index = proofs.leaves.length;
            for (let i = 0; i < proofs.leaves.length; i++) {
                if (proofs.leaves[i].address == user_1.address) {
                    user_1_index = i;
                }
            }
            expect(user_1_index < proofs.leaves.length).to.be.true;
            const proof = abiCoder.encode(['uint256', 'bytes32[]'], [user_1_index, proofs.leaves[user_1_index].proof]);
            open_parameters.proof = proof;
            await mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters);
            await expect(
                mbContract.connect(user_2).openBox(...Object.values(open_parameters), txParameters),
            ).to.be.rejectedWith('not qualified');
        }
        {
            let user_2_index = proofs.leaves.length;
            for (let i = 0; i < proofs.leaves.length; i++) {
                if (proofs.leaves[i].address == user_2.address) {
                    user_2_index = i;
                }
            }
            expect(user_2_index < proofs.leaves.length).to.be.true;

            const proof = abiCoder.encode(['uint256', 'bytes32[]'], [user_2_index, proofs.leaves[user_2_index].proof]);
            open_parameters.proof = proof;
            await expect(
                mbContract.connect(user_2).setQualificationData(open_parameters.box_id, createBoxPara.qualification_data),
            ).to.be.rejectedWith('not box owner');
            await mbContract.connect(user_1).setQualificationData(open_parameters.box_id, createBoxPara.qualification_data);
            {
                const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
                expect(boxInfo).to.have.property('qualification_data').that.to.be.eq(createBoxPara.qualification_data);
            }
            await expect(
                mbContract.connect(user_2).openBox(...Object.values(open_parameters), txParameters),
            ).to.be.rejectedWith('not qualified');
            await mbContract.connect(user_1).setQualificationData(open_parameters.box_id, proofs.merkleRoot);
            {
                const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
                expect(boxInfo).to.have.property('qualification_data').that.to.be.eq(proofs.merkleRoot);
            }
            await mbContract.connect(user_2).openBox(...Object.values(open_parameters), txParameters);
        }
    });

    it('Should MaskHolderQlf qualification work', async () => {
        expect((await testMaskTokenContract.balanceOf(contractCreator.address)).gt(0)).to.be.true;
        expect((await testMaskTokenContract.balanceOf(user_1.address)).eq(0)).to.be.true;

        const open_parameters = JSON.parse(JSON.stringify(openBoxParameters));
        {
            const parameter = JSON.parse(JSON.stringify(createBoxPara));
            parameter.sell_all = true;
            parameter.qualification = maskHolderQlfContract.address;
            await mbContract.connect(user_1).createBox(...Object.values(parameter));
            const logs = await ethers.provider.getLogs(mbContract.filters.CreationSuccess());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            open_parameters.box_id = result.box_id;
        }
        await expect(
            mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters),
        ).to.be.rejectedWith('not holding enough token');

        // transfer
        await testMaskTokenContract.transfer(user_1.address, holderMinAmount);
        await mbContract.connect(user_1).openBox(...Object.values(open_parameters), txParameters);

        const boxInfo = await mbContract.getBoxInfo(open_parameters.box_id);
        expect(boxInfo).to.have.property('qualification').that.to.be.eq(maskHolderQlfContract.address);
    });

    it('Should not be able to call initialize', async () => {
        await expect(mbContract.connect(contractCreator).initialize()).to.be.rejectedWith(Error);
        await expect(mbContract.connect(user_1).initialize()).to.be.rejectedWith(Error);
        await expect(mbContract.connect(user_2).initialize()).to.be.rejectedWith(Error);
    });

    it('Should transferOwnership work', async () => {
        await expect(mbContract.connect(user_1).transferOwnership(user_1.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).transferOwnership(user_1.address);
        const owner = await mbContract.owner();
        expect(owner).to.be.eq(user_1.address);
    });
});
