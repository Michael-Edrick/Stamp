import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

console.log("API route file for /api/users/me loaded.");

export async function GET(req: NextRequest) {
  console.log("GET /api/users/me handler started.");
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  console.log(`Received walletAddress: ${walletAddress}`);

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  try {
    console.log("Attempting to find user by walletAddress or custodyAddress...");
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: walletAddress.toLowerCase() },
          { custodyAddress: walletAddress.toLowerCase() },
        ]
      }
    });
    console.log("Finished find user. User found:", !!user);

    if (!user) {
      console.log("User not found. Attempting to create a new user profile...");
      try {
        const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY as string);
        const farcasterUser = await neynarClient.lookupUserByVerification(walletAddress);
        
        const newUser = {
          walletAddress: walletAddress.toLowerCase(),
          custodyAddress: farcasterUser.user.custodyAddress.toLowerCase(),
          fid: farcasterUser.user.fid.toString(),
          username: farcasterUser.user.username,
          displayName: farcasterUser.user.displayName,
          pfpUrl: farcasterUser.user.pfpUrl,
        };
        
        user = await prisma.user.create({ data: newUser });
        console.log("Successfully created new user:", user.username);
      } catch (error) {
         console.error("Failed to create user from Farcaster profile, creating a basic profile.", error);
         // If Neynar lookup fails (e.g., wallet not associated with Farcaster), create a basic user
         user = await prisma.user.create({
            data: {
                walletAddress: walletAddress.toLowerCase(),
                // You can add default values for other fields here if needed
            }
         });
         console.log("Successfully created new basic user.");
      }
    }
    
    console.log("Returning user data.");
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in GET /api/users/me:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, ...updateData } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required for updates" }, { status: 400 });
    }

    // Ensure tags are handled as an array
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    const updatedUser = await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: updateData,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: unknown) {
    console.error("Error updating user profile:", error);
     if (error instanceof Error && 'code' in error && error.code === 'P2002' && error.message.includes('username')) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "An error occurred while updating the profile." },
      { status: 500 }
    );
  }
} 