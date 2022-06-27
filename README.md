# MysteryBox Smart Contract

## Brief introduction

MysteryBox Smart Contract is an Ethereum smart contract for people to sell/buy NFT tokens. Inspired by [Fukubukuro](https://en.wikipedia.org/wiki/Fukubukuro), people can put NFT(s) in a box and customers/players can pick an NFT(randomly).

For design details, please see [API document](docs/API.md).

## Getting Started

### Project setup

This project has [`git submodules`](https://git-scm.com/book/en/v2/Git-Tools-Submodules). You need to initialize these submodules first.

```bash
git submodule update --init --recursive
```

To install required node.js modules

```bash
npm ci
```

To compile the solidity source code

```bash
npm run compile
```

To run unit test:

```bash
npm run test
```

To deploy the smart contract on Ethereum `rinkeby` testnet:

```bash
npm run deploy rinkeby
```

Using the [`helper.ts`](helper.ts) script to set up the deployed smart contracts.

### Troubleshoot & Tips

- This project is powered by [hardhat](https://hardhat.org/).
    You can change your network configuration in `hardhat.config.ts` file.
- This smart contract involves some _randomness_, hence, the estimated gas consumption is probably not accurate. To make sure `transaction gas limit` is large enough, we need to give `a larger gas consumption`.

## Deployed Contract Address

### MysteryBox & MaskTestNFT

<!-- begin main -->

| Chain               | MysteryBox                             | MaskTestNFT                             |
| ------------------- | -------------------------------------- | --------------------------------------- |
| mainnet             | [`0x294428f0`][mb-mainnet]             | [`0x56136E69`][nft-mainnet]             |
| ropsten             | [`0xc7387b6A`][mb-ropsten]             | [`0x4c73F4DC`][nft-ropsten]             |
| rinkeby             | [`0xF8ED169B`][mb-rinkeby]             | [`0x0c8FB5C9`][nft-rinkeby]             |
| bsc                 |                                        | [`0xa8518287`][nft-bsc]                 |
| matic               | [`0x02F98667`][mb-matic]               | [`0x49C2a3D9`][nft-matic]               |
| goerli              | [`0xd4ABB07c`][mb-goerli]              | [`0xcdE281B3`][nft-goerli]              |
| fantom              | [`0x19f179D7`][mb-fantom]              | [`0x05ee315E`][nft-fantom]              |
| celo                | [`0x578a7Fee`][mb-celo]                | [`0x066804d9`][nft-celo]                |
| avalanche           | [`0x05ee315E`][mb-avalanche]           | [`0x81246335`][nft-avalanche]           |
| optimism_kovan      | [`0x3eadcFB5`][mb-optimism_kovan]      | [`0x7DBA5446`][nft-optimism_kovan]      |
| optimism            | [`0xF9F7C149`][mb-optimism]            | [`0x578a7Fee`][nft-optimism]            |
| aurora              | [`0x5B966f3a`][mb-aurora]              | [`0x54a0A221`][nft-aurora]              |
| fuse                | [`0x5B966f3a`][mb-fuse]                | [`0x54a0A221`][nft-fuse]                |
| boba                | [`0x5B966f3a`][mb-boba]                |                                         |
| moonriver           | [`0x6cc1b105`][mb-moonriver]           |                                         |
| conflux_espace_test | [`0x4c64b524`][mb-conflux_espace_test] | [`0xc29afd93`][nft-conflux_espace_test] |
| conflux_espace      | [`0x4c64b524`][mb-conflux_espace]      | [`0xc29afd93`][nft-conflux_espace]      |
| harmony_test        | [`0x4fda6d9b`][mb-harmony_test]        | [`0xd48bc506`][nft-harmony_test]        |
| harmony             | [`0xDc0905F2`][mb-harmony]             | [`0x677f7bba`][nft-harmony]             |
| metis_test          | [`0x5B966f3a`][mb-metis_test]          | [`0x981be454`][nft-metis_test]          |
| metis               | [`0x981be454`][mb-metis]               | [`0x96c7D011`][nft-metis]               |
| kardia              | [`0xbC7d9898`][mb-kardia]              | [`0x8D03d9b4`][nft-kardia]              |
| astar               | [`0x041Bdc5b`][mb-astar]               | [`0x7E0aa694`][nft-astar]               |

[mb-mainnet]: https://etherscan.io/address/0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145
[mb-ropsten]: https://ropsten.etherscan.io/address/0xc7387b6Ac310ae15576451d2d37058711331105c
[mb-rinkeby]: https://rinkeby.etherscan.io/address/0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac
[mb-matic]: https://polygonscan.com/address/0x02F98667b3A1202a320F67a669a5e4e451fD0cc1
[mb-goerli]: https://goerli.etherscan.io/address/0xd4ABB07c7f6D57C17812520c9Ea5d597c7Bf09Ec
[mb-fantom]: https://ftmscan.com/address/0x19f179D7e0D7d9F9d5386afFF64271D98A91615B
[mb-celo]: https://explorer.celo.org/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98
[mb-avalanche]: https://snowtrace.io/address/0x05ee315E407C21a594f807D61d6CC11306D1F149
[mb-optimism_kovan]: https://kovan-optimistic.etherscan.io/address/0x3eadcFB5FbCEd62B07DDB41aeACFCbff601cf36B
[mb-optimism]: https://optimistic.etherscan.io/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0
[mb-aurora]: https://explorer.mainnet.aurora.dev/address/0x5B966f3a32Db9C180843bCb40267A66b73E4f022
[mb-fuse]: https://explorer.fuse.io/address/0x5B966f3a32Db9C180843bCb40267A66b73E4f022
[mb-boba]: https://blockexplorer.boba.network/address/0x5B966f3a32Db9C180843bCb40267A66b73E4f022
[mb-moonriver]: https://moonriver.moonscan.io/address/0x6cc1b1058F9153358278C35E0b2D382f1585854B
[mb-conflux_espace_test]: https://evmtestnet.confluxscan.io/address/0x4c64b52476902430f56870d51d18529737acfa2f
[mb-conflux_espace]: https://evm.confluxscan.io/address/0x4c64b52476902430f56870d51d18529737acfa2f
[mb-harmony_test]: https://explorer.pops.one/address/0x4fda6d9bb68af18e5d686555b18ccea7c82e0a3f
[mb-harmony]: https://explorer.harmony.one/address/0xDc0905F2Dac875E29A36f22F1Ea046e063875D3e
[mb-metis_test]: https://stardust-explorer.metis.io/address/0x5B966f3a32Db9C180843bCb40267A66b73E4f022
[mb-metis]: https://andromeda-explorer.metis.io/address/0x981be454a930479d92C91a0092D204b64845A5D6
[mb-kardia]: https://explorer.kardiachain.io/address/0xbC7d98985966f56A66B0cB5F23d865676dc2ac84
[mb-astar]: https://blockscout.com/astar/address/0x041Bdc5b713aFc3AA06b9511E1e55552138b139A
[nft-mainnet]: https://etherscan.io/address/0x56136E69A5771436a9598804c5eA792230c21181
[nft-ropsten]: https://ropsten.etherscan.io/address/0x4c73F4DC55Ef094259570892F52717cF19c62283
[nft-rinkeby]: https://rinkeby.etherscan.io/address/0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8
[nft-bsc]: https://bscscan.com/address/0xa8518287BfB7729A6CC2d67f757eB2074DA84913
[nft-matic]: https://polygonscan.com/address/0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78
[nft-goerli]: https://goerli.etherscan.io/address/0xcdE281B32b629f2e89E5953B674E1E507e6dabcF
[nft-fantom]: https://ftmscan.com/address/0x05ee315E407C21a594f807D61d6CC11306D1F149
[nft-celo]: https://explorer.celo.org/address/0x066804d9123bF2609Ed4A4a40b1177a9c5a9Ed51
[nft-avalanche]: https://snowtrace.io/address/0x812463356F58fc8194645A1838ee6C52D8ca2D26
[nft-optimism_kovan]: https://kovan-optimistic.etherscan.io/address/0x7DBA54465650ee4077E295d81130a21D5eDc04F9
[nft-optimism]: https://optimistic.etherscan.io/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98
[nft-aurora]: https://explorer.mainnet.aurora.dev/address/0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B
[nft-fuse]: https://explorer.fuse.io/address/0x54a0A221C25Fc0a347EC929cFC5db0be17fA2a2B
[nft-conflux_espace_test]: https://evmtestnet.confluxscan.io/address/0xc29afd93409226ce9f8a358790f8830371ee33e7
[nft-conflux_espace]: https://evm.confluxscan.io/address/0xc29afd93409226ce9f8a358790f8830371ee33e7
[nft-harmony_test]: https://explorer.pops.one/address/0xd48bc506a9fe6024f6b8a401ef91ae1db6b83f90
[nft-harmony]: https://explorer.harmony.one/address/0x677f7bba13108649ecff068e8b3d55631327b83a
[nft-metis_test]: https://stardust-explorer.metis.io/address/0x981be454a930479d92C91a0092D204b64845A5D6
[nft-metis]: https://andromeda-explorer.metis.io/address/0x96c7D011cdFD467f551605f0f5Fce279F86F4186
[nft-kardia]: https://explorer.kardiachain.io/address/0x8D03d9b43e98Cc2f790Be4E96503fD0CcFd04a2D
[nft-astar]: https://blockscout.com/astar/address/0x7E0aa694E51551Bcc0e669180123AAcB1debC5fd

<!-- end main -->

### Qualification Contract

<!-- begin Qualification -->

| Chain   | WhitelistQlf               | SigVerifyQlf               | MaskHolderQlf              | MerkleProofQlf             |
| ------- | -------------------------- | -------------------------- | -------------------------- | -------------------------- |
| ropsten | [`0x3011dF5b`][wl-ropsten] |                            |                            |                            |
| rinkeby | [`0x50eCEebb`][wl-rinkeby] | [`0x9a656528`][sv-rinkeby] | [`0x26c3DE14`][mh-rinkeby] | [`0x450A1185`][mp-rinkeby] |
| goerli  | [`0xfE14631D`][wl-goerli]  |                            |                            |                            |
| aurora  | [`0x83D6b366`][wl-aurora]  |                            |                            |                            |
| fuse    | [`0x83D6b366`][wl-fuse]    |                            |                            |                            |

[wl-ropsten]: https://ropsten.etherscan.io/address/0x3011dF5b0Be18A56693cC062Cb61a160dca571C3
[wl-rinkeby]: https://rinkeby.etherscan.io/address/0x50eCEebb7360Efb93094dDEA692e04274E548b1d
[sv-rinkeby]: https://rinkeby.etherscan.io/address/0x9a656528700493348132823C6A3C59CdFa48283d
[mh-rinkeby]: https://rinkeby.etherscan.io/address/0x26c3DE1430dc105b205F47fc497ED3015768C9B0
[mp-rinkeby]: https://rinkeby.etherscan.io/address/0x450A11854F41d6E958e258665e593929E3bf111D
[wl-goerli]: https://goerli.etherscan.io/address/0xfE14631D3C2364171694EBcA05CAD08A54B2b07a
[wl-aurora]: https://explorer.mainnet.aurora.dev/address/0x83D6b366f21e413f214EB077D5378478e71a5eD2
[wl-fuse]: https://explorer.fuse.io/address/0x83D6b366f21e413f214EB077D5378478e71a5eD2

<!-- end Qualification -->

[testnet $MASK token address](https://github.com/DimensionDev/misc_smart_contract#masktoken---testnet-only)

### Known issue and limitation

This smart contract only support [Enumerable ERC721 NFT](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable).

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/MysteryBox/issues).

## Security report

If you have any security issue, please send to <security@mask.io>.

## License

[MIT LICENSE](LICENSE)
