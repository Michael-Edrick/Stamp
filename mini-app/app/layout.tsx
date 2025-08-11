import { Inter, Roboto, Chivo_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import { Providers } from "./providers";
import { Toaster } from 'sonner';

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
});

const chivo_mono = Chivo_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-chivo-mono',
});

const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'StampMe';
const heroUrl = `${appUrl}/hero.png`;
// The post_url should point to our dedicated Farcaster sign-in API route.
const postUrl = `${appUrl}/api/farcaster-signin`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{appName}</title>
        <meta name="description" content="A simple app to reach anyone." />

        {/* Farcaster Frame Tags for Mini App */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={heroUrl} />
        <meta property="fc:frame:button:1" content={`Launch ${appName}`} />
        <meta property="fc:frame:button:1:action" content="post" />
        {/* On post, the Farcaster client will POST to this URL.
            Our next.config.mjs rewrite will send this to our API handler. */}
        <meta property="fc:frame:post_url" content={postUrl} /> 
      </head>
      <body className={`${inter.variable} ${roboto.variable} ${chivo_mono.variable} font-sans bg-black`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
