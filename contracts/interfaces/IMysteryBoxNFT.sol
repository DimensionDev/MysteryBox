// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

interface IMysteryBoxNFT {
    function mintNFT(uint256 _nftId, string memory _tokenURI, address recipient) external;
}
