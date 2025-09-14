import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPaidMessageNotification } from "@/lib/notification-client";

/**
 * A temporary GET endpoint to test the push notification functionality for the
 * currently authenticated user.
 *
 * It simulates receiving a paid message and triggers a notification.
 *
 * To use this, you must be logged into the app in your browser and provide
 * your wallet address in the 'x-wallet-address' header.
 */
export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing x-wallet-address header for authentication." },
        { status: 401 }
      );
    }

    // Find the user associated with the provided wallet address.
    const user = await prisma.user.findFirst({
      where: {
        verifiedAddresses: {
          some: {
            address: walletAddress.toLowerCase(),
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found for the provided wallet address." },
        { status: 404 }
      );
    }

    if (!user.fid) {
      return NextResponse.json(
        { error: "The authenticated user does not have a Farcaster ID (FID)." },
        { status: 400 }
      );
    }

    console.log(`Sending test notification for user ID: ${user.id}, FID: ${user.fid}`);

    // Fire-and-forget the notification to simulate the background process.
    sendPaidMessageNotification({
      recipientFid: parseInt(user.fid, 10),
      senderName: "Test System",
      messageContent: "This is a test notification to confirm your setup is working!",
    }).catch(error => {
      console.error("Failed to send test notification in background:", error);
    });

    return NextResponse.json(
      {
        message: `Test notification successfully triggered for FID ${user.fid}. Please check your device.`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error in test-notification endpoint:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
