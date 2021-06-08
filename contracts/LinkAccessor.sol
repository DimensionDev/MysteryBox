// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "./interfaces/IMysteryBox.sol";
import "hardhat/console.sol";

contract LinkAccessorBase is VRFConsumerBase, Ownable {
    bytes32 public keyHash;
    uint256 public fee;
    IMysteryBox public mysteryBox;

    constructor(
        address _vrfCoordinator,
        address _link,
        bytes32 _linkKeyHash,
        uint256 _fee,
        address _mysteryBox
    ) VRFConsumerBase(_vrfCoordinator, _link) {
        keyHash = _linkKeyHash;
        fee = _fee;
        mysteryBox = IMysteryBox(_mysteryBox);
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

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    function setMysteryBox(address _mysteryBox) external onlyOwner {
        mysteryBox = IMysteryBox(_mysteryBox);
    }
}

contract LinkAccessor is LinkAccessorBase {
    constructor(
        address _vrfCoordinator,
        address _link,
        bytes32 _linkKeyHash,
        uint256 _fee,
        address _mysteryBox
    )
        LinkAccessorBase(
            _vrfCoordinator,
            _link,
            _linkKeyHash,
            _fee,
            _mysteryBox
        )
    {
    }

    function getRandomNumber() external returns (bytes32 _requestId) {
        return super._getRandomNumber();
    }
}
