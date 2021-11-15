const ethers = require('ethers');
const utils = require('./utils.js');

const project_secret = require('./project.secret');

// TODO: organize these into a config file
const MysteryBoxArtifact = require('./abi/MysteryBox.json');
let MysteryBoxAddress;
let MysteryBoxApp;

const NFTArtifact = require('./abi/MaskTestNFT.json');
let NFTAddress;
let NFTApp;

let NetworkProvider;
let adminWallet;
let testWallet_0;
let testWallet_1;

const { CreateBoxParameters, openBoxParameters, seconds_in_a_day } = require('./test/constants.js');
//----------------------------------------
const transactionParameters = {
    gasLimit: 10000000,
};

//------------------------------------------------------------------------------------------------
const network = 'rinkeby';

const txParameters = {
    gasLimit: 6000000,
};
const creatBoxParameter = CreateBoxParameters[network];

async function main() {
    if (network === 'mainnet') {
        // set gas price carefully, it is expensive.
        // transactionParameters.nonce = 3440;
        // console.log("Force Nonce: " + transactionParameters.nonce);
        // transactionParameters.gasPrice = ethers.utils.parseUnits('25', 'gwei');
        const gasPriceList = await utils.getGasPrice(false);
        console.log(
            'Ethereum standard gas price: ' + ethers.utils.formatUnits(gasPriceList.standard, 'gwei') + ' Gwei',
        );
        transactionParameters.gasPrice = gasPriceList.standard;
        NetworkProvider = new ethers.providers.JsonRpcProvider(
            'https://mainnet.infura.io/v3/' + project_secret.infura_project_id,
        );
    } else if (network === 'rinkeby') {
        {
            const deploymentInfo = require('./.openzeppelin/rinkeby.json');
            if (deploymentInfo.proxies.length < 4) {
                throw 'project not deployed properly';
            }
            const lastOne = deploymentInfo.proxies.length - 1;
            NFTAddress = deploymentInfo.proxies[lastOne - 1].address;
            MysteryBoxAddress = deploymentInfo.proxies[lastOne].address;
        }
        NetworkProvider = new ethers.providers.JsonRpcProvider(
            'https://rinkeby.infura.io/v3/' + project_secret.infura_project_id,
        );
    } else {
        //
        NetworkProvider = new ethers.providers.JsonRpcProvider(
            'https://xxxx.infura.io/v3/' + project_secret.infura_project_id,
        );
    }
    adminWallet = new ethers.Wallet(project_secret.test_private_key[0], NetworkProvider);
    testWallet_0 = new ethers.Wallet(project_secret.test_private_key[1], NetworkProvider);
    testWallet_1 = new ethers.Wallet(project_secret.test_private_key[2], NetworkProvider);

    MysteryBoxApp = new ethers.Contract(MysteryBoxAddress, MysteryBoxArtifact.abi, adminWallet);

    NFTApp = new ethers.Contract(NFTAddress, NFTArtifact.abi, adminWallet);

    console.log('MysteryBoxAddress: ' + MysteryBoxAddress);
    console.log('network: ' + network + ' adminWallet address: ' + adminWallet.address);
    console.log('network: ' + network + ' testWallet_0 address: ' + testWallet_0.address);
    console.log('network: ' + network + ' testWallet_1 address: ' + testWallet_1.address);

    const action = process.argv[2];
    if (action === 'create') {
        const isApproved = await NFTApp.isApprovedForAll(testWallet_0.address, MysteryBoxApp.address);
        if (!isApproved) {
            const tx = await NFTApp.connect(testWallet_0).setApprovalForAll(MysteryBoxApp.address, true);
            await tx.wait();
        }
        const tx = await MysteryBoxApp.connect(testWallet_0).createBox(...Object.values(creatBoxParameter));
        await tx.wait();
    } else if (action === 'open') {
        const box_id = parseInt(process.argv[3]);
        openBoxParameters.box_id = box_id;
        txParameters.value = creatBoxParameter.payment[0][1];
        const tx = await MysteryBoxApp.connect(testWallet_1).openBox(...Object.values(openBoxParameters), txParameters);
        await tx.wait();
    } else if (action === 'test') {
        {
            const info = await MysteryBoxApp.getBoxInfo(1);
            console.log(JSON.stringify(info, null, 2));
        }
    } else if (action === 'add_admin') {
        const adminList = [
            "0x3A6690B247b467243F4C2F61Dd4100e18a336990",
            "0x67fA392717324B63Cb3793860eA099C1436e6458",
            "0xaa0065375E1194d45Ede6804AA9d7e01a326aaDD",
        ];
        const tx = await MysteryBoxApp.connect(adminWallet).addAdmin(adminList);
        const receipt = await tx.wait();
    } else if (action === 'create_invalid') {
        const now = Math.floor(new Date().getTime() / 1000);
        if (true) {
            creatBoxParameter.start_time = now + 120 * seconds_in_a_day;
            const tx = await MysteryBoxApp.connect(testWallet_0).createBox(...Object.values(creatBoxParameter));
            const receipt = await tx.wait();
            console.log(receipt);
        }
        if (true) {
            creatBoxParameter.start_time = 0;
            creatBoxParameter.end_time = now + 60;
            const tx = await MysteryBoxApp.connect(testWallet_0).createBox(...Object.values(creatBoxParameter));
            const receipt = await tx.wait();
            console.log(receipt);
        }
    } else if (action === 'open_invalid') {
        txParameters.value = creatBoxParameter.payment[0][1];
        openBoxParameters.box_id = 3;
        const tx = await MysteryBoxApp.connect(testWallet_1).openBox(...Object.values(openBoxParameters), txParameters);
        await tx.wait();
    } else {
        throw 'unknown command option';
    }
}

main().then(function () {});
