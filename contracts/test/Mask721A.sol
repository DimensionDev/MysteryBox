// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ERC721A.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Mask721A is Ownable, ERC721A {
    using Strings for uint256;
    string baseURI;
    uint256 public constant BATCH_SIZE = 10;
    uint256 public constant MAX_SUPPLY = 1000000;

    constructor(
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC721A(name, symbol, BATCH_SIZE, MAX_SUPPLY) {
        baseURI = uri;
    }

    function mint(uint256 amount) external {
        _safeMint(msg.sender, amount);
    }

    function setBaseURI(string memory _baseURI_) external onlyOwner {
        baseURI = _baseURI_;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        if (_exists(tokenId)) {
            return
                string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
        }

        return "unknown.json";
    }
}
