import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { User } from 'next-auth';
import { SignJWT } from 'jose';
import { getJwtSecretKey } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const {
            trustedData: { messageBytes },
        } = await req.json();

        const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! });

        const { valid, action } = await client.validateFrameAction(messageBytes);

        if (!valid || !action) {
            return NextResponse.json({ error: 'Invalid frame action' }, { status: 400 });
        }

        const custodyAddress = action.interactor.custody_address;
        const neynarUserResponse = await client.fetchBulkUsers({ fids: [action.interactor.fid] });
        const neynarUser = neynarUserResponse.users[0];
        
        if (!custodyAddress) {
            return NextResponse.json({ error: 'No custody address found for user' }, { status: 400 });
        }

        const user = await prisma.user.upsert({
            where: { custodyAddress: custodyAddress },
            update: {
                fid: neynarUser.fid.toString(),
                username: neynarUser.username,
                displayName: neynarUser.display_name,
                pfpUrl: neynarUser.pfp_url,
            },
            create: {
                custodyAddress: custodyAddress,
                fid: neynarUser.fid.toString(),
                username: neynarUser.username,
                displayName: neynarUser.display_name,
                pfpUrl: neynarUser.pfp_url,
                // Ensure walletAddress is also set on creation if possible, or handle cases where it might be null
                walletAddress: custodyAddress, 
            }
        });

        const token = await new SignJWT({
            id: user.id,
            fid: user.fid,
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(getJwtSecretKey());

        const response = NextResponse.redirect(process.env.NEXT_PUBLIC_URL!, { status: 302 });
        
        response.cookies.set('next-auth.session-token', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;

    } catch (error) {
        console.error('Farcaster sign-in error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
