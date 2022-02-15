import fs from 'fs'
import { soliditySha3 } from 'web3-utils'
import { MerkleTree } from './merkleTree'
import { buf2hex, hex2buf } from './helpers'
import { ethers } from 'ethers'
const abiCoder = new ethers.utils.AbiCoder()

export function generateMerkleTree(accounts: { address: string }[]): string {
  const leaves = accounts
    .map((v, i) => {
      return {
        buf: Buffer.concat([
          hex2buf(v.address),
        ]),
        ...v,
      }
    })
    .slice(0, 10000)

  const tree = new MerkleTree(
    leaves.map((l) => buf2hex(l.buf)),
    (soliditySha3 as unknown) as (...str: string[]) => string,
  )

  const leavesWithProof = leaves.map((l) => {
    return {
      address: l.address,
      proof: tree.generateProof(buf2hex(l.buf)),
    }
  })

  const merkleRoot = tree.root
  console.log("writing to json file: " + JSON.stringify({ merkleRoot, leaves: leavesWithProof }, null, 2));
  fs.writeFile('./dist/proofs.json', JSON.stringify({ merkleRoot, leaves: leavesWithProof }, null, 2), () => {})

  return 'module.exports = ' + JSON.stringify({ merkleRoot, leavesWithProof }, null, 2)
}
