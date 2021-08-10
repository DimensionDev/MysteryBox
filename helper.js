const ethers = require("ethers");
const utils = require('./utils.js');

const project_secret = require('./project.secret');

// TODO: organize these into a config file
const MysteryBoxArtifact = require("./artifacts/contracts/MysteryBox.sol/MysteryBox.json");
let MysteryBoxAddress;
let MysteryBoxApp;

const {
    ChainlinkVRFConfig,
    ContractAddressConfig,
} = require('./SmartContractProjectConfig/config.js');

const ERC20Artifact = require("./node_modules/@openzeppelin/contracts/build/contracts/ERC20.json");
let NetworkProvider;
let adminWallet;
let testWallet_0;
let testWallet_1;

const {
    NftCtorParameters,
    openBoxParameters,
    seconds_in_a_day,
} = require('./test/constants.js');
//----------------------------------------
const transactionParameters = {
    gasLimit: 10000000,
    gasPrice: ethers.utils.parseUnits('5', 'gwei'),
};

//------------------------------------------------------------------------------------------------
const network = "rinkeby";

const txParameters = {
    gasLimit: 6000000,
};

async function main() {
    if (network === "mainnet") {
        // set gas price carefully, it is expensive.
        // transactionParameters.nonce = 3440;
        // console.log("Force Nonce: " + transactionParameters.nonce);
        // transactionParameters.gasPrice = ethers.utils.parseUnits('25', 'gwei');
        const gasPriceList = await utils.getGasPrice(false);
        console.log("Ethereum standard gas price: " + ethers.utils.formatUnits(gasPriceList.standard, 'gwei') + " Gwei");
        transactionParameters.gasPrice = gasPriceList.standard;
        NetworkProvider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/" + project_secret.infura_project_id);
    }
    else if(network === "rinkeby")
    {
        {
            const deploymentInfo = require("./.openzeppelin/rinkeby.json");
            if (deploymentInfo.proxies.length < 4) {
                throw "project not deployed properly";
            }
            const lastOne = deploymentInfo.proxies.length - 1;
            MysteryBoxAddress = deploymentInfo.proxies[lastOne].address;
        }
        NetworkProvider = new ethers.providers.JsonRpcProvider("https://rinkeby.infura.io/v3/" + project_secret.infura_project_id);
    }
    else {
        // 
        NetworkProvider = new ethers.providers.JsonRpcProvider("https://xxxx.infura.io/v3/" + project_secret.infura_project_id);
    }
    adminWallet = new ethers.Wallet(project_secret.test_private_key[0], NetworkProvider);
    testWallet_0 = new ethers.Wallet(project_secret.test_private_key[1], NetworkProvider);
    testWallet_1 = new ethers.Wallet(project_secret.test_private_key[2], NetworkProvider);

    MysteryBoxApp = new ethers.Contract(
        MysteryBoxAddress,
        MysteryBoxArtifact.abi,
        testWallet_0
    );

    console.log("network: " + network + " adminWallet address: " + adminWallet.address);
    console.log("network: " + network + " testWallet_0 address: " + testWallet_0.address);
    console.log("network: " + network + " testWallet_1 address: " + testWallet_1.address);

    const action = process.argv[2];
    if (action === "buy") {
        txParameters.value = ethers.utils.parseUnits('0.1', "ether");
        {
            const tx = await MysteryBoxApp.openBox(...Object.values(openBoxParameters), txParameters);
            await tx.wait();
        }
        {
            const tx = await MysteryBoxApp.connect(testWallet_1).openBox(...Object.values(openBoxParameters), txParameters);
            await tx.wait();
        }
    }
    else {
        throw "unknown command option";
    }
}

main().then(function() {
});
