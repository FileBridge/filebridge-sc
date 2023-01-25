// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MainBridge {

    // add Hash to verify
    event TokensLocked(address requester, uint amount);
    event TokensUnlocked(address requester, uint amount);

    constructor() {
       
    }

    // function to lock tokens 
    function lockTokens (address _requester, uint _amount) external {
        emit TokensLocked(_requester, _amount);
    }
    
    // function to unlock tokens
    function unlockTokens (address _requester, uint _amount) external {
        // transfer locked tokens back to user
        emit TokensUnlocked(_requester, _amount);
    }
    

}