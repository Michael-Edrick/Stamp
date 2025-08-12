"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from 'next/link';
import { UserCircleIcon, PaperAirplaneIcon, MagnifyingGlassIcon, ChatBubbleOvalLeftEllipsisIcon, PlusIcon } from '@heroicons/react/24/solid';
import { User as PrismaUser } from '@prisma/client';
import CustomAvatar from '@/app/components/CustomAvatar';

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import SearchModal from '@/app/components/SearchModal';

type Profile = Partial<PrismaUser> & {
  avatar?: string;
  tags?: string[];
  x_social?: string;
  instagram?: string;
};


/*
const dummyUsers: Profile[] = [
  {
    id: '1',
    name: 'Clemens Scherf',
    username: 'Clemens',
    avatar: 'https://i.pravatar.cc/150?u=clemens',
    bio: 'Founder of the London Blockchain Society, UK country lead at Base. Interested in entrepreneurship and emerging technology.',
    tags: ['BASE', 'LBS', 'WEB 3', 'LUCID', 'BLOCKCHAIN', 'MINI APPS', 'ICEBREAK'],
  },
  {
    id: '2',
    name: 'Jane Doe',
    username: 'janedoe',
    avatar: 'https://i.pravatar.cc/150?u=jane',
    bio: 'Web3 enthusiast and digital artist. Exploring the frontiers of decentralized technology and creativity.',
    tags: ['ART', 'NFT', 'DECENTRALIZATION', 'ETH', 'CREATOR'],
  },
  {
    id: '3',
    name: 'John Smith',
    username: 'johnsmith',
    avatar: 'https://i.pravatar.cc/150?u=john',
    bio: 'Building the future of finance with DeFi. Full-stack developer and open-source contributor.',
    tags: ['DEFI', 'SOLIDITY', 'DEVELOPER', 'FINTECH'],
  },
];
*/

const SocialLink = ({ platform, handle }: { platform: 'Instagram' | 'X', handle: string }) => {
    const Icon = () => platform === 'Instagram'
        ? <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.2,5.2 0 0,1 16.2,21.4H7.8C4.6,21.4 2,18.8 2,15.6V7.8A5.2,5.2 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" /></svg>
        : <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;

    return (
         <div className="flex items-center justify-between text-sm py-2">
          <div className="flex items-center text-gray-800">
            <Icon />
            <span className="ml-2">@{handle}</span>
          </div>
          <span className="text-blue-500 text-xs font-bold">verified</span>
        </div>
    );
};

const Tag = ({ text, color }: { text: string, color: string }) => (
  <div className={`text-xs text-white font-semibold px-2.5 py-1 rounded-full`} style={{ backgroundColor: color }}>
    {text}
  </div>
);

const UserCard = ({ user }: { user: Profile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tagColors = ['#4A90E2', '#F5A623', '#9013FE', '#4CAF50', '#2196F3', '#FF5722', '#607D8B'];
  
  // Use user's tags if they exist and are not empty, otherwise use a default set for display
  const userTags = user.tags && user.tags.length > 0 ? user.tags : [];
  const displayedTags = isExpanded ? userTags : userTags.slice(0, 4);

  return (
    <div 
      className="bg-white rounded-3xl p-4 shadow-md mb-4 border border-gray-200 transition-all duration-300 ease-in-out cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
            <CustomAvatar profile={user} className="w-10 h-10 rounded-full mr-3" />
            <div>
                <p className="font-bold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
        </div>
        <Link href={`/chat/${user.id}`} onClick={(e) => e.stopPropagation()}>
            <PaperAirplaneIcon className="w-6 h-6 text-blue-500 -rotate-45 cursor-pointer hover:scale-110 transition-transform" />
        </Link>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-gray-700 text-sm mb-4">{user.bio || 'No bio provided.'}</p>
          {user.x_social &&
            <SocialLink platform="X" handle={user.x_social} />
          }
          {user.instagram &&
            <SocialLink platform="Instagram" handle={user.instagram} />
          }
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {displayedTags.map((tag: string, index: number) => (
          <Tag key={tag} text={tag} color={tagColors[index % tagColors.length]} />
        ))}
        {!isExpanded && userTags.length > 4 && (
          <div className="text-xs font-bold text-gray-500">
            +{userTags.length - 4}
          </div>
        )}
      </div>
    </div>
  );
};


export default function HomePage() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
    const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const { disconnect } = useDisconnect();
  const [realUsers, setRealUsers] = useState<Profile[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
      const hasAttemptedSignIn = useRef(false);
  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users: Profile[] = await response.json();
      console.log("Fetched users:", users); // Added for debugging
      setRealUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    fetchUsers();
  }, [fetchUsers]);

  const handleSignIn = useCallback(async () => {
    if (!address || !chainId) {
      console.error("Wallet not fully connected, cannot sign in.");
      hasAttemptedSignIn.current = false; // Reset on failure
      return;
    }
    // This check is now only for manual sign-in flows, not the primary Farcaster path.
    // The network switch will be handled at the point of transaction.
    // if (chainId !== baseSepolia.id) {
    //   alert(`Please switch to the ${baseSepolia.name} network to sign in.`);
    //   hasAttemptedSignIn.current = false;
    //   return;
    // }
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
                const signature = await signMessageAsync({ message: message.prepareMessage() });
        const result = await signIn("credentials", { message: JSON.stringify(message), redirect: false, signature });

        if (result?.ok) {
            await updateSession(); // Force session update
            await fetchUsers(); // Re-fetch users to update the list
        } else {
            throw new Error("Sign-in failed after signature.");
        }
    } catch (error) {
        console.error("Sign-in error", error);
        hasAttemptedSignIn.current = false;
    }
  }, [address, chainId, signMessageAsync, updateSession, fetchUsers]);

  useEffect(() => {
    if (isConnected && sessionStatus === 'unauthenticated' && !hasAttemptedSignIn.current) {
        console.log("Wallet connected automatically, attempting SIWE.");
        hasAttemptedSignIn.current = true;
        handleSignIn();
    }
  }, [isConnected, sessionStatus, handleSignIn]);

  const handleSignOut = () => {
    disconnect();
    signOut();
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans">
       <header className="fixed top-0 left-0 right-0 z-10 w-full max-w-md mx-auto flex justify-between items-center p-4 bg-[#F0F2F5]">
          <h1 className="text-xl font-bold text-gray-900">StampMe</h1>
          <div>
              {isClient && (<>
                {sessionStatus === "authenticated" ? (
                    <button onClick={handleSignOut} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Sign Out</button>
                ) : (
                    <ConnectWallet />
                )}
              </>)}
          </div>
      </header>
      <div className="w-full max-w-md mx-auto pt-20 pb-24 px-4">
        {/* {dummyUsers.map(user => (
          <UserCard key={user.id} user={user} />
        ))} */}
        {realUsers.map((user) => (
            <UserCard key={user.id} user={user} />
        ))}
      </div>
       <BottomNav 
        currentUser={session?.user as Profile} 
        isClient={isClient}
        onSearchClick={() => setIsSearchModalOpen(true)}
       />
       {isSearchModalOpen && <SearchModal onClose={() => setIsSearchModalOpen(false)} />}
    </div>
  );
}

const BottomNav = ({ currentUser, isClient, onSearchClick }: { currentUser?: Profile, isClient: boolean, onSearchClick: () => void }) => {
    const navButtonBase = "w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110";

    return (
        <div className="fixed bottom-6 left-0 right-0 w-full flex justify-center items-center">
            <div className="flex items-center justify-center gap-x-4 bg-black rounded-full shadow-lg p-3">
                <button className={`${navButtonBase} bg-neutral-800`} onClick={onSearchClick}>
                    <MagnifyingGlassIcon className="w-7 h-7 text-white"/>
                </button>
                <Link href="/inbox" className={`${navButtonBase} bg-orange-500`}>
                    <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-white"/>
                </Link>
                <button className={`${navButtonBase} bg-blue-600 cursor-not-allowed`} disabled>
                    <PlusIcon className="w-7 h-7 text-white"/>
                </button>
                <Link href="/profile" className="w-12 h-12 rounded-full transition-transform duration-200 hover:scale-110 flex items-center justify-center">
                  {isClient && currentUser ? (
                    <CustomAvatar profile={currentUser} className="w-full h-full rounded-full" />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-white" />
                  )}
                </Link>
            </div>
        </div>
    );
};
