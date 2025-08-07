

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://stamp-me.vercel.app';

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjExMDc3ODksInR5cGUiOiJhdXRoIiwia2V5IjoiMHgzNDZCMERjY0M3YjZCNmVkN0IzRTQ3NENiNjc0Mjk3NkY4NEQxMjk1In0",
      payload: "eyJkb21haW4iOiJzdGFtcC1tZS52ZXJjZWwuYXBwIn0",
      signature: "TCxSA7kk16cAaU3F1RLo/mTgeyf5PLx6ROF/HlCj0wZDdDA0TISgR4NI2EJEqHdvLx1Nhl3yrUDhaBgkqNSapRw=",
    },
    frame: {
      version: "1",
      name: "StampMe",
      imageUrl: `${URL}/hero.png`,
      iconUrl: `${URL}/icon.png`,
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      splashImageUrl: `${URL}/splash.png`,
      splashBackgroundColor: "#000000",
      buttonTitle: "Launch StampMe"
    },
  });
}
