export enum ChainId {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  BSC = 56,
  Matic = 137,
  Goerli = 5,
  Fantom = 250,
  Celo = 42220,
  Avalanche = 43114,
  Optimism_kovan = 69,
  Optimism = 10,
  Aurora = 1313161554,
  Fuse = 122,
  Boba = 288,
  Moonriver = 1285,
  Conflux_espace_test = 71,
  Conflux_espace = 1030,
  Harmony = 1666600000,
  Harmony_test = 1666700000,
  Metis = 1088,
  Metis_test = 28,
  xDai = 100,
  Arbiturm = 42161,
  Kardia = 24,
}
function makeAddressDetailURL(domain: string) {
  return (address: string) => `https://${domain}/address/${address}`
}

export const BlockExplorer: Record<ChainId, (address: string) => string> = {
  [ChainId.Mainnet]: makeAddressDetailURL("etherscan.io"),
  [ChainId.Ropsten]: makeAddressDetailURL("ropsten.etherscan.io"),
  [ChainId.Rinkeby]: makeAddressDetailURL("rinkeby.etherscan.io"),
  [ChainId.BSC]: makeAddressDetailURL("bscscan.com"),
  [ChainId.Matic]: makeAddressDetailURL("polygonscan.com"),
  [ChainId.Goerli]: makeAddressDetailURL("goerli.etherscan.io"),
  [ChainId.Fantom]: makeAddressDetailURL("ftmscan.com"),
  [ChainId.Celo]: makeAddressDetailURL("explorer.celo.org"),
  [ChainId.Avalanche]: makeAddressDetailURL("snowtrace.io"),
  [ChainId.Optimism_kovan]: makeAddressDetailURL("kovan-optimistic.etherscan.io"),
  [ChainId.Optimism]: makeAddressDetailURL("optimistic.etherscan.io"),
  [ChainId.Aurora]: makeAddressDetailURL("explorer.mainnet.aurora.dev"),
  [ChainId.Fuse]: makeAddressDetailURL("explorer.fuse.io"),
  [ChainId.Boba]: makeAddressDetailURL("blockexplorer.boba.network"),
  [ChainId.Moonriver]: makeAddressDetailURL("moonriver.moonscan.io"),
  [ChainId.Conflux_espace_test]: makeAddressDetailURL("evmtestnet.confluxscan.io"),
  [ChainId.Conflux_espace]: makeAddressDetailURL("evm.confluxscan.io"),
  [ChainId.Harmony]: makeAddressDetailURL("explorer.harmony.one"),
  [ChainId.Harmony_test]: makeAddressDetailURL("explorer.pops.one"),
  [ChainId.Metis]: makeAddressDetailURL("andromeda-explorer.metis.io"),
  [ChainId.Metis_test]: makeAddressDetailURL("stardust-explorer.metis.io"),
  [ChainId.xDai]: (address) => `https://blockscout.com/xdai/mainnet/address/${address}`,
  [ChainId.Arbiturm]: makeAddressDetailURL("explorer.arbitrum.io"),
  [ChainId.Kardia]: makeAddressDetailURL("explorer.kardiachain.io")
}

export const Contracts: string[] = [
  "MysteryBox",
  "MaskTestNFT",
  "WhitelistQlf",
  "SigVerifyQlf",
  "MaskHolderQlf",
  "MerkleProofQlf"
]

export type DeployedAddressRow = {
  Chain: string,
  MysteryBox: string,
  MaskTestNFT: string,
  WhitelistQlf: string,
  SigVerifyQlf: string,
  MaskHolderQlf: string,
  MerkleProofQlf: string,
}
