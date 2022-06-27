// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// merkle proof qualification
contract MerkleProofQlf {
    uint32 public constant version = 4;

    constructor() {}

    function is_qualified(address account, bytes memory proof)
        external
        view
        virtual
        returns (bool qualified, string memory error_msg)
    {
        bytes32[] memory _proof;
        bytes32 merkle_root;
        (proof, merkle_root) = abi.decode(proof, (bytes, bytes32));
        // solhint-disable-next-line
        (_proof) = abi.decode(proof, (bytes32[]));
        // validate whitelist user
        bytes32 leaf = keccak256(abi.encodePacked(account));
        if (MerkleProof.verify(_proof, merkle_root, leaf)) {
            return (true, "");
        }
        return (false, "not qualified");
    }
}
