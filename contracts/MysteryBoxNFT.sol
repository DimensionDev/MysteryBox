// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MysteryBoxNFT is ERC721URIStorage, Ownable {
    mapping(address => bool) public admin;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    /**
     * @dev mint an NFT.
     *
     */
    function mintNFT(
        uint256 _nftId,
        string memory _tokenURI,
        address recipient
    ) external onlyAdmin {
        _safeMint(recipient, _nftId);
        _setTokenURI(_nftId, _tokenURI);
    }

    /**
     * @dev Throws if called by any account other than an admin.
     */
    // Using https://docs.openzeppelin.com/contracts/3.x/access-control?
    modifier onlyAdmin() {
        require(admin[msg.sender], "caller is not an admin");
        _;
    }

    function addAdmin(address _admin) external onlyOwner {
        admin[_admin] = true;
    }

    function revokeAdmin(address _admin) external onlyOwner {
        admin[_admin] = false;
    }
}
