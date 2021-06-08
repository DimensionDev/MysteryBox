// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../interfaces/IVRFConsumer.sol';

contract MockLinkToken is ERC20 {
    uint256 public constant initialSupply = 10**28;
    address public to;
    uint256 public value;
    address public sender;

    constructor() ERC20('ChainLink Token', 'LINK') {
        _mint(msg.sender, initialSupply);
    }

    function transferAndCall(
        address _to,
        uint256 _value,
        bytes calldata data
    ) external returns (bool) {
        to = _to;
        value = _value;
        sender = msg.sender;
        transfer(_to, _value);
        return true;
    }

}
