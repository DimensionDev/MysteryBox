const ethers = require('ethers');

const ZeroAddress = '0x0000000000000000000000000000000000000000';
const now = Math.floor(new Date().getTime() / 1000);
const seconds_in_a_day = 60 * 60 * 24;
const MaxNumberOfNFT = 24;

const MaskNFTInitParameters = {
    mainnet: {
        name: 'Mask Test NFT',
        symbol: 'MaskTestNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json',
    },
    rinkeby: {
        name: 'Mask Test NFT',
        symbol: 'MaskTestNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json',
    },
    ropsten: {
        name: 'Mask Test NFT',
        symbol: 'MaskTestNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json',
    },
    matic_mainnet: {
        name: 'Mask Test NFT',
        symbol: 'MaskTestNFT',
        baseURI: 'https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json',
    },
};

const CreateBoxParameters = {
    mainnet: {
        nft_address: '0x0000000000000000000000000000000000000000',
        name: 'Mask Test NFT Sale',
        payment: [
            // 0.1 ETH
            [ZeroAddress, ethers.utils.parseUnits('0.1', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
        personal_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        sell_all: true,
        nft_id_list: [],
        qualification: ZeroAddress,
    },
    rinkeby: {
        nft_address: '0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8',
        name: 'Mask Test NFT Sale',
        payment: [
            // 0.1 ETH
            [ZeroAddress, ethers.utils.parseUnits('0.1', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
        personal_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        sell_all: true,
        nft_id_list: [],
        qualification: ZeroAddress,
    },
    matic_mainnet: {
        nft_address: '0x0000000000000000000000000000000000000000',
        name: 'Mask Test NFT Sale',
        payment: [
            // 0.1 ETH
            [ZeroAddress, ethers.utils.parseUnits('0.1', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
        personal_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        sell_all: true,
        nft_id_list: [],
        qualification: ZeroAddress,
    },
};

const openBoxParameters = {
    box_id: 1,
    amount: 1,
    payment_token_index: 0,
    proof: [],
};

const qualification_project_name = 'MASK';
const qualification_verifier = '0x720272934CE8e42106f7d4F79B666C52030FCdA6';

module.exports = {
    MaskNFTInitParameters,
    CreateBoxParameters,
    ZeroAddress,
    MaxNumberOfNFT,
    openBoxParameters,
    qualification_project_name,
    qualification_verifier,
    seconds_in_a_day,
};
