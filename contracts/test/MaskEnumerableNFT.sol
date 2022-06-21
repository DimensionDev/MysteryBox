// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

contract MaskEnumerableNFT is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    string private baseURI;

    // index ==> resource URI
    mapping(uint256 => string) private resource_list;
    // id ==> resource index
    mapping(uint256 => uint256) private index_by_id;

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseURI_
    ) public initializer {
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

    function mint_other_types(uint256 number, uint256 resource_index) external {
        for (uint256 i = 0; i < number; i++) {
            uint256 id = totalSupply();
            _safeMint(msg.sender, id);
            index_by_id[id] = resource_index;
        }
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        uint256 index = index_by_id[tokenId];
        string memory uri = resource_list[index];
        bytes memory uri_length = bytes(uri);
        if (uri_length.length == 0) {
            return baseURI;
        }
        return uri;
    }

    function set_resource(uint256 index, string memory resource)
        external
        onlyOwner
    {
        resource_list[index] = resource;
    }
}
