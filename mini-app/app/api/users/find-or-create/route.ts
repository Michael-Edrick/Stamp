import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { User as FarcasterUser } from "@neynar/nodejs-sdk/build/neynar-api/v2";

export async function POST(req: NextRequest) {
  try {
    const farcasterUser = (await req.json()) as FarcasterUser;

    if (!farcasterUser || !farcasterUser.fid) {
      return NextResponse.json(
        { error: "Valid Farcaster user data is required" },
        { status: 400 }
      );
    }

    // Attempt to find an existing user by their Farcaster FID
    const existingUser = await prisma.user.findUnique({
      where: {
        fid: String(farcasterUser.fid),
      },
    });

    if (existingUser) {
      // If user exists, check if we need to update their address
      if (!existingUser.walletAddress && farcasterUser.custody_address) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            walletAddress: farcasterUser.custody_address.toLowerCase(),
            custodyAddress: farcasterUser.custody_address.toLowerCase(),
          },
        });
        return NextResponse.json(updatedUser);
      }
      // If user exists and is up-to-date, return their profile
      return NextResponse.json(existingUser);
    } else {
      // If user does not exist, create them
      const newUser = await prisma.user.create({
        data: {
          fid: String(farcasterUser.fid),
          username: farcasterUser.username,
          name: farcasterUser.display_name,
          image: farcasterUser.pfp_url,
          walletAddress: farcasterUser.custody_address?.toLowerCase(),
          custodyAddress: farcasterUser.custody_address?.toLowerCase(),
        },
      });
      return NextResponse.json(newUser);
    }
  } catch (error) {
    console.error("Error in find-or-create user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
