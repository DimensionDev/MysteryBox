const ethers = require('ethers');

const ZeroAddress = '0x0000000000000000000000000000000000000000';
const now = Math.floor(new Date().getTime() / 1000);
const seconds_in_a_day = 60 * 60 * 24;
const MaxNumberOfNFT = 24;

const NftCtorParameters = {
    mainnet: {
        name: '1559 Supporter 718/1559',
        symbol: 'MaskNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/',
        purchase_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        qualification: ZeroAddress,
        total: [1, 1, 5, 15, 88],
        payment: [
            // 0.1 ETH
            [ZeroAddress, ethers.utils.parseUnits('0.1', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
    },
    rinkeby: {
        name: '1559 Supporter 718/1559',
        symbol: 'MaskNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/',
        purchase_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        qualification: ZeroAddress,
        total: [1, 1, 5, 15, 88],
        payment: [
            // ETH
            [ZeroAddress, ethers.utils.parseUnits('0.1', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
    },
    matic_mainnet: {
        name: '1559 Supporter 718/1559',
        symbol: 'MaskNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/',
        purchase_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        qualification: ZeroAddress,
        total: [1, 1, 5, 15, 88],
        payment: [
            // 100 MATIC
            [ZeroAddress, ethers.utils.parseUnits('100', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
    },
};

const openBoxParameters = {
    _number_of_nft: 1,
    _payment_token_index: 0,
    _proof: [],
};

const qualification_project_name = 'MASK';
const qualification_verifier = '0x720272934CE8e42106f7d4F79B666C52030FCdA6';

module.exports = {
    NftCtorParameters,
    ZeroAddress,
    MaxNumberOfNFT,
    openBoxParameters,
    qualification_project_name,
    qualification_verifier,
    seconds_in_a_day,
};
