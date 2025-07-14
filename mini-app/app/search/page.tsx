"use client";

import Link from "next/link";

export default function SearchPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-[var(--background-main)] text-[var(--text-primary)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-6 h-11">
          <h1 className="text-xl font-bold">Search</h1>
        </header>

        <main className="flex-1">
          <p>Search functionality will be implemented here.</p>
          <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">
            &larr; Back to Home
          </Link>
        </main>
      </div>
    </div>
  );
} 