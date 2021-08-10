// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IQLF.sol";

contract MysteryBox is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event ClaimPayment (
        address indexed owner,
        address token_address,
        uint256 amount,
        uint256 timestamp
    );

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

    // `tokenURI` = `baseURI` + id + '.json'
    string private baseURI;

    // maxmimum number of NFT(s) user can buy
    uint32 private purchase_limit;

    // sale start time
    uint32 private start_time;

    // sale end time
    uint32 private end_time;

    // total NFT in stock
    uint32 private stock_total;

    // qualification contract address
    address private qualification;

    // total NFT(s) by types
    uint32[] private total;

    // number of NFT(s) in stock
    uint32[] private stock;

    // payment info, price/tokens, etc
    PaymentInfo[] private payment;

    // how many NFT(s) purchased
    mapping(address => uint32) public purchased_by_addr;

    // NFT types
    mapping(uint256 => uint32) public nft_type;

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseURI_,
        uint32 _purchase_limit,
        uint32 _start_time,
        uint32 _end_time,
        address _qualification,
        uint32[] memory _total,
        PaymentOption[] calldata _payment
    )
        public
        initializer
    {
        __ERC721_init(_name, _symbol);
        __ERC721Enumerable_init();
        __Ownable_init();
        baseURI = _baseURI_;
        purchase_limit = _purchase_limit;
        total = _total;
        stock = _total;
        uint32 _stock_total;
        for (uint256 i = 0; i < _total.length; i++) {
            _stock_total = _stock_total + _total[i];
        }
        stock_total = _stock_total;

        start_time = _start_time;
        end_time = _end_time;
        qualification = _qualification;

        for (uint256 i = 0; i < _payment.length; i++) {
            if (_payment[i].token_addr != address(0)) {
                require(IERC20(_payment[i].token_addr).totalSupply() > 0, "Not a valid ERC20 token address");
            }
            PaymentInfo memory paymentInfo = PaymentInfo(_payment[i].token_addr, _payment[i].price, 0);
            payment.push(paymentInfo);
        }
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, StringsUpgradeable.toString(tokenId), ".json"));
        }
        else {
            return "";
        }
    }

    function openBox(
        uint8 _number_of_nft,
        uint8 _payment_token_index,
        bytes memory _proof
    )
        external
        payable
    {
        require(_payment_token_index < payment.length, "invalid payment token");
        require (start_time < block.timestamp, "not started");
        require (end_time > block.timestamp, "expired");
        require(tx.origin == msg.sender, "no contracts");
        if (qualification != address(0)) {
            bool qualified;
            string memory error_msg;
            (qualified, error_msg) = IQLF(qualification).is_qualified(msg.sender, _proof);
            require(qualified, error_msg);
        }
        uint32 bought_number = purchased_by_addr[msg.sender];
        require((bought_number + _number_of_nft) <= purchase_limit, "exceeds personal limit");
        require(stock_total > 0, "no NFT left");
        uint8 actual_number_of_nft = _number_of_nft;
        if (_number_of_nft > stock_total) {
            actual_number_of_nft = uint8(stock_total);
        }
        {
            uint256 total_payment = payment[_payment_token_index].price;
            total_payment = total_payment.mul(actual_number_of_nft);
            address token_address = payment[_payment_token_index].token_addr;
            if (token_address == address(0)) {
                require(msg.value >= total_payment, "not enough ETH");
                uint256 eth_to_refund = msg.value.sub(total_payment);
                if ((_number_of_nft > actual_number_of_nft) && (eth_to_refund > 0)) {
                    address payable addr = payable(_msgSender());
                    addr.transfer(eth_to_refund);
                }
            }
            else {
                // transfer to owner
                IERC20(token_address).safeTransferFrom(_msgSender(), address(this), total_payment);
            }
            payment[_payment_token_index].receivable_amount += total_payment;
        }
        uint32[] memory _stock = stock;
        uint32 _stock_total = stock_total;
        {
            uint256 rand = _random();
            for (uint256 i = 0; i < actual_number_of_nft; i++) {
                uint32 type_id = _pickNFT(_stock, rand, _stock_total);
                nft_type[totalSupply()] = type_id;
                _safeMint(msg.sender, totalSupply());
                _stock[type_id]--;
                _stock_total--;
                rand = uint256(keccak256(abi.encodePacked(rand, i)));
            }
            purchased_by_addr[msg.sender] = bought_number + actual_number_of_nft;
            stock = _stock;
            stock_total = _stock_total;
        }
    }

    function claimPayment() external onlyOwner {
        for (uint256 token_index = 0; token_index < payment.length; token_index++) {
            address token_address = payment[token_index].token_addr;
            uint256 amount = payment[token_index].receivable_amount;
            if (amount == 0) {
                continue;
            }
            payment[token_index].receivable_amount = 0;
            if (token_address == address(0)) {
                address payable addr = payable(_msgSender());
                addr.transfer(amount);
            }
            else {
                IERC20(token_address).safeTransfer(_msgSender(), amount);
            }
            emit ClaimPayment(_msgSender(), token_address, amount, block.timestamp);
        }
    }

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
    {
        _purchase_limit = purchase_limit;
        _start_time = start_time;
        _end_time = end_time;
        _qualification = qualification;
        _stock = stock;
        _payment = payment;
    }

    function setPurchaseLimit(uint32 _purchase_limit) external onlyOwner {
        purchase_limit = _purchase_limit;
    }

    function setStartTime(uint32 _start_time) external onlyOwner {
        start_time = _start_time;
    }

    function setEndTime(uint32 _end_time) external onlyOwner {
        end_time = _end_time;
    }

    function setBaseURI(string memory _baseURI_) external onlyOwner {
        baseURI = _baseURI_;
    }

    function setQualification(address _qualification) external onlyOwner {
        qualification = _qualification;
    }

    function setPrice(uint8 _payment_token_index, uint256 _price) external onlyOwner {
        require(_payment_token_index < payment.length, "invalid payment token");
        payment[_payment_token_index].price = _price;
    }

    function _pickNFT(
        uint32[] memory _stock,
        uint256 rand,
        uint32 _stock_total
    )
        private
        pure
        returns(uint32)
    {
        rand = rand % _stock_total;
        uint32 nft_index = 0;
        uint32 combined = 0;
        for (uint32 index = 0; index < _stock.length; index++) {
            if (_stock[index] == 0) {
                continue;
            }
            if ((rand >= combined) && (rand < (combined + _stock[index]))) {
                nft_index = index;
                break;
            }
            combined += _stock[index];
        }
        return nft_index;
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

    function _baseURI() internal view override virtual returns (string memory) {
        return baseURI;
    }
}
