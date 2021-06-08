// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestTokenC is ERC20 {
    constructor(uint initialSupply) ERC20("TestTokenC", "TESTC") {
        _mint(msg.sender, initialSupply);
    }
}
