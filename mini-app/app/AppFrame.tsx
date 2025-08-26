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

  return (
    <main 
      style={{ 
        height: '100%',
        paddingTop: `${top}px`,
        paddingBottom: `${bottom}px`,
        boxSizing: 'border-box'
      }}
    >
      {children}
    </main>
  );
}
