const { providers } = require('ethers');

/**
 * @param {number} time second
 */
async function advanceTime(time) {
    await network.provider.send('evm_increaseTime', [time]);
}

async function advanceBlock() {
    await network.provider.send('evm_mine', []);
}

async function takeSnapshot() {
    return network.provider.send('evm_snapshot', []);
}

/**
 * @param {string} id snapshot id
 */
async function revertToSnapShot(id) {
    await network.provider.send('evm_revert', [id]);
}

/**
 * @param {number} time second
 * @return {Promise<providers.Block>} Get the latest block from the network
 */
async function advanceTimeAndBlock(time) {
    await advanceTime(time);
    await advanceBlock();
    return Promise.resolve(ethers.provider.getBlock());
}

module.exports = {
    advanceTime,
    advanceBlock,
    advanceTimeAndBlock,
    takeSnapshot,
    revertToSnapShot,
};
