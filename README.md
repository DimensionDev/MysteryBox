# MysteryBox Smart Contract

## Brief introduction

MysteryBox Smart Contract is an Ethereum smart contract for people to sell/buy NFT tokens. Inspired by [Fukubukuro](https://en.wikipedia.org/wiki/Fukubukuro), people can create a collection(different kinds) of NFT tokens and customers/players can pick an NFT(randomly) after payment.

For design details, please see [API document](API.md).

## Getting Started

### Project setup

This project has [`git submodules`](https://git-scm.com/book/en/v2/Git-Tools-Submodules). After `clone`, you need to `update` the submodules.

```bash
git submodule init
git submodule update
```

To install required node.js modules:

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

Using the [`project_setup.js`](project_setup.js) script to set up the deployed smart contracts.

```bash
node project_setup.js setup
```

### Troubleshoot & Tips

- This project is powered by [hardhat](https://hardhat.org/).
  You can change your network configuration in `hardhat.config.ts` file.
- This smart contract involves some *randomness*, hence, the estimated gas consumption is probably not accurate. To make sure `transaction gas limit` is large/good enough, we need to give `a larger gas consumption`.

## Deployed Contract Address

### MysteryBoxNFT

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x039E7e42c311c35935c8B1518a981dFE9Aa3f64F][0x039E7e42c311c35935c8B1518a981dFE9Aa3f64F] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x039E7e42c311c35935c8B1518a981dFE9Aa3f64F]: https://rinkeby.etherscan.io/address/0x039E7e42c311c35935c8B1518a981dFE9Aa3f64F
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### LinkAccessor

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x9948D5A1bCC6E052132CB7c417CF5d8F2dF38417][0x9948D5A1bCC6E052132CB7c417CF5d8F2dF38417] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x9948D5A1bCC6E052132CB7c417CF5d8F2dF38417]: https://rinkeby.etherscan.io/address/0x9948D5A1bCC6E052132CB7c417CF5d8F2dF38417
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### MysteryBox

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x7365A2523dD7e1D746b779448E099a1E55ad264B][0x7365A2523dD7e1D746b779448E099a1E55ad264B] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x7365A2523dD7e1D746b779448E099a1E55ad264B]: https://rinkeby.etherscan.io/address/0x7365A2523dD7e1D746b779448E099a1E55ad264B
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/MysteryBox/issues).

## License

[MIT LICENSE](LICENSE)