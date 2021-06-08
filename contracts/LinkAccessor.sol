// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./interfaces/IMysteryBox.sol";
import "hardhat/console.sol";

contract LinkAccessorBase is VRFConsumerBase, Ownable {
    using SafeERC20 for IERC20;

    bytes32 public keyHash;
    uint256 public fee;
    IMysteryBox public mysteryBox;
    IUniswapV2Router02 public uniswapRouter;
    address[] public uniswapPath;

    constructor(
        address _vrfCoordinator,
        address _link,
        bytes32 _linkKeyHash,
        uint256 _fee,
        address _mysteryBox,
        address _uniswapRouterAddr
    ) VRFConsumerBase(_vrfCoordinator, _link) {
        keyHash = _linkKeyHash;
        fee = _fee;
        mysteryBox = IMysteryBox(_mysteryBox);
        uniswapRouter = IUniswapV2Router02(_uniswapRouterAddr);
        // by default, ETH -> $LINK
        uniswapPath.push(uniswapRouter.WETH());
        uniswapPath.push(_link);
    }

    function _getRandomNumber() internal returns (bytes32 _requestId) {
        require(msg.sender == address(mysteryBox), "Only MysteryBox can call");
        // require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        return requestRandomness(keyHash, fee);
    }

    function fulfillRandomness(
        bytes32 _requestId,
        uint256 _randomness
    )
        internal
        override
        virtual
    {
        // console.log("LinkAccessor::fulfillRandomness()");
        if (mysteryBox != IMysteryBox(address(0))) {
            mysteryBox.fulfillRandomness(_requestId, _randomness);
        }
    }

    // manager can `fulfillRandomness`, in case `Chainlink VRF service` not working
    function sendRandomNumber(
        bytes32 _requestId,
        uint256 _randomness
    )
        external
        onlyOwner
    {
        fulfillRandomness(_requestId, _randomness);
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    function setMysteryBox(address _mysteryBox) external onlyOwner {
        mysteryBox = IMysteryBox(_mysteryBox);
    }

    // This contract only manages fees for `Chainlink VRF service`.
    // And this API is added for maintainance, not a backdoor.
    function transfer(address _tokenAddr) external onlyOwner {
        // ETH or $LINK token
        if (_tokenAddr == address(0)) {
            address payable addr = payable(msg.sender);
            addr.transfer(address(this).balance);
        }
        else {
            uint256 balance = IERC20(_tokenAddr).balanceOf(address(this));
            IERC20(_tokenAddr).transfer(msg.sender, balance);
        }
    }
}

contract LinkAccessor is LinkAccessorBase {
    constructor(
        address _vrfCoordinator,
        address _link,
        bytes32 _linkKeyHash,
        uint256 _fee,
        address _mysteryBox,
        address _uniswapRouterAddr
    )
        LinkAccessorBase(
            _vrfCoordinator,
            _link,
            _linkKeyHash,
            _fee,
            _mysteryBox,
            _uniswapRouterAddr
        )
    {
    }

    // This API can receive some `ether`
    function getRandomNumber() external payable returns (bytes32 _requestId) {
        if (LINK.balanceOf(address(this)) < fee) {
            // LINK balance is not enough, try buying
            swapLinkToken();
        }
        require(LINK.balanceOf(address(this)) >= fee, "not enough $LINK");
        return super._getRandomNumber();
    }

    function swapLinkToken() internal {
        uint deadline = block.timestamp + 15;
        uniswapRouter.swapExactETHForTokens{ value: address(this).balance }(
            uint(0),
            uniswapPath,
            address(this),
            deadline
        );
    }
}
