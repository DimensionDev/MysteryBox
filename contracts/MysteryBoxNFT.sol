// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MysteryBoxNFT is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    string baseURI;
    mapping(address => bool) public admin;
    // Token name
    string internal ext_name;

    // Token symbol
    string internal ext_symbol;

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
        ext_name = _name;
        ext_symbol = _symbol;
        baseURI = _baseURI_;
    }

    function _baseURI() internal view override virtual returns (string memory) {
        return baseURI;
    }

    function name() public view virtual override returns (string memory) {
        return ext_name;
    }

    function symbol() public view virtual override returns (string memory) {
        return ext_symbol;
    }

    /**
     * @dev mint an NFT.
     *
     */
    function mintNFT(
        uint256 _nftId,
        address recipient
    ) external onlyAdmin {
        _safeMint(recipient, _nftId);
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

    function setName(string memory _name) external onlyOwner {
        ext_name = _name;
    }

    function setSymbol(string memory _symbol) external onlyOwner {
        ext_symbol = _symbol;
    }
}
