# MysteryBox Smart Contract API

## Function Briefing

### NFT MysteryBox representation

Briefly, a MysteryBox contains different types of NFT(s) for sale. When plyers call`MysteryBox`, The smart contract will pick an NFT randomly, mint it, and transfer it to players.
To keep it simple, we keep the number of different types of NFT(s) in a list.
Example, suppose there will be 5 different types of NFT(s), initially, the stock will look like:

```javascript
// total = 10,000 NFT(s) for sale
stock = [
    50,    // type 0, 50
    100,   // type 1, 100
    1000,  // type 2, 1000
    2000,  // type 3, 2000
    6850,  // type 4, 6850
];
```

The smart contract will pick NFT(s) randomly, and the chance of each NFT being picked is the same. Hence, the possibility of getting type 0 NFT is 0.5%. So, compared to others, type 0 is relatively `rare`.

### getNFTInfo

The query of MysteryBox status.

```solidity
    function getNFTInfo()
        external
        view
        returns (
            uint32 _purchase_limit,
            uint32 _start_time,
            uint32 _end_time,
            address _qualification,
            uint32[] memory _stock,
            PaymentInfo[] memory _payment
        )
    {}
```

- Parameters:
  - N/A
- Returns:
  - `_purchase_limit`: Maximum of NFT(s) each player can buy.
  - `_start_time`: Sale start time(timestamp as seconds since unix epoch)
  - `_end_time`: Sale end time(timestamp as seconds since unix epoch)
  - `_qualification`: qualifaction smart contract address.
  - `_stock`: the list of the number of NFT(s) in stock.
  - `_payment`: Payment information.
- Events:
  - N/A

### openBox

MysteryBox players `openBox` to buy and open boxes. The smart contract will mint NFT(s) randomly after the transaction is successful. Players are allowed to call `openBox` multiple times.

```solidity
    function openBox(
        uint8 _number_of_nft,
        uint8 _payment_token_index,
        bytes memory _proof
    )
        external
        payable
    {}
```

- Parameters:
  - `_number_of_nft`: collection id.
  - `_payment_token_index`: how to pay.
  - `_proof`: proof to be a qualified player.
- Events:
  - `Transfer(address from, address to, uint256 tokenId)`

### claimPayment

NFT owners can `claimPayment` after NFT(s) are sold.

```solidity
    function claimPayment(uint256[] calldata _collection_ids) external {}
```

- Parameters:
  - N/A
- Events:

```solidity
    event ClaimPayment (
        address indexed owner,
        uint256 indexed collection_id,
        address token_address,
        uint256 amount,
        uint256 timestamp
    );
```

### purchased_by_addr

Get how many NFT(s) a player has purchased.

```solidity
    function purchased_by_addr(address _addr)
        external
        view
        returns (
            uint32 _number_of_nft,
        )
    {}
```

- Parameters:
  - `_addr`: wallet address.
- Returns:
  - `_number_of_nft`: Total number of NFT(s) bought by this player.
- Events:
  - N/A