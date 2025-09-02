import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { FarcasterUser } from '@/types/farcaster';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  try {
    // Step 1: Check if the address is already linked to a user.
    const existingAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress.toLowerCase() },
      include: { user: true },
    });

    if (existingAddress) {
      return NextResponse.json(existingAddress.user);
    }

    // Step 2: If address is new, query Neynar to get Farcaster profile.
    const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY as string });
    let farcasterUser: FarcasterUser | undefined;
    
    try {
      const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });
      const farcasterUserData = result as unknown as Record<string, FarcasterUser[]>;
      farcasterUser = Object.values(farcasterUserData)[0]?.[0];
    } catch (neynarError) {
      console.warn(`Neynar API call failed for address ${walletAddress}. It might not be a Farcaster user.`, neynarError);
    }
    
    // Step 3: Handle user creation/linking based on Neynar data.
    if (farcasterUser && farcasterUser.fid) {
      // We found a Farcaster user for this address.
      const userFid = farcasterUser.fid.toString();

      // Step 3a: Check if a user with this FID already exists in our DB.
      let user = await prisma.user.findUnique({
        where: { fid: userFid },
      });

      if (user) {
        // User exists, so just link the new address to them.
        await prisma.verifiedAddress.create({
          data: {
            address: walletAddress.toLowerCase(),
            userId: user.id,
          },
        });
        return NextResponse.json(user);
      } else {
        // This is a new Farcaster user for our app.
        // Create the user and link all their known addresses.
        const newUser = await prisma.user.create({
          data: {
            fid: userFid,
            username: farcasterUser.username,
            name: farcasterUser.display_name || farcasterUser.username || '',
            image: farcasterUser.pfp_url || '',
            custodyAddress: farcasterUser.custody_address,
            // Keep the old walletAddress field populated for now for backward compatibility
            walletAddress: walletAddress.toLowerCase(), 
          },
        });

        // Link all verified addresses from Neynar to the new user.
        const allAddresses = farcasterUser.verified_addresses?.eth_addresses || [];
        if (!allAddresses.includes(walletAddress.toLowerCase())) {
            allAddresses.push(walletAddress.toLowerCase());
        }
        
        for (const address of allAddresses) {
          await prisma.verifiedAddress.create({
            data: {
              address: address.toLowerCase(),
              userId: newUser.id,
            },
          });
        }
        return NextResponse.json(newUser);
      }
    } else {
      // Step 4: This is a new user without a Farcaster profile.
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