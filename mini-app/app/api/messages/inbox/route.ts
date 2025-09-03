import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  try {
    // Find the user by their wallet address using the new VerifiedAddress table.
    const verifiedAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress.toLowerCase() },
      select: { user: { select: { id: true } } },
    });

    if (!verifiedAddress || !verifiedAddress.user) {
      return NextResponse.json({ error: "User not found for the given wallet address" }, { status: 404 });
    }

    const { user } = verifiedAddress;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Only take the most recent message
          include: {
            sender: true,
          }
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(conversations, { status: 200 });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the inbox." },
      { status: 500 }
    );
  }
} 