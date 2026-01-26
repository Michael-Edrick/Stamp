import { Inter, Roboto, Chivo_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Toaster } from 'sonner';
import AppFrame from "./AppFrame";
import Script from 'next/script';
import "./peel.css"; // Correct import path

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://stamp-lucid.vercel.app';
  const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Stamp';

  const frameMetadata = {
    version: "next",
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
    button: {
      title: `Launch ${appName}`,
      action: {
        type: "launch_frame",
        name: appName,
        url: URL,
        splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
        splashBackgroundColor:
          process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      },
    },
  };

  return {
    title: appName,
    description: "A simple app to reach anyone.",
    other: {
      "fc:miniapp": JSON.stringify(frameMetadata),
      "fc:frame": JSON.stringify(frameMetadata),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${roboto.variable} ${chivo_mono.variable} font-sans h-full`} style={{ backgroundColor: '#DEDEDE' }}>
        <Providers>
          <AppFrame>
            {children}
          </AppFrame>
          <Toaster />
          <Script src="/peel.js" strategy="beforeInteractive" />
        </Providers>
      </body>
    </html>
  );
}
