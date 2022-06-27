//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NonEnumerableNFT is ERC721 {
    constructor(uint256 initialSupply) ERC721("TestToken_721", "TEST") {
        for (uint256 i = 0; i < initialSupply; i++) {
            _mint(msg.sender, i);
        }
    }

    /*
    function mint(uint256 number) external {
        for (uint256 i = 0; i < number; i++) {
            _safeMint(msg.sender, totalSupply());
        }
    }
    */
}
