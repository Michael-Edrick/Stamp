import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from 'crypto';
import { getFrameMessage } from "frames.js";
import { NextRequest } from "next/server";
import { getFarcasterUser } from "@/app/api/auth/[...nextauth]/options";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import {
  messageEscrowABI,
  messageEscrowAddress,
} from "@/lib/contract";
import { createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY as string);

async function getSender(req: NextRequest) {
  const body = await req.json();

  if (body.untrustedData) {
    // Frame request
    const frameMessage = await getFrameMessage(body);
    const fid = frameMessage.requesterFid;
    const farcasterUser = (await neynarClient.fetchBulkUsers([fid])).users[0];
    const walletAddress = farcasterUser.custody_address;
    return await getFarcasterUser(walletAddress);
  } else {
    // Regular API request
    const { walletAddress } = body;
    return await getFarcasterUser(walletAddress);
  }
}

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
    
    // Use wallet address from header to get sender, ensuring backend identifies the user
    if (!walletAddress) {
        return NextResponse.json({ error: "Missing x-wallet-address header" }, { status: 401 });
    }
    const sender = await getFarcasterUser(walletAddress);

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 401 });
    }

    // --- Transaction Confirmation Logic ---
    if (messageId && txHash) {
      const existingMessage = await prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: true },
      });

      if (!existingMessage || existingMessage.senderId !== sender.id) {
        return NextResponse.json({ error: "Message not found or unauthorized" }, { status: 404 });
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "SENT",
          txHash: txHash,
        },
        include: { sender: true },
      });

      // Grant message bundle on successful payment
      await prisma.conversation.update({
          where: { id: existingMessage.conversationId },
          data: { messagesRemaining: 10 }
      });

      return NextResponse.json({ newMessage: updatedMessage }, { status: 201 });
    }
    // --- End Transaction Confirmation Logic ---

    if (!content || !recipientId) {
      return NextResponse.json(
        { error: "Missing required fields: content, recipientId" },
        { status: 400 }
      );
    }
    
    const conversation = await getOrCreateConversation(sender.id, recipientId);

    // --- Payment Required Logic ---
    if (conversation.messagesRemaining <= 0) {
        // Generate a unique ID for the on-chain message
        const onChainMessageId = `0x${randomBytes(32).toString("hex")}`;
        
        // Create the message in a pending state
        const pendingMessage = await prisma.message.create({
            data: {
                content,
                senderId: sender.id,
                recipientId,
                conversationId: conversation.id,
                status: 'PENDING_PAYMENT',
                amount: amount, // Amount will be passed in the next step
                onChainMessageId: onChainMessageId,
            }
        });

        // Return a 402 response indicating payment is required
        return NextResponse.json(
            {
              error: "Payment is required to start this conversation.",
              paymentRequired: true,
              onChainMessageId: onChainMessageId,
              messageId: pendingMessage.id, // Send back the db message ID
            },
            { status: 402 } // Payment Required
        );
    }
    // --- End Payment Required Logic ---


    // --- Standard Message Sending Logic ---
    const result = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          content,
          senderId: sender.id,
          recipientId,
          conversationId: conversation.id,
          status: 'SENT',
        },
        include: { sender: true }
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