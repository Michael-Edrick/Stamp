import {
  FrameNotificationDetails,
  type SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { getUserNotificationDetails } from "@/lib/notification";
import { sendNotification } from '@farcaster/miniapp-node';
import prisma from '@/lib/prisma';

const appUrl = process.env.NEXT_PUBLIC_URL || "";

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotification({
  fid,
  title,
  body,
  notificationDetails,
}: {
  fid: number;
  title: string;
  body: string;
  notificationDetails?: FrameNotificationDetails | null;
}): Promise<SendFrameNotificationResult> {
  if (!notificationDetails) {
    notificationDetails = await getUserNotificationDetails(fid);
  }
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  const response = await fetch(notificationDetails.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: appUrl,
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    if (responseBody.success === false) {
      return { state: "error", error: responseBody.error.errors };
    }

    if (responseBody.data.result.rateLimitedTokens.length) {
      return { state: "rate_limit" };
    }

    return { state: "success" };
  }

  return { state: "error", error: responseJson };
}

// Define the structure of the notification payload
interface PaidMessageNotification {
  recipientFid: number;
  senderName: string;
  messageContent: string;
}

export async function sendPaidMessageNotification(notification: PaidMessageNotification) {
  const { recipientFid, senderName, messageContent } = notification;

  try {
    // Find the user and their active notification token from the database
    const userWithToken = await prisma.user.findFirst({
      where: {
        fid: recipientFid.toString(),
        notificationTokens: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        notificationTokens: {
          where: {
            isActive: true,
          },
        },
      },
    });

    // If no active token is found, we cannot send a notification
    if (!userWithToken || !userWithToken.notificationTokens.length) {
      console.log(`No active notification token found for FID ${recipientFid}. Skipping notification.`);
      return;
    }

    const { token, providerUrl } = userWithToken.notificationTokens[0];

    // Construct the notification payload
    const notificationPayload = {
      tokens: [token],
      notification: {
        // Use a timestamp to ensure the notification ID is unique per message
        notificationId: `paid-message-${Date.now()}`,
        title: `You received a paid message from ${senderName}!`,
        body: `"${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`,
        // This URL will open the app directly to the inbox
        targetUrl: 'https://stamp-me.vercel.app/inbox', 
      },
    };

    console.log(`Sending notification to FID ${recipientFid}...`);
    
    // Send the notification using the Farcaster library
    const result = await sendNotification(providerUrl, notificationPayload);

    // Handle tokens that are no longer valid
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      console.warn('Found invalid tokens:', result.invalidTokens);
      // Deactivate the invalid tokens in the database
      await prisma.notificationToken.updateMany({
        where: {
          token: {
            in: result.invalidTokens,
          },
        },
        data: {
          isActive: false,
        },
      });
    }

    console.log('Notification sent successfully:', result.successfulTokens);
  } catch (error) {
    console.error(`Failed to send notification to FID ${recipientFid}:`, error);
    // Do not throw the error, as this is a background process
    // and should not block the main API response.
  }
}
