

function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://stamp-me.vercel.app';

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjExMDc3ODksInR5cGUiOiJhdXRoIiwia2V5IjoiMHgzNDZCMERjY0M3YjZCNmVkN0IzRTQ3NENiNjc0Mjk3NkY4NEQxMjk1In0",
      payload: "eyJkb21haW4iOiJzdGFtcC1tZS52ZXJjZWwuYXBwIn0",
      signature: "TCxSA7kk16cAaU3F1RLo/mTgeyf5PLx6ROF/HlCj0wZDdDA0TISgR4NI2EJEqHdvLx1Nhl3yrUDhaBgkqNSapRw=",
    },
    frame: withValidProperties({
      version: "1",
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [],
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: [],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
    }),
    baseBuilder: {
      allowedAddress: ["0xb33115C3695C6eF84c90E74305544b17885254D1"]
    },
  });
}
