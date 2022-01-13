// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// whilte list qualification
contract SigVerifyQlf {
    uint32 constant public version = 4;

    constructor() {
    }

    function is_qualified(address account, bytes memory proof)
        virtual
        external
        view
        returns
        (
            bool qualified,
            string memory error_msg
        )
    {
        bytes32 verifier_bytes32;
        (proof, verifier_bytes32) = abi.decode(proof, (bytes, bytes32));
        address verifier = address(uint160(uint256(verifier_bytes32)));

        bytes32 msg_hash = keccak256(abi.encodePacked(account));
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixed_hash = keccak256(abi.encodePacked(prefix, msg_hash));
        // `proof` now is signature
        address calculated_verifier = ECDSA.recover(prefixed_hash, proof);
        if (calculated_verifier != verifier) {
            return (false, "not qualified");
        }
        return (true, "");
    }
}
