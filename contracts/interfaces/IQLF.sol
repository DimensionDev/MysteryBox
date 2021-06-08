// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.0;

abstract
contract IQLF {
    function version() virtual external view returns (uint32);

    /**
     * @dev Check if the given address is qualified, implemented on demand.
     *
     * Requirements:
     *
     * - `account` account to be checked
     * - `data`  data to prove if a user is qualified.
     *           For instance, it can be a MerkelProof to prove if a user is in a whitelist
     *
     * Return:
     *
     * - `bool` whether the account is qualified for ITO
     * - `string` if not qualified, it contains the error message(reason)
     */
    function is_qualified(address account, bytes memory proof) virtual external view returns (bool, string memory);
}
