import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';

const { MaskNFTInitParameters } = require('../test/constants.js');

interface IDeployedContractAddress {
    MaskEnumerableNFT: string;
    MysteryBox: string;
    WhitelistQlf: string;
    SigVerifyQlf: string;
}
type DeployedContractAddress = Record<string, IDeployedContractAddress>;
const deployedContractAddress: DeployedContractAddress = {
    mainnet: {
        MaskEnumerableNFT: '0x56136E69A5771436a9598804c5eA792230c21181',
        MysteryBox: '0x0dFB34D213f613Dda67a2924F60b5301d42ABFb7',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    rinkeby: {
        MaskEnumerableNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0xbFcf8210F5B6764D86a9C5252218ad627A6a949d',
        WhitelistQlf: '0x996A9DCe6247cd8AaFA60de34cDD5332d9AdE702',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    ropsten: {
        MaskEnumerableNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0xB604C213FC3903E0C77c4a05Fe6FA0ff33924597',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_mainnet: {
        MaskEnumerableNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        MaskEnumerableNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_test: {
        MaskEnumerableNFT: '0x0000000000000000000000000000000000000000',
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
        deployedContractAddress[network].MaskEnumerableNFT = deploymentInfo.proxies[lastOne - 1].address;
        deployedContractAddress[network].MysteryBox = deploymentInfo.proxies[lastOne].address;
        // deployedContractAddress[network].WhitelistQlf = deploymentInfo.proxies[lastOne - 1].address;
        // deployedContractAddress[network].SigVerifyQlf = deploymentInfo.proxies[lastOne].address;
    } else {
        // TODO
    }

    if (false) {
        if (false) {
            const impl = await ethers.getContractFactory('MaskEnumerableNFT');
            const proxy = await upgrades.deployProxy(impl, [...Object.values(MaskNftParameter)]);
            await proxy.deployed();
            console.log('MaskEnumerableNFT proxy: ' + proxy.address);

            const admin = await upgrades.admin.getInstance();
            const impl_addr = await admin.getProxyImplementation(proxy.address);
            await hre.run('verify:verify', {
                address: impl_addr,
                constructorArguments: [...Object.values(MaskNftParameter)],
            });
        }
        if (false) {
            const impl = await ethers.getContractFactory('MysteryBox');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);

            const admin = await upgrades.admin.getInstance();
            const impl_addr = await admin.getProxyImplementation(proxy.address);
            await hre.run('verify:verify', {
                address: impl_addr,
                constructorArguments: [],
            });
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
        if (true) {
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
        }
        if (false) {
            // upgrade contract
            const implWhitelistQlf = await ethers.getContractFactory('WhitelistQlf');
            const instance = await upgrades.upgradeProxy(
                deployedContractAddress[network].WhitelistQlf,
                implWhitelistQlf,
            );
            await instance.deployTransaction.wait();
            const admin = await upgrades.admin.getInstance();
            const impl = await admin.getProxyImplementation(deployedContractAddress[network].WhitelistQlf);
            await hre.run('verify:verify', {
                address: impl,
                constructorArguments: [],
            });
        }

        // const implWhitelistQlf = await ethers.getContractFactory('WhitelistQlf');
        // await upgrades.upgradeProxy(deployedContractAddress[network].WhitelistQlf, implWhitelistQlf);

        // const implSigVerifyQlf = await ethers.getContractFactory('SigVerifyQlf');
        // await upgrades.upgradeProxy(deployedContractAddress[network].SigVerifyQlf, implSigVerifyQlf);
    }
};

func.tags = ['MysteryBox'];

module.exports = func;
