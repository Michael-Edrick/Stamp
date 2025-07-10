"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { SessionProvider } from "next-auth/react";
import { config } from "@/lib/wagmi";

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{props.children}</SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
