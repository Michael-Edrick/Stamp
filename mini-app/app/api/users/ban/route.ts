import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const userToBan = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, walletAddress: true, isBanned: true }
    });

    if (!userToBan) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (userToBan.isBanned) {
      return NextResponse.json(
        { error: "User is already banned" },
        { status: 400 }
      );
    }

    const bannedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
      select: {
        id: true,
        username: true,
        walletAddress: true,
        isBanned: true,
        updatedAt: true
      }
    });

    console.log(`User ${bannedUser.walletAddress} (${bannedUser.username || 'No username'}) has been banned. Reason: ${reason || 'No reason provided'}`);

    return NextResponse.json(
      {
        message: "User banned successfully",
        user: bannedUser
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error banning user:", error);
    
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while banning the user" },
      { status: 500 }
    );
  }
} 