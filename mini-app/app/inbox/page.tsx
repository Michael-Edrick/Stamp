"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import CustomAvatar from "@/app/components/CustomAvatar";
import { User, Message, Conversation as PrismaConversation } from "@prisma/client";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import useSWR from "swr";

interface ConversationWithDetails extends PrismaConversation {
  participants: Partial<User>[];
  messages: (Message & { sender: Partial<User> })[];
  currentUserWalletAddress?: string; // Add this to pass the current user's address
}

export default function InboxPage() {
  const { address, isConnected, isConnecting } = useAccount();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const fetchInbox = useCallback(() => {
    if (address) {
      setLoading(true);
      fetch(`/api/messages/inbox?walletAddress=${address}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch inbox");
          }
          return res.json();
        })
        .then((data) => {
          setConversations(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [address]);

  useEffect(() => {
    // Wait for connection status to be stable before acting
    if (!isConnected && !isConnecting) {
      router.push("/");
    } else if (isConnected) {
      fetchInbox();
    }
  }, [isConnected, isConnecting, router, fetchInbox]);

  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR(
    address ? `/api/users/me?walletAddress=${address}` : null,
    fetcher
  );

  if (isConnecting || loading || isLoadingCurrentUser) {
    return <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans">
      <header className="fixed top-0 left-0 right-0 z-10 w-full max-w-md mx-auto flex items-center p-4 bg-[#F0F2F5]">
        <Link href="/" className="p-2 -ml-2">
          <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mx-auto">Inbox</h1>
        <div className="w-6 h-6"></div> {/* Spacer */}
      </header>
      <div className="w-full max-w-md mx-auto pt-20 pb-24 px-4">
        {error && <p className="text-red-500 text-center">{error}</p>}
        <div className="space-y-4">
          {conversations.length > 0 ? (
            conversations.map((convo: ConversationWithDetails) => {
              const lastMessage = convo.messages[0];
              const otherParticipant = convo.participants.find(p => p.id !== currentUser?.id);
              if (!lastMessage || !otherParticipant) return null;

              return (
                <Link href={`/chat/${otherParticipant.id}`} key={convo.id} className="block bg-white p-4 rounded-2xl flex items-start space-x-4 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
                  <CustomAvatar profile={otherParticipant} className="w-10 h-10 rounded-full mt-1" />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">{otherParticipant.name || "Anonymous"}</span>
                      <span className="text-xs text-gray-500">{new Date(lastMessage.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-600 mt-1 truncate">
                      <span className="font-semibold text-gray-800">{lastMessage.senderId === currentUser?.id ? "You: " : ""}</span>
                      {lastMessage.content}
                    </p>
                  </div>
                </Link>
              )
            })
          ) : (
            <p className="text-center text-gray-500 mt-10">Your inbox is empty.</p>
          )}
        </div>
      </div>
    </div>
  );
} 