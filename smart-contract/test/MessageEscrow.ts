import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MessageEscrow", function () {
  async function deployMessageEscrowFixture() {
    const [owner, sender, recipient, feeWallet] = await ethers.getSigners();

    // Deploy a mock USDC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy();
    
    // Deploy the MessageEscrow contract
    const MessageEscrow = await ethers.getContractFactory("MessageEscrow");
    const feePercentage = 10;
    const messageEscrow = await MessageEscrow.deploy(await usdc.getAddress(), feeWallet.address, feePercentage);

    // Mint some mock USDC for the sender
    await usdc.mint(sender.address, ethers.parseUnits("1000", 18));

    // Approve the MessageEscrow contract to spend sender's USDC
    await usdc.connect(sender).approve(await messageEscrow.getAddress(), ethers.parseUnits("100", 18));

    return { messageEscrow, usdc, owner, sender, recipient, feeWallet };
  }

  describe("Deployment", function () {
    it("Should set the right USDC token address", async function () {
      const { messageEscrow, usdc } = await deployMessageEscrowFixture();
      expect(await messageEscrow.usdc()).to.equal(await usdc.getAddress());
    });
  });

  describe("sendMessage", function () {
    it("Should allow a user to send a message and escrow funds", async function () {
      const { messageEscrow, usdc, sender, recipient } = await deployMessageEscrowFixture();
      const messageId = ethers.id("test-message-1");
      const amount = ethers.parseUnits("10", 18);
      const expiryDuration = 60 * 60 * 24; // 1 day

      await expect(messageEscrow.connect(sender).sendMessage(recipient.address, messageId, amount, expiryDuration))
        .to.emit(messageEscrow, "MessageSent")
        .withArgs(messageId, sender.address, recipient.address, amount, (await time.latest()) + expiryDuration);

      const message = await messageEscrow.messages(messageId);
      expect(message.sender).to.equal(sender.address);
      expect(message.amount).to.equal(amount);
      expect(await usdc.balanceOf(await messageEscrow.getAddress())).to.equal(amount);
    });
  });

  describe("releaseFunds", function () {
    it("Should allow the owner to release funds and take a fee", async function () {
      const { messageEscrow, usdc, owner, sender, recipient, feeWallet } = await deployMessageEscrowFixture();
      const messageId = ethers.id("test-message-2");
      const amount = ethers.parseUnits("10", 18);
      await messageEscrow.connect(sender).sendMessage(recipient.address, messageId, amount, 3600);

      await expect(messageEscrow.connect(owner).releaseFunds(messageId))
        .to.emit(messageEscrow, "FundsReleased")
        .withArgs(messageId);

      const message = await messageEscrow.messages(messageId);
      expect(message.responded).to.be.true;

      const feeAmount = (amount * BigInt(10)) / BigInt(100);
      const recipientAmount = amount - feeAmount;

      expect(await usdc.balanceOf(recipient.address)).to.equal(recipientAmount);
      expect(await usdc.balanceOf(feeWallet.address)).to.equal(feeAmount);
    });

    it("Should fail if a non-owner tries to release funds", async function () {
      const { messageEscrow, sender, recipient } = await deployMessageEscrowFixture();
      const messageId = ethers.id("test-message-3");
      await messageEscrow.connect(sender).sendMessage(recipient.address, messageId, ethers.parseUnits("10", 18), 3600);
      
      await expect(messageEscrow.connect(sender).releaseFunds(messageId)).to.be.revertedWith("Only the owner can release funds");
    });
  });

  describe("claimRefund", function () {
    it("Should allow the sender to claim a refund after expiry", async function () {
      const { messageEscrow, usdc, sender, recipient } = await deployMessageEscrowFixture();
      const messageId = ethers.id("test-message-4");
      const amount = ethers.parseUnits("10", 18);
      const expiryDuration = 3600; // 1 hour
      await messageEscrow.connect(sender).sendMessage(recipient.address, messageId, amount, expiryDuration);
      
      const senderInitialBalance = await usdc.balanceOf(sender.address);

      // Increase time to after expiry
      await time.increase(expiryDuration + 1);

      await expect(messageEscrow.connect(sender).claimRefund(messageId))
        .to.emit(messageEscrow, "Refunded")
        .withArgs(messageId);

      const message = await messageEscrow.messages(messageId);
      expect(message.refunded).to.be.true;
      expect(await usdc.balanceOf(sender.address)).to.equal(senderInitialBalance + amount);
    });

    it("Should fail if refund is claimed before expiry", async function () {
      const { messageEscrow, sender, recipient } = await deployMessageEscrowFixture();
      const messageId = ethers.id("test-message-5");
      await messageEscrow.connect(sender).sendMessage(recipient.address, messageId, ethers.parseUnits("10", 18), 3600);

      await expect(messageEscrow.connect(sender).claimRefund(messageId)).to.be.revertedWith("Message has not expired yet");
    });
  });
});
