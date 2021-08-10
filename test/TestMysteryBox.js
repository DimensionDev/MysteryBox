const chai = require('chai');
const MockDate = require('mockdate');
const expect = chai.expect;
const helper = require('./helper');
const { soliditySha3 } = require('web3-utils');

chai.use(require('chai-as-promised'));

const jsonABI = require('../artifacts/contracts/MysteryBox.sol/MysteryBox.json');
const interface = new ethers.utils.Interface(jsonABI.abi);

const qlfWhiltelistJsonABI = require('../artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json');
const qlfSigVerifyJsonABI = require('../artifacts/contracts/SigVerifyQlf.sol/SigVerifyQlf.json');

let snapshotId;
let mbContract;
let nftContract;

let testTokenAContract;
let testTokenBContract;
let testTokenCContract;
let contractCreator;
let user_0;
let user_1;

let whitelistQlfContract;
let sigVerifyQlfContract;

const {
    NftCtorParameters,
    openBoxParameters,
    MysteryboxCtorParameters,
    CreateCollectionParameters,
    ZeroAddress,
    ProbabilityDistributionTestRound,
    MaxNumberOfNFT,
    qualification_project_name,
    seconds_in_a_day,
} = require('./constants');

const network = 'mainnet';
const ctorParameter = NftCtorParameters[network];

const txParameters = {
    gasLimit: 6000000,
    value: ctorParameter.payment[0][1],
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
            const factory = await ethers.getContractFactory('WhitelistQlf');
            const proxy = await upgrades.deployProxy(factory, []);
            whitelistQlfContract = new ethers.Contract(proxy.address, qlfWhiltelistJsonABI.abi, contractCreator);
        }

        {
            const factory = await ethers.getContractFactory('SigVerifyQlf');
            const proxy = await upgrades.deployProxy(factory, [qualification_project_name, verifier.address]);
            sigVerifyQlfContract = new ethers.Contract(proxy.address, qlfSigVerifyJsonABI.abi, contractCreator);
        }
        // first is ETH: address(0)
        ctorParameter.payment.push([testTokenAContract.address, ctorParameter.payment[0][1]]);
        ctorParameter.payment.push([testTokenBContract.address, ctorParameter.payment[0][1]]);
        ctorParameter.payment.push([testTokenCContract.address, ctorParameter.payment[0][1]]);
        {
            const factory = await ethers.getContractFactory('MysteryBox');
            const proxy = await upgrades.deployProxy(factory, [...Object.values(ctorParameter)]);
            mbContract = new ethers.Contract(proxy.address, jsonABI.abi, contractCreator);
        }
        await testTokenAContract.transfer(user_0.address, transferAmount);
        await testTokenAContract.connect(user_0).approve(mbContract.address, transferAmount);
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

        const name = await mbContract.name();
        expect(name).to.be.eq(ctorParameter.name);

        const symbol = await mbContract.symbol();
        expect(symbol).to.be.eq(ctorParameter.symbol);
    });

    it('Should not be able to buy if not-started', async () => {
        const now = Math.floor(new Date().getTime() / 1000);
        const start_time = now + seconds_in_a_day;
        await mbContract.connect(contractCreator).setStartTime(start_time);
        await expect(
            mbContract.connect(user_0).openBox(...Object.values(openBoxParameters), txParameters),
        ).to.be.rejectedWith('not started');
    });

    it('Should not mint expired', async () => {
        const now = Math.floor(new Date().getTime() / 1000);
        const end_time = now - seconds_in_a_day;
        await mbContract.connect(contractCreator).setEndTime(end_time);
        await expect(
            mbContract.connect(user_0).openBox(...Object.values(openBoxParameters), txParameters),
        ).to.be.rejectedWith('expired');
    });

    it('Should mint reject invalid parameters', async () => {
        {
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters._payment_token_index = 1;
            await expect(mbContract.connect(user_1).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'ERC20: transfer amount exceeds balance',
            );
            await testTokenAContract.transfer(user_1.address, transferAmount);
            await expect(mbContract.connect(user_1).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'ERC20: transfer amount exceeds allowance',
            );
        }
        {
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters._number_of_nft = MaxNumberOfNFT + 1;
            await expect(mbContract.connect(user_0).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'exceeds personal limit',
            );
        }
        {
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            parameters._payment_token_index = ctorParameter.payment.length;
            await expect(mbContract.connect(user_0).openBox(...Object.values(parameters))).to.be.rejectedWith(
                'invalid payment token',
            );
        }
        {
            const tx_parameters = {
                value: 0,
            };
            await expect(
                mbContract.connect(user_1).openBox(...Object.values(openBoxParameters), tx_parameters),
            ).to.be.rejectedWith('not enough ETH');
        }
    });

    it('Should personal limit work', async () => {
        const parameters = JSON.parse(JSON.stringify(openBoxParameters));
        const tx_parameters = JSON.parse(JSON.stringify(txParameters));
        parameters._number_of_nft = MaxNumberOfNFT / 2;
        tx_parameters.value = txParameters.value.mul(parameters._number_of_nft);
        await mbContract.connect(user_0).openBox(...Object.values(parameters), tx_parameters);
        await mbContract.connect(user_0).openBox(...Object.values(parameters), tx_parameters);
        await expect(
            mbContract.connect(user_0).openBox(...Object.values(parameters), tx_parameters),
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
            const draw_parameters = JSON.parse(JSON.stringify(openBoxParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            // draw 2 NFT(s), should work
            draw_parameters._number_of_nft = total_NFT_number;
            await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters);
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
            const draw_parameters = JSON.parse(JSON.stringify(openBoxParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            draw_parameters._number_of_nft = total_NFT_number + 10;
            // draw 3 NFT,
            await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters);
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
            const draw_parameters = JSON.parse(JSON.stringify(openBoxParameters));
            const logs = await ethers.provider.getLogs(mbContract.filters.CollectionCreated());
            const parsedLog = interface.parseLog(logs[0]);
            const result = parsedLog.args;
            expect(result).to.have.property('owner').that.to.be.eq(contractCreator.address);
            expect(result).to.have.property('collection_id');
            const collection_id = result.collection_id;
            draw_parameters._collection_id = collection_id;
            await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters);
            await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters);
            await expect(
                mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters),
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
            const draw_parameters = JSON.parse(JSON.stringify(openBoxParameters));
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
            const txParameter = JSON.parse(JSON.stringify(txParameters));
            await expect(
                mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameter),
            ).to.be.rejectedWith('not enough ETH');
            // draw 3 NFT
            txParameter.value = CreateCollectionParameters.payment[0][1]
                .mul(draw_parameters._number_of_nft)
                .add(txParameter.value);
            await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameter);
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

    it('Should openBox + claimNFT + ERC-20 + LocalRandomNumberGenerator work properly', async () => {
        await expect(mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id)).to.be.rejectedWith(
            'nothing to claim',
        );

        await mbContract.connect(contractCreator).setLinkAccessor(ZeroAddress);
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;

        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1];
        // token A balance before
        const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
        await mbContract.connect(user_0).openBox(...Object.values(openBoxParameters), txParameters);
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
            await expect(mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id)).to.be.rejectedWith(
                'nothing to claim',
            );
            expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        }
    });

    it('Should openBox + claimNFT + ERC-20 + ChainLinkVRF work properly', async () => {
        expect(await mbContract.isReadyToClaim(openBoxParameters._collection_id, user_0.address)).to.be.true;
        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1];
        // token A balance before
        const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
        await openBox();
        const userTokenABalanceAfterDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterDraw = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceBeforeDraw.eq(userTokenABalanceAfterDraw.add(paymentTokenAAmount))).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceBeforeDraw.add(paymentTokenAAmount))).to.be.true;
        expect((await nftContract.balanceOf(user_0.address)).eq(0)).to.be.true;
        // should revert if `random number` is not generated
        await expect(mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id)).to.be.rejectedWith(
            'random number not ready',
        );
        expect(await mbContract.isReadyToClaim(openBoxParameters._collection_id, user_0.address)).to.be.false;
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
        expect(await mbContract.isReadyToClaim(openBoxParameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id);
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
            await expect(mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id)).to.be.rejectedWith(
                'nothing to claim',
            );
            expect((await nftContract.balanceOf(user_0.address)).eq(1)).to.be.true;
        }
        const userTokenABalanceAfterClaim = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterClaim = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceAfterDraw.eq(userTokenABalanceAfterClaim)).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceAfterClaim)).to.be.true;
    });

    it('Should openBox multiple NFT work properly', async () => {
        {
            const purchaseHistory = await mbContract.getPurchaseInfo(openBoxParameters._collection_id, user_0.address);
            expect(purchaseHistory._claim_history.length).to.be.eq(0);
        }
        // token A balance before
        const paymentTokenAAmount = CreateCollectionParameters.payment[1][1].mul(MaxNumberOfNFT);
        const userTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceBeforeDraw = await testTokenAContract.balanceOf(mbContract.address);
        {
            const MultiDrawNFT_parameters = JSON.parse(JSON.stringify(openBoxParameters));
            MultiDrawNFT_parameters._number_of_nft = MaxNumberOfNFT;
            await mbContract.connect(user_0).openBox(...Object.values(MultiDrawNFT_parameters), txParameters);
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
        expect(await mbContract.isReadyToClaim(openBoxParameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id);
        expect((await nftContract.balanceOf(user_0.address)).eq(MaxNumberOfNFT)).to.be.true;
        const userTokenABalanceAfterClaim = await testTokenAContract.balanceOf(user_0.address);
        const contractTokenABalanceAfterClaim = await testTokenAContract.balanceOf(mbContract.address);
        expect(userTokenABalanceAfterDraw.eq(userTokenABalanceAfterClaim)).to.be.true;
        expect(contractTokenABalanceAfterDraw.eq(contractTokenABalanceAfterClaim)).to.be.true;
        {
            const purchaseHistory = await mbContract.getPurchaseInfo(openBoxParameters._collection_id, user_0.address);
            expect(purchaseHistory._claim_history.length).to.be.eq(MaxNumberOfNFT);
        }
    });

    it('Should openBox + claimNFT + ETH + ChainLinkVRF work properly', async () => {
        const parameters = JSON.parse(JSON.stringify(openBoxParameters));
        parameters._payment_token_index = 0;

        const nft_price = CreateCollectionParameters.payment[parameters._payment_token_index][1];
        // payment + 'fee'
        const paymentEthAmount = nft_price.add(txParameters.value);
        const txParameters = JSON.parse(JSON.stringify(txParameters));
        txParameters.value = paymentEthAmount;
        // ETH balance
        const userEthBalanceBeforeDraw = await ethers.provider.getBalance(user_0.address);
        const contractEthBalanceBeforeDraw = await ethers.provider.getBalance(mbContract.address);
        await mbContract.connect(user_0).openBox(...Object.values(parameters), txParameters);
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
        // `probability distribution` of 4 different classes of NFT should roughly match:
        // 10% 10% 30% 50%
        for (let i = 0; i < ProbabilityDistributionTestRound; i++) {
            await mbContract.connect(user_0).openBox(...Object.values(openBoxParameters), txParameters);
            const fakeRequestId = await accessorContract.requestId();
            const fakeRand = soliditySha3(user_0.address, i, Date.now());
            await accessorContract
                .connect(fake_vrf_coordinator)
                .rawFulfillRandomness(fakeRequestId, fakeRand, rawFulfillRandomnessTxParameter);
        }
        expect(await mbContract.isReadyToClaim(openBoxParameters._collection_id, user_0.address)).to.be.true;
        await mbContract.connect(user_0).claimNFT(openBoxParameters._collection_id);
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

        const purchaseHistory = await mbContract.getPurchaseInfo(openBoxParameters._collection_id, user_0.address);
        expect(purchaseHistory).to.have.property('_claim_history');
        expect(purchaseHistory._claim_history.length).to.be.eq(ProbabilityDistributionTestRound);
    });

    it('Should claimPayment reject invalid parameters', async () => {
        await expect(mbContract.connect(user_1).claimPayment()).to.be.rejectedWith('not owner');
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
            const parameters = JSON.parse(JSON.stringify(openBoxParameters));
            const txParameters = JSON.parse(JSON.stringify(txParameters));
            parameters._payment_token_index = 0;
            txParameters.value = paymentEthAmount.add(txParameters.value);
            await mbContract.connect(user_0).openBox(...Object.values(parameters), txParameters);
        }
        await openBox();
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
        await mbContract.connect(contractCreator).setQualification(whitelistQlfContract.address);
        await whitelistQlfContract.add_white_list([user_0.address]);
        await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters);
        await expect(
            mbContract.connect(user_1).openBox(...Object.values(draw_parameters), txParameters),
        ).to.be.rejectedWith('not whitelisted');
    });

    it('Should signature verification qualification work', async () => {
        await mbContract.connect(contractCreator).setQualification(sigVerifyQlfContract.address);
        {
            const draw_parameters = JSON.parse(JSON.stringify(openBoxParameters));
            const msg_hash = soliditySha3(qualification_project_name, user_0.address);
            const signature = await verifier.signMessage(ethers.utils.arrayify(msg_hash));
            draw_parameters._proof = signature;
            await mbContract.connect(user_0).openBox(...Object.values(draw_parameters), txParameters);
            await expect(
                mbContract.connect(user_1).openBox(...Object.values(draw_parameters), txParameters),
            ).to.be.rejectedWith('not qualified');
        }
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

    it('Should setStartTime/setEndTime work', async () => {
        {
            const nftInfo = await mbContract.getNFTInfo();
            expect(nftInfo._start_time).to.be.eq(ctorParameter.start_time);
            expect(nftInfo._end_time).to.be.eq(ctorParameter.end_time);
        }
        const now = Math.floor(new Date().getTime() / 1000);
        // set start time
        const start_time = now + seconds_in_a_day;
        await expect(mbContract.connect(user_0).setStartTime(start_time)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).setStartTime(start_time);
        // set end time
        const end_time = now + seconds_in_a_day;
        await expect(mbContract.connect(user_0).setEndTime(end_time)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).setEndTime(end_time);
        {
            const nftInfo = await mbContract.getNFTInfo();
            expect(nftInfo._end_time).to.be.eq(end_time);
        }
    });

    it('Should setQualification work', async () => {
        {
            const nftInfo = await mbContract.getNFTInfo();
            expect(nftInfo._qualification).to.be.eq(ctorParameter.qualification);
        }
        await expect(mbContract.connect(user_0).setQualification(whitelistQlfContract.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner',
        );
        await mbContract.connect(contractCreator).setQualification(whitelistQlfContract.address);
        {
            const nftInfo = await mbContract.getNFTInfo();
            expect(nftInfo._qualification).to.be.eq(whitelistQlfContract.address);
        }
    });

    it('Should setBaseURI work', async () => {
        /*
        {
            const name = await mbContract.name();
            expect(name).to.be.eq(NftCtorParameters.name);
        }

        const newName = 'MASK NFT';
        await expect(mbContract.connect(user_0).setName(newName)).to.be.rejectedWith('Ownable: caller is not the owner');
        await mbContract.connect(contractCreator).setName(newName);

        {
            const name = await mbContract.name();
            expect(name).to.be.eq(newName);
        }
        */
    });

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
