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
    console.log(`[GET /api/users/me] Searching for user with walletAddress: ${walletAddress}`);
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: { equals: walletAddress, mode: 'insensitive' } },
          { custodyAddress: { equals: walletAddress, mode: 'insensitive' } },
        ]
      }
    });

    if (!user) {
      console.log(`[GET /api/users/me] User not found in DB. Attempting Farcaster enrichment for ${walletAddress}.`);
      // User not found. Try to enrich from Farcaster; if that fails, create a basic profile.
      try {
        const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY as string });
        const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });
        console.log(`[GET /api/users/me] Neynar API response for ${walletAddress}:`, JSON.stringify(result, null, 2));
        
        const farcasterUserData = result as unknown as Record<string, FarcasterUser[]>;
        const farcasterUserList = Object.values(farcasterUserData)[0];

        if (!farcasterUserList || farcasterUserList.length === 0) {
          // This will be caught by the catch block below, leading to basic profile creation.
          console.log(`[GET /api/users/me] Farcaster user not found in Neynar response for ${walletAddress}.`);
          throw new Error(`Farcaster user not found for wallet: ${walletAddress}`);
        }
        
        // If we found a user, create a rich profile from their Farcaster data
        const farcasterUser = farcasterUserList[0];
        console.log(`[GET /api/users/me] Farcaster user found: ${farcasterUser.username}. Creating rich profile.`);
        user = await prisma.user.create({
          data: {
            walletAddress: walletAddress.toLowerCase(),
            username: farcasterUser.username,
            name: farcasterUser.display_name || farcasterUser.username || '',
            image: farcasterUser.pfp_url || '',
            fid: farcasterUser.fid.toString(),
          }
        });

      } catch (error) {
        // If Farcaster enrichment fails for any reason, create a basic user.
        console.error(`[GET /api/users/me] Farcaster enrichment failed for ${walletAddress}. Creating basic profile. Full Error:`, error);
        user = await prisma.user.create({
            data: {
                walletAddress: walletAddress.toLowerCase(),
                // Provide a default, unique username
                username: `user_${walletAddress.slice(2, 10)}`, 
                name: 'New User', // Provide a default name
                image: '',
            }
        });
      }
    }
    
    console.log(`[GET /api/users/me] Successfully found or created user for ${walletAddress}. Returning user object.`);
    return NextResponse.json(user);
  } catch (error) {
    console.error(`[GET /api/users/me] CRITICAL ERROR for walletAddress ${walletAddress}:`, error);
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