import { NextResponse } from 'next/server';

export async function GET() {
  // Account Association from env
  const accountAssociationHeader = process.env.FARCASTER_HEADER;
  const accountAssociationPayload = process.env.FARCASTER_PAYLOAD;
  const accountAssociationSignature = process.env.FARCASTER_SIGNATURE;

  // Frame details from env
  const appUrl = process.env.NEXT_PUBLIC_URL;
  const appIcon = process.env.NEXT_PUBLIC_APP_ICON;
  const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME;
  const appSubtitle = process.env.NEXT_PUBLIC_APP_SUBTITLE;
  const appDescription = process.env.NEXT_PUBLIC_APP_DESCRIPTION;
  const appSplashImage = process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE;
  const appSplashBackgroundColor = process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR;
  const appPrimaryCategory = process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY;

  // Check for mandatory variables
  if (!accountAssociationSignature || !accountAssociationHeader || !accountAssociationPayload || !appUrl) {
    console.error("One or more required Farcaster environment variables are not set.");
    return NextResponse.json({ error: "Server configuration error: Missing Farcaster configuration." }, { status: 500 });
  }

  const farcasterJson = {
    "frame": {
      "name": appName,
      "version": "1",
      "iconUrl": appIcon,
      "homeUrl": appUrl,
      "imageUrl": `${appUrl}/hero.png`,
      "splashImageUrl": appSplashImage,
      "splashBackgroundColor": appSplashBackgroundColor,
      "webhookUrl": `${appUrl}/api/webhook`,
      "subtitle": appSubtitle,
      "description": appDescription,
      "primaryCategory": appPrimaryCategory,
      "tags": [
        "social",
        "messaging",
        "community"
      ]
    },
    "accountAssociation": {
      "header": accountAssociationHeader,
      "payload": accountAssociationPayload,
      "signature": accountAssociationSignature
    }
  };

  return NextResponse.json(farcasterJson);
}
