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
let testWallet;
let adminWallet;

const {
    CreateCollectionParameters,
    DrawNftParameters,
    ZeroAddress,
    drawTxParameters,
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
        let deploymentInfo;
        deploymentInfo = require("./deployments/rinkeby/MysteryBoxNFT.json");
        MysteryBoxNFTAddress = deploymentInfo.address;

        deploymentInfo = require("./.openzeppelin/rinkeby.json");
        const lastOne = deploymentInfo.proxies.length - 1;
        MysteryBoxAddress = deploymentInfo.proxies[lastOne].address;

        deploymentInfo = require("./deployments/rinkeby/LinkAccessor.json");
        LinkAccessorAddress = deploymentInfo.address;

        NetworkProvider = new ethers.providers.JsonRpcProvider("https://rinkeby.infura.io/v3/" + project_secret.infura_project_id);
    }
    else {
        // 
        NetworkProvider = new ethers.providers.JsonRpcProvider("https://xxxx.infura.io/v3/" + project_secret.infura_project_id);
    }
    adminWallet = new ethers.Wallet(project_secret.test_private_key[0], NetworkProvider);
    testWallet = new ethers.Wallet(project_secret.test_private_key[1], NetworkProvider);

    MysteryBoxApp = new ethers.Contract(
        MysteryBoxAddress,
        MysteryBoxArtifact.abi,
        testWallet
    );
    MysteryBoxNFTApp = new ethers.Contract(
        MysteryBoxNFTAddress,
        MysteryBoxNFTArtifact.abi,
        testWallet
    );
    LinkAccessorApp = new ethers.Contract(
        LinkAccessorAddress,
        LinkAccessorArtifact.abi,
        testWallet
    );

    MaskTokenApp = new ethers.Contract(
        ContractAddressConfig[network].MaskTokenAddress,
        ERC20Artifact.abi,
        testWallet
    );

    LinkTokenApp = new ethers.Contract(
        ChainlinkVRFConfig[network].LinkAddress,
        ERC20Artifact.abi,
        testWallet
    );

    console.log("network: " + network + " wallet address: " + testWallet.address);

    const action = process.argv[2];
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
        tx = await MaskTokenApp.connect(testWallet).approve(MysteryBoxApp.address, allowance, transactionParameters);
        await tx.wait();

        const linkTransferAmount = ethers.utils.parseUnits("10", 18).toString();
        console.log('LinkTokenApp.transfer()');
        tx = await LinkTokenApp.connect(adminWallet).transfer(LinkAccessorApp.address, linkTransferAmount, transactionParameters);
        await tx.wait();
    }
    else if (action === "create_collection") {
        CreateCollectionParameters.nft_option = [
            [50, 50],
            [50, 50],
        ];
        CreateCollectionParameters.payment = [
            [ZeroAddress, ethers.utils.parseUnits('1', 18)],
            [ContractAddressConfig[network].MaskTokenAddress, ethers.utils.parseUnits('1', 18)],
        ],
        await MysteryBoxApp.createCollection(...Object.values(CreateCollectionParameters), transactionParameters);
    }
    else if (action === "draw") {
        DrawNftParameters._collection_id = `1`;
        // DrawNftParameters._number_of_nft = `64`;
        const tx = await MysteryBoxApp.drawNFT(...Object.values(DrawNftParameters), drawTxParameters);
        await tx.wait();
    }
    else if (action === "claim") {
        const tx = await MysteryBoxApp.claimNFT(transactionParameters);
        await tx.wait();
    }
    else {
        throw "unknown command option";
    }
}

main().then(function() {
});
