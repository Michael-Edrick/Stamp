import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { V2User as FarcasterUser } from "@neynar/nodejs-sdk";

export async function POST(req: NextRequest) {
  try {
    const farcasterUser = (await req.json()) as FarcasterUser;

    console.log("Data received from Neynar API:", farcasterUser);

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
      // Use the primary verified ETH address if available, otherwise fall back
      const primaryAddress = farcasterUser.verified_addresses?.primary?.eth_address;
      const walletAddress = primaryAddress || farcasterUser.verified_addresses?.eth_addresses?.[0];

      const newUser = await prisma.user.create({
        data: {
          fid: String(farcasterUser.fid),
          username: farcasterUser.username,
          name: farcasterUser.display_name,
          image: farcasterUser.pfp_url,
          walletAddress: walletAddress,
          custodyAddress: farcasterUser.custody_address,
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
