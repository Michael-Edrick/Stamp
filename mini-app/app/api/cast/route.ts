import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export async function POST(req: NextRequest) {
  try {
    const { recipientUsername } = await req.json();

    if (!recipientUsername) {
      return NextResponse.json({ error: 'recipientUsername is required' }, { status: 400 });
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    const signerUuid = process.env.NEYNAR_SIGNER_UUID; 

    if (!neynarApiKey || !signerUuid) {
      console.error("Neynar API Key or Signer UUID are not set in environment variables.");
      return NextResponse.json({ error: 'Server configuration error for Farcaster.' }, { status: 500 });
    }

    const neynarClient = new NeynarAPIClient({ apiKey: neynarApiKey } as { apiKey: string });

    const app_link = "https://app.stampme.xyz";
    const castText = `Hey @${recipientUsername}! You've received a new paid message on StampMe. Check your inbox to read it and claim your funds: ${app_link}`;
    
    const castResponse = await neynarClient.publishCast(signerUuid, { text: castText });

    return NextResponse.json({ success: true, message: 'Cast submitted successfully via Neynar', data: castResponse }, { status: 200 });

  } catch (error: any) {
    console.error('Error submitting cast via Neynar:', error);
    
    if (error.response) {
      console.error('Neynar API Response Error:', JSON.stringify(error.response.data, null, 2));
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    const errorDetails = error.response ? error.response.data : errorMessage;
    
    return NextResponse.json({ error: 'Internal Server Error', details: errorDetails }, { status: 500 });
  }
}
