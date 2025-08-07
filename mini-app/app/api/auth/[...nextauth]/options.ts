import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import prisma from "@/lib/prisma";

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
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        try {
          const siwe = new SiweMessage(JSON.parse(credentials?.message || "{}"));
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");

          const result = await siwe.verify({
            signature: credentials?.signature || "",
            domain: nextAuthUrl.host,
            nonce: siwe.nonce,
          });

          if (result.success) {
            const farcasterUser = await getFarcasterUser(siwe.address);
            
            // Data to be saved or updated in the database
            const userData = {
              walletAddress: siwe.address,
              fid: farcasterUser?.fid?.toString(),
              name: farcasterUser?.display_name || farcasterUser?.username,
              image: farcasterUser?.pfp_url,
            };

            const user = await prisma.user.upsert({
              where: { walletAddress: siwe.address },
              update: {
                fid: farcasterUser?.fid?.toString(),
                name: farcasterUser?.display_name || farcasterUser?.username,
                image: farcasterUser?.pfp_url,
              },
              create: {
                walletAddress: siwe.address,
                fid: farcasterUser?.fid?.toString(),
                name: farcasterUser?.display_name || farcasterUser?.username || `${siwe.address.slice(0, 6)}...${siwe.address.slice(-4)}`,
                image: farcasterUser?.pfp_url,
              },
            });

            // Check if user is banned
            if (user.isBanned) {
              console.log(`Banned user ${user.walletAddress} attempted to login`);
              return null;
            }

            return {
              id: user.id,
              name: user.name,
              image: user.image,
              fid: user.fid,
            };
          }
          return null;
        } catch (e) {
          console.error("Authentication error:", e);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // This callback is called whenever a JWT is created or updated.
    async jwt({ token, user }) {
      if (user) {
        // When a user successfully signs in, the 'user' object from 'authorize' is passed here.
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
