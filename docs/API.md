# MysteryBox Smart Contract API

## Function Briefing

### NFT MysteryBox

Briefly, NFT designers/owners(such as: artists, etc) put a collection of NFT(s) into a `MysteryBox` and NFT fans(players) can buy NFT(s) from the collection. When players buy NFT(s), the smart contract will pick an NFT randomly, and transfer it to players. After the sale, the NFT collection owner can claim the payments.

### createBox

Create a `MysteryBox`.

```solidity
    function createBox (
        address nft_address,
        string calldata name,
        PaymentOption[] calldata payment,
        uint32 personal_limit,
        uint32 start_time,
        uint32 end_time,
        bool sell_all,
        uint256[] calldata nft_id_list,
        address qualification
    )
        external
    {}
```

- Parameters:
  - `nft_address`: NFT smart contract address.
  - `name`: Name of this box.
  - `payment`: Payment information.
  - `personal_limit`: Maximum of NFT(s) each player can buy.
  - `start_time`: Sale start time(timestamp as seconds since unix epoch).
  - `end_time`: Sale end time(timestamp as seconds since unix epoch).
  - `sell_all`: If owner wants to sell all NFT(s) owned.
  - `nft_id_list`: If `sell_all` is false, the list of NFT ids for sale.
  - `qualification`: qualifaction smart contract address.
- Returns:
  - N/A
- Events:

```solidity
event CreationSuccess (
    address indexed creator,
    address indexed nft_address,
    uint256 box_id,
    string name,
    uint32 start_time,
    uint32 end_time,
    bool sell_all
);
```

If `sell_all` is true, it means the box creator wants to sell all NFT(s) of `nft_address` he owned. In this case, `nft_id_list` will be ignored.
If `sell_all` is false, owner need to provide he NFT id(s) he/she wants to sell into `nft_id_list`.

`payment` includes payment token addresses and price.
`payment token address` can be `ETH` or `ERC-20 token address`.

- If `payment token` is `ETH`: `address` is `0x0000000000000000000000000000000000000000`.
- If `payment token` is `ERC20 token`: `address` is `ERC-20 token address`.

`qualification` is the smart contract address. And this smart contract is used to check if a player's wallet address is qualified for an NFT sale. If `qualification` is `0x0000000000000000000000000000000000000000`, it means everyone is qualified.

### openBox

MysteryBox players `open_box` to buy and open boxes. The smart contract will mint NFT(s) randomly after the transaction is successful. Players are allowed to call `openBox` multiple times.

```solidity
    function openBox(
        uint256 box_id,
        uint8 amount,
        uint8 payment_token_index,
        bytes memory proof
    )
        external
        payable
    {}
```

- Parameters:
  - `box_id`: box id.
  - `amount`: how many NFT(s) a player wants to buy.
  - `payment_token_index`: token to pay for the NFT.
  - `proof`: proof to prove a player is qualified for the sale.
- Events:
  - `Transfer(address from, address to, uint256 tokenId)`

`payment_token_index` is the payment token index in `payment` when the box is created by `create_box`.

- If `payment token` is `ETH`: players must send enough `ETH` through `transaction value`.
- If `payment token` is `ERC20 token`: players must approve enough `allowance` for the purchase.

### claimPayment

`MysteryBox` owners can `claim_payment` after NFT(s) are sold.

```solidity
    function claimPayment(uint256[] calldata box_ids) external {}
```

- Parameters:
  - `box_ids`: list of box id.
- Events:

```solidity
    event ClaimPayment (
        address indexed creator,
        uint256 indexed box_id,
        address token_address,
        uint256 amount,
        uint256 timestamp
    );
```

### getBoxInfo

Get basic information about a `MysteryBox`.

```solidity
    function getBoxInfo(uint256 box_id)
        external
        view
        returns (
            address creator,
            address nft_address,
            string memory name,
            PaymentInfo[] memory payment,
            uint32 personal_limit,
            bool started,
            bool expired,
            uint256 remaining
        )
    {}
```

- Parameters:
  - `box_id`: box id.
- Returns:
  - `creator`: `MysteryBox` owner.
  - `nft_address`: NFT smart contract address.
  - `name`: Name of this box.
  - `payment`: Payment information.
  - `personal_limit`: Maximum of NFT(s) each player can buy.
  - `started`: If sale is started.
  - `expired`: If sale ended.
  - `remaining`: How many NFT(s) left in the NFT box.
- Events:
  - N/A

### getPurchasedNft

Get the list of NFT(s) a player has purchased.

```solidity
    function getPurchasedNft(uint256 box_id, address customer)
        external
        view
        returns(uint256[] memory nft_id_list)
    {}
```

- Parameters:
  - `box_id`: box id.
  - `customer`: user address.
- Returns:
  - `nft_id_list`: The list of NFT(s) bought by this player.
- Events:
  - N/A

### addNftIntoBox

Add more NFT for sale.

```solidity
    function addNftIntoBox (
        uint256 box_id,
        uint256[] calldata nft_id_list
    )
        external
    {}
```

- Parameters:
  - `box_id`: box id.
  - `nft_id_list`: The list of NFT(s) for sale.
- Returns:
  - N/A
- Events:
  - N/A

### getNftListForSale

Get the list of NFT(s) for sale.

```solidity
    function getNftListForSale(uint256 box_id, uint256 cursor, uint256 amount)
        external
        view
        returns(uint256[] memory nft_id_list)
    {}
```

- Parameters:
  - `box_id`: box id.
  - `cursor`: cursor.
  - `amount`: how many NFT id(s) users want to get.
- Returns:
  - `nft_id_list`: The list of NFT(s) for sale.
- Events:
  - N/A

Suppose the owner added a lot of NFT(s) into a `MysteryBox`, the list of NFT on sale will be very long. Hence smart contract might not be able to return all NFT id(s), because of the block gas limit. That's where the `cursor` and `amount` come from. These two parameters enable users to get part of the list.
This figure shows how it works:

```javascript
    // Suppose the list is going on and on. Following line can get NFT id from 4 ~ 10.
    const nft_id_list_on_sale = await get_nft_for_sale(1, 4, 7);
    /*
        0
        1
        2
        3
        4\--------------->`cursor`
        5 \
        6  \
        7   |==> amount
        8  /
        9 /
       10/
       11
       12
       13
    */
```
