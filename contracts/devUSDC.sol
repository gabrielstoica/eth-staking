// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract devUSDC is ERC20 {
    address public owner;

    constructor(uint256 initialSupply) ERC20("devUSDC", "dUSDC") {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }
}
