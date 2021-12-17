# MysteryBox Smart Contract

## Brief introduction

MysteryBox Smart Contract is an Ethereum smart contract for people to sell/buy NFT tokens. Inspired by [Fukubukuro](https://en.wikipedia.org/wiki/Fukubukuro), people can put NFT(s) in a box and customers/players can pick an NFT(randomly).

For design details, please see [API document](docs/API.md).

## Getting Started

### Project setup

This project has [`git submodules`](https://git-scm.com/book/en/v2/Git-Tools-Submodules). You need to initialize these submodules first.

```bash
git submodule init
git submodule update
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
npm run deploy:rinkeby
```

Using the [`helper.js`](helper.js) script to set up the deployed smart contracts.

### Troubleshoot & Tips

- This project is powered by [hardhat](https://hardhat.org/).
  You can change your network configuration in `hardhat.config.ts` file.
- This smart contract involves some *randomness*, hence, the estimated gas consumption is probably not accurate. To make sure `transaction gas limit` is large enough, we need to give `a larger gas consumption`.

## Deployed Contract Address

### MysteryBox

| Chain            | Address                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145](https://etherscan.io/address/0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145)                   |
| Ropsten          | [0xc7387b6Ac310ae15576451d2d37058711331105c](https://ropsten.etherscan.io/address/0xc7387b6Ac310ae15576451d2d37058711331105c)           |
| Rinkeby          | [0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8](https://rinkeby.etherscan.io/address/0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8)           |
| BSC              | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://bscscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Matic            | [0x02F98667b3A1202a320F67a669a5e4e451fD0cc1](https://polygonscan.com/address/0x02F98667b3A1202a320F67a669a5e4e451fD0cc1)                |
| Goerli           | [0xd4ABB07c7f6D57C17812520c9Ea5d597c7Bf09Ec](https://goerli.etherscan.io/address/0xd4ABB07c7f6D57C17812520c9Ea5d597c7Bf09Ec)            |
| Fantom           | [0x19f179D7e0D7d9F9d5386afFF64271D98A91615B](https://ftmscan.com/address/0x19f179D7e0D7d9F9d5386afFF64271D98A91615B)                    |
| Celo             | [0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98](https://explorer.celo.org/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98/transactions) |
| Avalanche        | [0x05ee315E407C21a594f807D61d6CC11306D1F149](https://snowtrace.io/address/0x05ee315E407C21a594f807D61d6CC11306D1F149)                   |
| Kovan-optimistic | [0x3eadcFB5FbCEd62B07DDB41aeACFCbff601cf36B](https://kovan-optimistic.etherscan.io/address/0x3eadcFB5FbCEd62B07DDB41aeACFCbff601cf36B)  |
| Optimistic       | [0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0](https://optimistic.etherscan.io/address/0xF9F7C1496c21bC0180f4B64daBE0754ebFc8A8c0)        |

### MaskTestNFT

| Chain            | Address                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0x56136E69A5771436a9598804c5eA792230c21181](https://etherscan.io/address/0x56136E69A5771436a9598804c5eA792230c21181)                   |
| Ropsten          | [0x4c73F4DC55Ef094259570892F52717cF19c62283](https://ropsten.etherscan.io/address/0x4c73F4DC55Ef094259570892F52717cF19c62283)           |
| Rinkeby          | [0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8](https://rinkeby.etherscan.io/address/0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8)           |
| BSC              | [0xa8518287BfB7729A6CC2d67f757eB2074DA84913](https://bscscan.com/address/0xa8518287BfB7729A6CC2d67f757eB2074DA84913)                    |
| Matic            | [0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78](https://polygonscan.com/address/0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78)                |
| Goerli           | [0xcdE281B32b629f2e89E5953B674E1E507e6dabcF](https://goerli.etherscan.io/address/0xcdE281B32b629f2e89E5953B674E1E507e6dabcF)            |
| Fantom           | [0x05ee315E407C21a594f807D61d6CC11306D1F149](https://ftmscan.com/address/0x05ee315E407C21a594f807D61d6CC11306D1F149)                    |
| Celo             | [0x066804d9123bF2609Ed4A4a40b1177a9c5a9Ed51](https://explorer.celo.org/address/0x066804d9123bF2609Ed4A4a40b1177a9c5a9Ed51/transactions) |
| Avalanche        | [0x812463356F58fc8194645A1838ee6C52D8ca2D26](https://snowtrace.io/address/0x812463356F58fc8194645A1838ee6C52D8ca2D26)                   |
| Kovan-optimistic | [0x7DBA54465650ee4077E295d81130a21D5eDc04F9](https://kovan-optimistic.etherscan.io/address/0x7DBA54465650ee4077E295d81130a21D5eDc04F9)  |
| Optimistic       | [0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98](https://optimistic.etherscan.io/address/0x578a7Fee5f0D8CEc7d00578Bf37374C5b95C4b98)        |

### WhitelistQlf

| Chain            | Address                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                   |
| Ropsten          | [0x3011dF5b0Be18A56693cC062Cb61a160dca571C3](https://ropsten.etherscan.io/address/0x3011dF5b0Be18A56693cC062Cb61a160dca571C3)           |
| Rinkeby          | [0x50eCEebb7360Efb93094dDEA692e04274E548b1d](https://rinkeby.etherscan.io/address/0x50eCEebb7360Efb93094dDEA692e04274E548b1d)           |
| BSC              | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://bscscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Matic            | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://polygonscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                |
| Goerli           | [0xfE14631D3C2364171694EBcA05CAD08A54B2b07a](https://goerli.etherscan.io/address/0xfE14631D3C2364171694EBcA05CAD08A54B2b07a)            |
| Fantom           | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://ftmscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Celo             | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://explorer.celo.org/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/transactions) |
| Avalanche        | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://snowtrace.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                   |
| Kovan-optimistic | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://kovan-optimistic.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)  |
| Optimistic       | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://optimistic.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)        |

### SigVerifyQlf

| Chain            | Address                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                   |
| Ropsten          | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://ropsten.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)           |
| Rinkeby          | [0x9a656528700493348132823C6A3C59CdFa48283d](https://rinkeby.etherscan.io/address/0x9a656528700493348132823C6A3C59CdFa48283d)           |
| BSC              | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://bscscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Matic            | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://polygonscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                |
| Goerli           | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://goerli.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)            |
| Fantom           | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://ftmscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Celo             | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://explorer.celo.org/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/transactions) |
| Avalanche        | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://snowtrace.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                   |
| Kovan-optimistic | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://kovan-optimistic.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)  |
| Optimistic       | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://optimistic.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)        |

### MaskHolderQlf

| Chain            | Address                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mainnet          | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                   |
| Ropsten          | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://ropsten.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)           |
| Rinkeby          | [0x26c3DE1430dc105b205F47fc497ED3015768C9B0](https://rinkeby.etherscan.io/address/0x26c3DE1430dc105b205F47fc497ED3015768C9B0)           |
| BSC              | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://bscscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Matic            | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://polygonscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                |
| Goerli           | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://goerli.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)            |
| Fantom           | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://ftmscan.com/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                    |
| Celo             | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://explorer.celo.org/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/transactions) |
| Avalanche        | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://snowtrace.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)                   |
| Kovan-optimistic | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://kovan-optimistic.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)  |
| Optimistic       | [0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx](https://optimistic.etherscan.io/address/0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)        |

[testnet $MASK token address](https://github.com/DimensionDev/misc_smart_contract#masktoken---testnet-only)

### Known issue and limitation

This smart contract only support [Enumerable ERC721 NFT](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable).

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/MysteryBox/issues).

## License

[MIT LICENSE](LICENSE)
