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
        nft_address: ZeroAddress,
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
        holder_token_addr: ZeroAddress,
        holder_min_token_amount: 0,
        qualification_data: '0x0000000000000000000000000000000000000000000000000000000000000000',
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
        holder_token_addr: ZeroAddress,
        holder_min_token_amount: 0,
        qualification_data: '0x0000000000000000000000000000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        nft_address: '0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78',
        name: 'Mask Test NFT Sale',
        payment: [
            // 10 MATIC
            [ZeroAddress, ethers.utils.parseUnits('10', 'ether')],
            // USDT
            // ['0xD92E713d051C37EbB2561803a3b5FBAbc4962431', ethers.utils.parseUnits('1', 18)],
        ],
        personal_limit: MaxNumberOfNFT,
        start_time: 0,
        end_time: now + seconds_in_a_day * 90,
        sell_all: true,
        nft_id_list: [],
        qualification: ZeroAddress,
        holder_token_addr: ZeroAddress,
        holder_min_token_amount: 0,
        qualification_data: '0x0000000000000000000000000000000000000000000000000000000000000000',
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
const holderMinAmount = ethers.utils.parseUnits('100', 18).toString();

export {
    MaskNFTInitParameters,
    CreateBoxParameters,
    ZeroAddress,
    MaxNumberOfNFT,
    openBoxParameters,
    qualification_project_name,
    qualification_verifier,
    seconds_in_a_day,
    holderMinAmount,
};
