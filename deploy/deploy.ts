import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';

const { NftCtorParameters } = require('../test/constants.js');

interface IDeployedContractAddress {
    MysteryBox: string;
    WhitelistQlf: string;
    SigVerifyQlf: string;
}
type DeployedContractAddress = Record<string, IDeployedContractAddress>;
const deployedContractAddress: DeployedContractAddress = {
    mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    rinkeby: {
        MysteryBox: '0x430C2F4bcf7327CeD17b5D2BD1a523df2d4Ae48e',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_test: {
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
    const ctorParameter = NftCtorParameters[network];

    if (network === 'rinkeby') {
        const deploymentInfo = require('../.openzeppelin/rinkeby.json');
        const lastOne = deploymentInfo.proxies.length - 1;
        deployedContractAddress[network].MysteryBox = deploymentInfo.proxies[lastOne].address;
        // deployedContractAddress[network].WhitelistQlf = deploymentInfo.proxies[lastOne - 1].address;
        // deployedContractAddress[network].SigVerifyQlf = deploymentInfo.proxies[lastOne].address;
    } else {
        // TODO
    }

    if (false) {
        {
            const impl = await ethers.getContractFactory('MysteryBox');
            const proxy = await upgrades.deployProxy(impl, [...Object.values(ctorParameter)]);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }
        {
            const impl = await ethers.getContractFactory('WhitelistQlf');
            const proxy = await upgrades.deployProxy(impl, [...Object.values(ctorParameter)]);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }
        {
            const impl = await ethers.getContractFactory('SigVerifyQlf');
            const proxy = await upgrades.deployProxy(impl, [...Object.values(ctorParameter)]);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }
    } else {
        // upgrade contract
        const implMysteryBox = await ethers.getContractFactory('MysteryBox');
        await upgrades.upgradeProxy(deployedContractAddress[network].MysteryBox, implMysteryBox);

        // const implWhitelistQlf = await ethers.getContractFactory('WhitelistQlf');
        // await upgrades.upgradeProxy(deployedContractAddress[network].WhitelistQlf, implWhitelistQlf);

        // const implSigVerifyQlf = await ethers.getContractFactory('SigVerifyQlf');
        // await upgrades.upgradeProxy(deployedContractAddress[network].SigVerifyQlf, implSigVerifyQlf);
    }
};

func.tags = ['MysteryBox'];

module.exports = func;
