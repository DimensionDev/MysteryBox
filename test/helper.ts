import { network, ethers } from "hardhat";
import { providers } from "ethers";

/**
 * @param {number} time second
 */
export async function advanceTime(time: number) {
  await network.provider.send("evm_increaseTime", [time]);
}

export async function advanceBlock() {
  await network.provider.send("evm_mine", []);
}

export async function takeSnapshot() {
  return network.provider.send("evm_snapshot", []);
}

/**
 * @param {string} id snapshot id
 */
export async function revertToSnapShot(id: string) {
  await network.provider.send("evm_revert", [id]);
}

/**
 * @param {number} time second
 * @return {Promise<providers.Block>} Get the latest block from the network
 */
export async function advanceTimeAndBlock(time: number): Promise<providers.Block> {
  await advanceTime(time);
  await advanceBlock();
  return Promise.resolve(ethers.provider.getBlock("latest"));
}
