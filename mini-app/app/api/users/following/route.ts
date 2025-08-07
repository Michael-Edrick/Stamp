import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set");
}

const client = new NeynarAPIClient(NEYNAR_API_KEY);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.fid) {
    return NextResponse.json({ error: 'Not authenticated or no FID found' }, { status: 401 });
  }

  const fid = parseInt(session.user.fid, 10);

  if (isNaN(fid)) {
    return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
  }

  try {
    const response = await client.fetchFollowingUsers(fid, { limit: 150 });
    // The SDK returns a generator, so we need to iterate over it.
    const users = [];
    for await (const user of response.users) {
      users.push(user);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching following users from Neynar:', error);
    return NextResponse.json({ error: 'Failed to fetch following users' }, { status: 500 });
  }
}
