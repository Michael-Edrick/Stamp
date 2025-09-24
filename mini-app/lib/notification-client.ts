import prisma from '@/lib/prisma';

// Define the structure of the notification payload for our specific use case.
interface PaidMessageNotification {
  recipientFid: number;
  senderName: string;
  messageContent: string;
  amount: number;
}

/**
 * Sends a push notification to a Farcaster client for a paid message.
 * This function finds the user's active notification token and makes a
 * POST request to the Farcaster client's notification server.
 */
export async function sendPaidMessageNotification(notification: PaidMessageNotification) {
  const { recipientFid, senderName, messageContent, amount } = notification;

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
      return;
    }

    const { token, providerUrl } = userWithToken.notificationTokens[0];

    // Construct the request body according to the Farcaster notification spec.
    const requestBody = {
      notificationId: `paid-message-${Date.now()}`,
      title: "StampMe",
      body: `${senderName} sent you a priority DM with $${amount}`,
      targetUrl: 'https://stamp-me.vercel.app/',
      tokens: [token],
    };

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

    // Handle tokens that the notification server reports as no longer valid.
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await prisma.notificationToken.updateMany({
        where: {
          token: { in: result.invalidTokens },
        },
        data: {
          isActive: false,
        },
      });
    }

  } catch (error) {
    console.error(`Failed to send notification to FID ${recipientFid}:`, error);
    // This is a background task, so we log the error but don't re-throw it,
    // as it should not block the main API response flow.
  }
}
