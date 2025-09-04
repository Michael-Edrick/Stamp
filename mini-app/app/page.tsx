"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect, useConnect } from "wagmi";
import Link from 'next/link';
import { UserCircleIcon, PaperAirplaneIcon, MagnifyingGlassIcon, ChatBubbleOvalLeftEllipsisIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { User as PrismaUser, Conversation as PrismaConversation, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from '@/app/components/CustomAvatar';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
// Removed the generic ConnectWallet, we'll use a custom button
import SearchModal from '@/app/components/SearchModal';
import { NetworkSwitcher } from '@/app/components/NetworkSwitcher';

// Local type definition to avoid import issues with the SDK
type NeynarUser = {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  // This is the crucial field for sending messages
  custody_address?: string; 
};

type Profile = Partial<PrismaUser> & {
  avatar?: string;
};

interface ConversationWithDetails extends PrismaConversation {
  participants: Partial<PrismaUser>[];
  messages: (PrismaMessage & { sender: Partial<PrismaUser> })[];
}


const UserCard = ({ user }: { user: NeynarUser }) => {
  // The link now directly goes to the chat page using the user's Farcaster ID (fid).
  // This works for both existing and new conversations.
  const href = `/chat/${user.fid}`;

  return (
    <div className="bg-white rounded-2xl p-3 flex items-center justify-between shadow-sm border border-gray-200">
      <div className="flex items-center">
        <CustomAvatar 
          profile={{
            name: user?.display_name,
            username: user?.username,
            image: user?.pfp_url, // Map pfp_url to image
            fid: user?.fid?.toString() // Convert fid to string
          }} 
          className="w-10 h-10 rounded-full mr-3" 
        />
        <div>
          <p className="font-bold text-gray-900">{user?.display_name || 'Unnamed'}</p>
          <p className="text-sm text-gray-500">@{user?.username || 'user'}</p>
        </div>
      </div>
      {/* Only render the link if we have a valid address to send to */}
      {user.custody_address && (
        <Link href={href} onClick={(e) => e.stopPropagation()}>
          <PaperAirplaneIcon className="w-6 h-6 text-blue-500 -rotate-45 cursor-pointer hover:scale-110 transition-transform" />
        </Link>
      )}
    </div>
  );
};

const ConversationCard = ({ conversation, currentUserId }: { conversation: ConversationWithDetails, currentUserId: string }) => {
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  const lastMessage = conversation.messages[0];

  if (!otherParticipant) return null;

  return (
    <Link href={`/chat/${otherParticipant?.fid}`} className="block bg-white p-4 rounded-2xl flex items-start space-x-4 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
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


const DebugPanel = () => {
  const account = useAccount();
  const { connectors } = useConnect();
  const { context: miniKitContext, isReady } = useMiniKit();

  const debugInfo = {
    wagmi_status: account.status,
    wagmi_address: account.address,
    minikit_ready: isReady,
    minikit_app: miniKitContext?.app,
    minikit_deeplink: miniKitContext?.deeplink,
    connectors_found: connectors.length,
    connector_names: connectors.map(c => c.name),
  };

  return (
    <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg text-xs">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <pre className="whitespace-pre-wrap break-all">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};


export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [following, setFollowing] = useState<NeynarUser[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { setFrameReady, isFrameReady } = useMiniKit();

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
      // Step 1: Fetch the current user's profile first. This is crucial because the other
      // calls may depend on the user's FID being present in the database.
      const userResponse = await fetch(`/api/users/me?walletAddress=${address}`);
      if (!userResponse.ok) {
        // If we can't get the main user, it's a critical error that stops the process.
        throw new Error(`Failed to fetch user profile. Status: ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      setCurrentUser(userData);

      // Step 2: Now that we have the user, fetch their conversations and following list concurrently.
      const [convoResponse, followingResponse] = await Promise.all([
        fetch(`/api/messages/inbox?walletAddress=${address}`),
        fetch(`/api/users/following?walletAddress=${address}`)
      ]);

      // Process conversations
      if (convoResponse.ok) {
        const convoData = await convoResponse.json();
        // Validate that the response is an array before setting state
        if (Array.isArray(convoData)) {
          setConversations(convoData);
        } else {
          console.warn("Inbox API did not return an array:", convoData);
          setConversations([]); // Default to empty array on unexpected format
        }
      } else {
        console.warn("Failed to fetch inbox, status:", convoResponse.status);
        setConversations([]); // Default to empty array on error
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

    } catch (err) {
      console.error("Error fetching homepage data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    setIsClient(true);
    if (isConnected && address) {
      fetchData();
    } else if (!isConnected) {
      // Clear data when disconnected
      setLoading(true);
      setCurrentUser(null);
      setConversations([]);
      setFollowing([]);
    }
  }, [isConnected, address, fetchData]);
  
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
      <div className="space-y-8">
        {/* Your Chats Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Your chats</h2>
            <Link href="/inbox" className="flex items-center text-blue-600 font-semibold text-sm">
              Chat <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {conversations.length > 0 ? (
              conversations.slice(0, 2).map((convo) => (
                currentUser?.id && <ConversationCard key={convo.id} conversation={convo} currentUserId={currentUser.id} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No recent chats.</p>
            )}
          </div>
        </div>

        {/* Following Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Following</h2>
          <div className="space-y-3">
            {following.length > 0 ? (
              following.slice(0, 4).map((user) => (
                <UserCard key={user.fid} user={user} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">Not following anyone yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#F0F2F5]nb font-sans flex flex-col">
       <header className="w-full max-w-md mx-auto flex justify-between items-center p-4 bg-[#F0F2F2]">
          <h1 className="text-xl font-bold text-gray-900">StampMe</h1>
          <div className="flex items-center gap-x-2">
              {isClient && !isConnected && (
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  disabled={isConnecting}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
              {isClient && isConnected && (
                <>
                  <div className="bg-white rounded-full px-3 py-1.5 flex items-center shadow-sm">
                    <CustomAvatar profile={currentUser} className="w-6 h-6 rounded-full mr-2" />
                    <span className="text-sm font-semibold text-gray-800">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '...'}
                    </span>
                  </div>
                  <NetworkSwitcher />
                  <button 
                    onClick={() => disconnect()} 
                    className="bg-red-500 text-white p-2 rounded-full text-xs font-semibold hover:bg-red-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                  </button>
                </>
              )}
          </div>
      </header>
      <main className="w-full max-w-md mx-auto px-4 flex-1 overflow-y-auto">
        {renderContent()}
        {isClient && <DebugPanel />}
      </main>
       <BottomNav 
        isClient={isClient}
        onSearchClick={() => setIsSearchModalOpen(true)}
       />
       {isSearchModalOpen && <SearchModal onClose={() => setIsSearchModalOpen(false)} />}
    </div>
  );
}

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
        <footer className="w-full flex justify-center items-center p-4 bg-[#F0F2F5]">
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
