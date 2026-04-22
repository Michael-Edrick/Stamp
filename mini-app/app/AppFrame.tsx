"use client";

import React from "react";

export default function AppFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main style={{ height: "100vh" }}>
      {children}
    </main>
  );
}
