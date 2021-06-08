import { ethers } from 'ethers';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import '@nomiclabs/hardhat-solhint';
import '@openzeppelin/hardhat-upgrades'

const {
    HardhatNetworkConfig,
    HardhatSolidityConfig,
    HardhatGasReporterConfig,
} = require('./SmartContractProjectConfig/config.js');

const networks = HardhatNetworkConfig;
const solidity = HardhatSolidityConfig;
const gasReporter = HardhatGasReporterConfig;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    networks,
    mocha: {
        timeout: 500000,
    },
    solidity,
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    gasReporter,
};
