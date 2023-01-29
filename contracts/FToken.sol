// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

error NO_FILE_BRIDGE();

contract FToken is
    ERC20,
    ERC20Burnable,
    Pausable,
    Ownable,
    ERC20Permit,
    ERC20FlashMint
{
    address immutable FILE_BRIDGE;
    address private immutable DAI_TOKEN;

    constructor(
        address _TOKEN_ADDRESS,
        address _FILE_BRIDGE,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        DAI_TOKEN = _TOKEN_ADDRESS;
        FILE_BRIDGE = _FILE_BRIDGE;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function deposit(uint256 amount) public {
        TransferHelper.safeTransferFrom(
            DAI_TOKEN,
            _msgSender(),
            address(this),
            amount
        );
        _mint(_msgSender(), amount);
    }

    function withdraw(uint256 amount) public {
        _burn(_msgSender(), amount);
        TransferHelper.safeTransfer(DAI_TOKEN, _msgSender(), amount);
    }

    function mint(address to, uint256 amount) external {
        if (_msgSender() != FILE_BRIDGE) revert NO_FILE_BRIDGE();
        _mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function getDaiAddress() external view returns (address daiAddress) {
        return DAI_TOKEN;
    }
}
