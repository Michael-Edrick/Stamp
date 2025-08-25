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

  // Do not render the children until the safeAreaInsets are available and non-zero.
  // This prevents the layout from rendering with the incorrect initial height (100vh)
  // before the host app has provided the correct dimensions.
  if (!safeAreaInsets || (safeAreaInsets.top === 0 && safeAreaInsets.bottom === 0)) {
    // Returning null is the cleanest way to prevent the broken layout from flashing.
    return null; 
  }

  const top = safeAreaInsets.top;
  const bottom = safeAreaInsets.bottom;
  const frameHeight = `calc(100vh - ${top}px - ${bottom}px)`;

  return (
    <main style={{ height: frameHeight }}>
      {children}
    </main>
  );
}
