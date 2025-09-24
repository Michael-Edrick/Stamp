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
  console.log("--- Webhook POST request received ---");
  try {
    console.log("Step 0: Parsing webhook body...");
    const body = await req.json();
    console.log("Webhook body parsed successfully. Body:", JSON.stringify(body, null, 2));

    // Step 1: Verify the signature. This is for security.
    console.log("Step 1: Verifying webhook signature...");
    const { fid } = await parseWebhookEvent(body, verifyAppKeyWithNeynar);
    console.log(`Webhook signature verified successfully. FID: ${fid}`);

    // Step 2: Find the user in our database.
    console.log(`Step 2: Finding user with FID ${fid}...`);
    const user = await prisma.user.findUnique({
      where: { fid: fid.toString() },
    });

    if (!user) {
      console.warn(`Webhook received for verified FID ${fid} but user not found in database.`);
      return NextResponse.json({ message: 'User not found' }, { status: 200 });
    }
    console.log(`User found successfully. User ID: ${user.id}`);

    // Step 3: Decode the event payload from the original request body.
    console.log("Step 3: Decoding event payload...");
    const eventPayload = decodeBase64Url(body.payload);
    console.log("Event payload decoded successfully. Event:", eventPayload.event);

    switch (eventPayload.event) {
      case 'frame_added':
      case 'notifications_enabled':
        console.log("Handling 'notifications_enabled' event.");
        if (eventPayload.notificationDetails) {
          const { token, url } = eventPayload.notificationDetails;
          console.log(`Saving notification token for user ${user.id}. Token: ${token}, URL: ${url}`);
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
        } else {
          console.warn("'notifications_enabled' event received without notificationDetails.");
        }
        break;

      case 'miniapp_removed':
      case 'notifications_disabled':
        console.log("Handling 'notifications_disabled' event.");
        await prisma.notificationToken.updateMany({
          where: { userId: user.id },
          data: { isActive: false },
        });
        console.log(`Successfully disabled notifications for user ${user.id}`);
        break;

      default:
        console.warn('Received a verified but unknown webhook event type:', eventPayload.event);
        break;
    }

    console.log("--- Webhook processing finished successfully ---");
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });

  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;
    console.error('!!! --- Error processing webhook --- !!!');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Full Error Object:', JSON.stringify(error, null, 2));

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
