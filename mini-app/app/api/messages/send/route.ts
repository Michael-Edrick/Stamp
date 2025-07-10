import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { content, recipient, txHash, messageId, amount } = body;

    if (!content || !recipient || !txHash || !messageId || amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: content, recipient, txHash, messageId, amount" },
        { status: 400 }
      );
    }

    // Find the recipient user by their wallet address
    const recipientUser = await prisma.user.findUnique({
      where: { walletAddress: recipient },
    });

    if (!recipientUser) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const newMessage = await prisma.message.create({
      data: {
        id: messageId,
        content,
        txHash,
        amount,
        senderId: session.user.id,
        recipientId: recipientUser.id,
        status: "PENDING", // PENDING until recipient responds
      },
    });

    // TODO: We will add a notification trigger here later

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') { // Unique constraint violation (e.g., messageId already exists)
      return NextResponse.json({ error: "This message ID has already been used." }, { status: 409 });
    }
    // Handle potential errors, e.g., foreign key constraint violation
     if (error.code === 'P2003') {
        return NextResponse.json({ error: "Invalid recipientId provided." }, { status: 400 });
    }
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "An error occurred while sending the message." },
      { status: 500 }
    );
  }
} 