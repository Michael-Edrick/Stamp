import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import prisma from "@/lib/prisma";
import { encode } from 'next-auth/jwt';

// Helper function to fetch user data from Neynar
async function getFarcasterUser(address: string) {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
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


export async function POST(req: NextRequest) {
  try {
    console.log("POST request received on /api/farcaster-signin");
    const body = await req.json();

    const {
        trustedData: { messageBytes },
    } = body;

    if (!process.env.NEYNAR_API_KEY) {
        throw new Error("NEYNAR_API_KEY is not set");
    }

    const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY });

    const {
        valid,
        action,
    } = await client.validateFrameAction(messageBytes);
    
    if (!valid) {
        console.error("Invalid frame action");
        return new NextResponse("Invalid Frame Action", { status: 400 });
    }

    const custodyAddress = action.interactor.custody_address;
    if (!custodyAddress) {
        console.error("Could not get custody address from frame action");
        return new NextResponse("Could not get custody address", { status: 400 });
    }

    console.log("Validated Farcaster user, address:", custodyAddress);

    const farcasterUser = await getFarcasterUser(custodyAddress);
            
    const userData = {
        walletAddress: custodyAddress,
        name: farcasterUser?.display_name || farcasterUser?.username,
        username: farcasterUser?.username,
        image: farcasterUser?.pfp_url,
    };

    const user = await prisma.user.upsert({
        where: { walletAddress: custodyAddress },
        update: { ...userData },
        create: { ...userData },
    });

    const sessionToken = await encode({
        token: {
            sub: user.id,
            name: user.name,
            image: user.image,
        },
        secret: process.env.NEXTAUTH_SECRET!,
        maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    const homeUrl = new URL("/", req.url);
    const response = NextResponse.redirect(homeUrl, { status: 302 });
    
    // Set the session cookie
    response.cookies.set({
        name: process.env.NODE_ENV === 'production' 
            ? '__Secure-next-auth.session-token' 
            : 'next-auth.session-token',
        value: sessionToken,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    
    return response;

  } catch (error) {
    console.error("Error in POST handler:", error);
    const homeUrl = new URL("/", req.url);
    return NextResponse.redirect(homeUrl, { status: 302 });
  }
}
