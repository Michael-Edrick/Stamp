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
  const URL = process.env.NEXT_PUBLIC_URL;

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjExMDc3ODksInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhhZTA1OWNiN2EyMjIwMDMwNjI3NDY1MjBmMjJmMDM1MkE3MkI1NTYwIn0",
      payload: "eyJkb21haW4iOiJkcmFnb253ci1taW5pa2l0LnZlcmNlbC5hcHAifQ",
      signature: "MHgyZTdkMDkwMDVkMTlhM2VjN2U4NTEwMWE1N2YyZjA5ODEyY2UxNjQwM2Q0NzA1YzVlNTU3MDQwNDY2N2I4Y2Q5N2Q5Nzc4MDdkZjdiYTViOTVlM2VlNmNmMWI3OWUxZTM5NWNmZmRkODE4NGIzMTE4Zjc4YjEzOGFlYTkxZDk4MjFj",
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
  });
}
