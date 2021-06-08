const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
const helper = require('./helper');
const { soliditySha3 } = require('web3-utils');

chai.use(require('chai-as-promised'));

const jsonABI = require('../artifacts/contracts/MysteryBox.sol/MysteryBox.json');
const interface = new ethers.utils.Interface(jsonABI.abi);

const nftJsonABI = require('../artifacts/contracts/MysteryBoxNFT.sol/MysteryBoxNFT.json');
const nftInterface = new ethers.utils.Interface(nftJsonABI.abi);

const qlfWhiltelistJsonABI = require('../artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json');
const qlfSigVerifyJsonABI = require('../artifacts/contracts/SigVerifyQlf.sol/SigVerifyQlf.json');

let snapshotId;
let mbContract;
let nftContract;
let linkTokenContract;
let accessorContract;

let testTokenAContract;
let testTokenBContract;
let testTokenCContract;
let contractCreator;
let user_0;
let user_1;
let fake_vrf_coordinator;
let whitelistQlfContract;
let sigVerifyQlfContract;
let verifier;
let collection_id;
const invalid_collection_id = 1000;

const {
    NftCtorParameters,
    LinkAccessorCtorParameters,
    MysteryboxCtorParameters,
    CreateCollectionParameters,
    DrawNftParameters,
    ZeroAddress,
    LinkAccessorFulfillRandomnessGasLimit,
    ProbabilityDistributionTestRound,
    MaxNumberOfNFT,
    DrawTxParameters,
    qualification_project_name,
    seconds_in_a_day,
} = require('./constants');

const rawFulfillRandomnessTxParameter = {
    gasLimit: LinkAccessorFulfillRandomnessGasLimit,
};

describe('MysteryBox', () => {
    // 1 billion tokens, typical decimal 18
    const testTokenMintAmount = ethers.utils.parseUnits('1000000000', 18).toString();
    const transferAmount = ethers.utils.parseUnits('100000000', 18).toString();

    before(async () => {
        signers = await ethers.getSigners();
        contractCreator = signers[0];
        user_0 = signers[1];
        user_1 = signers[2];
        fake_vrf_coordinator = signers[3];
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

        {
            const factory = await ethers.getContractFactory('MockLinkToken');
            const deploy = await factory.deploy();
            linkTokenContract = await deploy.deployed();
        }
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
            LinkAccessorCtorParameters.link = linkTokenContract.address;
            LinkAccessorCtorParameters.vrfCoordinator = fake_vrf_coordinator.address;
            const factory = await ethers.getContractFactory('MockLinkAccessor');
            const deploy = await factory.deploy(...Object.values(LinkAccessorCtorParameters));
            accessorContract = await deploy.deployed();
        }
        {
            const factory = await ethers.getContractFactory('MysteryBoxNFT');
            const proxy = await upgrades.deployProxy(factory, [...Object.values(NftCtorParameters)]);
            nftContract = new ethers.Contract(proxy.address, nftJsonABI.abi, contractCreator);
        }
        {
            MysteryboxCtorParameters._linkAccessor = accessorContract.address;
            MysteryboxCtorParameters._nftHandle = nftContract.address;
            const factory = await ethers.getContractFactory('MysteryBox');
            const proxy = await upgrades.deployProxy(factory, [...Object.values(MysteryboxCtorParameters)]);
            mbContract = new ethers.Contract(proxy.address, jsonABI.abi, contractCreator);
        }
        await linkTokenContract.transfer(accessorContract.address, LinkAccessorCtorParameters.fee.mul(10));
        await nftContract.addAdmin(mbContract.address);
        await testTokenAContract.transfer(user_0.address, transferAmount);
        await testTokenAContract.connect(user_0).approve(mbContract.address, transferAmount);
        {
            await accessorContract.connect(contractCreator).setMysteryBox(mbContract.address);
            const mysteryBox = await accessorContract.mysteryBox();
            expect(mysteryBox).to.be.eq(mbContract.address);
        }
        // first is ETH: address(0)
        CreateCollectionParameters.payment[1][0] = testTokenAContract.address;
        CreateCollectionParameters.payment[2][0] = testTokenBContract.address;
        CreateCollectionParameters.payment[3][0] = testTokenCContract.address;
        {
            await mbContract.connect(contractCreator).createCollection(...Object.values(CreateCollectionParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            collection_id = result.collection_id;
        }
        DrawNftParameters._collection_id = collection_id;
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

        const linkAccessor = await mbContract.linkAccessor();
        expect(linkAccessor).to.be.eq(accessorContract.address);

        const mysteryBoxNFT = await mbContract.mysteryBoxNFT();
        expect(mysteryBoxNFT).to.be.eq(nftContract.address);

        const fee = await mbContract.fee();
        expect(fee.eq(DrawTxParameters.value)).to.be.true;
    });

    it('Should setLinkAccessor work properly', async () => {
        await expect(mbContract.connect(user_0).setLinkAccessor(nftContract.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).setLinkAccessor(nftContract.address);
        const link_accessor = await mbContract.linkAccessor();
        expect(link_accessor).to.be.eq(nftContract.address);
    });

    it('Should setNftHandle work properly', async () => {
        await expect(mbContract.connect(user_0).setNftHandle(accessorContract.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).setNftHandle(accessorContract.address);
        const nft_handle = await mbContract.mysteryBoxNFT();
        expect(nft_handle).to.be.eq(accessorContract.address);
    });

    it('Should setFee work properly', async () => {
        {
            const fee = await mbContract.fee();
            expect(fee.eq(DrawTxParameters.value)).to.be.true;
        }
        const newFee = ethers.BigNumber.from(DrawTxParameters.value).mul(2);
        await expect(mbContract.connect(user_0).setFee(newFee)).to.be.rejectedWith('Ownable: caller is not the owner');
        await mbContract.connect(contractCreator).setFee(newFee);
        const fee = await mbContract.fee();
        expect(fee.eq(newFee)).to.be.true;
    });

    it('Should not draw not-started', async () => {
        const create_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
        const now = Math.floor(new Date().getTime() / 1000);
        create_parameters.start_time = now + seconds_in_a_day * 90;
        create_parameters.end_time = CreateCollectionParameters.start_time + seconds_in_a_day;
        await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
        const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
        const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
        const parsedLog = interface.parseLog(logs[0]);
        const result = parsedLog.args;
        expect(result).to.have.property('collection_id');
        const collection_id = result.collection_id;
        draw_parameters._collection_id = collection_id;
        await expect(
            mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters),
        ).to.be.rejectedWith('not started');
    });

    it('Should not draw expired', async () => {
        const create_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
        const now = Math.floor(new Date().getTime() / 1000);
        create_parameters.start_time = now - seconds_in_a_day;
        create_parameters.end_time = CreateCollectionParameters.start_time + seconds_in_a_day;
        await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
        const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
        const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
        const parsedLog = interface.parseLog(logs[0]);
        const result = parsedLog.args;
        expect(result).to.have.property('collection_id');
        const collection_id = result.collection_id;
        draw_parameters._collection_id = collection_id;
        await expect(
            mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters),
        ).to.be.rejectedWith('expired');
    });

    it('Should createCollection reject invalid parameters', async () => {
        {
            const invalid_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            invalid_parameters.nft_option = [];
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith('invalid NFT options');
        }
        {
            const invalid_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            invalid_parameters.nft_option = [
                [90, 0],
                [10, 100],
            ];
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith('invalid total amount');
        }
        {
            const invalid_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            invalid_parameters.nft_option = [
                [100, 100],
                [1, 100],
            ];
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith('invalid percentage');

            invalid_parameters.nft_option = [
                [80, 100],
                [1, 100],
            ];
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith('invalid percentage');
        }
        {
            const invalid_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            invalid_parameters.nft_option = [
                [100, 100],
                [0, 100],
            ];
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith('invalid percentage');
        }
        {
            const invalid_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            invalid_parameters.payment = [];
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith('invalid payment options');
        }

        {
            const invalid_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            invalid_parameters.payment[0][0] = nftContract.address;
            await expect(
                mbContract.connect(user_0).createCollection(...Object.values(invalid_parameters)),
            ).to.be.rejectedWith(Error);
        }
    });

    it('Should createCollection work properly', async () => {
        {
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            expect(collection_info).to.have.property('_owner').that.to.be.eq(contractCreator.address);
            expect(collection_info).to.have.property('_name').that.to.be.eq(CreateCollectionParameters.name);
            expect(collection_info)
                .to.have.property('_purchase_limit')
                .that.to.be.eq(CreateCollectionParameters.purchase_limit);
            expect(collection_info)
                .to.have.property('_start_time')
                .that.to.be.eq(CreateCollectionParameters.start_time);
            expect(collection_info).to.have.property('_end_time').that.to.be.eq(CreateCollectionParameters.end_time);
            expect(collection_info).to.have.property('_total_quantity').that.to.be.eq(40000);
            expect(collection_info).to.have.property('_drawn_quantity').that.to.be.eq(0);
            expect(collection_info).to.have.property('_claimed_quantity').that.to.be.eq(0);
            expect(collection_info).to.have.property('_qualification').that.to.be.eq(ZeroAddress);

            expect(collection_info).to.have.property('_nft_list');
            const nft_list = collection_info._nft_list;
            expect(nft_list.length).to.be.eq(CreateCollectionParameters.nft_option.length);
            expect(nft_list.map((info) => info.sold.toString())).to.eql(['0', '0', '0', '0']);
            expect(nft_list.map((info) => info.percentage)).to.eql(
                CreateCollectionParameters.nft_option.map((info) => info[0]),
            );

            expect(collection_info).to.have.property('_payment_list');
            const payment_list = collection_info._payment_list;
            expect(payment_list.map((info) => info.token_addr)).to.eql(
                CreateCollectionParameters.payment.map((info) => info[0]),
            );
            expect(payment_list.map((info) => info.price)).to.eql(
                CreateCollectionParameters.payment.map((info) => info[1]),
            );
            expect(payment_list.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
        }
        // using `local random number`
        await mbContract.connect(contractCreator).setLinkAccessor(ZeroAddress);
        const MultiDrawNFT_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
        MultiDrawNFT_parameters._number_of_nft = MaxNumberOfNFT;
        await mbContract.connect(user_0).drawNFT(...Object.values(MultiDrawNFT_parameters), DrawTxParameters);
        {
            const distribution = [0, 0, 0, 0];
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            const nft_list = collection_info._nft_list;
            expect(collection_info).to.have.property('_total_quantity').that.to.be.eq(40000);
            expect(collection_info).to.have.property('_drawn_quantity').that.to.be.eq(MaxNumberOfNFT);
            expect(collection_info).to.have.property('_claimed_quantity').that.to.be.eq(MaxNumberOfNFT);
            expect(distribution.length).to.be.eq(nft_list.length);
            const logs = await ethers.provider.getLogs(nftContract.filters.Transfer());
            expect(logs.length).to.be.eq(ProbabilityDistributionTestRound);
            for (let i = 0; i < logs.length; i++) {
                const parsedLog = nftInterface.parseLog(logs[i]);
                const result = parsedLog.args;
                expect(result).to.have.property('from').that.to.be.eq(ZeroAddress);
                expect(result).to.have.property('to').that.to.be.eq(user_0.address);
                expect(result).to.have.property('tokenId');
                const owner = await nftContract.ownerOf(result.tokenId);
                expect(owner).to.be.eq(user_0.address);
                const index = getNftTypeIndex(nft_list, result.tokenId);
                expect(index).to.be.lessThan(nft_list.length);
                distribution[index]++;
            }
            expect(nft_list.map((info) => info.sold)).to.eql(distribution);
        }
    });

    it('Should createCollection [different parameters] work properly', async () => {
        {
            const parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            parameters.nft_option = [[100, 100]];
            await mbContract.connect(contractCreator).createCollection(...Object.values(parameters));
        }
        {
            const parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
            parameters.nft_option = [
                [9, 100],
                [91, 100],
            ];
            await mbContract.connect(contractCreator).createCollection(...Object.values(parameters));
        }
    });

    it('Should drawNFT reject invalid parameters', async () => {
        {
            const parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            parameters._collection_id = invalid_collection_id;
            await expect(mbContract.connect(user_1).drawNFT(...Object.values(parameters))).to.be.rejectedWith(
                'invalid collection',
            );
        }
        await expect(
            mbContract.connect(user_1).drawNFT(...Object.values(DrawNftParameters), DrawTxParameters),
        ).to.be.rejectedWith('ERC20: transfer amount exceeds balance');
        await testTokenAContract.transfer(user_1.address, transferAmount);
        await expect(
            mbContract.connect(user_1).drawNFT(...Object.values(DrawNftParameters), DrawTxParameters),
        ).to.be.rejectedWith('ERC20: transfer amount exceeds allowance');
        {
            const parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            parameters._number_of_nft = MaxNumberOfNFT + 1;
            await expect(mbContract.connect(user_0).drawNFT(...Object.values(parameters))).to.be.rejectedWith(
                'exceeds personal limit',
            );
        }
        {
            const parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            parameters._payment_token_index = CreateCollectionParameters.payment.length;
            await expect(mbContract.connect(user_0).drawNFT(...Object.values(parameters))).to.be.rejectedWith(
                'invalid payment token',
            );
        }
        {
            const tx_parameters = JSON.parse(JSON.stringify(DrawTxParameters));
            tx_parameters.value = 0;
            await expect(
                mbContract.connect(user_1).drawNFT(...Object.values(DrawNftParameters), tx_parameters),
            ).to.be.rejectedWith('not enough Fee');
        }
    });

    it('Should draw-limit work', async () => {
        const parameters = JSON.parse(JSON.stringify(DrawNftParameters));
        parameters._number_of_nft = MaxNumberOfNFT / 2;
        await mbContract.connect(user_0).drawNFT(...Object.values(parameters), DrawTxParameters);
        await mbContract.connect(user_0).drawNFT(...Object.values(parameters), DrawTxParameters);
        await expect(
            mbContract.connect(user_0).drawNFT(...Object.values(parameters), DrawTxParameters),
        ).to.be.rejectedWith('exceeds personal limit');
    });

    it('Should total-amount work', async () => {
        const create_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
        // total 2 NFT(s)
        const total_NFT_number = 2;
        create_parameters.nft_option = [
            [20, 1],
            [80, 1],
        ];
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;
        {
            await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
            const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            // draw 2 NFT(s), should work
            draw_parameters._number_of_nft = total_NFT_number;
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters);
            {
                // NFT can be claimed after `random number` is generated
                const fakeRequestId = await accessorContract.requestId();
                const fakeRand = LinkAccessorCtorParameters.link;
                await accessorContract
                    .connect(fake_vrf_coordinator)
                    .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
            }
            await mbContract.connect(user_0).claimNFT(draw_parameters._collection_id);
            expect((await nftContract.balanceOf(user_0.address)).eq(total_NFT_number)).to.be.true;
        }
        {
            // token A balance before
            const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
            const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
            await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
            const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            draw_parameters._number_of_nft = total_NFT_number + 10;
            // draw 3 NFT,
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters);
            {
                // NFT can be claimed after `random number` is generated
                const fakeRequestId = await accessorContract.requestId();
                const fakeRand = LinkAccessorCtorParameters.link;
                await accessorContract
                    .connect(fake_vrf_coordinator)
                    .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
            }
            await mbContract.connect(user_0).claimNFT(draw_parameters._collection_id);
            // should only pay & draw & claim 2 NFT(s)
            const userTokenABalanceAfterDraw = await testTokenAContract.balanceOf(user_0.address);
            const contractTokenABalanceAfterDraw = await testTokenAContract.balanceOf(mbContract.address);
            const paymentTokenAAmount = CreateCollectionParameters.payment[1][1].mul(total_NFT_number);
            expect(userTokenABalanceBeforeDraw.eq(userTokenABalanceAfterDraw.add(paymentTokenAAmount))).to.be.true;
            expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceBeforeDraw.add(paymentTokenAAmount))).to.be
                .true;
            expect((await nftContract.balanceOf(user_0.address)).eq(total_NFT_number * 2)).to.be.true;
        }
        {
            await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
            const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters);
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters);
            await expect(
                mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters),
            ).to.be.rejectedWith('no NFT left');
            {
                // NFT can be claimed after `random number` is generated
                const fakeRequestId = await accessorContract.requestId();
                const fakeRand = LinkAccessorCtorParameters.link;
                await accessorContract
                    .connect(fake_vrf_coordinator)
                    .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
            }
            await mbContract.connect(user_0).claimNFT(draw_parameters._collection_id);
            expect((await nftContract.balanceOf(user_0.address)).eq(total_NFT_number * 3)).to.be.true;
        }
        {
            // pay with ETH, test refund
            const userEthBalanceBeforeDraw = await ethers.provider.getBalance(user_0.address);
            // unsued fee will be transfered to `LinkAccessor`
            const unused_fee = await mbContract.unused_fee();
            let contractEthBalanceBeforeDraw = await ethers.provider.getBalance(mbContract.address);
            contractEthBalanceBeforeDraw = contractEthBalanceBeforeDraw.sub(unused_fee);
            await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
            const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            // Pay with ETH
            draw_parameters._payment_token_index = 0;
            draw_parameters._collection_id = collection_id;
            draw_parameters._number_of_nft = total_NFT_number + 1;
            const txParameter = JSON.parse(JSON.stringify(DrawTxParameters));
            await expect(
                mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), txParameter),
            ).to.be.rejectedWith('not enough ETH');
            // draw 3 NFT
            txParameter.value = CreateCollectionParameters.payment[0][1]
                .mul(draw_parameters._number_of_nft)
                .add(txParameter.value);
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), txParameter);
            // should only pay & draw & claim 2 NFT(s)
            const userEthBalanceAfterDraw = await ethers.provider.getBalance(user_0.address);
            const contractEthBalanceAfterDraw = await ethers.provider.getBalance(mbContract.address);
            const paymentTokenETHAmount = CreateCollectionParameters.payment[0][1].mul(total_NFT_number);
            // `gas consumption + fee`
            expect(userEthBalanceBeforeDraw.gt(userEthBalanceAfterDraw.add(paymentTokenETHAmount))).to.be.true;
            // ETH refund: assume (`gas consumption + fee` < NFT price)
            expect(userEthBalanceBeforeDraw.lt(userEthBalanceAfterDraw.add(txParameter.value))).to.be.true;
            expect(contractEthBalanceAfterDraw.eq(contractEthBalanceBeforeDraw.add(paymentTokenETHAmount))).to.be.true;
            {
                // NFT can be claimed after `random number` is generated
                const fakeRequestId = await accessorContract.requestId();
                const fakeRand = LinkAccessorCtorParameters.link;
                await accessorContract
                    .connect(fake_vrf_coordinator)
                    .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
            }
            {
                const collection_info = await mbContract.getCollectionInfo(draw_parameters._collection_id);
                expect(collection_info._drawn_quantity).to.be.eq(total_NFT_number);
                expect(collection_info._claimed_quantity).to.be.eq(0);
                const purchaseHistory = await mbContract.getPurchaseInfo(
                    draw_parameters._collection_id,
                    user_0.address,
                );
                expect(purchaseHistory._claim_history.length).to.be.eq(0);
                expect(purchaseHistory._purchased_number).to.be.eq(total_NFT_number);
            }
            await mbContract.connect(user_0).claimNFT(draw_parameters._collection_id);
            expect((await nftContract.balanceOf(user_0.address)).eq(total_NFT_number * 4)).to.be.true;
            {
                const collection_info = await mbContract.getCollectionInfo(draw_parameters._collection_id);
                expect(collection_info._drawn_quantity).to.be.eq(total_NFT_number);
                expect(collection_info._claimed_quantity).to.be.eq(total_NFT_number);
                const purchaseHistory = await mbContract.getPurchaseInfo(
                    draw_parameters._collection_id,
                    user_0.address,
                );
                expect(purchaseHistory._claim_history.length).to.be.eq(total_NFT_number);
                expect(purchaseHistory._purchased_number).to.be.eq(total_NFT_number);
            }
        }
    });

    it('Should drawNFT + claimNFT + ERC-20 + LocalRandomNumberGenerator work properly', async () => {
        await expect(mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id)).to.be.rejectedWith(
            'nothing to claim',
        );

        await mbContract.connect(contractCreator).setLinkAccessor(ZeroAddress);
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;

        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1];
        // token A balance before
        const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
        await mbContract.connect(user_0).drawNFT(...Object.values(DrawNftParameters), DrawTxParameters);
        const userTokenABalanceAfterDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterDraw = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceBeforeDraw.eq(userTokenABalanceAfterDraw.add(paymentTokenAAmount))).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceBeforeDraw.add(paymentTokenAAmount))).to.be.true;
        expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        {
            const logs = await ethers.provider.getLogs(nftContract.filters.Transfer());
            const parsedLog = nftInterface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('from').that.to.be.eq(ZeroAddress);
            expect(result).to.have.property('to').that.to.be.eq(user_0.address);
            expect(result).to.have.property('tokenId');
            const owner = await nftContract.ownerOf(result.tokenId);
            expect(owner).to.be.eq(user_0.address);
        }
        {
            // `claimNFT()` again should revert
            await expect(mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id)).to.be.rejectedWith(
                'nothing to claim',
            );
            expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        }
    });

    it('Should drawNFT + claimNFT + ERC-20 + ChainLinkVRF work properly', async () => {
        expect(await mbContract.isReadyToClaim(DrawNftParameters._collection_id, user_0.address)).to.be.true;
        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1];
        // token A balance before
        const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
        await drawNFT();
        const userTokenABalanceAfterDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterDraw = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceBeforeDraw.eq(userTokenABalanceAfterDraw.add(paymentTokenAAmount))).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceBeforeDraw.add(paymentTokenAAmount))).to.be.true;
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;
        // should revert if `random number` is not generated
        await expect(mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id)).to.be.rejectedWith(
            'random number not ready',
        );
        expect(await mbContract.isReadyToClaim(DrawNftParameters._collection_id, user_0.address)).to.be.false;
        {
            // others can NOT call `rawFulfillRandomness`
            const fakeRequestId = LinkAccessorCtorParameters.linkKeyHash;
            const fakeRand = LinkAccessorCtorParameters.link;
            await expect(
                accessorContract
                    .connect(user_1)
                    .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter),
            ).to.be.rejectedWith('Only VRFCoordinator can fulfill');
        }
        {
            // NFT can be claimed after `random number` is generated
            const fakeRequestId = await accessorContract.requestId();
            const fakeRand = LinkAccessorCtorParameters.link;
            await accessorContract
                .connect(fake_vrf_coordinator)
                .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
        }
        expect(await mbContract.isReadyToClaim(DrawNftParameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id);
        expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        {
            const logs = await ethers.provider.getLogs(nftContract.filters.Transfer());
            const parsedLog = nftInterface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('from').that.to.be.eq(ZeroAddress);
            expect(result).to.have.property('to').that.to.be.eq(user_0.address);
            expect(result).to.have.property('tokenId');
            const owner = await nftContract.ownerOf(result.tokenId);
            expect(owner).to.be.eq(user_0.address);
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            const index = getNftTypeIndex(collection_info._nft_list, result.tokenId);
            expect(index).to.be.lessThan(collection_info._nft_list.length);
        }
        {
            // `claimNFT()` again should revert
            await expect(mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id)).to.be.rejectedWith(
                'nothing to claim',
            );
            expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        }
        const userTokenABalanceAfterClaim = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterClaim = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceAfterDraw.eq(userTokenABalanceAfterClaim)).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceAfterClaim)).to.be.true;
    });

    it('Should drawNFT multiple NFT work properly', async () => {
        {
            const purchaseHistory = await mbContract.getPurchaseInfo(DrawNftParameters._collection_id, user_0.address);
            expect(purchaseHistory._claim_history.length).to.be.eq(0);
        }
        // token A balance before
        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1].mul(MaxNumberOfNFT);
        const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
        {
            const MultiDrawNFT_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            MultiDrawNFT_parameters._number_of_nft = MaxNumberOfNFT;
            await mbContract.connect(user_0).drawNFT(...Object.values(MultiDrawNFT_parameters), DrawTxParameters);
        }
        const userTokenABalanceAfterDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterDraw = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceBeforeDraw.eq(userTokenABalanceAfterDraw.add(paymentTokenAAmount))).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceBeforeDraw.add(paymentTokenAAmount))).to.be.true;
        {
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            const payment_list = collection_info._payment_list;
            expect(payment_list.map((info) => info.receivable_amount.toString())).to.eql([
                '0',
                paymentTokenAAmount.toString(),
                '0',
                '0',
            ]);
        }
        {
            const fakeRequestId = await accessorContract.requestId();
            const fakeRand = LinkAccessorCtorParameters.link;
            await accessorContract
                .connect(fake_vrf_coordinator)
                .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
        }
        expect(await mbContract.isReadyToClaim(DrawNftParameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id);
        expect((await nftContract.balanceOf(user_0.address)).eq(MaxNumberOfNFT)).to.be.true;
        const userTokenABalanceAfterClaim = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterClaim = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceAfterDraw.eq(userTokenABalanceAfterClaim)).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceAfterClaim)).to.be.true;
        {
            const purchaseHistory = await mbContract.getPurchaseInfo(DrawNftParameters._collection_id, user_0.address);
            expect(purchaseHistory._claim_history.length).to.be.eq(MaxNumberOfNFT);
        }
    });

    it('Should drawNFT + claimNFT + ETH + ChainLinkVRF work properly', async () => {
        const parameters = JSON.parse(JSON.stringify(DrawNftParameters));
        parameters._payment_token_index = 0;

        const nft_price = CreateCollectionParameters.payment[parameters._payment_token_index][1];
        // payment + 'fee'
        const paymentEthAmount = nft_price.add(DrawTxParameters.value);
        const txParameters = JSON.parse(JSON.stringify(DrawTxParameters));
        txParameters.value = paymentEthAmount;
        // ETH balance
        const userEthBalanceBeforeDraw = await ethers.provider.getBalance(user_0.address);
        const contractEthBalanceBeforeDraw = await ethers.provider.getBalance(mbContract.address);
        await mbContract.connect(user_0).drawNFT(...Object.values(parameters), txParameters);
        const userEthBalanceAfterDraw = await ethers.provider.getBalance(user_0.address);
        const contractEthBalanceAfterDraw = await ethers.provider.getBalance(mbContract.address);
        // gas consumption
        expect(userEthBalanceBeforeDraw.gt(userEthBalanceAfterDraw.add(paymentEthAmount))).to.be.true;
        expect(contractEthBalanceAfterDraw.eq(contractEthBalanceBeforeDraw.add(nft_price))).to.be.true;
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;
        // should revert if `random number` is not generated
        await expect(mbContract.connect(user_0).claimNFT(parameters._collection_id)).to.be.rejectedWith(
            'random number not ready',
        );
        expect(await mbContract.isReadyToClaim(parameters._collection_id, user_0.address)).to.be.false;
        {
            // NFT can be claimed after `random number` is generated
            const fakeRequestId = await accessorContract.requestId();
            const fakeRand = LinkAccessorCtorParameters.link;
            await accessorContract
                .connect(fake_vrf_coordinator)
                .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
        }
        expect(await mbContract.isReadyToClaim(parameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(parameters._collection_id);
        expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        {
            const logs = await ethers.provider.getLogs(nftContract.filters.Transfer());
            const parsedLog = nftInterface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('from').that.to.be.eq(ZeroAddress);
            expect(result).to.have.property('to').that.to.be.eq(user_0.address);
            expect(result).to.have.property('tokenId');
            const owner = await nftContract.ownerOf(result.tokenId);
            expect(owner).to.be.eq(user_0.address);
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            const index = getNftTypeIndex(collection_info._nft_list, result.tokenId);
            expect(index).to.be.lessThan(collection_info._nft_list.length);
        }
        {
            // `claimNFT()` again should revert
            await expect(mbContract.connect(user_0).claimNFT(parameters._collection_id)).to.be.rejectedWith(
                'nothing to claim',
            );
            expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        }
        const userEthBalanceAfterClaim = await ethers.provider.getBalance(user_0.address);
        const contractEthBalanceAfterClaim = await ethers.provider.getBalance(mbContract.address);
        expect(userEthBalanceAfterDraw.gt(userEthBalanceAfterClaim)).to.be.true;
        expect(contractEthBalanceAfterDraw.eq(contractEthBalanceAfterClaim)).to.be.true;
    });

    it('probability distribution test', async () => {
        await linkTokenContract.transfer(
            accessorContract.address,
            LinkAccessorCtorParameters.fee.mul(ProbabilityDistributionTestRound),
        );
        // `probability distribution` of 4 different classes of NFT should roughly match:
        // 10% 10% 30% 50%
        for (let i = 0; i < ProbabilityDistributionTestRound; i++) {
            await mbContract.connect(user_0).drawNFT(...Object.values(DrawNftParameters), DrawTxParameters);
            const fakeRequestId = await accessorContract.requestId();
            const fakeRand = soliditySha3(user_0.address, i, Date.now());
            await accessorContract
                .connect(fake_vrf_coordinator)
                .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
        }
        expect(await mbContract.isReadyToClaim(DrawNftParameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id);
        const distribution = [0, 0, 0, 0];
        const collection_info = await mbContract.getCollectionInfo(collection_id);
        expect(distribution.length).to.be.eq(collection_info._nft_list.length);
        const logs = await ethers.provider.getLogs(nftContract.filters.Transfer());
        expect(logs.length).to.be.eq(ProbabilityDistributionTestRound);
        for (let i = 0; i < logs.length; i++) {
            const parsedLog = nftInterface.parseLog(logs[i]);
            const result = parsedLog.args;
            expect(result).to.have.property('from').that.to.be.eq(ZeroAddress);
            expect(result).to.have.property('to').that.to.be.eq(user_0.address);
            expect(result).to.have.property('tokenId');
            const owner = await nftContract.ownerOf(result.tokenId);
            expect(owner).to.be.eq(user_0.address);
            const index = getNftTypeIndex(collection_info._nft_list, result.tokenId);
            expect(index).to.be.lessThan(collection_info._nft_list.length);
            distribution[index]++;
        }
        for (let i = 0; i < distribution.length; i++) {
            distribution[i] = distribution[i] / ProbabilityDistributionTestRound;
        }
        try {
            // distribution[2] is 0.3
            expect(distribution[2]).to.be.greaterThan(0.1);
            expect(distribution[2]).to.be.lessThan(0.5);
            // distribution[2] is 0.5
            expect(distribution[3]).to.be.greaterThan(0.3);
            expect(distribution[3]).to.be.lessThan(0.7);
        } catch (ex) {
            console.log('exception: unexpected distribution: ' + distribution + ' please check!');
        }

        const purchaseHistory = await mbContract.getPurchaseInfo(DrawNftParameters._collection_id, user_0.address);
        expect(purchaseHistory).to.have.property('_claim_history');
        expect(purchaseHistory._claim_history.length).to.be.eq(ProbabilityDistributionTestRound);
    });

    it('Should claimPayment reject invalid parameters', async () => {
        await expect(mbContract.connect(user_1).claimPayment([collection_id])).to.be.rejectedWith('not owner');
        await expect(
            mbContract.connect(contractCreator).claimPayment([collection_id, invalid_collection_id]),
        ).to.be.rejectedWith('not owner');
        await expect(mbContract.connect(user_1).claimPayment([invalid_collection_id])).to.be.rejectedWith('not owner');
    });

    it('Should claimPayment work', async () => {
        {
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            expect(collection_info).to.have.property('_payment_list');
            const payment_list = collection_info._payment_list;
            expect(payment_list.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
        }
        let paymentEthAmount = CreateCollectionParameters.payment[0][1];
        {
            const parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const txParameters = JSON.parse(JSON.stringify(DrawTxParameters));
            parameters._payment_token_index = 0;
            txParameters.value = paymentEthAmount.add(DrawTxParameters.value);
            await mbContract.connect(user_0).drawNFT(...Object.values(parameters), txParameters);
        }
        await drawNFT();
        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1];
        {
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            expect(collection_info).to.have.property('_payment_list');
            const payment_list = collection_info._payment_list;
            expect(payment_list.map((info) => info.receivable_amount.toString())).to.eql([
                paymentEthAmount.toString(),
                paymentTokenAAmount.toString(),
                '0',
                '0',
            ]);
        }
        // ETH balance before
        const authorEthBalanceBeforeClaim = await ethers.provider.getBalance(contractCreator.address);
        const contractEthBalanceBeforeClaim = await ethers.provider.getBalance(mbContract.address);
        // token A balance before
        const authorTokenABalanceBeforeClaim = await testTokenAContract.balanceOf(contractCreator.address);
        const contractTokenABalanceBeforeClaim = await testTokenAContract.balanceOf(mbContract.address);
        await mbContract.connect(contractCreator).claimPayment([collection_id]);
        const authorEthBalanceAfterClaim = await ethers.provider.getBalance(contractCreator.address);
        const contractEthBalanceAfterClaim = await ethers.provider.getBalance(mbContract.address);
        // token A balance after
        const authorTokenABalanceAfterClaim = await testTokenAContract.balanceOf(contractCreator.address);
        const contractTokenABalanceAfterClaim = await testTokenAContract.balanceOf(mbContract.address);

        // assume `gas consumption` is less than `paymentEthAmount`
        expect(authorEthBalanceAfterClaim.gt(authorEthBalanceBeforeClaim)).to.be.true;
        expect(contractEthBalanceBeforeClaim.eq(contractEthBalanceAfterClaim.add(paymentEthAmount))).to.be.true;
        expect(authorTokenABalanceAfterClaim.eq(authorTokenABalanceBeforeClaim.add(paymentTokenAAmount))).to.be.true;
        expect(contractTokenABalanceBeforeClaim.eq(contractTokenABalanceAfterClaim.add(paymentTokenAAmount))).to.be
            .true;
        {
            const collection_info = await mbContract.getCollectionInfo(collection_id);
            const payment_list = collection_info._payment_list;
            expect(payment_list.map((info) => info.receivable_amount.toString())).to.eql(['0', '0', '0', '0']);
        }
        await mbContract.connect(contractCreator).claimPayment([collection_id]);
        {
            const authorEthBalanceAfterClaimAgain = await ethers.provider.getBalance(contractCreator.address);
            const contractEthBalanceAfterClaimAgain = await ethers.provider.getBalance(mbContract.address);
            expect(authorEthBalanceAfterClaim.gt(authorEthBalanceAfterClaimAgain)).to.be.true;
            expect(contractEthBalanceAfterClaim.eq(contractEthBalanceAfterClaimAgain)).to.be.true;

            // token A balance after
            const authorTokenABalanceAfterClaimAgain = await testTokenAContract.balanceOf(contractCreator.address);
            const contractTokenABalanceAfterClaimAgain = await testTokenAContract.balanceOf(mbContract.address);
            expect(authorTokenABalanceAfterClaim.eq(authorTokenABalanceAfterClaimAgain)).to.be.true;
            expect(contractTokenABalanceAfterClaim.eq(contractTokenABalanceAfterClaimAgain)).to.be.true;
        }
    });

    it('Should whitelist qualification work', async () => {
        const create_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
        create_parameters._qualification = whitelistQlfContract.address;
        await whitelistQlfContract.add_white_list([user_0.address]);
        {
            await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
            const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters);
            await expect(
                mbContract.connect(user_1).drawNFT(...Object.values(draw_parameters), DrawTxParameters),
            ).to.be.rejectedWith('not whitelisted');
        }
    });

    it('Should signature verification qualification work', async () => {
        const create_parameters = JSON.parse(JSON.stringify(CreateCollectionParameters));
        create_parameters._qualification = sigVerifyQlfContract.address;
        {
            await mbContract.connect(contractCreator).createCollection(...Object.values(create_parameters));
            const draw_parameters = JSON.parse(JSON.stringify(DrawNftParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            {
                const msg_hash = soliditySha3(qualification_project_name, user_0.address);
                const signature = await verifier.signMessage(ethers.utils.arrayify(msg_hash));
                draw_parameters._proof = signature;
            }
            await mbContract.connect(user_0).drawNFT(...Object.values(draw_parameters), DrawTxParameters);
            await expect(
                mbContract.connect(user_1).drawNFT(...Object.values(draw_parameters), DrawTxParameters),
            ).to.be.rejectedWith('not qualified');
        }
    });

    it('Should claimNFT revert if no NFT is there', async () => {
        // `claimNFT()` again should revert
        await expect(mbContract.connect(user_0).claimNFT(DrawNftParameters._collection_id)).to.be.rejectedWith(
            'nothing to claim',
        );
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;
    });

    it('Should fulfillRandomness reject non-accessor', async () => {
        // only `accessor` can call `fulfillRandomness`
        const fakeRequestId = await accessorContract.requestId();
        const fakeRand = LinkAccessorCtorParameters.link;
        await expect(mbContract.connect(user_0).fulfillRandomness(fakeRequestId, fakeRand)).to.be.rejectedWith(
            'Only linkAccessor can call',
        );
    });

    it('Should initialize not work', async () => {
        // should not be able to call it again
        await expect(
            mbContract.connect(contractCreator).initialize(...Object.values(MysteryboxCtorParameters)),
        ).to.be.rejectedWith(Error);
        await expect(
            mbContract.connect(user_0).initialize(...Object.values(MysteryboxCtorParameters)),
        ).to.be.rejectedWith(Error);
        await expect(
            mbContract.connect(user_1).initialize(...Object.values(MysteryboxCtorParameters)),
        ).to.be.rejectedWith(Error);
    });

    it('Should transferOwnership work', async () => {
        await expect(mbContract.connect(user_0).transferOwnership(user_0.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).transferOwnership(user_0.address);
        await expect(mbContract.connect(contractCreator).setLinkAccessor(nftContract.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(user_0).setLinkAccessor(nftContract.address);
    });

    async function drawNFT() {
        await mbContract.connect(user_0).drawNFT(...Object.values(DrawNftParameters), DrawTxParameters);
        const logs = await ethers.provider.getLogs(mbContract.filters.NFTDrawn());
        expect(logs.length).to.be.eq(1);
        const parsedLog = interface.parseLog(logs[0]);
        const result = parsedLog.args;
        expect(result).to.have.property('owner').that.to.be.eq(user_0.address);
        expect(result).to.have.property('collection_id');
        expect(result.collection_id.toString()).to.be.eq(DrawNftParameters._collection_id.toString());
        expect(result).to.have.property('number_of_nft').that.to.be.eq(DrawNftParameters._number_of_nft);
    }

    function getNftTypeIndex(TypeList, NftId) {
        // `NFT type ID` is the upper 128 bits of the NFT id.
        // Find the index of `NftId` in `TypeList`.
        const NftTypeId = NftId.shr(128);
        for (let i = 0; i < TypeList.length; i++) {
            const matchTypeId = TypeList[i].latest_nft_id.shr(128);
            if (NftTypeId.eq(matchTypeId)) {
                return i;
            }
        }
        return TypeList.length;
    }
});
