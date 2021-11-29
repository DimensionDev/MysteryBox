import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';

const { MaskNFTInitParameters, holderMinAmount } = require('../test/constants.js');

const { ContractAddressConfig } = require('../SmartContractProjectConfig/config.js');

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
        MysteryBox: '0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    rinkeby: {
        MaskEnumerableNFT: '0x25d0dAf7c544aee4f69cE656149b49301D5B2FeD',
        MysteryBox: '0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac',
        WhitelistQlf: '0x50eCEebb7360Efb93094dDEA692e04274E548b1d',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    ropsten: {
        MaskEnumerableNFT: '0x0000000000000000000000000000000000000000',
        MysteryBox: '0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_mainnet: {
        MaskEnumerableNFT: '0xa8518287BfB7729A6CC2d67f757eB2074DA84913',
        MysteryBox: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        MaskEnumerableNFT: '0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78',
        MysteryBox: '0x02F98667b3A1202a320F67a669a5e4e451fD0cc1',
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
    let MaskNftParameter = MaskNFTInitParameters[network];
    if (typeof MaskNftParameter === 'undefined') {
        MaskNftParameter = MaskNFTInitParameters['mainnet'];
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
                constructorArguments: [],
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
        if (false) {
            const impl = await ethers.getContractFactory('MaskHolderQlf');
            const proxy = await upgrades.deployProxy(impl, [
                ContractAddressConfig[network].MaskTokenAddress,
                holderMinAmount,
            ]);
            await proxy.deployed();
            console.log('MaskHolderQlf proxy: ' + proxy.address);
            const admin = await upgrades.admin.getInstance();
            const impl_addr = await admin.getProxyImplementation(proxy.address);
            await hre.run('verify:verify', {
                address: impl_addr,
                constructorArguments: [],
            });
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
    }
};

func.tags = ['MysteryBox'];

module.exports = func;
