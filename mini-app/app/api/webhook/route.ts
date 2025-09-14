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

    // Verify the webhook event to ensure it's a valid request from a Farcaster client
    const data = await parseWebhookEvent(body, verifyAppKeyWithNeynar);

    const { fid } = data;

    // Find the user in our database associated with the FID from the webhook
    const user = await prisma.user.findUnique({
      where: { fid: fid.toString() },
    });

    if (!user) {
      console.warn(`Webhook received for FID ${fid} but user not found.`);
      // Return a 200 status because it's not a server error, but we can't process it.
      return NextResponse.json({ message: 'User not found' }, { status: 200 });
    }

    // Use a type assertion to handle the library's complex discriminated union type.
    // This allows us to bypass the build error and handle the nested data structure.
    const eventPayload = data as any;

    // The actual event string (e.g., 'miniapp_added') is nested inside the 'event' object.
    switch (eventPayload.event) {
      // These events signify the user has opted-in to notifications
      case 'miniapp_added':
      case 'notifications_enabled':
        // The notification details are also on this nested object.
        if (eventPayload.notificationDetails) {
          const { token, url } = eventPayload.notificationDetails;
          // Use upsert to create a new token or update an existing one for the user
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
          console.log(`Saved/Updated notification token for user ${user.id}`);
        }
        break;

      // These events signify the user has opted-out
      case 'miniapp_removed':
      case 'notifications_disabled':
        // We can safely use update because a token must exist to be disabled
        await prisma.notificationToken.update({
          where: { userId: user.id },
          data: { isActive: false },
        });
        console.log(`Disabled notifications for user ${user.id}`);
        break;

      default:
        // Log the entire data object for debugging unknown events.
        console.warn('Received an unknown webhook event type:', eventPayload);
        break;
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });

  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;
    console.error('Error processing webhook:', error);

    // Handle verification errors gracefully as per the Farcaster documentation
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
