// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MessageEscrow is ReentrancyGuard {
    IERC20 public usdc;
    address public owner;
    address public platformFeeWallet;
    uint256 public platformFeePercentage;

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

    constructor(address _usdcAddress, address _platformFeeWallet, uint256 _platformFeePercentage) {
        require(_platformFeeWallet != address(0), "Invalid fee wallet address");
        require(_platformFeePercentage > 0 && _platformFeePercentage <= 100, "Fee percentage must be between 1 and 100");
        usdc = IERC20(_usdcAddress);
        owner = msg.sender;
        platformFeeWallet = _platformFeeWallet;
        platformFeePercentage = _platformFeePercentage;
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
        
        uint256 feeAmount = (msgData.amount * platformFeePercentage) / 100;
        uint256 recipientAmount = msgData.amount - feeAmount;

        require(usdc.transfer(platformFeeWallet, feeAmount), "Fee transfer failed");
        require(usdc.transfer(msgData.recipient, recipientAmount), "Recipient transfer failed");
        
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