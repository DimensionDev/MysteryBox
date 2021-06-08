import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';

const { ChainlinkVRFConfig } = require('../SmartContractProjectConfig/config.js');

interface IDeployedContractAddress {
    MysteryBox: string;
}
type DeployedContractAddress = Record<string, IDeployedContractAddress>;
const deployedContractAddress: DeployedContractAddress = {
    mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
    },
    rinkeby: {
        MysteryBox: '0x3Df3751C5A3ed4D6DD3BB38E3867ecd432825cC1',
    },
    bsc_mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
    },
    matic_mainnet: {
        MysteryBox: '0x0000000000000000000000000000000000000000',
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
        deployedContractAddress[network].MysteryBox = deploymentInfo.proxies[lastOne].address;
    } else {
        // TODO
    }
    if (false) {
        // deploy, we normally do this only once
        const deployedMysteryBox = await deploy('MysteryBoxNFT', {
            from: deployer,
            args: ['MysteryBox', 'MysteryBoxNFT'],
            log: true,
        });

        const deployedLinkAccessor = await deploy('LinkAccessor', {
            from: deployer,
            args: [
                config.VRFCoordinator,
                config.LinkAddress,
                config.KeyHash,
                config.Fee,
                deployedContractAddress[network].MysteryBox,
            ],
            log: true,
        });

        const impl = await ethers.getContractFactory('MysteryBox');
        const proxy = await upgrades.deployProxy(impl, [
            deployer,
            deployedLinkAccessor.address,
            deployedMysteryBox.address,
        ]);
        await proxy.deployed();
        console.log('proxy: ' + proxy.address);
    } else {
        // upgrade contract
        const impl = await ethers.getContractFactory('MysteryBox');
        await upgrades.upgradeProxy(deployedContractAddress[network].MysteryBox, impl);
    }
};

func.tags = ['MysteryBox'];

module.exports = func;
