import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import '@nomiclabs/hardhat-solhint';
import '@openzeppelin/hardhat-upgrades'
import "@nomiclabs/hardhat-etherscan";

const {
    HardhatNetworkConfig,
    HardhatSolidityConfig,
    HardhatGasReporterConfig,
    EtherscanConfig,
} = require('./SmartContractProjectConfig/config.js');

const networks = HardhatNetworkConfig;
const solidity = HardhatSolidityConfig;
const gasReporter = HardhatGasReporterConfig;
const etherscan = EtherscanConfig;

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
    etherscan,
    gasReporter,
};
