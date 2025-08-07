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

    const userToUnban = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, walletAddress: true, isBanned: true }
    });

    if (!userToUnban) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!userToUnban.isBanned) {
      return NextResponse.json(
        { error: "User is not banned" },
        { status: 400 }
      );
    }

    const unbannedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
      select: {
        id: true,
        username: true,
        walletAddress: true,
        isBanned: true,
        updatedAt: true
      }
    });

    console.log(`User ${unbannedUser.walletAddress} (${unbannedUser.username || 'No username'}) has been unbanned. Reason: ${reason || 'No reason provided'}`);

    return NextResponse.json(
      {
        message: "User unbanned successfully",
        user: unbannedUser
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error unbanning user:", error);
    
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while unbanning the user" },
      { status: 500 }
    );
  }
} 