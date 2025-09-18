import { NextRequest } from "next/server";
import prisma from "./prisma";

/**
 * A utility function to get the authenticated user from the database
 * based on the wallet address provided in the request search parameters.
 * This is used in place of a full NextAuth session for API routes.
 * @param req The NextRequest object.
 * @returns The user object from the database or null if not found.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  const walletAddress = req.headers.get("x-wallet-address");

  if (!walletAddress) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      walletAddress: {
        equals: walletAddress,
        mode: 'insensitive'
      },
    },
  });

  return user;
}
