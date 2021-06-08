// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

interface ILinkAccessor {
    function getRandomNumber() external returns (bytes32 requestId);
}
