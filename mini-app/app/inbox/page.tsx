"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import Link from 'next/link';
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import Inbox from "@/app/components/Inbox";

export default function InboxPage() {
  const { isConnected, isConnecting } = useAccount();
  const router = useRouter();

  useEffect(() => {
    // Wait for connection status to be stable before acting
    if (!isConnected && !isConnecting) {
      router.push("/");
    }
  }, [isConnected, isConnecting, router]);

  if (isConnecting) {
    return <div className="min-h-screen bg-[#DEDEDE] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#DEDEDE] font-sans">
      <header className="fixed top-0 left-0 right-0 z-10 w-full max-w-md mx-auto flex items-center p-4 bg-[#DEDEDE]">
        <Link href="/" className="p-2 -ml-2">
          <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mx-auto">Inbox</h1>
        <div className="w-6 h-6"></div> {/* Spacer */}
      </header>
      <div className="w-full max-w-md mx-auto pt-20 pb-24 px-4">
        <Inbox />
      </div>
    </div>
  );
} 