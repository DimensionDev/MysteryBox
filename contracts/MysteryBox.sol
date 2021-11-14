// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IQLF.sol";

contract MysteryBox is OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct PaymentOption {
        address token_addr;
        uint256 price;
    }

    struct PaymentInfo {
        // A token address for payment:
        // 1. ERC-20 token address
        // 2. adderss(0) for ETH
        address token_addr;
        uint256 price;
        uint256 receivable_amount;
    }

    struct Box {
        address creator;
        address nft_address;
        string name;
        PaymentInfo[] payment;
        // maxmimum number of NFT(s) user can buy
        uint32 personal_limit;
        uint32 start_time;
        uint32 end_time;
        // sell all NFT(s) owned
        bool sell_all;
        uint256[] nft_id_list;
        address qualification;
        mapping(address => uint256[]) purchased_nft;
        // total number of NFT(s)
        uint256 total;
        bool canceled;
    }

    event CreationSuccess (
        address indexed creator,
        address indexed nft_address,
        uint256 box_id,
        string name,
        uint32 start_time,
        uint32 end_time,
        bool sell_all
    );

    event OpenSuccess(
        uint256 indexed box_id,
        address indexed customer,
        address indexed nft_address,
        uint256 amount
    );

    event CancelSuccess(
        uint256 indexed box_id,
        address indexed creator
    );

    event ClaimPayment (
        address indexed creator,
        uint256 indexed box_id,
        address token_address,
        uint256 amount,
        uint256 timestamp
    );

    // uint256 private constant REMAINING_GAS_PROTECTION = 50 * 1000;
    uint256 private _box_id;
    mapping(uint256 => Box) private box_by_id;

    function initialize() public initializer {
        __Ownable_init();
    }

    function createBox (
        address nft_address,
        string memory name,
        PaymentOption[] memory payment,
        uint32 personal_limit,
        uint32 start_time,
        uint32 end_time,
        bool sell_all,
        uint256[] memory nft_id_list,
        address qualification
    )
        external
    {
        _box_id++;
        require(end_time > block.timestamp, "invalid end time");
        require(IERC721(nft_address).isApprovedForAll(msg.sender, address(this)), "not ApprovedForAll");
        require(payment.length > 0, "invalid payment");

        Box storage box = box_by_id[_box_id];
        for (uint256 i = 0; i < payment.length; i++) {
            if (payment[i].token_addr != address(0)) {
                require(IERC20(payment[i].token_addr).totalSupply() > 0, "Not a valid ERC20 token address");
            }
            PaymentInfo memory paymentInfo = PaymentInfo(payment[i].token_addr, payment[i].price, 0);
            box.payment.push(paymentInfo);
        }

        box.creator = msg.sender;
        box.nft_address = nft_address;
        box.name = name;
        box.personal_limit = personal_limit;
        box.start_time = start_time;
        box.end_time = end_time;
        box.sell_all = sell_all;
        box.qualification = qualification;

        if (sell_all) {
            // validate it is an `Enumerable` NFT
            /* solhint-disable */
            require(
                IERC721(nft_address).supportsInterface(type(IERC721EnumerableUpgradeable).interfaceId),
                "not enumerable nft");
            /* solhint-enable */
            uint256 nftBalance = IERC721(nft_address).balanceOf(msg.sender);
            require(nftBalance > 0, "no nft owned");
            box.sell_all = true;
            box.total = nftBalance;
        }
        else {
            require(nft_id_list.length > 0, "empty nft list");
            require(_check_ownership(nft_id_list, nft_address), "now owner");
            box.nft_id_list = nft_id_list;
            box.total = nft_id_list.length;
        }
        emit CreationSuccess (
            msg.sender,
            nft_address,
            _box_id,
            name,
            start_time,
            end_time,
            sell_all
        );
    }

    // Add more NFT for sale
    function addNftIntoBox (
        uint256 box_id,
        uint256[] calldata nft_id_list
    )
        external
    {
        Box storage box = box_by_id[box_id];
        require(box.creator == msg.sender, "not box owner");
        require(box.sell_all == false, "can not add for sell_all");
        address nft_address = box.nft_address;
        address creator = box.creator;

        for (uint256 i = 0; i < nft_id_list.length; i++) {
            address nft_owner = IERC721(nft_address).ownerOf(nft_id_list[i]);
            require(creator == nft_owner, "not nft owner");
            box.nft_id_list.push(nft_id_list[i]);
        }
        box.total += nft_id_list.length;
    }

    // cancel sale
    function cancelBox (uint256 box_id)
        external
    {
        Box storage box = box_by_id[box_id];
        require(box.creator == msg.sender, "not box owner");
        require(block.timestamp <= box.start_time, "sale started");
        require(!(box.canceled), "sale canceled already");
        box.canceled = true;
        emit CancelSuccess(box_id, msg.sender);
    }

    function openBox(
        uint256 box_id,
        uint8 amount,
        uint8 payment_token_index,
        bytes memory proof
    )
        external
        payable
    {
        require(tx.origin == msg.sender, "no contracts");
        Box storage box = box_by_id[box_id];
        require(block.timestamp > box.start_time, "not started");
        require(box.end_time > block.timestamp, "expired");
        require(payment_token_index < box.payment.length, "invalid payment token");
        require((box.purchased_nft[msg.sender].length + amount) <= box.personal_limit, "exceeds personal limit");
        require(!(box.canceled), "sale canceled");

        if (box.qualification != address(0)) {
            bool qualified;
            string memory error_msg;
            (qualified, error_msg) = IQLF(box.qualification).is_qualified(msg.sender, proof);
            require(qualified, error_msg);
        }

        address nft_address = box.nft_address;
        address creator = box.creator;
        uint256 total;
        if (box.sell_all) {
            total = IERC721(nft_address).balanceOf(creator);
        }
        else {
            total = box.nft_id_list.length;
        }
        require(total > 0, "no NFT left");
        if (amount > total) {
            amount = uint8(total);
        }

        uint256 rand = _random();
        if (box.sell_all) {
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = rand % total;
                uint256 token_id = IERC721Enumerable(nft_address).tokenOfOwnerByIndex(creator, token_index);
                IERC721(nft_address).safeTransferFrom(creator, msg.sender, token_id);
                box.purchased_nft[msg.sender].push(token_id);
                rand = uint256(keccak256(abi.encodePacked(rand, i)));
                total--;
            }
        }
        else {
            uint8 nft_transfered;
            // pick NFT(s) from nft-id list
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = rand % total;
                uint256 token_id = box.nft_id_list[token_index];
                if (creator == IERC721(nft_address).ownerOf(token_id)) {
                    // transfer NFT
                    IERC721(nft_address).safeTransferFrom(creator, msg.sender, token_id);
                    box.purchased_nft[msg.sender].push(token_id);
                    nft_transfered++;
                }
                else {
                    // TODO: owner transfered this NFT elsewhere, do we need to keep searching?
                    // If we do, validate `remaining gas`, to make sure we can finish the tx successfully
                    // Otherwise, this collection will go to a dead-loop state.
                    // if (gasleft() <= REMAINING_GAS_PROTECTION) {
                    // }
                }
                // remove this NFT id from the list
                _remove_nft_id(box, token_index);
                rand = uint256(keccak256(abi.encodePacked(rand, i)));
                total--;
            }
            // update NFT transfered `amount`, which will be used for `payment`
            amount = nft_transfered;
        }
        {
            uint256 total_payment = box.payment[payment_token_index].price;
            total_payment = total_payment.mul(amount);
            address payment_token_address = box.payment[payment_token_index].token_addr;
            if (payment_token_address == address(0)) {
                require(msg.value >= total_payment, "not enough ETH");
                uint256 eth_to_refund = msg.value.sub(total_payment);
                if (eth_to_refund > 0) {
                    address payable addr = payable(msg.sender);
                    addr.transfer(eth_to_refund);
                }
            }
            else {
                IERC20(payment_token_address).safeTransferFrom(msg.sender, address(this), total_payment);
            }
            box.payment[payment_token_index].receivable_amount += total_payment;
        }
        emit OpenSuccess(box_id, msg.sender, nft_address, amount);
    }

    function claimPayment(uint256[] calldata box_ids) external {
        for (uint256 asset_index = 0; asset_index < box_ids.length; asset_index++) {
            Box storage box = box_by_id[box_ids[asset_index]];
            require(box.creator == msg.sender, "not owner");
            uint256 total;
            if (box.sell_all) {
                total = IERC721(box.nft_address).balanceOf(msg.sender);
            }
            else {
                total = box.nft_id_list.length;
            }
            require(box.end_time <= block.timestamp || total == 0, "not expired/sold-out");

            for (uint256 token_index = 0; token_index < box.payment.length; token_index++) {
                address token_address = box.payment[token_index].token_addr;
                uint256 amount = box.payment[token_index].receivable_amount;
                if (amount == 0) {
                    continue;
                }
                box.payment[token_index].receivable_amount = 0;
                if (token_address == address(0)) {
                    address payable addr = payable(msg.sender);
                    addr.transfer(amount);
                }
                else {
                    IERC20(token_address).safeTransfer(msg.sender, amount);
                }
                emit ClaimPayment(msg.sender, box_ids[asset_index], token_address, amount, block.timestamp);
            }
        }
    }

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
            uint256 remaining,
            uint256 total,
            address qualification,
            bool canceled
        )
    {
        Box storage box = box_by_id[box_id];
        creator = box.creator;
        nft_address = box.nft_address;
        name = box.name;
        payment = box.payment;
        personal_limit = box.personal_limit;
        started = block.timestamp > box.start_time;
        expired = block.timestamp > box.end_time;

        if (box.sell_all) {
            remaining = IERC721(nft_address).balanceOf(creator);
        }
        else {
            remaining = box.nft_id_list.length;
        }

        total = box.total;
        qualification = box.qualification;
        canceled = box.canceled;
    }

    function getPurchasedNft(uint256 box_id, address customer)
        external
        view
        returns(uint256[] memory nft_id_list)
    {
        Box storage box = box_by_id[box_id];
        nft_id_list = box.purchased_nft[customer];
    }

    function getNftListForSale(uint256 box_id, uint256 cursor, uint256 amount)
        external
        view
        returns(uint256[] memory nft_id_list)
    {
        Box storage box = box_by_id[box_id];
        address nft_address = box.nft_address;
        address creator = box.creator;
        uint256 total;
        if (box.sell_all) {
            total = IERC721(nft_address).balanceOf(creator);
        }
        else {
            total = box.nft_id_list.length;
        }
        if (cursor >= total) {
            return nft_id_list;
        }
        if (amount > (total - cursor)) {
            amount = total - cursor;
        }
        nft_id_list = new uint[](amount);

        if (box.sell_all) {
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = i + cursor;
                nft_id_list[i] = IERC721Enumerable(nft_address).tokenOfOwnerByIndex(creator, token_index);
            }
        }
        else {
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = i + cursor;
                nft_id_list[i] = box.nft_id_list[token_index];
            }
        }
    }

    function _random() internal view returns (uint256 rand) {
        uint256 blocknumber = block.number;
        uint256 random_gap = uint256(keccak256(abi.encodePacked(blockhash(blocknumber-1), msg.sender))) % 255;
        uint256 random_block = blocknumber - 1 - random_gap;
        bytes32 sha = keccak256(abi.encodePacked(blockhash(random_block),
                                                msg.sender,
                                                block.coinbase,
                                                block.difficulty));
        return uint256(sha);
    }

    function _check_ownership(uint256[] memory nft_token_id_list, address nft_address)
        internal
        view
        returns(bool)
    {
        for (uint256 i = 0; i < nft_token_id_list.length; i++) {
            address nft_owner = IERC721(nft_address).ownerOf(nft_token_id_list[i]);
            if (nft_owner != msg.sender){
                return false;
            }
        }
        return true;
    }

    function _remove_nft_id(Box storage box, uint256 index) private {
        require(box.nft_id_list.length > index, "invalid index");
        uint256 lastTokenIndex = box.nft_id_list.length - 1;
        // When we delete the last ID, the swap operation is unnecessary
        if (index != lastTokenIndex) {
            uint256 lastTokenId = box.nft_id_list[lastTokenIndex];
            // Move the last token to the slot of the to-delete token
            box.nft_id_list[index] = lastTokenId;
        }
        box.nft_id_list.pop();
    }
}
