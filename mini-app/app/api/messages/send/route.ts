import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ethers } from "ethers";
import { messageEscrowABI, messageEscrowAddress } from "@/lib/contract";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const senderId = session.user.id;

  try {
    const body = await req.json();
    const { 
      content, 
      recipientWalletAddress, 
      recipientUsername,
      recipientPfpUrl,
      recipientFid,
      amount, 
      txHash, 
      onChainMessageId 
    } = body;

    if (!content || !recipientWalletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: content, recipientWalletAddress" },
        { status: 400 }
      );
    }

    // --- Find or Create Recipient User ---
    let recipient = await prisma.user.findUnique({
      where: { walletAddress: recipientWalletAddress },
    });

    if (!recipient) {
      // User does not exist, create a placeholder profile for them.
      recipient = await prisma.user.create({
        data: {
          walletAddress: recipientWalletAddress,
          name: recipientUsername, // Use Farcaster username as initial name
          username: recipientUsername,
          image: recipientPfpUrl, // Use Farcaster pfp as initial image
          fid: recipientFid ? recipientFid.toString() : null,
          // Add default values for any other required fields
        },
      });
    }
    const recipientId = recipient.id;
    // --- End of Find or Create ---


    // Find or create a conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: { id: { in: [senderId, recipientId] } },
        },
      },
    });

    // Check if payment is required
    if (!conversation || conversation.messagesRemaining <= 0) {
      if (amount === undefined || !txHash) {
        return NextResponse.json(
          { 
            error: "Payment is required to start or continue this conversation.",
            paymentRequired: true 
          },
          { status: 402 } // Payment Required
        );
      }

      // Payment is provided, create/reset the conversation
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            participants: {
              connect: [{ id: senderId }, { id: recipientId }],
            },
            messagesRemaining: 10, // Start with a fresh bundle
          },
        });
      } else {
        // Reset the message count for an existing conversation
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { messagesRemaining: 10 },
        });
      }
    }

    // At this point, we have a valid conversation with messages remaining.
    // We use a transaction to ensure all database operations succeed or neither do.
    const result = await prisma.$transaction(async (tx) => {
      
      // Check if this is the first reply to a paid message
      const originalMessage = await tx.message.findFirst({
        where: {
            conversationId: conversation.id,
            amount: { not: null } // Find the message that started the bundle
        },
        orderBy: {
            createdAt: 'asc'
        }
      });

      // Security Check: If this is a reply, see if it's for a paid message that can be claimed.
      // We check if an original paid message exists in this conversation that hasn't been replied to yet.
      if (originalMessage && originalMessage.status === 'SENT' && originalMessage.recipientId === senderId) {
          
          // The current user is the recipient of the original paid message. They are authorized to claim the funds.
          // Call the smart contract to release funds.
          try {
            const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
            if (!baseSepoliaRpcUrl) {
              throw new Error("Environment variable BASE_SEPOLIA_RPC_URL is not set.");
            }
            const provider = new ethers.JsonRpcProvider(baseSepoliaRpcUrl);
            const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
            if (!deployerPrivateKey) {
                throw new Error("DEPLOYER_PRIVATE_KEY environment variable is not set.");
            }
            const wallet = new ethers.Wallet(deployerPrivateKey, provider);
            const messageEscrow = new ethers.Contract(messageEscrowAddress, messageEscrowABI, wallet);
            
            const onChainIdFromDb = originalMessage.onChainMessageId;
            if(!onChainIdFromDb) {
                throw new Error("Cannot release funds, original on-chain messageId is missing.");
            }

            console.log(`Releasing funds for on-chain messageId: ${onChainIdFromDb}`);
            const releaseTx = await messageEscrow.releaseFunds(onChainIdFromDb);
            await releaseTx.wait();
            console.log("Funds released successfully. Tx:", releaseTx.hash);

          } catch (contractError) {
              console.error("Smart contract call failed:", contractError);
              // If the contract call fails, we should not proceed with the DB transaction.
              throw new Error("Failed to release funds from smart contract.");
          }

          await tx.message.update({
              where: { id: originalMessage.id },
              data: { status: 'REPLIED' }
          });
      }

      const newMessage = await tx.message.create({
        data: {
          content,
          amount: conversation.messagesRemaining === 10 ? amount : null, // only set amount on first message of bundle
          txHash: conversation.messagesRemaining === 10 ? txHash : null,
          onChainMessageId: conversation.messagesRemaining === 10 ? onChainMessageId : null,
          senderId,
          recipientId,
          conversationId: conversation.id,
        },
      });

      const updatedConversation = await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          messagesRemaining: {
            decrement: 1,
          },
        },
      });

      return { newMessage, updatedConversation };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "An error occurred while sending the message." },
      { status: 500 }
    );
  }
} 