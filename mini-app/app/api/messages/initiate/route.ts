import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const senderId = session.user.id;

  try {
    const body = await req.json();
    const { content, recipientId, amount } = body;

    if (!content || !recipientId || amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: content, recipientId, amount" },
        { status: 400 }
      );
    }

    // Find or create a conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: { id: { in: [senderId, recipientId] } },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: senderId }, { id: recipientId }],
          },
          // We can set this to 0 initially, it will be updated upon payment confirmation
          messagesRemaining: 0,
        },
      });
    }

    // Generate a secure, unique on-chain message ID on the backend
    const onChainMessageId = `0x${randomBytes(32).toString("hex")}`;

    // Create a new message with a 'PENDING_PAYMENT' status
    const pendingMessage = await prisma.message.create({
      data: {
        content,
        amount,
        status: "PENDING_PAYMENT",
        onChainMessageId,
        senderId,
        recipientId,
        conversationId: conversation.id,
      },
    });

    // Return the on-chain ID and the DB message ID to the frontend
    return NextResponse.json(
      {
        onChainMessageId: pendingMessage.onChainMessageId,
        messageId: pendingMessage.id, // The database ID for this pending message
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error initiating message:", error);
    return NextResponse.json(
      { error: "An error occurred while initiating the message." },
      { status: 500 }
    );
  }
} 