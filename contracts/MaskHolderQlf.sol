// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

contract MaskHolderQlf is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint32 public version;
    address public token_addr;
    uint256 public min_balance;

    function initialize(address addr, uint256 balance) public initializer {
        __Ownable_init();
        version = 1;
        token_addr = addr;
        min_balance = balance;
    }

    function set_token_addr(address addr) external onlyOwner {
        token_addr = addr;
    }

    function set_min_balance(uint256 balance) external onlyOwner {
        min_balance = balance;
    }

    function is_qualified(address account, bytes memory)
        external
        view
        virtual
        returns (bool qualified, string memory error_msg)
    {
        uint256 balance = IERC20Upgradeable(token_addr).balanceOf(account);
        if (balance < min_balance) {
            return (false, "not holding enough token");
        }
        return (true, "");
    }
}
