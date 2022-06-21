// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// whitelist qualification
contract WhitelistQlf is OwnableUpgradeable {
    uint32 public version;
    mapping(address => bool) public white_list;
    mapping(address => bool) public admin;

    function initialize() public initializer {
        __Ownable_init();
        version = 1;
    }

    function addAdmin(address[] memory addrs) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            admin[addrs[i]] = true;
        }
    }

    function addWhitelist(address[] memory addrs) external {
        require(admin[msg.sender] || msg.sender == owner(), "not admin");
        for (uint256 i = 0; i < addrs.length; i++) {
            white_list[addrs[i]] = true;
        }
    }

    function removeWhitelist(address[] memory addrs) external {
        require(admin[msg.sender] || msg.sender == owner(), "not admin");
        for (uint256 i = 0; i < addrs.length; i++) {
            white_list[addrs[i]] = false;
        }
    }

    function is_qualified(address account, bytes memory)
        external
        view
        virtual
        returns (bool qualified, string memory error_msg)
    {
        if (white_list[account] || admin[account]) {
            return (true, "");
        }
        return (false, "not whitelisted");
    }
}
