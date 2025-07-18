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
    const { content, recipientId, amount, txHash } = body;

    if (!content || !recipientId) {
      return NextResponse.json(
        { error: "Missing required fields: content, recipientId" },
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

      // If an original paid message exists, it's not replied to, and the current sender is the recipient
      if (originalMessage && originalMessage.status === 'SENT' && originalMessage.senderId !== senderId) {
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