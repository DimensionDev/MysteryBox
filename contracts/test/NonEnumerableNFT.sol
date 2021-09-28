//SPDX-License-Identifier: MIT

pragma solidity >0.4.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NonEnumerableNFT is ERC721 {
    constructor(uint initialSupply) ERC721("TestToken_721", "TEST") public{
        for (uint i=0; i<initialSupply; i++) {
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