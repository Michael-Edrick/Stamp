import { NextRequest, NextResponse } from 'next/server';
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from '@farcaster/miniapp-node';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Verify the webhook signature. This function will throw an error if
    // the signature is invalid. It returns the verified FID.
    const { fid } = await parseWebhookEvent(body, verifyAppKeyWithNeynar);

    // Step 2: Find the user in our database associated with the verified FID.
    const user = await prisma.user.findUnique({
      where: { fid: fid.toString() },
    });

    if (!user) {
      console.warn(`Webhook received for FID ${fid} but user not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 200 });
    }

    // Step 3: Use the original (and now trusted) request body to get the event details.
    // The event payload is NOT returned by the verification function.
    const eventPayload = body;

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
