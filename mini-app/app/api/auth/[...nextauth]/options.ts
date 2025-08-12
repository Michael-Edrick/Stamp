import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import prisma from "@/lib/prisma";

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// Helper function to fetch user data from Neynar
async function getFarcasterUser(address: string) {
    if (!NEYNAR_API_KEY) {
        console.error("NEYNAR_API_KEY is not set.");
        return null;
    }
    // Note: The endpoint is for a single address, but Neynar's API uses 'bulk-by-address' for this.
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;
    try {
        const response = await fetch(url, {
            headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
        });
        if (!response.ok) {
            console.error(`Neynar API failed with status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        // The endpoint returns a map where the key is the address
        return data.users[address]?.[0] || null;
    } catch (error) {
        console.error("Error fetching from Neynar API:", error);
        return null;
    }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // CredentialsProvider has been removed as we are no longer using SIWE for login.
    // Farcaster frame authentication is handled by the /api/farcaster-signin route,
    // and manual wallet connection does not require a backend session.
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // This callback is called whenever a JWT is created or updated.
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.fid) {
          token.fid = user.fid;
        }
      }
      return token;
    },
    // This callback is called whenever a session is checked.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        if (token.fid) {
          session.user.fid = token.fid as string;
        }
      }
      return session;
    },
  },
};
