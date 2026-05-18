// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract UnifiedCommsToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public immutable maxSupply;

    event RewardMinted(address indexed to, uint256 amount, string reason);
    event TokenRedeemed(address indexed from, uint256 amount, string featureCode);

    constructor(address admin, uint256 initialSupply, uint256 maxSupply_) ERC20("Unified Comms Token", "UCT") {
        require(admin != address(0), "Admin cannot be zero address");
        require(maxSupply_ > 0, "Max supply must be greater than zero");
        require(initialSupply <= maxSupply_, "Initial supply exceeds max supply");

        maxSupply = maxSupply_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    function mintReward(address to, uint256 amount, string memory reason) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Recipient cannot be zero address");
        require(totalSupply() + amount <= maxSupply, "Max supply exceeded");

        _mint(to, amount);

        emit RewardMinted(to, amount, reason);
    }

    function redeem(uint256 amount, string memory featureCode) external {
        require(amount > 0, "Amount must be greater than zero");

        _burn(msg.sender, amount);

        emit TokenRedeemed(msg.sender, amount, featureCode);
    }
}