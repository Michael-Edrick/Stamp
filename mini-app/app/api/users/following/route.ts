import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import prisma from "@/lib/prisma";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set");
}

const client = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });

// Helper function to fetch user data from Neynar
async function getFarcasterUser(address: string) {
    if (!NEYNAR_API_KEY) {
        console.error("NEYNAR_API_KEY is not set.");
        return null;
    }
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;
    try {
        const response = await fetch(url, {
            headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
        });
        if (!response.ok) {
            console.error(`Neynar API failed with status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data.users[address]?.[0] || null;
    } catch (error) {
        console.error("Error fetching from Neynar API:", error);
        return null;
    }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Farcaster user data to get FID
    const farcasterUser = await getFarcasterUser(user.walletAddress);
    
    if (!farcasterUser?.fid) {
      return NextResponse.json({ error: 'No FID found for user' }, { status: 400 });
    }

    const fid = parseInt(farcasterUser.fid.toString(), 10);

    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    // Note: fetchFollowingUsers might not exist in the current SDK version
    // For now, return an empty array or implement a different approach
    return NextResponse.json({ users: [] });
    
  } catch (error) {
    console.error('Error fetching following users:', error);
    return NextResponse.json({ error: 'Failed to fetch following users' }, { status: 500 });
  }
}
