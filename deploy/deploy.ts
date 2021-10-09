import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';

const { MaskNFTInitParameters } = require('../test/constants.js');

interface IDeployedContractAddress {
    MaskTestNFT: string;
    MysteryBox: string;
    WhitelistQlf: string;
    SigVerifyQlf: string;
}
type DeployedContractAddress = Record<string, IDeployedContractAddress>;
const deployedContractAddress: DeployedContractAddress = {
    mainnet: {
        MaskTestNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    rinkeby: {
        MaskTestNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x430C2F4bcf7327CeD17b5D2BD1a523df2d4Ae48e',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_mainnet: {
        MaskTestNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        MaskTestNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_test: {
        MaskTestNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const network: string = hre.hardhatArguments.network ? hre.hardhatArguments.network : 'rinkeby';
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const MaskNftParameter = MaskNFTInitParameters[network];

    if (network === 'rinkeby') {
        const deploymentInfo = require('../.openzeppelin/rinkeby.json');
        const lastOne = deploymentInfo.proxies.length - 1;
        deployedContractAddress[network].MaskTestNFT = deploymentInfo.proxies[lastOne - 1].address;
        deployedContractAddress[network].MysteryBox = deploymentInfo.proxies[lastOne].address;
        // deployedContractAddress[network].WhitelistQlf = deploymentInfo.proxies[lastOne - 1].address;
        // deployedContractAddress[network].SigVerifyQlf = deploymentInfo.proxies[lastOne].address;
    } else {
        // TODO
    }

    if (false) {
        if (false) {
            const impl = await ethers.getContractFactory('MaskTestNFT');
            const proxy = await upgrades.deployProxy(impl, [...Object.values(MaskNftParameter)]);
            await proxy.deployed();
            console.log('MaskTestNFT proxy: ' + proxy.address);
        }
        if (true) {
            const impl = await ethers.getContractFactory('MysteryBox');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }
        if (false) {
            const impl = await ethers.getContractFactory('WhitelistQlf');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }
        if (false) {
            const impl = await ethers.getContractFactory('SigVerifyQlf');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }
    } else {
        // upgrade contract
        const implMysteryBox = await ethers.getContractFactory('MysteryBox');
        const instance = await upgrades.upgradeProxy(deployedContractAddress[network].MysteryBox, implMysteryBox);
        await instance.deployTransaction.wait();
        const admin = await upgrades.admin.getInstance();
        const impl = await admin.getProxyImplementation(deployedContractAddress[network].MysteryBox);
        // example: `npx hardhat verify --network rinkeby 0x8974Ce3955eE1306bA89687C558B6fC1E5be777B`
        await hre.run('verify:verify', {
            address: impl,
            constructorArguments: [],
        });

        // const implWhitelistQlf = await ethers.getContractFactory('WhitelistQlf');
        // await upgrades.upgradeProxy(deployedContractAddress[network].WhitelistQlf, implWhitelistQlf);

        // const implSigVerifyQlf = await ethers.getContractFactory('SigVerifyQlf');
        // await upgrades.upgradeProxy(deployedContractAddress[network].SigVerifyQlf, implSigVerifyQlf);
    }
};

func.tags = ['MysteryBox'];

module.exports = func;
