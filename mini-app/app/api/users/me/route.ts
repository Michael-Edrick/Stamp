import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

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
        const farcasterUsers = await neynarClient.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });
        
        if (!farcasterUsers.users.length) {
          return NextResponse.json({ message: "Farcaster user not found" }, { status: 404 });
        }
        
        const farcasterUser = farcasterUsers.users[0];
        
        const newUser = {
          walletAddress: walletAddress.toLowerCase(),
          username: farcasterUser.username,
          displayName: farcasterUser.display_name,
          pfpUrl: farcasterUser.pfp_url,
          fid: farcasterUser.fid,
        };

        const createdUser = await prisma.user.create({
          data: newUser,
        });
        user = createdUser;

      } catch (error) {
         console.error("Failed to create user from Farcaster profile, creating a basic profile.", error);
         // If Neynar lookup fails (e.g., wallet not associated with Farcaster), create a basic user
         user = await prisma.user.create({
            data: {
                walletAddress: walletAddress.toLowerCase(),
                // Add default values for other fields if needed, e.g., username
                username: `user_${Date.now()}` 
            }
         });
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