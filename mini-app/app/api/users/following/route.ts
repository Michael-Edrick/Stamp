import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ error: 'NEYNAR_API_KEY is not configured' }, { status: 500 });
  }

  try {
    // 1. Find the user in our database to get their Farcaster FID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: { equals: walletAddress, mode: 'insensitive' } },
          { custodyAddress: { equals: walletAddress, mode: 'insensitive' } },
        ],
      },
    });

    if (!user || !user.fid) {
      console.log(`[DEBUG] /api/users/following: Found user for wallet ${walletAddress}, but they are missing an FID. User object:`, user);
      return NextResponse.json({ error: 'User not found or does not have a Farcaster FID' }, { status: 404 });
    }

    // 2. Use the FID to fetch the user's following list from Neynar
    const neynarClient = new NeynarAPIClient({apiKey: NEYNAR_API_KEY});
    
    // The FID from our database is a string, but the SDK expects a number.
    const fid = parseInt(user.fid, 10);
    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid FID stored for user' }, { status: 500 });
    }

    let allFollowing: any[] = [];
    let cursor: string | null = null;
    const totalToFetch = 250;

    // Fetch up to 250 users in batches of 100
    while (allFollowing.length < totalToFetch) {
        const remaining = totalToFetch - allFollowing.length;
        const limit = Math.min(100, remaining);

        const result = await neynarClient.fetchUserFollowing({ 
            fid, 
            limit, 
            cursor: cursor || undefined 
        });

        const followingBatch = result.users.map((u: any) => u.user);
        allFollowing = allFollowing.concat(followingBatch);
        
        cursor = result.next.cursor;

        // If there's no next cursor, we've fetched all the users they follow.
        if (!cursor) {
            break;
        }
    }

    // Sort the combined list by follower count in descending order
    // Using bracket notation to bypass a TypeScript build error.
    allFollowing.sort((a: any, b: any) => (b['follower_count'] || 0) - (a['follower_count'] || 0));

    // 3. Return the sorted list of followed users
    return NextResponse.json(allFollowing);

  } catch (error) {
    console.error('Error in GET /api/users/following:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
