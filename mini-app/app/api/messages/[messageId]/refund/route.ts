import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// This endpoint confirms that a refund has been processed on-chain
// and updates the message status in the database.
export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  // const session = await getAuth();
  // const walletAddress = session?.walletAddress;
  const user = await getAuthenticatedUser(req);

  if (!user || !user.walletAddress) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const walletAddress = user.walletAddress;

  const { messageId } = params;

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

    // Update the message status to REFUNDED
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        status: 'REFUNDED',
      },
      include: {
        sender: true, // Include sender to match the frontend type
      }
    });

    return NextResponse.json({ updatedMessage });
  } catch (error) {
    console.error("Error updating message status to refunded:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 