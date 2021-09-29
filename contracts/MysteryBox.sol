// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IQLF.sol";
// import "hardhat/console.sol";

contract MysteryBox is OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    enum NftType {
        ERC_721,
        ERC_1155
    }

    struct PaymentOption {
        address token_addr;
        uint256 price;
    }

    struct BoxOption {
        // maxmimum number of NFT(s) user can buy
        uint32 personal_limit;
        uint32 start_time;
        uint32 end_time;

        // sell all NFT(s) owned
        bool sell_all;
        address nft_address;

        string name;
        PaymentOption[] payment;

        // used for `ERC_721`
        uint256[] erc721_list;
        address qualification;

        // `token address`
        address holder_token_addr;
        // `token holder`
        uint256 holder_min_token_amount;

        NftType nft_type;
        ERC1155_Item[] erc1155_list;
    }

    struct ERC1155_Item {
        uint256 nft_id;
        uint256 amount;
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
        // maxmimum number of NFT(s) user can buy
        uint32 personal_limit;
        uint32 start_time;
        uint32 end_time;
        address creator;
        bool canceled;
        // sell all NFT(s) owned
        bool sell_all;
        address nft_address;
        string name;
        PaymentInfo[] payment;

        // used for `ERC_721`
        uint256[] erc721_list;
        address qualification;
        mapping(address => uint256[]) purchased_nft;
        // total number of NFT(s)
        uint256 total;

        // `token address`
        address holder_token_addr;
        // `token holder`
        uint256 holder_min_token_amount;

        NftType nft_type;
        ERC1155_Item[] erc1155_list;
        uint256 erc1155_remaining;
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
    mapping(address => bool) public admin;
    mapping(address => bool) public whitelist;

    function initialize() public initializer {
        __Ownable_init();
    }

    function createBox(BoxOption memory box_option) external
    {
        _box_id++;
        require(box_option.end_time > block.timestamp, "invalid end time");
        require(IERC721(box_option.nft_address).isApprovedForAll(msg.sender, address(this)), "not ApprovedForAll");
        require(box_option.payment.length > 0, "invalid payment");
        require(whitelist[msg.sender] || admin[msg.sender], "not whitelisted");

        Box storage box = box_by_id[_box_id];
        for (uint256 i = 0; i < box_option.payment.length; i++) {
            if (box_option.payment[i].token_addr != address(0)) {
                require(IERC20(box_option.payment[i].token_addr).totalSupply() > 0, "Not a valid ERC20 token address");
            }
            PaymentInfo memory paymentInfo = PaymentInfo(
                box_option.payment[i].token_addr,
                box_option.payment[i].price,
                0
            );
            box.payment.push(paymentInfo);
        }

        box.creator = msg.sender;
        box.nft_address = box_option.nft_address;
        box.name = box_option.name;
        box.personal_limit = box_option.personal_limit;
        box.start_time = box_option.start_time;
        box.end_time = box_option.end_time;
        box.sell_all = box_option.sell_all;
        box.qualification = box_option.qualification;
        box.holder_token_addr = box_option.holder_token_addr;
        box.holder_min_token_amount = box_option.holder_min_token_amount;
        box.nft_type = box_option.nft_type;
        if (box_option.holder_token_addr != address(0)) {
            require(IERC20(box_option.holder_token_addr).totalSupply() > 0, "Not a valid ERC20 token address");
        }

        if (box_option.sell_all) {
            // must be `ERC721 Enumerable` NFT
            /* solhint-disable */
            require(
                IERC721(box_option.nft_address).supportsInterface(type(IERC721EnumerableUpgradeable).interfaceId),
                "not enumerable nft");
            /* solhint-enable */
            uint256 nftBalance = IERC721(box_option.nft_address).balanceOf(msg.sender);
            require(nftBalance > 0, "no nft owned");
            box.total = nftBalance;
        }
        else {
            if (box_option.nft_type == NftType.ERC_721) {
                _check_erc721_list(box_option.erc721_list, box_option.nft_address);
                box.erc721_list = box_option.erc721_list;
                box.total = box_option.erc721_list.length;
            }
            else {
                box.total = _check_and_count_erc1155_list(
                    box_option.erc1155_list,
                    box_option.nft_address
                );
                box.erc1155_remaining = box.total;
                for (uint256 i = 0; i < box_option.erc1155_list.length; i++) {
                    box.erc1155_list.push(box_option.erc1155_list[i]);
                }
            }
        }
        emit CreationSuccess (
            msg.sender,
            box_option.nft_address,
            _box_id,
            box_option.name,
            box_option.start_time,
            box_option.end_time,
            box_option.sell_all
        );
    }

    // Add more ERC721 NFT for sale
    function addERC721IntoBox (
        uint256 box_id,
        uint256[] calldata erc721_list
    )
        external
    {
        Box storage box = box_by_id[box_id];
        require(box.creator == msg.sender, "not box owner");
        require(box.sell_all == false, "can not add for sell_all");
        require(box.nft_type == NftType.ERC_721, "not ERC721");

        address nft_address = box.nft_address;
        address creator = box.creator;

        for (uint256 i = 0; i < erc721_list.length; i++) {
            address nft_owner = IERC721(nft_address).ownerOf(erc721_list[i]);
            require(creator == nft_owner, "not nft owner");
            box.erc721_list.push(erc721_list[i]);
        }
        box.total += erc721_list.length;
    }

    // Add more ERC1155 NFT for sale
    function addERC1155IntoBox (
        uint256 box_id,
        ERC1155_Item[] calldata erc1155_list
    )
        external
    {
        Box storage box = box_by_id[box_id];
        require(box.creator == msg.sender, "not box owner");
        require(box.sell_all == false, "can not add for sell_all");
        require(box.nft_type == NftType.ERC_1155, "not ERC721");

        address nft_address = box.nft_address;
        address creator = box.creator;

        // TODO
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

        if (box.holder_min_token_amount > 0 && box.holder_token_addr != address(0)) {
            require(
                IERC20(box.holder_token_addr).balanceOf(msg.sender) >= box.holder_min_token_amount,
                "not holding enough token"
            );
        }

        if (box.qualification != address(0)) {
            bool qualified;
            string memory error_msg;
            (qualified, error_msg) = IQLF(box.qualification).is_qualified(msg.sender, proof);
            require(qualified, error_msg);
        }

        amount = _transfer_random_nft(box, amount);
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
        emit OpenSuccess(box_id, msg.sender, box.nft_address, amount);
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
                if (box.nft_type == NftType.ERC_721) {
                    total = box.erc721_list.length;
                }
                else {
                    total = box.erc1155_list.length;
                }
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
            uint32 personal_limit,
            address qualification,
            address holder_token_addr,
            uint256 holder_min_token_amount
        )
    {
        Box storage box = box_by_id[box_id];
        creator = box.creator;
        nft_address = box.nft_address;
        name = box.name;
        personal_limit = box.personal_limit;
        qualification = box.qualification;
        holder_token_addr = box.holder_token_addr;
        holder_min_token_amount = box.holder_min_token_amount;
    }

    function getBoxStatus(uint256 box_id)
        external
        view
        returns (
            PaymentInfo[] memory payment,
            bool started,
            bool expired,
            bool canceled,
            uint256 remaining,
            uint256 total
        )
    {
        Box storage box = box_by_id[box_id];
        payment = box.payment;
        started = block.timestamp > box.start_time;
        expired = block.timestamp > box.end_time;
        canceled = box.canceled;
        total = box.total;

        if (box.sell_all) {
            remaining = IERC721(box.nft_address).balanceOf(box.creator);
        }
        else {
            if (box.nft_type == NftType.ERC_721) {
                remaining = box.erc721_list.length;
            }
            else {
                remaining = box.erc1155_remaining;
            }
        }
    }

    function getPurchasedNft(uint256 box_id, address customer)
        external
        view
        returns(uint256[] memory nft_list)
    {
        Box storage box = box_by_id[box_id];
        nft_list = box.purchased_nft[customer];
    }

    function getNftListForSale(uint256 box_id, uint256 cursor, uint256 amount)
        external
        view
        returns(uint256[] memory nft_list)
    {
        Box storage box = box_by_id[box_id];
        address nft_address = box.nft_address;
        address creator = box.creator;
        uint256 total;
        if (box.sell_all) {
            total = IERC721(nft_address).balanceOf(creator);
        }
        else {
            if (box.nft_type == NftType.ERC_721) {
                total = box.erc721_list.length;
            }
            else {
                total = box.erc1155_list.length;
            }
        }
        if (cursor >= total) {
            return nft_list;
        }
        if (amount > (total - cursor)) {
            amount = total - cursor;
        }
        nft_list = new uint[](amount);

        if (box.sell_all) {
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = i + cursor;
                nft_list[i] = IERC721Enumerable(nft_address).tokenOfOwnerByIndex(creator, token_index);
            }
        }
        else {
            if (box.nft_type == NftType.ERC_721) {
                for (uint256 i = 0; i < amount; i++) {
                    uint256 token_index = i + cursor;
                    nft_list[i] = box.erc721_list[token_index];
                }
            }
            else {
                for (uint256 i = 0; i < amount; i++) {
                    uint256 token_index = i + cursor;
                    nft_list[i] = box.erc1155_list[token_index].nft_id;
                }
            }
        }
    }

    function addAdmin(address[] memory addrs) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            admin[addrs[i]] = true;
        }
    }

    function removeAdmin(address[] memory addrs) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            admin[addrs[i]] = false;
        }
    }

    function addWhitelist(address[] memory addrs) external {
        require(admin[msg.sender] || msg.sender == owner(), "not admin");
        for (uint256 i = 0; i < addrs.length; i++) {
            whitelist[addrs[i]] = true;
        }
    }

    function removeWhitelist(address[] memory addrs) external {
        require(admin[msg.sender] || msg.sender == owner(), "not admin");
        for (uint256 i = 0; i < addrs.length; i++) {
            whitelist[addrs[i]] = false;
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

    function _check_erc721_list(uint256[] memory erc721_list, address nft_address)
        internal
        view
        returns(bool)
    {
        require(erc721_list.length > 0, "empty nft list");
        for (uint256 i = 0; i < erc721_list.length; i++) {
            address nft_owner = IERC721(nft_address).ownerOf(erc721_list[i]);
            require (nft_owner == msg.sender, "now owner");
        }
    }

    function _check_and_count_erc1155_list(
        ERC1155_Item[] memory erc1155_list,
        address nft_address
    )
        internal
        view
        returns(uint256)
    {
        require(erc1155_list.length > 0, "empty nft list");
        uint256 total;
        for (uint256 i = 0; i < erc1155_list.length; i++) {
            uint256 balance = IERC1155(nft_address).balanceOf(msg.sender, erc1155_list[i].nft_id);
            require(balance > erc1155_list[i].amount, "not enough balance");
            total = total + erc1155_list[i].amount;
        }
        return total;
    }


    // `transfer` random NFT(s)
    // return how many NFT(s) really transfered
    function _transfer_random_nft(Box storage box, uint8 amount) internal returns(uint8) {
        address nft_address = box.nft_address;
        address creator = box.creator;

        uint256 total;
        if (box.sell_all) {
            total = IERC721(nft_address).balanceOf(creator);
        }
        else {
            if (box.nft_type == NftType.ERC_721) {
                total = box.erc721_list.length;
            }
            else {
                total = box.erc1155_remaining;
            }
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
            return amount;
        }
        if (box.nft_type == NftType.ERC_721) {
            uint8 nft_transfered;
            // pick NFT(s) from nft-id list
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = rand % total;
                uint256 token_id = box.erc721_list[token_index];
                if (creator == IERC721(nft_address).ownerOf(token_id)) {
                    // transfer NFT
                    IERC721(nft_address).safeTransferFrom(creator, msg.sender, token_id);
                    box.purchased_nft[msg.sender].push(token_id);
                    nft_transfered++;
                }
                else {
                    // TODO: owner transfered this NFT elsewhere
                    // If we do, validate `remaining gas`, to make sure we can finish the tx successfully
                    // Otherwise, this collection will go to a dead-loop state.
                    // if (gasleft() <= REMAINING_GAS_PROTECTION) {
                    // }
                }
                // remove this NFT id from the list
                _remove_erc721_from_list(box, token_index);
                rand = uint256(keccak256(abi.encodePacked(rand, i)));
                total--;
            }
            // update NFT transfered `amount`, which will be used for `payment`
            return nft_transfered;
        }
        else {
            uint8 nft_transfered;
            uint256 total_index = box.erc1155_list.length;
            // pick NFT(s) from nft-id list
            for (uint256 i = 0; i < amount; i++) {
                uint256 token_index = rand % total_index;
                uint256 token_id = box.erc1155_list[token_index].nft_id;
                uint256 remaining = box.erc1155_list[token_index].amount;
                // console.log("remaining: %d token_id: %s to: %s", remaining, token_id, msg.sender);
                if (remaining > 0) {
                    // transfer NFT
                    IERC1155(nft_address).safeTransferFrom(creator, msg.sender, token_id, 1, "");
                    box.purchased_nft[msg.sender].push(token_id);
                    nft_transfered++;
                    remaining--;
                }
                else {
                    // Box owner transfered this NFT elsewhere
                }
                if (remaining == 0) {
                    _remove_erc1155_from_list(box, token_index);
                    total_index--;
                }
                else {
                    box.erc1155_list[token_index].amount = remaining;
                }
                rand = uint256(keccak256(abi.encodePacked(rand, i)));
            }
            box.erc1155_remaining = box.erc1155_remaining - amount;
            return nft_transfered;
        }
    }

    function _remove_erc721_from_list(Box storage box, uint256 index) private {
        require(box.erc721_list.length > index, "invalid index");
        uint256 lastTokenIndex = box.erc721_list.length - 1;
        // When we delete the last ID, the swap operation is unnecessary
        if (index != lastTokenIndex) {
            uint256 lastTokenId = box.erc721_list[lastTokenIndex];
            // Move the last token to the slot of the to-delete token
            box.erc721_list[index] = lastTokenId;
            // console.log("index: %s last: %d", index, lastTokenId);
        }
        box.erc721_list.pop();
    }

    function _remove_erc1155_from_list(Box storage box, uint256 index) private {
        require(box.erc1155_list.length > index, "invalid index");
        uint256 lastTokenIndex = box.erc1155_list.length - 1;
        // When we delete the last ID, the swap operation is unnecessary
        if (index != lastTokenIndex) {
            // Move the last token to the slot of the to-delete token
            box.erc1155_list[index].amount = box.erc1155_list[lastTokenIndex].amount;
            box.erc1155_list[index].nft_id = box.erc1155_list[lastTokenIndex].nft_id;
        }
        box.erc1155_list.pop();
    }
}
