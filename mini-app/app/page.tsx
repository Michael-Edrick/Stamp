"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount, useSignMessage, useConnect, useDisconnect } from "wagmi";
import { injected } from 'wagmi/connectors'
import { SiweMessage } from "siwe";
import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar } from "@coinbase/onchainkit/identity";
import Link from "next/link";

// --- Main App Component ---

export default function App() {
  const { address, isConnected, chainId, status: accountStatus } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: session, status: sessionStatus } = useSession();
  const { disconnect } = useDisconnect();
  const [profiles, setProfiles] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const hasAttemptedSignIn = useRef(false);

  useEffect(() => {
    if (isConnected && sessionStatus === "unauthenticated" && !hasAttemptedSignIn.current) {
      hasAttemptedSignIn.current = true;
      handleSignIn();
    }
    if (!isConnected) {
      hasAttemptedSignIn.current = false;
    }
  }, [isConnected, sessionStatus]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mock profile fetching
  useEffect(() => {
    const mockProfiles = [
      { id: '0x1234567890123456789012345678901234567890', name: 'Clemens Scherf', username: 'Clemens' },
      { id: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Vitalik Buterin', username: 'vitalik' },
    ];
    setProfiles(mockProfiles as any);
  }, []);

  const handleSignIn = async () => {
    if (!address || !chainId) {
      console.error("Wallet not fully connected, cannot sign in.");
      hasAttemptedSignIn.current = false; // Allow retry
      return;
    }
    try {
        const nonceRes = await fetch('/api/auth/nonce');
        const { nonce } = await nonceRes.json();

        const message = new SiweMessage({
            domain: window.location.host,
            address: address,
            statement: "Sign in with Ethereum to the app.",
            uri: window.location.origin,
            version: "1",
            chainId: chainId,
            nonce: nonce,
        });

        const signature = await signMessageAsync({
            message: message.prepareMessage(),
        });

        await signIn("credentials", {
            message: JSON.stringify(message),
            redirect: false,
            signature,
        });

    } catch (error) {
        console.error("Sign-in error", error);
        hasAttemptedSignIn.current = false; // Allow retry on error
    }
  };

  const handleSignOut = () => {
    disconnect();
    signOut();
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[var(--background-main)] text-[var(--text-primary)]">
      <div className="w-full max-w-md mx-auto px-4 py-3 pb-28">
        <header className="flex justify-between items-center mb-6 h-11">
            <h1 className="text-xl font-bold">New Mail!</h1>
            <div>
                {isClient && (<>
                  {sessionStatus === "authenticated" ? (
                      <button onClick={handleSignOut} className="bg-red-500 text-white px-4 py-2 rounded-lg">Sign Out</button>
                  ) : (
                      <CustomConnectButton />
                  )}
                </>)}
            </div>
        </header>

        <main className="flex-1">
            {profiles.map((profile, index) => (
                <ProfileCard key={index} profile={profile} />
            ))}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

const CustomConnectButton = () => {
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  if (isConnected) {
    return null;
  }

  return (
    <button onClick={() => connect({ connector: injected() })} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
      Sign In
    </button>
  );
};

const ProfileCard = ({ profile }: { profile: any }) => (
  <div className="bg-[var(--background-card)] rounded-2xl p-4 mb-4 shadow-sm">
    <div className="flex items-center">
      <Avatar address={profile.id as `0x${string}`} className="w-10 h-10 rounded-full mr-4" />
      <div>
        <p className="font-bold text-lg">{profile.name || "Anonymous"}</p>
        <p className="text-sm text-[var(--text-muted)]">@{profile.username || profile.id.slice(0, 8)}</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="bg-[var(--accent-blue)] text-white text-xs font-semibold px-2 py-1 rounded-full">BASE</span>
      <span className="bg-[var(--accent-orange)] text-white text-xs font-semibold px-2 py-1 rounded-full">LBS</span>
      <span className="bg-[var(--accent-purple)] text-white text-xs font-semibold px-2 py-1 rounded-full">WEB 3</span>
    </div>
  </div>
);

const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto h-24 bg-transparent flex justify-center items-center">
        <div className="flex items-center justify-between bg-black rounded-full shadow-lg p-2 w-48">
            <button className="p-3 rounded-full bg-gray-700 cursor-not-allowed" disabled><SearchIcon /></button>
            <Link href="/inbox" className="p-3 rounded-full hover:bg-gray-800"><MessageIcon /></Link>
            <Link href="/new-message" className="p-3 rounded-full bg-blue-600 hover:bg-blue-700"><PlusIcon /></Link>
        </div>
    </div>
);

const SearchIcon = () => (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>);
const MessageIcon = () => (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>);
const PlusIcon = () => (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>);
