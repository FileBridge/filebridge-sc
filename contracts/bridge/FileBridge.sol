// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./NodeManager.sol";

error NOT_SUPPORTED_TOKEN();
error TOKEN_EXIST();
error TOKEN_DOESNT_EXIST();

// NODE MAGAER ERRORS
error OWNER_ADDRESS_ZERO();
error WRONGE_SIG();

contract FileBridge is
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    NodeManagement,
    EIP712
{
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC20Mintable;

    mapping(address => uint256) private fees;
    mapping(address => address) public tokenToWTokenMap;

    bytes32 private constant _REDEEM_TOKEN_TYPEHASH =
        keccak256(
            "redeemToken(address to,uint256 chainId,address token,uint256 amount)"
        );
    uint256 public constant bridgeVersion = 1;
    uint256 public startBlockNumber;
    address payable public WFIL_ADDRESS;

    // Flags execution of contract initialization.
    bool internal isInitialized;

    receive() external payable {}

    constructor() EIP712("FileBridge", "1") {}

    function initialize(
        address _owner,
        address[] memory _members,
        uint256 _honestThreshold
    ) external initializer {
        startBlockNumber = block.number;
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(GOVERNANCE_ROLE, _owner);
        __AccessControl_init();
        // NODE MANAGER
        if (_owner == address(0)) revert OWNER_ADDRESS_ZERO();
        for (uint8 i = 0; i < _members.length; i++) {
            _setupRole(GUARDIAN_ROLE, _members[i]);
        }
        acceptebleThreshold = _honestThreshold;
        __AccessControl_init();

        status = Status.Active;
        isInitialized = true;
    }

    function setWethAddress(
        address payable _wethAddress
    ) external onlyRole(GOVERNANCE_ROLE) {
        WFIL_ADDRESS = _wethAddress;
    }

    event TokenAddedToList(address _token, address _WToken);

    event TokenRemovedFromList(address _token);

    event TokenChangedInList(
        address _token,
        address _WTokenOld,
        address _WTokenNew
    );

    event TokenDeposit(
        address indexed to,
        uint256 chainId,
        IERC20 token,
        uint256 amount
    );
    event TokenRedeem(
        address indexed to,
        uint256 chainId,
        IERC20 token,
        uint256 amount
    );

    // VIEW FUNCTIONS ***/
    function getFeeBalance(
        address tokenAddress
    ) external view returns (uint256) {
        return fees[tokenAddress];
    }

    function redeemTokenHashGenerator(
        address to,
        uint256 chainId,
        IERC20 token,
        uint256 amount
    ) external view returns (bytes32 hash) {
        bytes32 structHash = keccak256(
            abi.encode(
                _REDEEM_TOKEN_TYPEHASH,
                to,
                chainId,
                address(token),
                amount
            )
        );

        hash = _hashTypedDataV4(structHash);
    }

    // ADD WRAPPED TOKEN FUNCTION ***/
    /**
     * * @notice add the token to list of acceptable token for brdige
     * * @param _token ERC20 token
     * * @param _fToken Wrapped ERC20 token
     */

    function addWToken(
        address _token,
        address _fToken
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (tokenToWTokenMap[_token] != address(0)) revert TOKEN_EXIST();
        tokenToWTokenMap[_token] = _fToken;
        emit TokenAddedToList(_token, _fToken);
    }

    // ADD WRAPPED TOKEN FUNCTION ***/
    /**
     * * @notice remove the token from list of acceptable token for brdige
     * * @param _token ERC20 token
     */

    function removeWToken(address _token) external onlyRole(GOVERNANCE_ROLE) {
        if (tokenToWTokenMap[_token] == address(0)) revert TOKEN_DOESNT_EXIST();
        tokenToWTokenMap[_token] = address(0);
        emit TokenRemovedFromList(_token);
    }

    // ADD WRAPPED TOKEN FUNCTION ***/
    /**
     * * @notice change the token in list of acceptable token for brdige
     * * @param _token ERC20 token
     * * @param _fToken Wrapped ERC20 token
     */

    function changeWToken(
        address _token,
        address _fToken
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (tokenToWTokenMap[_token] == address(0)) revert TOKEN_DOESNT_EXIST();
        emit TokenChangedInList(_token, tokenToWTokenMap[_token], _fToken);
        tokenToWTokenMap[_token] = _fToken;
    }

    // FEE FUNCTIONS ***/
    /**
     * * @notice withdraw specified ERC20 token fees to a given address
     * * @param token ERC20 token in which fees acccumulated to transfer
     * * @param to Address to send the fees to
     */
    function withdrawFees(
        IERC20 token,
        address to
    ) external whenNotPaused onlyRole(GOVERNANCE_ROLE) {
        require(to != address(0), "Address is 0x000");
        if (fees[address(token)] != 0) {
            token.safeTransfer(to, fees[address(token)]);
            fees[address(token)] = 0;
        }
    }

    // PAUSABLE FUNCTIONS ***/
    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }

    /**
     * @notice Relays to nodes to transfers an ERC20 token cross-chain
     * @param to address on other chain to bridge assets to
     * @param chainId which chain to bridge assets onto
     * @param token ERC20 compatible token to deposit into the bridge
     * @param amount Amount in native token decimals to transfer cross-chain pre-fees
     **/
    function depositToken(
        address to,
        uint256 chainId,
        IERC20 token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        IFToken fToken = IFToken(tokenToWTokenMap[address(token)]);
        if (address(fToken) == address(0)) revert NOT_SUPPORTED_TOKEN();

        emit TokenDeposit(to, chainId, token, amount);
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.approve(address(fToken), amount);
        fToken.deposit(amount);
        fToken.burn(amount);
    }

    /**
     * @notice Relays to nodes that (typically) a wrapped synAsset ERC20 token has been burned and the underlying needs to be redeeemed on the native chain
     * @param to address on other chain to redeem underlying assets to
     * @param chainId which underlying chain to bridge assets onto
     * @param token ERC20 compatible token to deposit into the bridge
     * @param amount Amount in native token decimals to transfer cross-chain pre-fees
     **/
    function redeemToken(
        address to,
        uint256 chainId,
        IERC20 token,
        uint256 amount,
        bytes32 r,
        bytes32 vs
    ) external nonReentrant whenNotPaused {
        bytes32 structHash = keccak256(
            abi.encode(
                _REDEEM_TOKEN_TYPEHASH,
                to,
                chainId,
                address(token),
                amount
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, r, vs);

        if (!hasRole(GOVERNANCE_ROLE, signer)) revert WRONGE_SIG();

        _redeemToken(to, chainId, token, amount);
    }

    function _redeemToken(
        address to,
        uint256 chainId,
        IERC20 token,
        uint256 amount
    ) private {
        IFToken fToken = IFToken(tokenToWTokenMap[address(token)]);
        emit TokenRedeem(to, chainId, token, amount);

        fToken.mint(address(this), amount);
        fToken.withdraw(amount);
        token.transfer(to, amount);
    }
}

interface IWETH9 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    receive() external payable;

    function deposit() external payable;

    function withdraw(uint256 wad) external;

    function totalSupply() external view returns (uint256);

    function approve(address guy, uint256 wad) external returns (bool);

    function transfer(address dst, uint256 wad) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 wad
    ) external returns (bool);
}

interface IERC20Mintable is IERC20 {
    function mint(address to, uint256 amount) external;
}

interface IFToken {
    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function burn(uint256 amount) external;

    function mint(address to, uint256 amount) external;
}
