import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { messageId } = await params;

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

    if (messageToUpdate.senderId !== session.user.id) {
      return NextResponse.json({ error: "You are not the sender of this message" }, { status: 403 });
    }

    // In a real implementation, you would also check the message's expiry from the smart contract
    // before allowing a refund.
    // TODO: Add logic here to call the `claimRefund` function on the smart contract.

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { status: "REFUNDED" },
    });

    return NextResponse.json(updatedMessage, { status: 200 });
  } catch (error) {
    console.error("Error refunding message:", error);
    return NextResponse.json(
      { error: "An error occurred while refunding the message." },
      { status: 500 }
    );
  }
} 