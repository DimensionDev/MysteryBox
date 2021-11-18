// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract MaskHolderQlf is OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint32 public version;
    address public token_addr;
    uint256 public min_balance;

    function initialize(
        address addr,
        uint256 balance
    ) public initializer
    {
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
        virtual
        external
        view
        returns
        (
            bool qualified,
            string memory error_msg
        )
    {
        uint256 balance = IERC20(token_addr).balanceOf(account);
        if (balance < min_balance) {
            return (false, "not holding enough token");
        }
        return (true, "");
    }
}
