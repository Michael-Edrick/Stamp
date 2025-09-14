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
  const neynarClient = new NeynarAPIClient({apiKey: NEYNAR_API_KEY});

  try {
    // 1. Find the user associated with the connected walletAddress using the new data model.
    const verifiedAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress.toLowerCase() },
      include: { user: true },
    });
    
    // If we don't find the address, or the user is missing, they can't have a following list.
    if (!verifiedAddress || !verifiedAddress.user) {
        return NextResponse.json({ error: 'User not found for the given wallet address' }, { status: 404 });
    }

    const user = verifiedAddress.user;

    // We still need to check for the FID, as non-Farcaster users won't have one.
    if (!user.fid) {
      // THIS IS THE MODIFIED LOGIC FOR TESTING
      // If the user has no FID, they are not a Farcaster user.
      // Instead of an empty list, we will return a default Farcaster user to message.
      console.log("User has no FID, returning default user for testing.");
      try {
        const defaultUserFid = 1107789; // Your main FID
        const { users } = await neynarClient.fetchBulkUsers([defaultUserFid]);
        if (users.length > 0) {
          // The API returns a list, so we send back our single user in a list.
          return NextResponse.json(users);
        } else {
          // If we can't find the default user for some reason, return empty.
          return NextResponse.json([]);
        }
      } catch (neynarError) {
        console.error("Failed to fetch default user from Neynar:", neynarError);
        return NextResponse.json([]); // Return empty on error
      }
    }

    // 2. Use the FID to fetch the user's following list from Neynar
    
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
