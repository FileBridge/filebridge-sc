// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract NodeManagement is AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // Status of the guardian.
    // Active means the guardian is active.
    // Closed means the guardian was closed happily.
    // Terminated means the guardian was closed due to misbehavior.
    enum Status {
        Active,
        Closed,
        Terminated
    }

    // struct tokenBridgeSig {

    // };

    // Minimum number of guardian members required to produce a signature.
    uint256 public acceptebleThreshold;

    // The timestamp at which guardian has been created and key generation process
    // started.
    uint256 internal keyGenerationStartTimestamp;

    // The current status of the guardian.
    // If the guardian is Active members monitor it and support requests from the
    // guardian owner.
    // If the owner decides to close the guardian the flag is set to Closed.
    // If the owner seizes member bonds the flag is set to Terminated.
    Status internal status;

    // Flags execution of contract initialization.
    bool internal isInitialized;

    // Notification that the guardian was closed by the owner.
    // Members no longer need to support this guardian.
    event guardianClosed();

    // Notification that the guardian has been terminated by the owner.
    // Members no longer need to support this guardian.
    event guardianTerminated();

    /// @notice Gets the timestamp the guardian was opened at.
    /// @return Timestamp the guardian was opened at.
    function getOpenedTimestamp() external view returns (uint256) {
        return keyGenerationStartTimestamp;
    }

    /// @notice Closes guardian when owner decides that they no longer need it.
    /// Releases bonds to the guardian members.
    /// @dev The function can be called only by the owner of the guardian and only
    /// if the guardian has not been already closed.
    function closeguardian()
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyWhenActive
    {
        markAsClosed();
    }

    /// @notice Returns true if the guardian is active.
    /// @return true if the guardian is active, false otherwise.
    function isActive() public view returns (bool) {
        return status == Status.Active;
    }

    /// @notice Returns true if the guardian is closed and members no longer support
    /// this guardian.
    /// @return true if the guardian is closed, false otherwise.
    function isClosed() public view returns (bool) {
        return status == Status.Closed;
    }

    /// @notice Returns true if the guardian has been terminated.
    /// guardian is terminated when bonds are seized and members no longer support
    /// this guardian.
    /// @return true if the guardian has been terminated, false otherwise.
    function isTerminated() public view returns (bool) {
        return status == Status.Terminated;
    }

    /// @notice Initialization function.
    /// @dev We use clone factory to create new guardian. That is why this contract
    /// doesn't have a constructor. We provide guardian parameters for each instance
    /// function after cloning instances from the master contract.
    /// Initialization must happen in the same transaction in which the clone is
    /// created.
    /// @param _owner Address of the guardian owner.
    /// @param _members Addresses of the guardian members.
    /// @param _honestThreshold Minimum number of honest guardian members.
    function initialize(
        address _owner,
        address[] memory _members,
        uint256 _honestThreshold
    ) public {
        require(!isInitialized, "Contract already initialized");
        require(_owner != address(0));
        for (uint8 i = 0; i < _members.length; i++) {
            _setupRole(GUARDIAN_ROLE, _members[i]);
        }
        acceptebleThreshold = _honestThreshold;

        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        __AccessControl_init();

        status = Status.Active;
        isInitialized = true;

        /* solium-disable-next-line security/no-block-members*/
        keyGenerationStartTimestamp = block.timestamp;
    }

    /// @notice Marks the guardian as closed.
    /// guardian can be marked as closed only when there is no signing in progress
    /// or the requested signing process has timed out.
    function markAsClosed() internal {
        status = Status.Closed;
        emit guardianClosed();
    }

    /// @notice Marks the guardian as terminated.
    /// guardian can be marked as terminated only when there is no signing in progress
    /// or the requested signing process has timed out.
    function markAsTerminated() internal {
        status = Status.Terminated;
        emit guardianTerminated();
    }

    /// @notice Terminates the guardian.
    function terminateguardian() internal {
        markAsTerminated();
    }

    /// @notice Checks if the guardian is currently active.
    /// @dev Throws an error if called when the guardian has been already closed.
    modifier onlyWhenActive() {
        require(isActive(), "guardian is not active");
        _;
    }
}
