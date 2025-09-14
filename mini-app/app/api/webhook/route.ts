import { NextRequest, NextResponse } from 'next/server';
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from '@farcaster/miniapp-node';
import prisma from '@/lib/prisma';

// Helper function to decode Base64URL encoded strings.
function decodeBase64Url(encoded: string) {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Verify the signature. This is for security.
    const { fid } = await parseWebhookEvent(body, verifyAppKeyWithNeynar);

    // Step 2: Find the user in our database.
    const user = await prisma.user.findUnique({
      where: { fid: fid.toString() },
    });

    if (!user) {
      console.warn(`Webhook received for verified FID ${fid} but user not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 200 });
    }

    // Step 3: Decode the event payload from the original request body.
    // This was the missing step. The event details are inside this decoded object.
    const eventPayload = decodeBase64Url(body.payload);

    switch (eventPayload.event) {
      case 'miniapp_added':
      case 'notifications_enabled':
        if (eventPayload.notificationDetails) {
          const { token, url } = eventPayload.notificationDetails;
          await prisma.notificationToken.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              token,
              providerUrl: url,
              isActive: true,
            },
            update: {
              token,
              providerUrl: url,
              isActive: true,
            },
          });
          console.log(`Successfully saved/updated notification token for user ${user.id}`);
        }
        break;

      case 'miniapp_removed':
      case 'notifications_disabled':
        await prisma.notificationToken.updateMany({
          where: { userId: user.id },
          data: { isActive: false },
        });
        console.log(`Successfully disabled notifications for user ${user.id}`);
        break;

      default:
        console.warn('Received a verified but unknown webhook event type:', eventPayload);
        break;
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });

  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;
    console.error('Error processing webhook:', error);

    switch (error.name) {
      case 'VerifyJsonFarcasterSignature.InvalidDataError':
      case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
        return NextResponse.json({ message: 'Invalid webhook data' }, { status: 400 });
      case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
        return NextResponse.json({ message: 'Invalid app key' }, { status: 401 });
      case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
        return NextResponse.json({ message: 'Internal server error during verification' }, { status: 500 });
      default:
        return NextResponse.json({ message: 'An unknown internal server error occurred' }, { status: 500 });
    }
  }
}
