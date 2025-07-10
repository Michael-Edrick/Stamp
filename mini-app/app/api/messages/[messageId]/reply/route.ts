import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  const session = await getServerSession(authOptions);
  const { messageId } = params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const messageToUpdate = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!messageToUpdate) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (messageToUpdate.recipientId !== session.user.id) {
      return NextResponse.json({ error: "You are not the recipient of this message" }, { status: 403 });
    }

    // TODO: Add logic here to call the `releaseFunds` function on the smart contract.
    // This will require the frontend to send the transaction and the backend to verify it,
    // or for the backend to manage a wallet to send the transaction itself.
    
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { status: "REPLIED" },
    });

    return NextResponse.json(updatedMessage, { status: 200 });
  } catch (error) {
    console.error("Error replying to message:", error);
    return NextResponse.json(
      { error: "An error occurred while replying to the message." },
      { status: 500 }
    );
  }
} 