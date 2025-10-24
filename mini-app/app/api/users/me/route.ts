import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { FarcasterUser } from '@/types/farcaster';

async function findOrCreateUserWithFid(fid: string, username: string, displayName: string, pfpUrl: string, connectingAddress: string) {
  // Try to find the user by FID first
  const existingUser = await prisma.user.findUnique({
    where: { fid },
  });

  if (existingUser) {
    // If user exists, ensure the connecting address is linked
    await prisma.verifiedAddress.upsert({
      where: { address: connectingAddress.toLowerCase() },
      update: { userId: existingUser.id },
      create: { address: connectingAddress.toLowerCase(), userId: existingUser.id },
    });
    return existingUser;
  }

  // If user does not exist, we need their full profile for custody_address
  const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY as string });
  const result = await neynarClient.fetchBulkUsers({ fids: [Number(fid)] });
  const fullProfile = result.users[0];

  // Create the new user
  const newUser = await prisma.user.create({
    data: {
      fid,
      username,
      name: displayName,
      image: pfpUrl,
      custodyAddress: fullProfile?.custody_address,
      walletAddress: connectingAddress.toLowerCase(),
    },
  });

  // Link the connecting address
  await prisma.verifiedAddress.create({
    data: {
      address: connectingAddress.toLowerCase(),
      userId: newUser.id,
    },
  });

  return newUser;
}


export async function GET(req: NextRequest) {
  const headers = req.headers;
  const minikitFid = headers.get('x-minikit-user-fid');
  const minikitUsername = headers.get('x-minikit-user-username');
  const minikitDisplayName = headers.get('x-minikit-user-displayname');
  const minikitPfpUrl = headers.get('x-minikit-user-pfpurl');

  console.log('BACKEND_RECEIVED_HEADERS:', {
    minikitFid,
    minikitUsername,
    minikitDisplayName,
    minikitPfpUrl,
  });

  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  try {
    // --- Path A: MiniKit Data is Present ---
    if (minikitFid) {
      const minikitUsername = headers.get('x-minikit-user-username')!;
      const minikitDisplayName = headers.get('x-minikit-user-displayname')!;
      const minikitPfpUrl = headers.get('x-minikit-user-pfpurl')!;

      const user = await findOrCreateUserWithFid(minikitFid, minikitUsername, minikitDisplayName, minikitPfpUrl, walletAddress);
      return NextResponse.json(user);
    }

    // --- Path B: No MiniKit Data (Regular Browser Fallback) ---
    const existingAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress.toLowerCase() },
      include: { user: true },
    });

    if (existingAddress) {
      return NextResponse.json(existingAddress.user);
    }

    // If address is new, query Neynar to get Farcaster profile.
    const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY as string });
    let farcasterUser: FarcasterUser | undefined;
    
    try {
      const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });
      const farcasterUserData = result as unknown as Record<string, FarcasterUser[]>;
      farcasterUser = Object.values(farcasterUserData)[0]?.[0];
    } catch (neynarError) {
      console.warn(`Neynar API call failed for address ${walletAddress}. It might not be a Farcaster user.`, neynarError);
    }
    
    // Handle user creation/linking based on Neynar data.
    if (farcasterUser && farcasterUser.fid) {
      const user = await findOrCreateUserWithFid(String(farcasterUser.fid), farcasterUser.username, farcasterUser.display_name, farcasterUser.pfp_url, walletAddress);
      return NextResponse.json(user);
    } else {
      // This is a new user without a Farcaster profile.
      const newUser = await prisma.user.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          username: `user_${walletAddress.slice(2, 10)}`,
          name: 'New User',
          image: '',
        },
      });
      // Link their connecting address.
      await prisma.verifiedAddress.create({
        data: {
          address: walletAddress.toLowerCase(),
          userId: newUser.id,
        },
      });
      return NextResponse.json(newUser);
    }
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

    // Explicitly remove name and username from the update payload
    delete updateData.name;
    delete updateData.username;

    // Ensure tags are handled as an array
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    // Find the user by wallet address case-insensitively first
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: walletAddress,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Now update using the unique ID
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
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