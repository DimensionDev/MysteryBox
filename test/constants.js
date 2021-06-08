const ethers = require('ethers');

const ZeroAddress = '0x0000000000000000000000000000000000000000';

// https://docs.chain.link/docs/get-a-random-number/
const LinkAccessorFulfillRandomnessGasLimit = 200000;
const ProbabilityDistributionTestRound = 64;

const NftCtorParameters = {
    name: 'Mask Network NFT',
    symbol: 'MaskNFT',
};

const NftMintParameters = {
    id: 12345,
    tokenURI: 'https://ipfs.io/ipfs/QmSXHfQ9Q3H1sPKmHyy1aupapJEyiTnumCQUTTVvEbib3j?filename=mask.png',
};

const LinkAccessorCtorParameters = {
    vrfCoordinator: '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952',
    link: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    linkKeyHash: '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445',
    fee: ethers.utils.parseUnits(`2`, 18),
    mysteryBox: ZeroAddress,
};

const MysteryboxCtorParameters = {
    _owner: ZeroAddress,
    _linkAccessor: ZeroAddress,
    _nftHandle: ZeroAddress,
};

const CreateCollectionParameters = {
    name: 'MUST HAVE',
    quantity_limit: 64,
    start_time: 0,
    // 30 days
    end_time: Math.floor(new Date().getTime() / 1000) + 108000,
    nft_option: [
        [10, 100],
        [10, 100],
        [30, 100],
        [50, 100],
    ],
    payment: [
        // ETH
        [ZeroAddress, ethers.utils.parseUnits('0.1', 18)],
        // USDT
        ['0xdAC17F958D2ee523a2206206994597C13D831ec7', ethers.utils.parseUnits('100', 18)],
        // USDC
        ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', ethers.utils.parseUnits('10', 18)],
        // MASK
        ['0x69af81e73a73b40adf4f3d4223cd9b1ece623074', ethers.utils.parseUnits('1', 18)],
    ],
};

const DrawNftParameters = {
    _collection_id: '0',
    _number_of_nft: 1,
    _payment_token_index: 1,
};

const MaxNumberOfNFT = 64;

const drawTxParameters = {
    // 6 M Gwei
    gasLimit: 6000000,
    // `0.01 ether` is the fee users need to pay to draw an NFT
    value: ethers.utils.parseUnits('0.01', 'ether'),
};

module.exports = {
    NftCtorParameters,
    NftMintParameters,
    LinkAccessorCtorParameters,
    MysteryboxCtorParameters,
    CreateCollectionParameters,
    DrawNftParameters,
    ZeroAddress,
    LinkAccessorFulfillRandomnessGasLimit,
    ProbabilityDistributionTestRound,
    MaxNumberOfNFT,
    drawTxParameters,
};
