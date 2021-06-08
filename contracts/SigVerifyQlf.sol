// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// whilte list qualification
contract SigVerifyQlf is OwnableUpgradeable {
    uint32 public version;
    address public verifier;
    string public project;

    function initialize(string memory _project, address _verifier) public initializer
    {
        __Ownable_init();
        version = 2;
        project = _project;
        verifier = _verifier;
    }

    function set_verifier(address _verifier) external onlyOwner {
        verifier = _verifier;
    }

    function set_project(string memory _project) external onlyOwner {
        project = _project;
    }

    function is_qualified(address account, bytes memory signature)
        virtual
        external
        view
        returns
        (
            bool qualified,
            string memory error_msg
        )
    {
        bytes32 msg_hash = keccak256(abi.encodePacked(project, account));
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixed_hash = keccak256(abi.encodePacked(prefix, msg_hash));
        address calculated_verifier = ECDSA.recover(prefixed_hash, signature);
        if (calculated_verifier != verifier) {
            return (false, "not qualified");
        }
        return (true, "");
    }
}
