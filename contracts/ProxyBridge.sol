// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProxyBridge {

    // add Hash to verify
    event TokensMinted(address requester, uint amount);
    event TokensBurnt(address requester, uint amount);

    constructor() {
       
    }

    // function to lock tokens 
    function mintTokens (address _requester, uint _amount) external {
        // mint FDAI 
        emit TokensMinted(_requester, _amount);
    }
    
    // function to unlock tokens
    function burnTokens (address _requester, uint _amount) external {
        // burn FDAI
        emit TokensBurnt(_requester, _amount);
    }
    

}