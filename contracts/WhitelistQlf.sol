// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// whilte list qualification
contract WhitelistQlf is OwnableUpgradeable {
    uint32 public version;
    mapping(address => bool) public white_list;

    function initialize() public initializer
    {
        __Ownable_init();
        version = 1;
    }

    function add_white_list(address[] memory addrs) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            white_list[addrs[i]] = true;
        }
    }

    function remove_white_list(address[] memory addrs) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            white_list[addrs[i]] = false;
        }
    }

    function is_qualified(address account, bytes memory)
        virtual
        external
        view
        returns
        (
            bool qualified,
            string memory error_msg
        )
    {
        if (!white_list[account]) {
            return (false, "not whitelisted");
        }
        return (true, "");
    }
}
