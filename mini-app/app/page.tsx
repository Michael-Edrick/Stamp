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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();
      setProfiles(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Optionally, set an error state to show in the UI
    }
  };

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
            {profiles.map((profile: any) => (
                <ProfileCard 
                  key={profile.id} 
                  profile={profile} 
                  isExpanded={expandedProfileId === profile.id}
                  onExpand={() => setExpandedProfileId(expandedProfileId === profile.id ? null : profile.id)}
                />
            ))}
        </main>
      </div>
      <BottomNav onSearchClick={() => setIsSearchModalOpen(true)} currentUserAddress={address} isClient={isClient} />
      {isSearchModalOpen && <SearchModal profiles={profiles} onClose={() => setIsSearchModalOpen(false)} />}
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

const CustomAvatar = ({ profile, className }: { profile: any, className: string }) => {
  if (profile?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.image} alt={profile.name || 'User avatar'} className={className} />;
  }
  // Fallback to OnchainKit Avatar if no image, but we want a better placeholder.
  // Using UserCircleIcon as the placeholder.
  const sizeClass = className.split(' ').find(c => c.startsWith('w-') || c.startsWith('h-')) || 'w-10 h-10';
  return <UserCircleIcon className={`${sizeClass} text-gray-400`} />;
}

const ProfileCard = ({ profile, isExpanded, onExpand }: { profile: any, isExpanded: boolean, onExpand: () => void }) => (
  <div className="bg-[var(--background-card)] rounded-2xl p-4 mb-4 shadow-sm relative transition-all duration-300 ease-in-out" onClick={onExpand}>
    <div className="flex items-center">
      <CustomAvatar profile={profile} className="w-10 h-10 rounded-full mr-4" />
      <div>
        <p className="font-bold text-lg">{profile.name || "Anonymous"}</p>
        <p className="text-sm text-[var(--text-muted)]">@{profile.username || (profile.walletAddress ? profile.walletAddress.slice(0, 8) : '')}</p>
      </div>
    </div>
    
    {isExpanded && (
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-300 mb-4">{profile.bio || 'No bio yet.'}</p>
        {profile.x_social && (
          <div className="flex items-center justify-between text-sm bg-gray-800 p-2 rounded-lg mb-2">
            <span>X (Twitter)</span>
            <span className="text-blue-400">@{profile.x_social}</span>
          </div>
        )}
        {profile.instagram && (
          <div className="flex items-center justify-between text-sm bg-gray-800 p-2 rounded-lg">
            <span>Instagram</span>
            <span className="text-purple-400">@{profile.instagram}</span>
          </div>
        )}
      </div>
    )}

    {!isExpanded && (
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="bg-[var(--accent-blue)] text-white text-xs font-semibold px-2 py-1 rounded-full">BASE</span>
        <span className="bg-[var(--accent-orange)] text-white text-xs font-semibold px-2 py-1 rounded-full">LBS</span>
        <span className="bg-[var(--accent-purple)] text-white text-xs font-semibold px-2 py-1 rounded-full">WEB 3</span>
      </div>
    )}
    <Link 
      href={`/new-message?recipient=${profile.walletAddress}&name=${profile.name || 'Anonymous'}`} 
      className="absolute top-4 right-4 p-2 rounded-full bg-blue-600 hover:bg-blue-700"
      onClick={(e) => e.stopPropagation()}
    >
      <SendIcon />
    </Link>
  </div>
);

const BottomNav = ({ onSearchClick, currentUserAddress, isClient }: { onSearchClick: () => void, currentUserAddress: `0x${string}` | undefined, isClient: boolean }) => (
    <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto h-24 bg-transparent flex justify-center items-center">
        <div className="flex items-center justify-around bg-black rounded-full shadow-lg p-2 w-80">
            <button onClick={onSearchClick} className="p-3 rounded-full hover:bg-gray-800"><SearchIcon /></button>
            <Link href="/inbox" className="p-3 rounded-full bg-orange-500 hover:bg-orange-600"><MessageIcon /></Link>
            <button className="p-3 rounded-full bg-blue-600 cursor-not-allowed" disabled><PlusIcon /></button>
            <Link href="/profile" className="p-2 rounded-full hover:bg-gray-800">
              {isClient && currentUserAddress ? (
                <CustomAvatar profile={{ walletAddress: currentUserAddress }} className="w-8 h-8 rounded-full" />
              ) : (
                <UserCircleIcon />
              )}
            </Link>
        </div>
    </div>
);

const SearchIcon = ({ className }: { className?: string }) => (<svg className={`w-6 h-6 text-white ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>);
const MessageIcon = () => (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>);
const PlusIcon = () => (<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>);
const UserCircleIcon = ({ className = "w-8 h-8 text-gray-400" }: { className?: string }) => (<svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" /></svg>);

const SearchModal = ({ profiles, onClose }: { profiles: any[], onClose: () => void }) => {
  const tags = ['BASE', 'LBS', 'WEB 3', 'LUCID', 'SOLANA', 'ETH'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-end z-50" onClick={onClose}>
      <div 
        className="bg-black w-full max-w-md h-[90vh] rounded-t-3xl p-4 text-white flex flex-col transform transition-transform duration-300 ease-in-out"
        style={{ transform: 'translateY(0)', animation: 'slideUp 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-4 cursor-grab"></div>
        
        <h2 className="text-lg font-bold mb-3">Profiles</h2>
        <div className="space-y-3 mb-6">
          {profiles.map(p => <ModalProfileCard key={p.id} profile={p} />)}
        </div>

        <h2 className="text-lg font-bold mb-3">Relevant Tags</h2>
        <div className="flex flex-wrap gap-2 mb-auto">
          {tags.map(tag => <Tag key={tag} name={tag} />)}
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search..." className="w-full bg-gray-800 rounded-full py-3 pl-11 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  );
};

const ModalProfileCard = ({ profile }: { profile: any }) => (
  <div className="flex items-center justify-between bg-gray-900 rounded-xl p-3">
    <div className="flex items-center">
      <CustomAvatar profile={profile} className="w-10 h-10 rounded-full mr-3" />
      <div>
        <p className="font-semibold">{profile.name || 'Anonymous'}</p>
        <p className="text-sm text-gray-400">@{profile.username || (profile.walletAddress ? profile.walletAddress.slice(0, 8) : '')}</p>
      </div>
    </div>
    <Link 
      href={`/new-message?recipient=${profile.walletAddress}&name=${profile.name || 'Anonymous'}`} 
      className="p-2 rounded-full bg-blue-600 hover:bg-blue-700"
    >
      <SendIcon />
    </Link>
  </div>
);

const Tag = ({ name }: { name: string }) => {
  const colors: { [key: string]: string } = {
    BASE: 'bg-blue-500',
    LBS: 'bg-orange-500',
    'WEB 3': 'bg-purple-500',
    LUCID: 'bg-indigo-900',
    SOLANA: 'bg-pink-500',
    ETH: 'bg-gray-500'
  };
  return <span className={`text-white text-sm font-bold px-3 py-1.5 rounded-full ${colors[name] || 'bg-gray-600'}`}>{name}</span>
};

const SendIcon = () => (<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>);

// Add this to globals.css if you can, or a style tag in the component.
/*
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
*/
