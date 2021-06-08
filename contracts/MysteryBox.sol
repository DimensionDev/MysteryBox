// SPDX-License-Identifier: MIT

// IMPORTANT: if you want to use other solc version compilers(like: 0.7.x)
// Make sure it reverts on integer overflow, eg, using SafeMath, SafeMath32
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./interfaces/ILinkAccessor.sol";
import "./interfaces/IMysteryBoxNFT.sol";

contract MysteryBox is Initializable, Context {
    using SafeERC20 for IERC20;
    // `solc 0.8.x` reverts automatically on `integer overflow`
    using SafeMath for uint256;
    // using SafeMath32 for uint32;

    uint256 constant private SUM_OF_PERCENTAGE = 100;
    uint256 constant private NFT_TYPE_COUNTER_INCREMENT = 1 << 128;
    uint256 private collectionCounter;
    uint256 private NftTypeIdCounter;

    // We maintain `owner` instead of using `Ownable` because we want to use the `Proxy` design pattern.
    address public owner;
    ILinkAccessor public linkAccessor;
    IMysteryBoxNFT public mysteryBoxNFT;

    // Fee users need to pay to cover the fee for the `Chainlink VRF service`.
    uint256 public fee;

    // To simplify ABI parameters
    struct NFTOption {
        uint8 percentage;
        uint32 total;
    }
    struct PaymentOption {
        address token_addr;
        uint256 price;
    }

    struct NFTInfo {
        uint256 latest_nft_id;
        uint32 total;
        uint32 sold;
        // probability distribution
        uint8 percentage;
    }

    struct PaymentInfo {
        // A token address for payment:
        // 1. ERC-20 token address
        // 2. adderss(0) for ETH
        address token_addr;
        uint256 price;
        uint256 receivable_amount;
    }

    struct NFTCollection {
        address owner;
        string name;
        //--------------------------
        // maximum number of NFT(s) a user can buy
        uint32 draw_limit;
        uint32 start_time;
        uint32 end_time;
        // total number of NFT(s)
        uint32 total_quantity;
        // total number of NFT(s) drawn
        uint32 drawn_quantity;
        // total number of NFT(s) claimed
        uint32 claimed_quantity;
        // NFT counter bought by a specific user
        mapping(address => uint32) quantity_by_addr;
        //--------------------------
        NFTInfo[] nft_list;
        PaymentInfo[] payment_list;
    }

    struct DrawInfo {
        uint256 collection_id;
        uint256 rand;
        address owner;
        uint8 number_of_nft;
    }
    // `collection_id` => `NFTCollection`
    mapping(uint256 => NFTCollection) public collectionMap;

    // `random number request id` ==> `DrawInfo`
    mapping(bytes32 => DrawInfo) public drawInfoMap;

    // `address` --> `random number request id` list
    mapping (address => bytes32[]) claimMap;

    // `user address` ==> `NFT`
    mapping (address => uint256[]) purchaseHistory;

    event CollectionCreated(address indexed owner, uint256 collection_id);
    event NFTDrawn(address indexed owner, bytes32 request_id);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ClaimPayment (
        address indexed owner,
        uint256 indexed collection_id,
        address token_address,
        uint256 amount,
        uint256 timestamp
    );

    function initialize(
        address _owner,
        address _linkAccessor,
        address _nftHandle
    )
        public
        initializer
    {
        owner = _owner;
        linkAccessor = ILinkAccessor(_linkAccessor);
        mysteryBoxNFT = IMysteryBoxNFT(_nftHandle);
        fee = 0.01 ether;
    }

    function setLinkAccessor(address _linkAccessor) external onlyOwner {
        linkAccessor = ILinkAccessor(_linkAccessor);
    }

    function setNftHandle(address _nftHandle) external onlyOwner {
        mysteryBoxNFT = IMysteryBoxNFT(_nftHandle);
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function createCollection(
        string calldata _name,
        uint32 _draw_limit,
        uint32 _start_time,
        uint32 _end_time,
        NFTOption[] calldata _nft_options,
        PaymentOption[] calldata _payment
    )
        external
    {
        require(_nft_options.length > 0, "invalid NFT options");
        require(_payment.length > 0, "invalid payment options");

        collectionCounter++;
        uint256 collection_id = collectionCounter;
        NFTCollection storage collection = collectionMap[collection_id];
        collection.owner = _msgSender();
        collection.name = _name;
        collection.draw_limit = _draw_limit;
        collection.start_time = _start_time;
        collection.end_time = _end_time;
        uint32 total = 0;
        {
            uint256 sum_of_percentage = 0;
            for (uint256 i = 0; i < _nft_options.length; i++) {
                require(_nft_options[i].percentage > 0, "invalid percentage");
                require(_nft_options[i].total > 0, "invalid total amount");
                // allocate `NFT type id` first
                NftTypeIdCounter = NftTypeIdCounter.add(NFT_TYPE_COUNTER_INCREMENT);
                NFTInfo memory nft_info = NFTInfo(
                    NftTypeIdCounter,
                    _nft_options[i].total,
                    0,
                    _nft_options[i].percentage
                );
                collection.nft_list.push(nft_info);
                sum_of_percentage = sum_of_percentage + _nft_options[i].percentage;
                total += _nft_options[i].total;
            }
            require(sum_of_percentage == SUM_OF_PERCENTAGE, "invalid percentage");
        }
        collection.total_quantity = total;
        {
            for (uint256 i = 0; i < _payment.length; i++) {
                if (_payment[i].token_addr != address(0)) {
                    require(IERC20(_payment[i].token_addr).totalSupply() > 0, "Not a valid ERC20 token address");
                }
                PaymentInfo memory payment_list = PaymentInfo(_payment[i].token_addr, _payment[i].price, 0);
                collection.payment_list.push(payment_list);
            }
        }
        emit CollectionCreated(_msgSender(), collection_id);
    }

    function getCollectionInfo(uint256 _collection_id)
        external
        view
        returns (
            address _owner,
            string memory _name,
            uint32 _draw_limit,
            uint32 _start_time,
            uint32 _end_time,
            uint32 _total_quantity,
            uint32 _drawn_quantity,
            uint32 _claimed_quantity,
            NFTInfo[] memory _nft_list,
            PaymentInfo[] memory _payment_list
        )
    {
        NFTCollection storage collection = collectionMap[_collection_id];
        _owner = collection.owner;
        _name = collection.name;
        _draw_limit = collection.draw_limit;
        _start_time = collection.start_time;
        _end_time = collection.end_time;
        _total_quantity = collection.total_quantity;
        _drawn_quantity = collection.drawn_quantity;
        _claimed_quantity = collection.claimed_quantity;
        _nft_list = collection.nft_list;
        _payment_list = collection.payment_list;
    }

    /**
     * @dev draw NFT(s) from a collection
     *
     * Requirements:
     *
     * - `_collection_id` collection id.
     * - `_number_of_nft` number of NFT(s) players want to buy.
     * - `_payment_token_index` payment option.
     *
     * Returns:
     *
     * Emits {NFTDrawn} events.
     */
    function drawNFT(
        uint256 _collection_id,
        uint8 _number_of_nft,
        uint8 _payment_token_index
    )
        external
        payable
    {
        NFTCollection storage collection = collectionMap[_collection_id];
        require(collection.owner != address(0), "invalid collection");
        require(_payment_token_index < collection.payment_list.length, "invalid payment token");
        require (collection.start_time < block.timestamp, "not started");
        require (collection.end_time > block.timestamp, "expired");

        uint32 bought_number = collection.quantity_by_addr[msg.sender];
        require((bought_number + _number_of_nft) <= collection.draw_limit, "exceeds personal limit");
        require((collection.drawn_quantity + _number_of_nft) <= collection.total_quantity, "exceeds total limit");
        {
            uint256 total = collection.payment_list[_payment_token_index].price;
            total = total.mul(_number_of_nft);
            address token_address = collection.payment_list[_payment_token_index].token_addr;
            if (token_address == address(0)) {
                require(msg.value >= total.add(fee), "not enought ETH");
            }
            else {
                require(msg.value >= fee, "not enought Fee");
                IERC20(token_address).safeTransferFrom(_msgSender(), address(this), total);
            }
            collection.payment_list[_payment_token_index].receivable_amount += total;
        }
        {
            bytes32 request_id = _requestNFT(_collection_id, _msgSender(), _number_of_nft);
            collection.quantity_by_addr[msg.sender] = bought_number  + _number_of_nft;
            collection.drawn_quantity = collection.drawn_quantity + _number_of_nft;
            emit NFTDrawn(_msgSender(), request_id);
        }
    }

    /**
     * @dev claim payment
     *
     * Requirements:
     *
     * - `_collection_ids` list of NFT collection id.
     *   The contract caller must own these assets, otherwise, the transaction will revert.
     *
     * Returns:
     *
     * Emits {ClaimPayment} events.
     */
    function claimPayment(uint256[] calldata _collection_ids) external {
        for (uint256 asset_index = 0; asset_index < _collection_ids.length; asset_index++) {
            NFTCollection storage collection = collectionMap[_collection_ids[asset_index]];
            require(collection.owner == _msgSender(), "not owner");
            for (uint256 token_index = 0; token_index < collection.payment_list.length; token_index++) {
                address token_address = collection.payment_list[token_index].token_addr;
                uint256 amount = collection.payment_list[token_index].receivable_amount;
                if (amount == 0) {
                    continue;
                }
                collection.payment_list[token_index].receivable_amount = 0;
                if (token_address == address(0)) {
                    address payable addr = payable(_msgSender());
                    addr.transfer(amount);
                }
                else {
                    IERC20(token_address).safeTransfer(_msgSender(), amount);
                }
                emit ClaimPayment(_msgSender(), _collection_ids[asset_index], token_address, amount, block.timestamp);
            }
        }
    }

    /**
     * @dev claim all NFT(s)
     *
     * Requirements:
     *
     * - All NFT(s) must be ready to claim, otherwise, transactions would revert.
     *
     * Returns:
     *
     * Emits {Transfer} events.
     *
     * Potential issue:
     *
     * If an user `buys` lots of NFT(s), `claimNFT()` might reach block gas limit.
     * We can implement `claimNFT(bytes32 requestId)` to claim a `requestId` specific NFT.
     */
    function claimNFT() external {
        uint256 toBeClaimed = claimMap[_msgSender()].length;
        if (toBeClaimed == 0) {
            return;
        }
        for (uint256 index = 0; index < toBeClaimed; index++)  {
            bytes32 requestId = claimMap[_msgSender()][index];
            DrawInfo memory draw = drawInfoMap[requestId];
            require(draw.owner == _msgSender(), "not owner");
            require(draw.collection_id != 0, "invalid draw record");
            require(draw.rand != 0, "invalid random number");
            _mintRandomNFT(draw.collection_id, draw.owner, draw.number_of_nft, draw.rand);
            drawInfoMap[requestId] = DrawInfo(0, 0, address(0), 0);
        }
        delete claimMap[_msgSender()];
    }

    /**
     * @dev NFT can only be claimed if the `random number` has been fulfilled by the `Chainlink VRF`.
     *      Check if a player's NFT(s) are ready to claim
     *
     * Requirements:
     *
     * - `_user_addr` the player's address
     *
     * Returns:
     *
     * Emits {ClaimPayment} events.
     */
    function isReadyToClaim(address _user_addr) external view returns(bool) {
        uint256 toBeClaimed = claimMap[_user_addr].length;
        if (toBeClaimed == 0) {
            return true;
        }
        for (uint256 index = 0; index < toBeClaimed; index++)  {
            bytes32 requestId = claimMap[_user_addr][index];
            DrawInfo memory draw = drawInfoMap[requestId];
            if (draw.rand == 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev get players' purchase history.
     *
     * Requirements:
     *
     * - `_user_addr` the player's address
     *
     * Returns:
     *
     * `_history` A list which contains all assets the user purchased
     */
    function getPurchaseHistory(address _user_addr) external view returns(uint256[] memory _history) {
        _history = purchaseHistory[_user_addr];
    }

    // draw NFT from a collection
    // TODO: prevent calling from a contract? Address::isContract()
    function _requestNFT(
        uint256 _collection_id,
        address _recipient,
        uint8 _number_of_nft
    )
        internal
        returns(bytes32)
    {
        if (address(linkAccessor) != address(0)) {
            // ChainLink VRF considerations/limitations:
            // https://docs.chain.link/docs/vrf-security-considerations/
            // TODO: link token management
            bytes32 requestId = linkAccessor.getRandomNumber();
            drawInfoMap[requestId] = DrawInfo(_collection_id, 0, _recipient, _number_of_nft);
            claimMap[_recipient].push(requestId);
            return requestId;
        } else {
            // ChainLink Accessor not available, using local random number
            uint256 rand = _getLocalRandomness();
            _mintRandomNFT(_collection_id, _recipient, _number_of_nft, rand);
            return 0;
        }
    }

    function _getLocalRandomness() internal view returns(uint256) {
        bytes32 sha = keccak256(abi.encodePacked(block.number,
                                                _msgSender(),
                                                block.coinbase,
                                                block.difficulty,
                                                block.timestamp
                                                )
                                );
        return uint256(sha);
    }

    // https://docs.chain.link/docs/get-a-random-number/
    // Max gas: 200K gwei
    // Hence, we can not do anything else, otherwise it will revert.
    function fulfillRandomness(
        bytes32 _requestId,
        uint256 _rand
    )
        external
    {
        require(_msgSender() == address(linkAccessor), "Only linkAccessor can call");
        DrawInfo storage draw = drawInfoMap[_requestId];
        require(draw.collection_id != 0, "invalid draw record");
        require(draw.rand == 0, "invalid draw record");
        draw.rand = _rand;
    }

    /**
     * @dev Mint a random NFT from a collection(`_collection_id`).
     * Return NFT id.
     */
    function _mintRandomNFT(
        uint256 _collection_id,
        address _recipient,
        uint8 _number_of_nft,
        uint256 _rand
    )
        private
    {
        NFTCollection storage collection = collectionMap[_collection_id];
        NFTInfo[] memory nft_list = collection.nft_list;
        for (uint256 i = 0; i < _number_of_nft; i++) {
            _rand = uint256(keccak256(abi.encode(_rand, i)));
            uint256 nft_index = _pickNFT(nft_list, _rand);
            uint256 nft_id = nft_list[nft_index].latest_nft_id;
            nft_id++;
            mysteryBoxNFT.mintNFT(nft_id, "", _recipient);
            purchaseHistory[_recipient].push(nft_id);
            // update storage
            collection.nft_list[nft_index].sold++;
            collection.nft_list[nft_index].latest_nft_id = nft_id;
            // update memory as well
            nft_list[nft_index].sold++;
            nft_list[nft_index].latest_nft_id = nft_id;
        }
        collection.claimed_quantity = collection.claimed_quantity + _number_of_nft;
    }

    struct DistributionTable {
        uint8 nft_index;
        uint8 start_percentage;
    }

    /**
     * @dev Pick a random NFT from a collection(`_collection_id`).
     * Return NFT index id.
     */
    function _pickNFT(
        NFTInfo[] memory nft_list,
        uint256 rand
    )
        private
        pure
        returns(uint256)
    {
        uint8 combined_percentage = 0;
        uint256 available_index = 0;
        DistributionTable[] memory table = new DistributionTable[](nft_list.length);
        for (uint8 index = 0; index < nft_list.length; index++) {
            if (nft_list[index].sold >= nft_list[index].total) {
                // sold out
                continue;
            }
            table[available_index] = DistributionTable(index, combined_percentage);
            available_index++;
            combined_percentage = combined_percentage + nft_list[index].percentage;
        }
        // Generate a random number from (0 ~ combined_percentage)
        // If 
        rand = rand % combined_percentage;
        uint256 nft_index = 0;
        for (nft_index = 0; nft_index < available_index; nft_index++) {
            uint256 current_percentage = nft_list[nft_index].percentage;
            uint256 start_percentage = table[nft_index].start_percentage;
            if ((rand >= start_percentage) && (rand < (start_percentage + current_percentage))) {
                break;
            }
        }
        // should never happen
        require(table[nft_index].nft_index < nft_list.length, "invalid NFT index");
        return table[nft_index].nft_index;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
