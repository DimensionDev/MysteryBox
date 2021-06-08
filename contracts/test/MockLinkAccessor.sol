// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import '../LinkAccessor.sol';

contract MockLinkAccessor is LinkAccessorBase {
    bytes32 public requestId;
    uint256 public randomNumber;

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

    function fulfillRandomness(
        bytes32 _requestId,
        uint256 _randomness
    )
        internal
        override
    {
        // console.log("fulfillRandomness()");
        randomNumber = _randomness;
        super.fulfillRandomness(_requestId, _randomness);
    }

    function getRandomNumber() external returns (bytes32 _requestId) {
        requestId = super._getRandomNumber();
        return requestId;
    }
}
