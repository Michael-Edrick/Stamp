import type { FrameNotificationDetails } from "@farcaster/frame-sdk";

// TODO: Re-implement this with Prisma and PostgreSQL

export async function getUserNotificationDetails(
  fid: number,
): Promise<FrameNotificationDetails | null> {
  console.log('getUserNotificationDetails not implemented', fid);
    return null;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails,
): Promise<void> {
  console.log('setUserNotificationDetails not implemented', fid, notificationDetails);
}

export async function deleteUserNotificationDetails(
  fid: number,
): Promise<void> {
  console.log('deleteUserNotificationDetails not implemented', fid);
}
