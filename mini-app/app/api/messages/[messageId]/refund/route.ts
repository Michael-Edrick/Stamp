import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// This endpoint confirms that a refund has been processed on-chain
// and updates the message status in the database.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  // const session = await getAuth();
  // const walletAddress = session?.walletAddress;
  const user = await getAuthenticatedUser(req);

  if (!user || !user.walletAddress) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const walletAddress = user.walletAddress;

  const { messageId } = await params;

  if (!messageId) {
    return NextResponse.json(
      { error: "Message ID is required" },
      { status: 400 }
    );
  }

  try {
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
      include: {
        sender: true,
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Security check: Only the original sender can trigger this update.
    if (message.sender.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Use a transaction to both delete the message and reset the conversation
    await prisma.$transaction(async (tx) => {
      // First, find the message to get its conversation ID
      const messageToDelete = await tx.message.findUnique({
        where: { id: messageId },
        select: { conversationId: true }
      });

      if (!messageToDelete) {
        // This case should be rare, but good to handle.
        // The transaction will be rolled back.
        throw new Error("Message not found during transaction.");
      }

      // Delete the message
      await tx.message.delete({
        where: {
          id: messageId,
        },
      });

      // Reset the messagesRemaining count on the conversation
      await tx.conversation.update({
        where: {
          id: messageToDelete.conversationId,
        },
        data: {
          messagesRemaining: 0,
        }
      });
    });


    return NextResponse.json({ deletedMessageId: messageId });
  } catch (error) {
    console.error("Error unsending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 