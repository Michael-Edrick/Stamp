import { MinikitConfig } from "@coinbase/onchainkit/minikit";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const minikitConfig: MinikitConfig = {
  accountAssociation: {
    header: process.env.FARCASTER_HEADER!,
    payload: process.env.FARCASTER_PAYLOAD!,
    signature: process.env.FARCASTER_SIGNATURE!,
  },
  frame: {
    name: "StampMe",
    version: "1",
    iconUrl: process.env.NEXT_PUBLIC_APP_ICON!,
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/hero.png`,
    splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE!,
    splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR!,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE!,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION!,
    primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY!,
    tags: ["social", "messaging", "community"],
  },
};
