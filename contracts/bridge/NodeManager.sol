// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract NodeManagement is AccessControlUpgradeable {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // Status of the guardian.
    // Active means the guardian is active.
    // Closed means the guardian was closed happily.
    // Terminated means the guardian was closed due to misbehavior.
    enum Status {
        Active,
        Closed,
        Terminated
    }

    // Minimum number of guardian members required to produce a signature.
    uint256 public acceptebleThreshold;

    // The current status of the guardian.
    // If the guardian is Active members monitor it and support requests from the
    // guardian owner.
    // If the owner decides to close the guardian the flag is set to Closed.
    // If the owner seizes member bonds the flag is set to Terminated.
    Status internal status;

    // Notification that the guardian was closed by the owner.
    // Members no longer need to support this guardian.
    event guardianClosed();

    // Notification that the guardian has been terminated by the owner.
    // Members no longer need to support this guardian.
    event guardianTerminated();

    /// @notice Closes guardian when owner decides that they no longer need it.
    /// Releases bonds to the guardian members.
    /// @dev The function can be called only by the owner of the guardian and only
    /// if the guardian has not been already closed.
    function closeguardian() public onlyRole(GOVERNANCE_ROLE) onlyWhenActive {
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
