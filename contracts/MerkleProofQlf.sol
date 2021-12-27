// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

import "./interfaces/IQLF.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// merkel proof qualification
contract MerkleProofQlf is OwnableUpgradeable {
    uint32 public version;
    bytes32 merkle_root;

    function initialize(bytes32 _merkle_root) public initializer
    {
        __Ownable_init();
        version = 3;
        merkle_root = _merkle_root;
    }

    function set_merkle_root(bytes32 _merkle_root) external onlyOwner {
        merkle_root = _merkle_root;
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
        (index, _proof) = abi.decode(proof, (uint256, bytes32[]));
        // validate whitelist user
        bytes32 leaf = keccak256(abi.encodePacked(index, account));
        if (MerkleProof.verify(_proof, merkle_root, leaf)) {
            return (true, "");
        }
        return (false, "not qualified");
    }
}
