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

To deploy the smart contract on Ethereum `rinkeby` testnet

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
| Mainnet | [0x0dFB34D213f613Dda67a2924F60b5301d42ABFb7][0x0dFB34D213f613Dda67a2924F60b5301d42ABFb7]                                                                 |
| Ropsten | [0xdB59446B15AB6e97A4452BA3e23dD03E5004c854][0xdB59446B15AB6e97A4452BA3e23dD03E5004c854]                                                                 |
| Rinkeby | [0xbFcf8210F5B6764D86a9C5252218ad627A6a949d][0xbFcf8210F5B6764D86a9C5252218ad627A6a949d] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0x0dFB34D213f613Dda67a2924F60b5301d42ABFb7]: https://etherscan.io/address/0x0dFB34D213f613Dda67a2924F60b5301d42ABFb7
[0xdB59446B15AB6e97A4452BA3e23dD03E5004c854]: https://ropsten.etherscan.io/address/0xdB59446B15AB6e97A4452BA3e23dD03E5004c854
[0xbFcf8210F5B6764D86a9C5252218ad627A6a949d]: https://rinkeby.etherscan.io/address/0xbFcf8210F5B6764D86a9C5252218ad627A6a949d
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### MaskTestNFT

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0x56136E69A5771436a9598804c5eA792230c21181][0x56136E69A5771436a9598804c5eA792230c21181]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8][0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0x56136E69A5771436a9598804c5eA792230c21181]: https://etherscan.io/address/0x56136E69A5771436a9598804c5eA792230c21181
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8]: https://rinkeby.etherscan.io/address/0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### WhitelistQlf

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x996A9DCe6247cd8AaFA60de34cDD5332d9AdE702][0x996A9DCe6247cd8AaFA60de34cDD5332d9AdE702] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x996A9DCe6247cd8AaFA60de34cDD5332d9AdE702]: https://rinkeby.etherscan.io/address/0x996A9DCe6247cd8AaFA60de34cDD5332d9AdE702
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

### Known issue and limitation

This smart contract only support [Enumerable ERC721 NFT](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable).

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/MysteryBox/issues).

## License

[MIT LICENSE](LICENSE)
