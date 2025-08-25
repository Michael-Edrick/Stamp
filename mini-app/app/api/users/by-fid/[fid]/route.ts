import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set");
}

const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY });

// GET /api/users/by-fid/[fid]
// Fetches a user profile by their Farcaster FID.
// If the user doesn't exist in the local database, it fetches their
// data from Neynar, creates a new user ("just-in-time" creation),
// and returns the new profile.
export async function GET(
  request: NextRequest,
  context: { params: { fid: string } }
) {
  const { params } = context;
  const fid = parseInt(params.fid, 10);

  if (isNaN(fid)) {
    return NextResponse.json({ error: 'Invalid FID format' }, { status: 400 });
  }

  try {
    // 1. Try to find the user in our database first
    let user = await prisma.user.findUnique({
      where: { fid: fid.toString() },
    });

    // 2. If the user is found, return them
    if (user) {
      return NextResponse.json(user);
    }

    // 3. If not found, fetch from Neynar
    const neynarResult = await neynarClient.fetchBulkUsers({ fids: [fid] });
    const farcasterUser = neynarResult.users[0];

    if (!farcasterUser) {
      return NextResponse.json({ error: 'User not found on Farcaster' }, { status: 404 });
    }

    // Ensure we have a wallet address to create the user
    const walletAddress = farcasterUser.custody_address || (farcasterUser.verified_addresses?.eth_addresses[0]);
    if (!walletAddress) {
      return NextResponse.json({ error: 'Farcaster user does not have a wallet address suitable for messaging.' }, { status: 404 });
    }

    // 4. Create a new user in our database (placeholder)
    const newUser = await prisma.user.create({
      data: {
        fid: farcasterUser.fid.toString(),
        username: farcasterUser.username,
        name: farcasterUser.display_name,
        image: farcasterUser.pfp_url,
        custodyAddress: farcasterUser.custody_address,
        walletAddress: walletAddress.toLowerCase(), // Use the found wallet address
        // Add default values for other required fields
        email: null,
        price: "0.01",
        refundWindow: "1",
        standardCost: "0.005",
        premiumCost: "0.05",
      },
    });

    // 5. Return the newly created user
    return NextResponse.json(newUser);

  } catch (error) {
    console.error(`Error fetching user by FID ${fid}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
