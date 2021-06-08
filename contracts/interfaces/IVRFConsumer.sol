// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

interface IVRFConsumer {
    function rawFulfillRandomness(
        bytes32 requestId,
        uint256 randomness
    )
    external;
}
