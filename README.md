# MysteryBox Smart Contract

## Brief introduction

MysteryBox Smart Contract is an Ethereum smart contract for people to sell/buy NFT tokens. Inspired by [Fukubukuro](https://en.wikipedia.org/wiki/Fukubukuro), people can create a collection(different kinds) of NFT tokens and customers/players can pick an NFT(randomly) after payment.

For design details, please see [API document](docs/API.md).

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
| Rinkeby | [0x9217Cc4F65054fe138807ecF6E25DdC75480396D][0x9217Cc4F65054fe138807ecF6E25DdC75480396D] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x9217Cc4F65054fe138807ecF6E25DdC75480396D]: https://rinkeby.etherscan.io/address/0x9217Cc4F65054fe138807ecF6E25DdC75480396D
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### LinkAccessor

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0x2326a8632Fb60965f931b0E6A6A6612F3dB2A87E][0x2326a8632Fb60965f931b0E6A6A6612F3dB2A87E] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0x2326a8632Fb60965f931b0E6A6A6612F3dB2A87E]: https://rinkeby.etherscan.io/address/0x2326a8632Fb60965f931b0E6A6A6612F3dB2A87E
[0xxxxxxxxx]: https://bscscan.com/address/0xxxxxxxxx
[0xxxxxxxxx]: https://polygonscan.com/address/0xxxxxxxxx

### MysteryBox

| Chain   | Address                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| Mainnet | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Ropsten | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Rinkeby | [0xe7D150B42CAAf8042e5956944a7fe2B4716c5fA5][0xe7D150B42CAAf8042e5956944a7fe2B4716c5fA5] |
| BSC     | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |
| Matic   | [0xxxxxxxxx][0xxxxxxxxx]                                                                 |

[0xxxxxxxxx]: https://etherscan.io/address/0xxxxxxxxx
[0xxxxxxxxx]: https://ropsten.etherscan.io/address/0xxxxxxxxx
[0xe7D150B42CAAf8042e5956944a7fe2B4716c5fA5]: https://rinkeby.etherscan.io/address/0xe7D150B42CAAf8042e5956944a7fe2B4716c5fA5
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

## Contribute

Any contribution is welcomed to make it better.

If you have any questions, please create an [issue](https://github.com/DimensionDev/MysteryBox/issues).

## License

[MIT LICENSE](LICENSE)