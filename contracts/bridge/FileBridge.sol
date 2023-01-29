// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error NOT_SUPPORTED_TOKEN();
error TOKEN_EXIST();
error TOKEN_DOESNT_EXIST();

contract FileBridge is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC20Mintable;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    mapping(address => uint256) private fees;
    mapping(address => address) public tokenToWTokenMap;

    uint256 public constant bridgeVersion = 1;
    uint256 public startBlockNumber;
    uint256 public chainGasAmount;
    address payable public WFIL_ADDRESS;
    INodeManagement public GUARDIAN_NODE;

    receive() external payable {}

    function initialize(address _GUARDIAN_NODE) external initializer {
        startBlockNumber = block.number;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(GOVERNANCE_ROLE, msg.sender);
        __AccessControl_init();
        GUARDIAN_NODE = INodeManagement(_GUARDIAN_NODE);
    }

    function setChainGasAmount(
        uint256 amount
    ) external onlyRole(GOVERNANCE_ROLE) {
        chainGasAmount = amount;
    }

    function setWethAddress(
        address payable _wethAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
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
    event TokenWithdraw(
        address indexed to,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes32 indexed kappa
    );
    event TokenMint(
        address indexed to,
        IERC20Mintable token,
        uint256 amount,
        uint256 fee,
        bytes32 indexed kappa
    );
    event TokenDepositAndSwap(
        address indexed to,
        uint256 chainId,
        IERC20 token,
        uint256 amount,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 minDy,
        uint256 deadline
    );
    event TokenMintAndSwap(
        address indexed to,
        IERC20Mintable token,
        uint256 amount,
        uint256 fee,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 minDy,
        uint256 deadline,
        bool swapSuccess,
        bytes32 indexed kappa
    );
    event TokenRedeemAndSwap(
        address indexed to,
        uint256 chainId,
        IERC20 token,
        uint256 amount,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 minDy,
        uint256 deadline
    );
    event TokenRedeemAndRemove(
        address indexed to,
        uint256 chainId,
        IERC20 token,
        uint256 amount,
        uint8 swapTokenIndex,
        uint256 swapMinAmount,
        uint256 swapDeadline
    );
    event TokenWithdrawAndRemove(
        address indexed to,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        uint8 swapTokenIndex,
        uint256 swapMinAmount,
        uint256 swapDeadline,
        bool swapSuccess,
        bytes32 indexed kappa
    );

    // v2 events
    event TokenRedeemV2(
        bytes32 indexed to,
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
        ERC20Burnable token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        emit TokenRedeem(to, chainId, token, amount);
        token.burnFrom(msg.sender, amount);
    }

    // /**
    //  * @notice Function to be called by the node group to withdraw the underlying assets from the contract
    //  * @param to address on chain to send underlying assets to
    //  * @param token ERC20 compatible token to withdraw from the bridge
    //  * @param amount Amount in native token decimals to withdraw
    //  * @param fee Amount in native token decimals to save to the contract as fees
    //  * @param kappa kappa
    //  **/
    // function withdraw(
    //     address to,
    //     IERC20 token,
    //     uint256 amount,
    //     uint256 fee,
    //     bytes32 kappa
    // ) external nonReentrant whenNotPaused {
    //     require(
    //         hasRole(NODEGROUP_ROLE, msg.sender),
    //         "Caller is not a node group"
    //     );
    //     require(amount > fee, "Amount must be greater than fee");
    //     require(!kappaMap[kappa], "Kappa is already present");
    //     kappaMap[kappa] = true;
    //     fees[address(token)] = fees[address(token)].add(fee);
    //     if (address(token) == WFIL_ADDRESS && WFIL_ADDRESS != address(0)) {
    //         IWETH9(WFIL_ADDRESS).withdraw(amount.sub(fee));
    //         (bool success, ) = to.call{value: amount.sub(fee)}("");
    //         require(success, "ETH_TRANSFER_FAILED");
    //         emit TokenWithdraw(to, token, amount, fee, kappa);
    //     } else {
    //         emit TokenWithdraw(to, token, amount, fee, kappa);
    //         token.safeTransfer(to, amount.sub(fee));
    //     }
    // }

    // /**
    //  * @notice Nodes call this function to mint a SynERC20 (or any asset that the bridge is given minter access to). This is called by the nodes after a TokenDeposit event is emitted.
    //  * @dev This means the SynapseBridge.sol contract must have minter access to the token attempting to be minted
    //  * @param to address on other chain to redeem underlying assets to
    //  * @param token ERC20 compatible token to deposit into the bridge
    //  * @param amount Amount in native token decimals to transfer cross-chain post-fees
    //  * @param fee Amount in native token decimals to save to the contract as fees
    //  * @param kappa kappa
    //  **/
    // function mint(
    //     address payable to,
    //     IERC20Mintable token,
    //     uint256 amount,
    //     uint256 fee,
    //     bytes32 kappa
    // ) external nonReentrant whenNotPaused {
    //     require(
    //         hasRole(NODEGROUP_ROLE, msg.sender),
    //         "Caller is not a node group"
    //     );
    //     require(amount > fee, "Amount must be greater than fee");
    //     require(!kappaMap[kappa], "Kappa is already present");
    //     kappaMap[kappa] = true;
    //     fees[address(token)] = fees[address(token)].add(fee);
    //     emit TokenMint(to, token, amount.sub(fee), fee, kappa);
    //     token.mint(address(this), amount);
    //     IERC20(token).safeTransfer(to, amount.sub(fee));
    //     if (chainGasAmount != 0 && address(this).balance > chainGasAmount) {
    //         to.call.value(chainGasAmount)("");
    //     }
    // }

    // /**
    //  * @notice Relays to nodes to both transfer an ERC20 token cross-chain, and then have the nodes execute a swap through a liquidity pool on behalf of the user.
    //  * @param to address on other chain to bridge assets to
    //  * @param chainId which chain to bridge assets onto
    //  * @param token ERC20 compatible token to deposit into the bridge
    //  * @param amount Amount in native token decimals to transfer cross-chain pre-fees
    //  * @param tokenIndexFrom the token the user wants to swap from
    //  * @param tokenIndexTo the token the user wants to swap to
    //  * @param minDy the min amount the user would like to receive, or revert to only minting the SynERC20 token crosschain.
    //  * @param deadline latest timestamp to accept this transaction
    //  **/
    // function depositAndSwap(
    //     address to,
    //     uint256 chainId,
    //     IERC20 token,
    //     uint256 amount,
    //     uint8 tokenIndexFrom,
    //     uint8 tokenIndexTo,
    //     uint256 minDy,
    //     uint256 deadline
    // ) external nonReentrant whenNotPaused {
    //     emit TokenDepositAndSwap(
    //         to,
    //         chainId,
    //         token,
    //         amount,
    //         tokenIndexFrom,
    //         tokenIndexTo,
    //         minDy,
    //         deadline
    //     );
    //     token.safeTransferFrom(msg.sender, address(this), amount);
    // }

    // /**
    //  * @notice Relays to nodes that (typically) a wrapped synAsset ERC20 token has been burned and the underlying needs to be redeeemed on the native chain. This function indicates to the nodes that they should attempt to redeem the LP token for the underlying assets (E.g "swap" out of the LP token)
    //  * @param to address on other chain to redeem underlying assets to
    //  * @param chainId which underlying chain to bridge assets onto
    //  * @param token ERC20 compatible token to deposit into the bridge
    //  * @param amount Amount in native token decimals to transfer cross-chain pre-fees
    //  * @param tokenIndexFrom the token the user wants to swap from
    //  * @param tokenIndexTo the token the user wants to swap to
    //  * @param minDy the min amount the user would like to receive, or revert to only minting the SynERC20 token crosschain.
    //  * @param deadline latest timestamp to accept this transaction
    //  **/
    // function redeemAndSwap(
    //     address to,
    //     uint256 chainId,
    //     ERC20Burnable token,
    //     uint256 amount,
    //     uint8 tokenIndexFrom,
    //     uint8 tokenIndexTo,
    //     uint256 minDy,
    //     uint256 deadline
    // ) external nonReentrant whenNotPaused {
    //     emit TokenRedeemAndSwap(
    //         to,
    //         chainId,
    //         token,
    //         amount,
    //         tokenIndexFrom,
    //         tokenIndexTo,
    //         minDy,
    //         deadline
    //     );
    //     token.burnFrom(msg.sender, amount);
    // }

    // /**
    //  * @notice Relays to nodes that (typically) a wrapped synAsset ERC20 token has been burned and the underlying needs to be redeeemed on the native chain. This function indicates to the nodes that they should attempt to redeem the LP token for the underlying assets (E.g "swap" out of the LP token)
    //  * @param to address on other chain to redeem underlying assets to
    //  * @param chainId which underlying chain to bridge assets onto
    //  * @param token ERC20 compatible token to deposit into the bridge
    //  * @param amount Amount in native token decimals to transfer cross-chain pre-fees
    //  * @param swapTokenIndex Specifies which of the underlying LP assets the nodes should attempt to redeem for
    //  * @param swapMinAmount Specifies the minimum amount of the underlying asset needed for the nodes to execute the redeem/swap
    //  * @param swapDeadline Specificies the deadline that the nodes are allowed to try to redeem/swap the LP token
    //  **/
    // function redeemAndRemove(
    //     address to,
    //     uint256 chainId,
    //     ERC20Burnable token,
    //     uint256 amount,
    //     uint8 swapTokenIndex,
    //     uint256 swapMinAmount,
    //     uint256 swapDeadline
    // ) external nonReentrant whenNotPaused {
    //     emit TokenRedeemAndRemove(
    //         to,
    //         chainId,
    //         token,
    //         amount,
    //         swapTokenIndex,
    //         swapMinAmount,
    //         swapDeadline
    //     );
    //     token.burnFrom(msg.sender, amount);
    // }

    // /**
    //  * @notice Nodes call this function to mint a SynERC20 (or any asset that the bridge is given minter access to), and then attempt to swap the SynERC20 into the desired destination asset. This is called by the nodes after a TokenDepositAndSwap event is emitted.
    //  * @dev This means the BridgeDeposit.sol contract must have minter access to the token attempting to be minted
    //  * @param to address on other chain to redeem underlying assets to
    //  * @param token ERC20 compatible token to deposit into the bridge
    //  * @param amount Amount in native token decimals to transfer cross-chain post-fees
    //  * @param fee Amount in native token decimals to save to the contract as fees
    //  * @param pool Destination chain's pool to use to swap SynERC20 -> Asset. The nodes determine this by using PoolConfig.sol.
    //  * @param tokenIndexFrom Index of the SynERC20 asset in the pool
    //  * @param tokenIndexTo Index of the desired final asset
    //  * @param minDy Minumum amount (in final asset decimals) that must be swapped for, otherwise the user will receive the SynERC20.
    //  * @param deadline Epoch time of the deadline that the swap is allowed to be executed.
    //  * @param kappa kappa
    //  **/
    // function mintAndSwap(
    //     address payable to,
    //     IERC20Mintable token,
    //     uint256 amount,
    //     uint256 fee,
    //     ISwap pool,
    //     uint8 tokenIndexFrom,
    //     uint8 tokenIndexTo,
    //     uint256 minDy,
    //     uint256 deadline,
    //     bytes32 kappa
    // ) external nonReentrant whenNotPaused {
    //     require(
    //         hasRole(NODEGROUP_ROLE, msg.sender),
    //         "Caller is not a node group"
    //     );
    //     require(amount > fee, "Amount must be greater than fee");
    //     require(!kappaMap[kappa], "Kappa is already present");
    //     kappaMap[kappa] = true;
    //     fees[address(token)] = fees[address(token)].add(fee);
    //     // Transfer gas airdrop
    //     if (chainGasAmount != 0 && address(this).balance > chainGasAmount) {
    //         to.call.value(chainGasAmount)("");
    //     }
    //     // first check to make sure more will be given than min amount required
    //     uint256 expectedOutput = ISwap(pool).calculateSwap(
    //         tokenIndexFrom,
    //         tokenIndexTo,
    //         amount.sub(fee)
    //     );

    //     if (expectedOutput >= minDy) {
    //         // proceed with swap
    //         token.mint(address(this), amount);
    //         token.safeIncreaseAllowance(address(pool), amount);
    //         try
    //             ISwap(pool).swap(
    //                 tokenIndexFrom,
    //                 tokenIndexTo,
    //                 amount.sub(fee),
    //                 minDy,
    //                 deadline
    //             )
    //         returns (uint256 finalSwappedAmount) {
    //             // Swap succeeded, transfer swapped asset
    //             IERC20 swappedTokenTo = ISwap(pool).getToken(tokenIndexTo);
    //             if (
    //                 address(swappedTokenTo) == WFIL_ADDRESS &&
    //                 WFIL_ADDRESS != address(0)
    //             ) {
    //                 IWETH9(WFIL_ADDRESS).withdraw(finalSwappedAmount);
    //                 (bool success, ) = to.call{value: finalSwappedAmount}("");
    //                 require(success, "ETH_TRANSFER_FAILED");
    //                 emit TokenMintAndSwap(
    //                     to,
    //                     token,
    //                     finalSwappedAmount,
    //                     fee,
    //                     tokenIndexFrom,
    //                     tokenIndexTo,
    //                     minDy,
    //                     deadline,
    //                     true,
    //                     kappa
    //                 );
    //             } else {
    //                 swappedTokenTo.safeTransfer(to, finalSwappedAmount);
    //                 emit TokenMintAndSwap(
    //                     to,
    //                     token,
    //                     finalSwappedAmount,
    //                     fee,
    //                     tokenIndexFrom,
    //                     tokenIndexTo,
    //                     minDy,
    //                     deadline,
    //                     true,
    //                     kappa
    //                 );
    //             }
    //         } catch {
    //             IERC20(token).safeTransfer(to, amount.sub(fee));
    //             emit TokenMintAndSwap(
    //                 to,
    //                 token,
    //                 amount.sub(fee),
    //                 fee,
    //                 tokenIndexFrom,
    //                 tokenIndexTo,
    //                 minDy,
    //                 deadline,
    //                 false,
    //                 kappa
    //             );
    //         }
    //     } else {
    //         token.mint(address(this), amount);
    //         IERC20(token).safeTransfer(to, amount.sub(fee));
    //         emit TokenMintAndSwap(
    //             to,
    //             token,
    //             amount.sub(fee),
    //             fee,
    //             tokenIndexFrom,
    //             tokenIndexTo,
    //             minDy,
    //             deadline,
    //             false,
    //             kappa
    //         );
    //     }
    // }

    // /**
    //  * @notice Function to be called by the node group to withdraw the underlying assets from the contract
    //  * @param to address on chain to send underlying assets to
    //  * @param token ERC20 compatible token to withdraw from the bridge
    //  * @param amount Amount in native token decimals to withdraw
    //  * @param fee Amount in native token decimals to save to the contract as fees
    //  * @param pool Destination chain's pool to use to swap SynERC20 -> Asset. The nodes determine this by using PoolConfig.sol.
    //  * @param swapTokenIndex Specifies which of the underlying LP assets the nodes should attempt to redeem for
    //  * @param swapMinAmount Specifies the minimum amount of the underlying asset needed for the nodes to execute the redeem/swap
    //  * @param swapDeadline Specificies the deadline that the nodes are allowed to try to redeem/swap the LP token
    //  * @param kappa kappa
    //  **/
    // function withdrawAndRemove(
    //     address to,
    //     IERC20 token,
    //     uint256 amount,
    //     uint256 fee,
    //     ISwap pool,
    //     uint8 swapTokenIndex,
    //     uint256 swapMinAmount,
    //     uint256 swapDeadline,
    //     bytes32 kappa
    // ) external nonReentrant whenNotPaused {
    //     require(
    //         hasRole(NODEGROUP_ROLE, msg.sender),
    //         "Caller is not a node group"
    //     );
    //     require(amount > fee, "Amount must be greater than fee");
    //     require(!kappaMap[kappa], "Kappa is already present");
    //     kappaMap[kappa] = true;
    //     fees[address(token)] = fees[address(token)].add(fee);
    //     // first check to make sure more will be given than min amount required
    //     uint256 expectedOutput = ISwap(pool).calculateRemoveLiquidityOneToken(
    //         amount.sub(fee),
    //         swapTokenIndex
    //     );

    //     if (expectedOutput >= swapMinAmount) {
    //         token.safeIncreaseAllowance(address(pool), amount.sub(fee));
    //         try
    //             ISwap(pool).removeLiquidityOneToken(
    //                 amount.sub(fee),
    //                 swapTokenIndex,
    //                 swapMinAmount,
    //                 swapDeadline
    //             )
    //         returns (uint256 finalSwappedAmount) {
    //             // Swap succeeded, transfer swapped asset
    //             IERC20 swappedTokenTo = ISwap(pool).getToken(swapTokenIndex);
    //             swappedTokenTo.safeTransfer(to, finalSwappedAmount);
    //             emit TokenWithdrawAndRemove(
    //                 to,
    //                 token,
    //                 finalSwappedAmount,
    //                 fee,
    //                 swapTokenIndex,
    //                 swapMinAmount,
    //                 swapDeadline,
    //                 true,
    //                 kappa
    //             );
    //         } catch {
    //             IERC20(token).safeTransfer(to, amount.sub(fee));
    //             emit TokenWithdrawAndRemove(
    //                 to,
    //                 token,
    //                 amount.sub(fee),
    //                 fee,
    //                 swapTokenIndex,
    //                 swapMinAmount,
    //                 swapDeadline,
    //                 false,
    //                 kappa
    //             );
    //         }
    //     } else {
    //         token.safeTransfer(to, amount.sub(fee));
    //         emit TokenWithdrawAndRemove(
    //             to,
    //             token,
    //             amount.sub(fee),
    //             fee,
    //             swapTokenIndex,
    //             swapMinAmount,
    //             swapDeadline,
    //             false,
    //             kappa
    //         );
    //     }
    // }

    // BRIDGE FUNCTIONS TO HANDLE DIFF ADDRESSES
    /**
     * @notice Relays to nodes that (typically) a wrapped synAsset ERC20 token has been burned and the underlying needs to be redeeemed on the native chain
     * @param to address on other chain to redeem underlying assets to
     * @param chainId which underlying chain to bridge assets onto
     * @param token ERC20 compatible token to deposit into the bridge
     * @param amount Amount in native token decimals to transfer cross-chain pre-fees
     **/
    function redeemV2(
        bytes32 to,
        uint256 chainId,
        ERC20Burnable token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        emit TokenRedeemV2(to, chainId, token, amount);
        token.burnFrom(msg.sender, amount);
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
}

interface INodeManagement {
    function getTransaction(uint256 _txId) external view;
}
