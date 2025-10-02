"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect, useConnect } from "wagmi";
import Link from 'next/link';
import { UserCircleIcon, PaperAirplaneIcon, MagnifyingGlassIcon, ChatBubbleOvalLeftEllipsisIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { User as PrismaUser, Conversation as PrismaConversation, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from '@/app/components/CustomAvatar';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import SearchModal from '@/app/components/SearchModal';
import { NetworkSwitcher } from '@/app/components/NetworkSwitcher';
import Inbox from '@/app/components/Inbox';
import Image from 'next/image';
import ComposeModal from './components/ComposeModal';

// Local type definition to avoid import issues with the SDK
type NeynarUser = {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  // This is the crucial field for sending messages
  custody_address?: string; 
};

type Profile = PrismaUser & {
  avatar?: string;
};

interface ConversationWithDetails extends PrismaConversation {
  participants: Partial<PrismaUser>[];
  messages: (PrismaMessage & { sender: Partial<PrismaUser> })[];
}

const UserCard = ({ user }: { user: NeynarUser }) => {
  const href = `/chat/${user.fid}`;

  // The entire card is now a clickable link, assuming all users from the
  // following list are messageable.
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-3 flex items-center justify-between shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center">
        <CustomAvatar
          profile={{
            name: user?.display_name,
            username: user?.username,
            image: user?.pfp_url,
            fid: user?.fid?.toString(),
          }}
          className="w-10 h-10 rounded-full mr-3"
        />
        <div>
          <p className="font-bold text-gray-900">
            {user?.display_name || 'Unnamed'}
          </p>
          <p className="text-sm text-gray-500">
            @{user?.username || 'user'}
          </p>
        </div>
      </div>
      <PaperAirplaneIcon className="w-6 h-6 text-blue-500 -rotate-45" />
    </Link>
  );
};

const ConversationCard = ({ conversation, currentUserId }: { conversation: ConversationWithDetails, currentUserId: string }) => {
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  const lastMessage = conversation.messages[0];

  if (!otherParticipant) return null;

  // Use the database ID for the link to support non-Farcaster users.
  const href = otherParticipant.id ? `/chat/${otherParticipant.id}` : '#';

  return (
    <Link href={href} className="block bg-white p-4 rounded-2xl flex items-start space-x-4 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
      <CustomAvatar profile={otherParticipant} className="w-10 h-10 rounded-full mt-1" />
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900">{otherParticipant?.name || "Anonymous"}</span>
          {lastMessage?.createdAt && (
            <span className="text-xs text-gray-500">{new Date(lastMessage.createdAt).toLocaleDateString()}</span>
          )}
        </div>
        {lastMessage?.content && (
          <p className="text-gray-600 mt-1 truncate">
            <span className="font-semibold text-gray-800">{lastMessage?.senderId === currentUserId ? "You: " : ""}</span>
            {lastMessage.content}
          </p>
        )}
      </div>
    </Link>
  );
};


export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  // const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  // const [following, setFollowing] = useState<NeynarUser[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const minikit = useMiniKit();
  const { setFrameReady, isFrameReady } = minikit;
  const [isComposeModalOpen, setComposeModalOpen] = useState(false);

  useEffect(() => {
    // console.log('EVIDENCE: Full useMiniKit object:', JSON.stringify(minikit, null, 2));
    const logData = async () => {
      try {
        await fetch('/api/log-client-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(minikit),
        });
      } catch (error) {
        console.error('Failed to send client log:', error);
      }
    };

    // Only send the log if the minikit object is populated
    if (minikit && Object.keys(minikit).length > 0) {
      logData();
    }
  }, [minikit]);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  const fetchData = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch the current user's profile first.
      // We now pass the minikit user data in headers if it exists.
      const headers: HeadersInit = {};
      const minikitUser = minikit?.context?.user;

      if (minikitUser?.fid) {
        headers['x-minikit-user-fid'] = String(minikitUser.fid);
        headers['x-minikit-user-username'] = minikitUser.username || '';
        headers['x-minikit-user-displayname'] = minikitUser.displayName || '';
        headers['x-minikit-user-pfpurl'] = minikitUser.pfpUrl || '';
      }

      const userResponse = await fetch(`/api/users/me?walletAddress=${address}`, {
        headers,
      });

      if (!userResponse.ok) {
        // If we can't get the main user, it's a critical error that stops the process.
        throw new Error(`Failed to fetch user profile. Status: ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      setCurrentUser(userData);

      /*
      // Step 2: Now that we have the user, fetch their conversations and following list concurrently.
      const [convoResponse, followingResponse] = await Promise.all([
        fetch(`/api/messages/inbox?walletAddress=${address}`),
        // fetch(`/api/users/following?walletAddress=${address}`)
      ]);

      // Process conversations
      if (convoResponse.ok) {
        const convoData = await convoResponse.json();
        // Validate that the response is an array before setting state
        if (Array.isArray(convoData)) {
          // setConversations(convoData);
        } else {
          console.warn("Inbox API did not return an array:", convoData);
          // setConversations([]);
        }
      } else {
        console.warn("Failed to fetch inbox, status:", convoResponse.status);
        // setConversations([]); // Default to empty array on error
      }

      // Process following list
      
      if (followingResponse.ok) {
        const followingData = await followingResponse.json();
        // Validate that the response is an array before setting state
        if (Array.isArray(followingData)) {
          setFollowing(followingData);
        } else {
          console.warn("Following API did not return an array:", followingData);
          setFollowing([]); // Default to empty array on unexpected format
        }
      } else {
        console.warn("Failed to fetch following list, status:", followingResponse.status);
        setFollowing([]); // Default to empty array on error
      }
      */

    } catch (err) {
      console.error("Error fetching homepage data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [address, minikit]);

  useEffect(() => {
    setIsClient(true);
    if (isConnected && address) {
      fetchData();
    } else if (!isConnected) {
      // Clear data when disconnected
      setLoading(false); // Changed from true to false to prevent loading state on initial load
      setCurrentUser(null);
      // setConversations([]);
      // setFollowing([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);
  
  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="text-center text-gray-500 py-10">
          <p>Please connect your wallet to see your dashboard.</p>
        </div>
      );
    }
    
    if (loading) {
      return <div className="text-center text-gray-500 py-10">Loading...</div>;
    }

    if (error) {
      return <div className="text-center text-red-500 py-10">Error: {error}</div>;
    }

    return (
      <Inbox />
    );
  };

  return (
    <div className="h-full bg-[#DEDEDE]nb font-sans flex flex-col">
       <header className="w-full max-w-md mx-auto flex justify-between items-center p-4 bg-[#DEDEDE]">
          <Link href="/" aria-label="Home">
            <Image src="/stamp-logo.png" alt="Stamp Logo" width={32} height={32} />
          </Link>
          <div className="flex items-center gap-x-2">
              {isClient && !isConnected && (
                  <button
                    onClick={() => {
                      // Find the Farcaster connector, or fall back to the first available one
                      const connector = connectors.find(c => c.id === 'xyz.farcaster.MiniAppWallet') || connectors[0];
                      if (connector) {
                        connect({ connector });
                      }
                    }}
                    disabled={isConnecting}
                    className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
              )}
              {isClient && isConnected && currentUser && (
                <>
                  {/* The following block is temporarily hidden for UI review */}
                  {/*
                  <div className="bg-white rounded-full px-3 py-1.5 flex items-center shadow-sm">
                    <span className="text-sm font-semibold text-gray-800 mr-2">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '...'}
                    </span>
                  </div>*/}
                  <NetworkSwitcher />
                  {/*
                  <button 
                    onClick={() => disconnect()} 
                    className="bg-red-500 text-white p-2 rounded-full text-xs font-semibold hover:bg-red-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                  </button>
                  */}
                  <Link 
                    href={currentUser ? `/profile` : '#'} 
                    className={`w-10 h-10 rounded-full transition-transform duration-200 hover:scale-110 flex items-center justify-center ${!currentUser ? 'pointer-events-none' : ''}`}
                    aria-disabled={!currentUser}
                  >
                    {currentUser ? (
                      <CustomAvatar profile={currentUser} className="w-full h-full rounded-full" />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-gray-400" />
                    )}
                  </Link>
                </>
              )}
          </div>
      </header>
      <main className="w-full max-w-md mx-auto px-4 flex-1 overflow-y-auto">
        {renderContent()}
      </main>
      {/* <BottomNav 
        isClient={isClient}
        onSearchClick={() => setIsSearchModalOpen(true)}
      /> */}
      {isSearchModalOpen && <SearchModal onClose={() => setIsSearchModalOpen(false)} />}
      
      {/* Floating Action Button */}
      <button 
        onClick={() => setComposeModalOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
        aria-label="New Message"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      {/* Compose Modal */}
      <ComposeModal 
        isOpen={isComposeModalOpen}
        onClose={() => setComposeModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}

/*
const BottomNav = ({ isClient, onSearchClick }: { isClient: boolean, onSearchClick: () => void }) => {
    const { address } = useAccount();
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (address) {
                try {
                    const response = await fetch(`/api/users/me?walletAddress=${address}`);
                    if (response.ok) {
                        const user = await response.json();
                        setCurrentUser(user);
                    } else {
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch current user", error);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
        };

        fetchUser();
    }, [address]);

    const navButtonBase = "w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110";

    return (
        <footer className="w-full flex justify-center items-center p-4 bg-[#DEDEDE]">
            <div className="flex items-center justify-center gap-x-4 bg-black rounded-full shadow-lg p-3">
                <button className={`${navButtonBase} bg-neutral-800`} onClick={onSearchClick}>
                    <MagnifyingGlassIcon className="w-7 h-7 text-white"/>
                </button>
                <Link href="/inbox" className={`${navButtonBase} bg-orange-500`}>
                    <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7 text-white"/>
                </button>
                <button className={`${navButtonBase} bg-blue-600 cursor-not-allowed`} disabled>
                    <PlusIcon className="w-7 h-7 text-white"/>
                </button>
                <Link 
                  href={currentUser ? `/profile` : '#'} 
                  className={`w-12 h-12 rounded-full transition-transform duration-200 hover:scale-110 flex items-center justify-center ${!currentUser ? 'pointer-events-none' : ''}`}
                  aria-disabled={!currentUser}
                >
                  {isClient && currentUser ? (
                    <CustomAvatar profile={currentUser} className="w-full h-full rounded-full" />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-white" />
                  )}
                </Link>
            </div>
        </footer>
    );
};
*/
