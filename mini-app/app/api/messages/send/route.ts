import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from 'crypto';
import { NextRequest } from "next/server";
import { sendPaidMessageNotification } from "@/lib/notification-client";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { messageEscrowABI } from "@/lib/contract";
import { CONFIG } from "@/lib/config";
// No longer importing getFarcasterUser

// Function to get or create a conversation between two users
async function getOrCreateConversation(userId1: string, userId2: string) {
  let conversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: userId1 } } },
        { participants: { some: { id: userId2 } } },
      ],
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: userId1 }, { id: userId2 }],
        },
        messagesRemaining: 0, // Start with 0, require payment to add more
      },
    });
  }

  return conversation;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      content,
      recipientId,
      amount,
      txHash,
      messageId, // This will be present when confirming a transaction
    } = body;
    const walletAddress = req.headers.get("x-wallet-address");
    console.log("--- New Request to /api/messages/send ---");
    console.log(`Received x-wallet-address: ${walletAddress}`);
    
    // Use wallet address from header to get sender, ensuring backend identifies the user
    if (!walletAddress) {
        return NextResponse.json({ error: "Missing x-wallet-address header" }, { status: 401 });
    }
    
    const verifiedAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress.toLowerCase() },
      include: { user: true },
    });
    
    if (!verifiedAddress || !verifiedAddress.user) {
      return NextResponse.json({ error: "Sender not found" }, { status: 401 });
    }

    const sender = verifiedAddress.user;

    // --- Transaction Confirmation Logic ---
    // This logic is now responsible for creating the conversation and the message.
    if (txHash && content && recipientId && amount) {
        const conversation = await getOrCreateConversation(sender.id, recipientId);

        const newMessage = await prisma.message.create({
            data: {
                content,
                senderId: sender.id,
                recipientId,
                conversationId: conversation.id,
                status: 'SENT',
                txHash,
                amount, // Save the amount directly as a number
                // onChainMessageId is now passed from the client on confirmation
                onChainMessageId: body.onChainMessageId || null,
            },
            include: { sender: true },
        });

        // Grant message bundle on successful payment
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { messagesRemaining: 10 } // TODO: Make this configurable
        });
        
        // After successfully saving, trigger a notification for the paid message
        if (amount > 0) {
          const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
          // Ensure the recipient exists, has an FID, and the sender has a username
          if (recipient && recipient.fid && sender.username) {
            // Fire-and-forget the notification so it doesn't block the response
            sendPaidMessageNotification({
              recipientFid: parseInt(recipient.fid, 10),
              senderName: sender.username,
              messageContent: content,
              amount: amount,
            }).catch(error => {
              // Log errors but don't crash the main flow
              console.error("Failed to send notification in background:", error);
            });
          }
        }

        return NextResponse.json({ newMessage }, { status: 201 });
    }
    // --- End Transaction Confirmation Logic ---

    if (!content || !recipientId) {
      return NextResponse.json(
        { error: "Missing required fields: content, recipientId" },
        { status: 400 }
      );
    }
    
    // Find the conversation without creating it yet
    const conversation = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { id: sender.id } } },
                { participants: { some: { id: recipientId } } },
            ],
        },
    });

    // --- Payment Required Logic ---
    // If the conversation doesn't exist or has no messages left, require payment.
    if (!conversation || conversation.messagesRemaining <= 0) {
        // Generate a unique ID for the on-chain message, but do not save anything to the DB.
        const onChainMessageId = `0x${randomBytes(32).toString("hex")}`;
        
        // Return a 402 response indicating payment is required
        return NextResponse.json(
            {
              error: "Payment is required to start this conversation.",
              paymentRequired: true,
              onChainMessageId: onChainMessageId,
            },
            { status: 402 } // Payment Required
        );
    }
    // --- End Payment Required Logic ---


    // --- Standard Message Sending Logic ---
    // This logic now only runs if payment is NOT required.

    // We need to handle the transaction result outside the transaction block
    let lastMessageFromOtherUser: any = null; 

    const result = await prisma.$transaction(async (tx) => {
      
      // --- START: Restored Reply-to-Claim Logic ---
      lastMessageFromOtherUser = await tx.message.findFirst({
          where: {
              conversationId: conversation.id,
              senderId: recipientId, // The message was from the person we are replying to
              status: 'SENT',       // The message has not been replied to yet
              amount: { gt: 0 },   // Ensure it was a paid message
          },
          orderBy: { createdAt: 'desc' },
      });

      // If the last message was a paid message from the other user, release the escrow.
      if (lastMessageFromOtherUser && lastMessageFromOtherUser.onChainMessageId) {
          
          try {
            const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
            if (!deployerPrivateKey) {
                throw new Error("DEPLOYER_PRIVATE_KEY environment variable is not set.");
            }
            // Ensure the private key is in the correct hex format.
            const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
            
            const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
            const rpcUrl = network === 'mainnet' ? process.env.BASE_MAINNET_RPC_URL : process.env.BASE_SEPOLIA_RPC_URL;

            if (!rpcUrl) {
              throw new Error(`RPC URL for ${network} is not configured.`);
            }

            const walletClient = createWalletClient({
                account,
                chain: CONFIG.chain,
                transport: http(rpcUrl),
            });
            const publicClient = createPublicClient({
                chain: CONFIG.chain,
                transport: http(rpcUrl),
            });

            const { request } = await publicClient.simulateContract({
                account,
                address: CONFIG.messageEscrowAddress as `0x${string}`,
                abi: messageEscrowABI,
                functionName: 'releaseFunds',
                args: [lastMessageFromOtherUser.onChainMessageId as `0x${string}`],
            });
            const hash = await walletClient.writeContract(request);

            console.log(`Funds released successfully. Tx hash: ${hash}`);

            await tx.message.update({
                where: { id: lastMessageFromOtherUser.id },
                data: { 
                  status: 'REPLIED', // Revert status back to REPLIED
                  isClaimed: true      // Set the new field
                },
            });
            console.log(`Updated message ${lastMessageFromOtherUser.id}: status to REPLIED, isClaimed to true.`);

          } catch (contractError) {
              console.error("Smart contract call to release funds failed:", contractError);
              // We throw an error to ensure the Prisma transaction is rolled back.
              throw new Error("Failed to release funds from smart contract. The reply was not sent.");
          }
      }
      // --- END: Restored Reply-to-Claim Logic ---

      const existingConversation = await tx.conversation.findUniqueOrThrow({ where: { id: conversation.id }});
      
      const newMessage = await tx.message.create({
        data: {
          content,
          senderId: sender.id,
          recipientId,
          conversationId: existingConversation.id,
          status: 'SENT',
        },
        include: { sender: true }
      });

      const updatedConversation = await tx.conversation.update({
        where: { id: existingConversation.id },
        data: {
          messagesRemaining: {
            decrement: 1,
          },
        },
      });

      return { newMessage, updatedConversation };
    }, { timeout: 20000 }); // Increased timeout to 20 seconds

    // After the transaction is successful, check if a claim happened
    if (lastMessageFromOtherUser) {
        return NextResponse.json({
            newMessage: result.newMessage,
            claimSuccess: true,
            claimedMessageId: lastMessageFromOtherUser.id,
        }, { status: 201 });
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "An error occurred while sending the message." },
      { status: 500 }
    );
  }
} 