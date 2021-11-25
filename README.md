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

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145][0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145] |
| Ropsten | [0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d][0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d] |
| Rinkeby | [0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac][0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0x02F98667b3A1202a320F67a669a5e4e451fD0cc1][0x02F98667b3A1202a320F67a669a5e4e451fD0cc1] |

[0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145]: https://etherscan.io/address/0x294428f04b0F9EbC49B7Ad61E2736ebD6808c145
[0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d]: https://ropsten.etherscan.io/address/0x0a04e23f95E9DB2Fe4C31252548F663fFe3AAe4d
[0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac]: https://rinkeby.etherscan.io/address/0xF8ED169BC0cdA735A88d32AC10b88AA5B69181ac
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0x02F98667b3A1202a320F67a669a5e4e451fD0cc1]: https://polygonscan.com/address/0x02F98667b3A1202a320F67a669a5e4e451fD0cc1

### MaskTestNFT

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0x56136E69A5771436a9598804c5eA792230c21181][0x56136E69A5771436a9598804c5eA792230c21181] |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8][0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78][0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78] |

[0x56136E69A5771436a9598804c5eA792230c21181]: https://etherscan.io/address/0x56136E69A5771436a9598804c5eA792230c21181
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8]: https://rinkeby.etherscan.io/address/0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78]: https://polygonscan.com/address/0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78

### WhitelistQlf

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x50eCEebb7360Efb93094dDEA692e04274E548b1d][0x50eCEebb7360Efb93094dDEA692e04274E548b1d] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x50eCEebb7360Efb93094dDEA692e04274E548b1d]: https://rinkeby.etherscan.io/address/0x50eCEebb7360Efb93094dDEA692e04274E548b1d
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### SigVerifyQlf

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x9a656528700493348132823C6A3C59CdFa48283d][0x9a656528700493348132823C6A3C59CdFa48283d] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x9a656528700493348132823C6A3C59CdFa48283d]: https://rinkeby.etherscan.io/address/0x9a656528700493348132823C6A3C59CdFa48283d
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### MaskHolderQlf

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x26c3DE1430dc105b205F47fc497ED3015768C9B0][0x26c3DE1430dc105b205F47fc497ED3015768C9B0] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x26c3DE1430dc105b205F47fc497ED3015768C9B0]: https://rinkeby.etherscan.io/address/0x26c3DE1430dc105b205F47fc497ED3015768C9B0
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

[testnet $MASK token address](https://github.com/DimensionDev/misc_smart_contract#masktoken---testnet-only)

### Known issue and limitation

This smart contract only support [Enumerable ERC721 NFT](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable).

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/MysteryBox/issues).

## License

[MIT LICENSE](LICENSE)
