"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { SessionProvider } from "next-auth/react";
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base } from 'viem/chains';
import { config } from "@/lib/wagmi";

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
            <MiniKitProvider
                apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
                chain={base}
                config={{
                    appearance: {
                        mode: 'auto',
                        theme: 'snake',
                        name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
                        logo: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_ICON_URL,
                    }
                }}
            >
                {props.children}
            </MiniKitProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
