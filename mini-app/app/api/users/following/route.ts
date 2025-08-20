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
      return NextResponse.json({ error: 'User not found or does not have a Farcaster FID' }, { status: 404 });
    }

    // 2. Use the FID to fetch the user's following list from Neynar
    const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);
    
    // The FID from our database is a string, but the SDK expects a number.
    const fid = parseInt(user.fid, 10);
    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid FID stored for user' }, { status: 500 });
    }

    // Using a limit of 50 for now to keep the response size reasonable
    const result = await neynarClient.fetchFollowingUsers(fid, { limit: 50 });

    // 3. Return the list of followed users
    return NextResponse.json(result.users);

  } catch (error) {
    console.error('Error in GET /api/users/following:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
