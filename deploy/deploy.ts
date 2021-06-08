import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';

const { ChainlinkVRFConfig, ContractAddressConfig } = require('../SmartContractProjectConfig/config.js');

const {
    NftCtorParameters,
    MysteryboxCtorParameters,
    qualification_project_name,
    qualification_verifier,
} = require('../test/constants.js');

interface IDeployedContractAddress {
    MysteryBox: string;
    MysteryBoxNFT: string;
    WhitelistQlf: string;
    SigVerifyQlf: string;
}
type DeployedContractAddress = Record<string, IDeployedContractAddress>;
const deployedContractAddress: DeployedContractAddress = {
    mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        MysteryBoxNFT: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    rinkeby: {
        MysteryBox: '0x3Df3751C5A3ed4D6DD3BB38E3867ecd432825cC1',
        MysteryBoxNFT: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        MysteryBoxNFT: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        MysteryBoxNFT: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
    bsc_test: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
        MysteryBoxNFT: '0x0000000000000000000000000000000000000000',
        WhitelistQlf: '0x0000000000000000000000000000000000000000',
        SigVerifyQlf: '0x0000000000000000000000000000000000000000',
    },
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const network: string = hre.hardhatArguments.network ? hre.hardhatArguments.network : 'rinkeby';
    const config = ChainlinkVRFConfig[network];
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    if (network === 'rinkeby') {
        const deploymentInfo = require('../.openzeppelin/rinkeby.json');
        const lastOne = deploymentInfo.proxies.length - 1;
        deployedContractAddress[network].MysteryBoxNFT = deploymentInfo.proxies[lastOne - 3].address;
        deployedContractAddress[network].MysteryBox = deploymentInfo.proxies[lastOne - 2].address;
        deployedContractAddress[network].WhitelistQlf = deploymentInfo.proxies[lastOne - 1].address;
        deployedContractAddress[network].SigVerifyQlf = deploymentInfo.proxies[lastOne].address;
    } else {
        // TODO
    }

    if (true) {
        let deployedMysteryBoxAddr;
        {
            const impl = await ethers.getContractFactory('MysteryBoxNFT');
            const proxy = await upgrades.deployProxy(impl, [...Object.values(NftCtorParameters)]);
            await proxy.deployed();
            deployedMysteryBoxAddr = proxy.address;
            console.log('MysteryBoxNFT proxy: ' + proxy.address);
        }

        const deployedLinkAccessor = await deploy('LinkAccessor', {
            from: deployer,
            args: [
                config.VRFCoordinator,
                config.LinkAddress,
                config.KeyHash,
                config.Fee,
                deployedContractAddress[network].MysteryBox,
                ContractAddressConfig[network].UniswapRouterAddress,
            ],
            log: true,
        });

        {
            const impl = await ethers.getContractFactory('MysteryBox');
            MysteryboxCtorParameters._linkAccessor = deployedLinkAccessor.address;
            MysteryboxCtorParameters._nftHandle = deployedMysteryBoxAddr;
            const proxy = await upgrades.deployProxy(impl, [...Object.values(MysteryboxCtorParameters)]);
            await proxy.deployed();
            console.log('MysteryBox proxy: ' + proxy.address);
        }

        {
            const impl = await ethers.getContractFactory('WhitelistQlf');
            const proxy = await upgrades.deployProxy(impl, []);
            await proxy.deployed();
            console.log('WhitelistQlf proxy: ' + proxy.address);
        }
        {
            const impl = await ethers.getContractFactory('SigVerifyQlf');
            const proxy = await upgrades.deployProxy(impl, [qualification_project_name, qualification_verifier]);
            await proxy.deployed();
            console.log('SigVerifyQlf proxy: ' + proxy.address);
        }
    } else {
        // upgrade contract
        const implMysteryBox = await ethers.getContractFactory('MysteryBox');
        await upgrades.upgradeProxy(deployedContractAddress[network].MysteryBox, implMysteryBox);

        const implMysteryBoxNFT = await ethers.getContractFactory('MysteryBoxNFT');
        await upgrades.upgradeProxy(deployedContractAddress[network].MysteryBoxNFT, implMysteryBoxNFT);

        const implWhitelistQlf = await ethers.getContractFactory('WhitelistQlf');
        await upgrades.upgradeProxy(deployedContractAddress[network].WhitelistQlf, implWhitelistQlf);

        const implSigVerifyQlf = await ethers.getContractFactory('SigVerifyQlf');
        await upgrades.upgradeProxy(deployedContractAddress[network].SigVerifyQlf, implSigVerifyQlf);
    }
};

func.tags = ['MysteryBox'];

module.exports = func;
