import { Inter, Roboto, Chivo_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'ReachMe',
    description: "A simple app to reach anyone.",
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: `${URL}/hero.png`,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'ReachMe'}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'ReachMe',
            url: URL,
            splashImageUrl: `${URL}/splash.png`,
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} ${chivo_mono.variable} font-sans bg-black`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
