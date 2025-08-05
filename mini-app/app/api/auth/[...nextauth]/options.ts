import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials) {
        try {
          const siwe = new SiweMessage(JSON.parse(credentials?.message || "{}"));
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");

          const result = await siwe.verify({
            signature: credentials?.signature || "",
            domain: nextAuthUrl.host,
            nonce: siwe.nonce, // The nonce is part of the signed message
          });

          if (result.success) {
            // Find user by wallet address
            let user = await prisma.user.findUnique({
              where: { walletAddress: siwe.address },
            });

            // If user doesn't exist, create a new one
            if (!user) {
              user = await prisma.user.create({
                data: {
                  walletAddress: siwe.address,
                  // You can add default values for username etc. here if you want
                },
              });
            }

            // Check if user is banned
            if (user.isBanned) {
              console.log(`Banned user ${user.walletAddress} attempted to login`);
              return null;
            }

            return {
              id: user.id,
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
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
}; 