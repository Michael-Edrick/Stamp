"use client";

import { useMiniKit } from "@coinbase/onchainkit/minikit";
import React from "react";

export default function AppFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context } = useMiniKit();
  const safeAreaInsets = context?.client?.safeAreaInsets;
  const top = safeAreaInsets?.top ?? 0;
  const bottom = safeAreaInsets?.bottom ?? 0;
  const frameHeight = `calc(100vh - ${top}px - ${bottom}px)`;

  return (
    <main style={{ height: frameHeight, backgroundColor: 'green' }}>
      {children}
    </main>
  );
}
