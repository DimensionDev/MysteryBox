const ethers = require('ethers');

const { ChainlinkVRFConfig, ContractAddressConfig } = require('../SmartContractProjectConfig/config.js');

const ZeroAddress = '0x0000000000000000000000000000000000000000';

// at 'Tue 17 Aug 2021 10:30:27', the swap price is: 2 $LINK == 0.017 ETH
const chainLinkFeeInEther = ethers.utils.parseUnits('0.02', 'ether');

// https://docs.chain.link/docs/get-a-random-number/
const LinkAccessorFulfillRandomnessGasLimit = 200000;
const ProbabilityDistributionTestRound = 24;

const NftCtorParameters = {
    name: '1559 Supporter 718/1559',
    symbol: 'MaskNFT',
    baseURI: 'https://nft.mask.io/MaskTestNFT_',
};

const NftMintParameters = {
    id: '12345',
    recipient: ZeroAddress,
};

const LinkAccessorCtorParameters = {
    vrfCoordinator: ChainlinkVRFConfig.mainnet.VRFCoordinator,
    link: ChainlinkVRFConfig.mainnet.LinkAddress,
    linkKeyHash: ChainlinkVRFConfig.mainnet.KeyHash,
    fee: ChainlinkVRFConfig.mainnet.Fee,
    mysteryBox: ZeroAddress,
    uniswapRouter: ContractAddressConfig.mainnet.UniswapRouterAddress,
};

const MysteryboxCtorParameters = {
    _linkAccessor: ZeroAddress,
    _nftHandle: ZeroAddress,
    _fee: chainLinkFeeInEther,
};

const CreateCollectionParameters = {
    name: 'Mask NFT',
    purchase_limit: 24,
    start_time: 0,
    // 30 days
    end_time: Math.floor(new Date().getTime() / 1000) + 7776000,
    nft_option: [
        [10, 10000],
        [10, 10000],
        [30, 10000],
        [50, 10000],
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
    _qualification: ZeroAddress,
};

const DrawNftParameters = {
    _collection_id: '0',
    _number_of_nft: 1,
    _payment_token_index: 1,
    _proof: [],
};

const MaxNumberOfNFT = 24;

const DrawTxParameters = {
    // 6 M Gwei
    gasLimit: 6000000,
    // `0.01 ether` is the fee users need to pay to draw an NFT
    value: chainLinkFeeInEther,
};

const qualification_project_name = 'MASK';
const qualification_verifier = '0x720272934CE8e42106f7d4F79B666C52030FCdA6';
const seconds_in_a_day = 60 * 60 * 24;

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
    DrawTxParameters,
    qualification_project_name,
    qualification_verifier,
    seconds_in_a_day,
};
