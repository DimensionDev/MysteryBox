// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract MaskNonEnumerableNFT is ERC721Upgradeable, OwnableUpgradeable {
    uint256 private id;

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseURI_
    ) public initializer {
        __ERC721_init(_name, _symbol);
        __Ownable_init();
    }

    function mint(uint256 number) external {
        for (uint256 i = 0; i < number; i++) {
            _safeMint(msg.sender, id);
            id++;
        }
    }
}
