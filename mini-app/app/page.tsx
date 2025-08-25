"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from "wagmi";
import Link from 'next/link';
import { UserCircleIcon, PaperAirplaneIcon, MagnifyingGlassIcon, ChatBubbleOvalLeftEllipsisIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { User as PrismaUser, Conversation as PrismaConversation, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from '@/app/components/CustomAvatar';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import SearchModal from '@/app/components/SearchModal';

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
    <Link href={`/chat/${otherParticipant?.id}`} className="block bg-white p-4 rounded-2xl flex items-start space-x-4 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
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
      // Fetch all data concurrently
      const [userResponse, convoResponse, followingResponse] = await Promise.all([
        fetch(`/api/users/me?walletAddress=${address}`),
        fetch(`/api/messages/inbox?walletAddress=${address}`),
        fetch(`/api/users/following?walletAddress=${address}`)
      ]);

      // Process current user
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData);
      } else {
        // If we can't get the main user, it's a critical error
        throw new Error('Failed to fetch user profile.');
      }

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
              following.slice(0, 2).map((user) => (
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
    <div className="h-full bg-[#F0F2F5] font-sans flex flex-col">
       <header className="w-full max-w-md mx-auto flex justify-between items-center p-4 bg-[#F0F2F5]">
          <h1 className="text-xl font-bold text-gray-900">StampMe</h1>
          <div>
              {isClient && <ConnectWallet />}
          </div>
      </header>
      <main className="w-full max-w-md mx-auto px-4 flex-1 overflow-y-auto">
        {renderContent()}
      </main>
       <BottomNav 
        className="mt-auto"
        isClient={isClient}
        onSearchClick={() => setIsSearchModalOpen(true)}
       />
       {isSearchModalOpen && <SearchModal onClose={() => setIsSearchModalOpen(false)} />}
    </div>
  );
}

const BottomNav = ({ isClient, onSearchClick, className }: { isClient: boolean, onSearchClick: () => void, className?: string }) => {
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
        <footer className={`w-full flex justify-center items-center p-4 bg-[#F0F2F5] ${className}`}>
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
