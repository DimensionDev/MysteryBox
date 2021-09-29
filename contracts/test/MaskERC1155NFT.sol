// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

contract MaskERC1155NFT is ERC1155Upgradeable, OwnableUpgradeable {
    string public name;
    string public symbol;

    // index ==> resource URI
    mapping(uint256 => string) private resource_list;

    // id ==> resource index
    mapping(uint256 => uint256) private index_by_id;

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseURI
    )
        public
        initializer
    {
        __ERC1155_init(_baseURI);
        __Ownable_init();
        name = _name;
        symbol = _symbol;
    }

    function mint(uint256 id, uint256 amount) external {
        _mint(msg.sender, id, amount, "");
    }

    function mint_other_types(uint256 id, uint256 amount, uint256 resource_index) external {
        _mint(msg.sender, id, amount, "");
        index_by_id[id] = resource_index;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        uint256 index = index_by_id[tokenId];
        string memory customized_uri = resource_list[index];
        bytes memory uri_length = bytes(customized_uri);
        if (uri_length.length == 0) {
            return super.uri(tokenId);
        }
        return customized_uri;
    }

    function set_resource(uint256 index, string memory resource) external onlyOwner {
        resource_list[index] = resource;
    }
}
