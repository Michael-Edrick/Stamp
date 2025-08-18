import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

// Define the shape of the Farcaster user object we need, as you suggested.
type FarcasterUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: { equals: walletAddress, mode: 'insensitive' } },
          { custodyAddress: { equals: walletAddress, mode: 'insensitive' } },
        ]
      }
    });

    if (!user) {
      // User not found, create a new one
      try {
        const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY as string });
        const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });

        // Log the entire result object for debugging, as you suggested
        console.log("Full Neynar API response:", JSON.stringify(result, null, 2));

        // Apply the type assertion directly to the result, not result.data
        const farcasterUserData = result as unknown as Record<string, FarcasterUser[]>;
        
        if (!farcasterUserData) {
          throw new Error("Received null or invalid data from Neynar API.");
        }

        // Safely access the user list from the response object
        const farcasterUserList = Object.values(farcasterUserData)[0];

        if (!farcasterUserList || farcasterUserList.length === 0) {
          throw new Error(`Farcaster user not found for wallet: ${walletAddress}`);
        }
        
        const farcasterUser = farcasterUserList[0];
        
        const newUser = {
          walletAddress: walletAddress.toLowerCase(),
          username: farcasterUser.username,
          displayName: farcasterUser.display_name || '',
          pfpUrl: farcasterUser.pfp_url || '',
          fid: farcasterUser.fid.toString(),
        };

        const createdUser = await prisma.user.create({
          data: newUser,
        });
        user = createdUser;

      } catch (error) {
        console.error("Failed to create user from Farcaster profile. Full error:", error);
        return NextResponse.json(
          { message: "Failed to create user from Farcaster profile.", error: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    }
    
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
      where: { walletAddress: walletAddress },
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