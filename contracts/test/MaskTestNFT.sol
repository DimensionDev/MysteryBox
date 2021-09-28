// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

contract MaskTestNFT is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    string private baseURI;

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseURI_
    )
        public
        initializer
    {
        __ERC721_init(_name, _symbol);
        __ERC721Enumerable_init();
        __Ownable_init();
        baseURI = _baseURI_;
    }

    function mint(uint256 number) external {
        for (uint256 i = 0; i < number; i++) {
            _safeMint(msg.sender, totalSupply());
        }
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return baseURI;
        /*
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, StringsUpgradeable.toString(tokenId), ".json"));
        }
        else {
            return "";
        }
        */
    }
}
