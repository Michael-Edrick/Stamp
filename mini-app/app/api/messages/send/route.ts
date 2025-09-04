import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from 'crypto';
import { NextRequest } from "next/server";
import { parseUnits } from "viem";
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

        const amountInWei = parseUnits(amount.toString(), 18);

        const newMessage = await prisma.message.create({
            data: {
                content,
                senderId: sender.id,
                recipientId,
                conversationId: conversation.id,
                status: 'SENT',
                txHash,
                amount: amountInWei.toString(),
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
    const result = await prisma.$transaction(async (tx) => {
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