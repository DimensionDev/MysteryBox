// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// merkel proof qualification
contract MerkleProofQlf {
    uint32 public version;

    constructor() {
        version = 4;
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
        uint256 index;
        bytes32[] memory _proof;
        // solhint-disable-next-line
        bytes32 merkle_root;
        (proof, merkle_root) = abi.decode(proof, (bytes, bytes32));
        (index, _proof) = abi.decode(proof, (uint256, bytes32[]));
        // validate whitelist user
        bytes32 leaf = keccak256(abi.encodePacked(index, account));
        if (MerkleProof.verify(_proof, merkle_root, leaf)) {
            return (true, "");
        }
        return (false, "not qualified");
    }
}
