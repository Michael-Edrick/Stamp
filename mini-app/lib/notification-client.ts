import prisma from '@/lib/prisma';

// Define the structure of the notification payload for our specific use case.
interface PaidMessageNotification {
  recipientFid: number;
  senderName: string;
  messageContent: string;
}

/**
 * Sends a push notification to a user for a paid message.
 * This function handles fetching the user's notification token and making the
 * POST request to the Farcaster client's notification server.
 */
export async function sendPaidMessageNotification(notification: PaidMessageNotification) {
  const { recipientFid, senderName, messageContent } = notification;

  try {
    // Find the user and their active notification token from the database.
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
          take: 1, // We only need one active token.
        },
      },
    });

    // If no active token is found, we cannot send a notification.
    if (!userWithToken || !userWithToken.notificationTokens.length) {
      console.log(`No active notification token found for FID ${recipientFid}. Skipping.`);
      return;
    }

    const { token, providerUrl } = userWithToken.notificationTokens[0];

    // Construct the request body according to the Farcaster notification spec.
    // NOTE: The Farcaster spec uses 'notificationId', 'title', 'body', etc.
    // on the top-level object, not nested under a 'notification' key.
    const requestBody = {
      notificationId: `paid-message-${Date.now()}`,
      title: `You received a paid message from ${senderName}!`,
      body: `"${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`,
      targetUrl: 'https://stamp-me.vercel.app/inbox',
      tokens: [token],
    };

    console.log(`Sending notification to FID ${recipientFid}...`);

    // Manually make the POST request as per the Farcaster documentation.
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Notification server responded with ${response.status}: ${errorBody}`);
    }

    const result = await response.json();

    // Log the entire raw response from the notification server for debugging.
    console.log("Received response from Farcaster notification server:", JSON.stringify(result, null, 2));

    // Handle tokens that the notification server reports as no longer valid.
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      console.warn('Deactivating invalid tokens:', result.invalidTokens);
      await prisma.notificationToken.updateMany({
        where: {
          token: { in: result.invalidTokens },
        },
        data: {
          isActive: false,
        },
      });
    }

    console.log('Notification sent successfully to tokens:', result.successfulTokens);

  } catch (error) {
    console.error(`Failed to send notification to FID ${recipientFid}:`, error);
    // This is a background task, so we log the error but don't re-throw it,
    // as it should not block the main API response flow.
  }
}
