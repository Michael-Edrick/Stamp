"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import CustomAvatar from "@/app/components/CustomAvatar";
import { User, Message, Conversation as PrismaConversation } from "@prisma/client";
import useSWR from "swr";
import StampAvatar from './StampAvatar';

interface ConversationWithDetails extends PrismaConversation {
  participants: Partial<User>[];
  messages: (Message & { sender: Partial<User> })[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Inbox() {
  const { address, isConnected } = useAccount();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR(
    address ? `/api/users/me?walletAddress=${address}` : null,
    fetcher
  );

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
    if (isConnected) {
      fetchInbox();
    }
  }, [isConnected, fetchInbox]);

  if (loading || isLoadingCurrentUser) {
    return <div className="text-center text-gray-500 py-10">Loading conversations...</div>;
  }
  
  if (error) {
    return <div className="text-center text-red-500 py-10">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {conversations.length > 0 ? (
        conversations.map((convo: ConversationWithDetails) => {
          const lastMessage = convo.messages[0];
          const otherParticipant = convo.participants.find(p => p.id !== currentUser?.id);
          if (!lastMessage || !otherParticipant) return null;

          const isPaidMessageToClaim = 
            lastMessage.recipientId === currentUser?.id &&
            lastMessage.amount &&
            lastMessage.amount > 0 &&
            lastMessage.status === 'SENT';

          // Use the internal DB ID for the chat link to support non-Farcaster users
          const href = otherParticipant.id ? `/chat/${otherParticipant.id}` : '#';

          if (isPaidMessageToClaim) {
            return (
              <Link href={href} key={convo.id} className="block bg-[#ECECEC] p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-200 hover:bg-gray-200 transition-colors">
                <div className="flex items-center space-x-4">
                  <CustomAvatar profile={otherParticipant} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-baseline">
                      <span className="font-bold text-gray-900">{otherParticipant.name || "Anonymous"}</span>
                      <span className="text-sm text-gray-500 ml-2">@{otherParticipant.username}</span>
                    </div>
                    <p className="text-gray-600 mt-1">
                      Reply to {otherParticipant.name} to collect ${lastMessage.amount}.
                    </p>
                  </div>
                </div>
                <StampAvatar 
                  profile={{
                    image: otherParticipant.image,
                    username: otherParticipant.username
                  }}
                  amount={lastMessage.amount}
                />
              </Link>
            )
          }

          return (
            <Link href={href} key={convo.id} className="block bg-[#ECECEC] p-4 rounded-2xl flex items-start space-x-4 shadow-sm border border-gray-200 hover:bg-gray-200 transition-colors">
              <CustomAvatar profile={otherParticipant} className="w-10 h-10 rounded-full mt-1" />
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="flex items-baseline">
                    <span className="font-bold text-gray-900">{otherParticipant.name || "Anonymous"}</span>
                    <span className="text-sm text-gray-500 ml-2">@{otherParticipant.username}</span>
                  </div>
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
  );
}
