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
        MaskEnumerableNFT: '0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8',
        MysteryBox: '0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac',
        WhitelistQlf: '0x50eCEebb7360Efb93094dDEA692e04274E548b1d',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    ropsten: {
        MaskEnumerableNFT: '0xc7387b6Ac310ae15576451d2d37058711331105c',
        MysteryBox: '0x4c73F4DC55Ef094259570892F52717cF19c62283',
        WhitelistQlf: '0x3011dF5b0Be18A56693cC062Cb61a160dca571C3',
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
    goerli: {
        MaskEnumerableNFT: '0xcdE281B32b629f2e89E5953B674E1E507e6dabcF',
        MysteryBox: '0xd4ABB07c7f6D57C17812520c9Ea5d597c7Bf09Ec',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    fantom: {
        MaskEnumerableNFT: '0x05ee315E407C21a594f807D61d6CC11306D1F149',
        MysteryBox: '0x19f179D7e0D7d9F9d5386afFF64271D98A91615B',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    avalanche: {
        MaskEnumerableNFT: '0x812463356F58fc8194645A1838ee6C52D8ca2D26',
        MysteryBox: '0x05ee315E407C21a594f807D61d6CC11306D1F149',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    celo: {
        MaskEnumerableNFT: '0x066804d9123bF2609Ed4A4a40b1177a9c5a9Ed51',
        MysteryBox: '0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    optimism: {
        MaskEnumerableNFT: '0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98',
        MysteryBox: '0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    optimism_kovan: {
        MaskEnumerableNFT: '0x7DBA54465650ee4077E295d81130a21D5eDc04F9',
        MysteryBox: '0x3eadcFB5FbCEd62B07DDB41aeACFCbff601cf36B',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    aurora: {
        MysteryBox: '0x5B966f3a32Db9C180843bCb40267A66b73E4f022',
        MaskEnumerableNFT: '0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B',
        WhitelistQlf: '0x83D6b366f21e413f214EB077D5378478e71a5eD2',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    fuse: {
        MysteryBox: '0x5B966f3a32Db9C180843bCb40267A66b73E4f022',
        MaskEnumerableNFT: '0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B',
        WhitelistQlf: '0x83D6b366f21e413f214EB077D5378478e71a5eD2',
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

    if (true) {
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
        if (true) {
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
        if (true) {
            const impl = await ethers.getContractFactory('WhitelistQlf');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('WhitelistQlf proxy: ' + proxy.address);
            const admin = await upgrades.admin.getInstance();
            const impl_addr = await admin.getProxyImplementation(proxy.address);
            await hre.run('verify:verify', {
                address: impl_addr,
                constructorArguments: [],
            });
        }
        if (false) {
            const impl = await ethers.getContractFactory('SigVerifyQlf');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('SigVerifyQlf proxy: ' + proxy.address);
            const admin = await upgrades.admin.getInstance();
            const impl_addr = await admin.getProxyImplementation(proxy.address);
            await hre.run('verify:verify', {
                address: impl_addr,
                constructorArguments: [],
            });
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
            const implMysteryBox = await ethers.getContractFactory('MaskEnumerableNFT');
            const instance = await upgrades.upgradeProxy(
                deployedContractAddress[network].MaskEnumerableNFT,
                implMysteryBox,
            );
            await instance.deployTransaction.wait();
            const admin = await upgrades.admin.getInstance();
            const impl = await admin.getProxyImplementation(deployedContractAddress[network].MaskEnumerableNFT);
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
