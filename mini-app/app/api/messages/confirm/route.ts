import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const senderId = session.user.id;

  try {
    const body = await req.json();
    const { messageId, txHash } = body;

    if (!messageId || !txHash) {
      return NextResponse.json(
        { error: "Missing required fields: messageId, txHash" },
        { status: 400 }
      );
    }

    // Find the pending message and verify the owner
    const pendingMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!pendingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (pendingMessage.senderId !== senderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (pendingMessage.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Message is not pending payment" },
        { status: 409 } // Conflict
      );
    }

    // All checks passed, update the message to 'SENT'
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: "SENT",
        txHash: txHash,
      },
      include: {
        sender: true,
      }
    });

    // Also update the conversation's message count
    await prisma.conversation.update({
        where: { id: updatedMessage.conversationId },
        data: { messagesRemaining: 10 }
    });
    
    return NextResponse.json({ updatedMessage }, { status: 200 });

  } catch (error) {
    console.error("Error confirming message:", error);
    return NextResponse.json(
      { error: "An error occurred while confirming the message." },
      { status: 500 }
    );
  }
} 