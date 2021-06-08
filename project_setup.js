const ethers = require("ethers");
const utils = require('./utils.js');

const project_secret = require('./project.secret');

// TODO: organize these into a config file
const MysteryBoxArtifact = require("./artifacts/contracts/MysteryBox.sol/MysteryBox.json");
let MysteryBoxAddress;
let MysteryBoxApp;

const MysteryBoxNFTArtifact = require("./artifacts/contracts/MysteryBoxNFT.sol/MysteryBoxNFT.json");
let MysteryBoxNFTAddress;
let MysteryBoxNFTApp;

const WhitelistQlfArtifact = require("./artifacts/contracts/WhitelistQlf.sol/WhitelistQlf.json");
let WhitelistQlfAddress;
let WhitelistQlfApp;

let SigVerifyQlfAddress;
let SigVerifyQlfApp;

const LinkAccessorArtifact = require("./artifacts/contracts/LinkAccessor.sol/LinkAccessor.json");
let LinkAccessorAddress;
let LinkAccessorApp;

const {
    ChainlinkVRFConfig,
    ContractAddressConfig,
} = require('./SmartContractProjectConfig/config.js');

const ERC20Artifact = require("./node_modules/@openzeppelin/contracts/build/contracts/ERC20.json");
let MaskTokenApp;
let LinkTokenApp;
let NetworkProvider;
let adminWallet;
let testWallet_0;
let testWallet_1;

const {
    NftCtorParameters,
    CreateCollectionParameters,
    DrawNftParameters,
    ZeroAddress,
    DrawTxParameters,
    seconds_in_a_day,
} = require('./test/constants.js');
//----------------------------------------
const transactionParameters = {
    gasLimit: 10000000,
    gasPrice: ethers.utils.parseUnits('5', 'gwei'),
};

//------------------------------------------------------------------------------------------------
const network = "rinkeby";

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
            MysteryBoxNFTAddress = deploymentInfo.proxies[lastOne - 3].address;
            MysteryBoxAddress = deploymentInfo.proxies[lastOne - 2].address;
            WhitelistQlfAddress = deploymentInfo.proxies[lastOne - 1].address;
            SigVerifyQlfAddress = deploymentInfo.proxies[lastOne].address;
        }

        {
            const deploymentInfo = require("./deployments/rinkeby/LinkAccessor.json");
            LinkAccessorAddress = deploymentInfo.address;
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
    MysteryBoxNFTApp = new ethers.Contract(
        MysteryBoxNFTAddress,
        MysteryBoxNFTArtifact.abi,
        testWallet_0
    );
    LinkAccessorApp = new ethers.Contract(
        LinkAccessorAddress,
        LinkAccessorArtifact.abi,
        testWallet_0
    );

    MaskTokenApp = new ethers.Contract(
        ContractAddressConfig[network].MaskTokenAddress,
        ERC20Artifact.abi,
        testWallet_0
    );

    LinkTokenApp = new ethers.Contract(
        ChainlinkVRFConfig[network].LinkAddress,
        ERC20Artifact.abi,
        testWallet_0
    );

    WhitelistQlfApp = new ethers.Contract(
        WhitelistQlfAddress,
        WhitelistQlfArtifact.abi,
        testWallet_0
    );

    console.log("network: " + network + " adminWallet address: " + adminWallet.address);
    console.log("network: " + network + " testWallet_0 address: " + testWallet_0.address);
    console.log("network: " + network + " testWallet_1 address: " + testWallet_1.address);

    const action = process.argv[2];
    DrawNftParameters._collection_id = process.argv[3];
    if (action === "setup") {
        let tx;
        console.log('MysteryBoxApp.setLinkAccessor()');
        tx = await MysteryBoxApp.connect(adminWallet).setLinkAccessor(LinkAccessorApp.address, transactionParameters);
        await tx.wait();

        console.log('MysteryBoxApp.setNftHandle()');
        tx = await MysteryBoxApp.connect(adminWallet).setNftHandle(MysteryBoxNFTApp.address, transactionParameters);
        await tx.wait();

        console.log('LinkAccessorApp.setMysteryBox()');
        tx = await LinkAccessorApp.connect(adminWallet).setMysteryBox(MysteryBoxAddress, transactionParameters);
        await tx.wait();

        console.log('MysteryBoxNFTApp.addAdmin()');
        tx = await MysteryBoxNFTApp.connect(adminWallet).connect(adminWallet).addAdmin(MysteryBoxAddress, transactionParameters);
        await tx.wait();

        const allowance = ethers.utils.parseUnits("1000000", 18).toString();
        console.log('MaskTokenApp.approve()');
        tx = await MaskTokenApp.connect(testWallet_0).approve(MysteryBoxApp.address, allowance, transactionParameters);
        await tx.wait();
        tx = await MaskTokenApp.connect(testWallet_1).approve(MysteryBoxApp.address, allowance, transactionParameters);
        await tx.wait();

        console.log('WhitelistQlfApp.add_white_list()');
        tx = await WhitelistQlfApp.connect(adminWallet).add_white_list([testWallet_0.address, testWallet_1.address]);
        await tx.wait();
    }
    else if (action === "create_collection") {
        CreateCollectionParameters.payment = [
            [ZeroAddress, ethers.utils.parseUnits('1', 18)],
            [ContractAddressConfig[network].MaskTokenAddress, ethers.utils.parseUnits('1', 18)],
        ];
        const now = Math.floor(new Date().getTime() / 1000);
        // started, expire in 90 days
        CreateCollectionParameters.start_time = now;
        CreateCollectionParameters.end_time = CreateCollectionParameters.start_time + seconds_in_a_day * 90;
        // CreateCollectionParameters._qualification = WhitelistQlfApp.address;
        await MysteryBoxApp.createCollection(...Object.values(CreateCollectionParameters), transactionParameters);

        // expired, for testing
        CreateCollectionParameters.start_time = now - seconds_in_a_day;
        CreateCollectionParameters.end_time = CreateCollectionParameters.start_time + seconds_in_a_day;
        await MysteryBoxApp.createCollection(...Object.values(CreateCollectionParameters), transactionParameters);

        // not-started, will start in 90 days, for testing
        CreateCollectionParameters.start_time = now + seconds_in_a_day * 90;
        CreateCollectionParameters.end_time = CreateCollectionParameters.start_time + seconds_in_a_day;
        await MysteryBoxApp.createCollection(...Object.values(CreateCollectionParameters), transactionParameters);
    }
    else if (action === "draw") {
        // DrawNftParameters._number_of_nft = `64`;
        {
            const tx = await MysteryBoxApp.drawNFT(...Object.values(DrawNftParameters), DrawTxParameters);
            await tx.wait();
        }
        {
            const tx = await MysteryBoxApp.connect(testWallet_1).drawNFT(...Object.values(DrawNftParameters), DrawTxParameters);
            await tx.wait();
        }
    }
    else if (action === "claim") {
        {
            const isReady = await MysteryBoxApp.isReadyToClaim(DrawNftParameters._collection_id, testWallet_0.address);
            if (!isReady) {
                console.log("wallet: " + testWallet_0.address + " is not ready");
                return;
            }
            const tx = await MysteryBoxApp.claimNFT(DrawNftParameters._collection_id, transactionParameters);
            await tx.wait();
        }
        {
            const isReady = await MysteryBoxApp.isReadyToClaim(DrawNftParameters._collection_id, testWallet_1.address);
            if (!isReady) {
                console.log("wallet: " + testWallet_1.address + " is not ready");
                return;
            }
            const tx = await MysteryBoxApp.connect(testWallet_1).claimNFT(DrawNftParameters._collection_id, transactionParameters);
            await tx.wait();
        }
    }
    else if (action === "debug") {
        {
            const URI = await MysteryBoxNFTApp.tokenURI('0x300000000000000000000000000000001');
            console.log('URI: ' + URI);
        }
        {
            const purchaseInfo = await MysteryBoxApp.getPurchaseInfo('1', testWallet_1.address);
            console.log('purchaseInfo: ' + purchaseInfo);
        }
        {
            await MysteryBoxNFTApp.connect(adminWallet).setName(NftCtorParameters.name);
            const name = await MysteryBoxNFTApp.name();
            console.log('name: ' + name);

            await MysteryBoxNFTApp.connect(adminWallet).setSymbol(NftCtorParameters.symbol);
            const symbol = await MysteryBoxNFTApp.symbol();
            console.log('symbol: ' + symbol);
        }
    }
    else {
        throw "unknown command option";
    }
}

main().then(function() {
});
