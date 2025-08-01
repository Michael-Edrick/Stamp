// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MessageEscrow is ReentrancyGuard {
    IERC20 public usdc;
    address public owner;

    struct Message {
        address sender;
        address recipient;
        uint256 amount;
        uint256 expiry; // Using block.timestamp for simplicity, but consider block number for more precision
        bool responded;
        bool refunded;
    }

    mapping(bytes32 => Message) public messages;

    event MessageSent(bytes32 indexed id, address indexed sender, address indexed recipient, uint256 amount, uint256 expiry);
    event FundsReleased(bytes32 indexed id);
    event Refunded(bytes32 indexed id);

    constructor(address _usdcAddress) {
        usdc = IERC20(_usdcAddress);
        owner = msg.sender;
    }

    function sendMessage(
        address recipient,
        bytes32 messageId,
        uint256 amount,
        uint256 expiryDuration
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");

        uint256 expiryTimestamp = block.timestamp + expiryDuration;
        
        messages[messageId] = Message(msg.sender, recipient, amount, expiryTimestamp, false, false);
        
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        emit MessageSent(messageId, msg.sender, recipient, amount, expiryTimestamp);
    }

    function releaseFunds(bytes32 messageId) external nonReentrant {
        Message storage msgData = messages[messageId];
        
        require(msg.sender == owner, "Only the owner can release funds");
        require(!msgData.responded, "Message has already been responded to");
        require(!msgData.refunded, "Message has already been refunded");

        msgData.responded = true;
        
        require(usdc.transfer(msgData.recipient, msgData.amount), "USDC transfer failed");
        
        emit FundsReleased(messageId);
    }

    function claimRefund(bytes32 messageId) external nonReentrant {
        Message storage msgData = messages[messageId];
        
        require(msg.sender == msgData.sender, "Only the sender can claim a refund");
        require(block.timestamp > msgData.expiry, "Message has not expired yet");
        require(!msgData.responded, "Message has already been responded to");
        require(!msgData.refunded, "Message has already been refunded");

        msgData.refunded = true;
        
        require(usdc.transfer(msgData.sender, msgData.amount), "USDC transfer failed");

        emit Refunded(messageId);
    }
} 