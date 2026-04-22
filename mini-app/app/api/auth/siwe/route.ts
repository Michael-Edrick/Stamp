import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { parseSiweMessage } from 'viem/siwe';
import { encode } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { FarcasterUser } from '@/types/farcaster';

const baseClient = createPublicClient({ chain: base, transport: http() });
const baseSepoliaClient = createPublicClient({ chain: baseSepolia, transport: http() });

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json({ error: 'message and signature are required' }, { status: 400 });
    }

    // Parse the SIWE message to determine chain
    const siweFields = parseSiweMessage(message);

    if (!siweFields.address) {
      return NextResponse.json({ error: 'Invalid SIWE message: missing address' }, { status: 400 });
    }

    const client = siweFields.chainId === baseSepolia.id ? baseSepoliaClient : baseClient;

    // Verify the signature
    const valid = await client.verifySiweMessage({
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const walletAddress = siweFields.address.toLowerCase();

    // Look up or create user by wallet address
    let user;
    const existingAddress = await prisma.verifiedAddress.findUnique({
      where: { address: walletAddress },
      include: { user: true },
    });

    if (existingAddress) {
      user = existingAddress.user;
    } else {
      // Try Neynar lookup by wallet address to get Farcaster profile
      const neynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! });
      let farcasterUser: FarcasterUser | undefined;
      try {
        const result = await neynarClient.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });
        const data = result as unknown as Record<string, FarcasterUser[]>;
        farcasterUser = Object.values(data)[0]?.[0];
      } catch (e) {
        console.warn('Neynar lookup failed during SIWE auth, will create wallet-only user:', e);
      }

      if (farcasterUser?.fid) {
        user = await prisma.user.upsert({
          where: { fid: String(farcasterUser.fid) },
          update: {
            username: farcasterUser.username,
            name: farcasterUser.display_name,
            image: farcasterUser.pfp_url,
          },
          create: {
            fid: String(farcasterUser.fid),
            username: farcasterUser.username,
            name: farcasterUser.display_name,
            image: farcasterUser.pfp_url,
            custodyAddress: farcasterUser.custody_address,
            walletAddress: walletAddress,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            walletAddress: walletAddress,
            username: `user_${walletAddress.slice(2, 10)}`,
            name: 'New User',
            image: '',
          },
        });
      }

      await prisma.verifiedAddress.upsert({
        where: { address: walletAddress },
        update: { userId: user.id },
        create: { address: walletAddress, userId: user.id },
      });
    }

    // Issue a JWT using NextAuth's own encoder so useSession + getServerSession can read it
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        fid: user.fid ?? undefined,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('next-auth.session-token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('SIWE auth error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
