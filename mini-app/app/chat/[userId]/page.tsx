"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { User as PrismaUser, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from "@/app/components/CustomAvatar";

type User = PrismaUser & {
  standardCost?: number | null;
  premiumCost?: number | null;
  tags?: string[];
};

interface MessageWithSender extends PrismaMessage {
  sender: User;
}

interface Conversation {
  id: string;
  messages: MessageWithSender[];
  messagesRemaining: number;
  participants: User[];
}

const PaymentModal = ({ user, onSelect, onClose }: { user: User | null; onSelect: (amount: number) => void; onClose: () => void; }) => {
    const standardCost = user?.standardCost || 1;
    const premiumCost = user?.premiumCost || 5;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-end" onClick={onClose}>
            <div className="bg-black text-white w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Send a message</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-3">
                    <div className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer" onClick={() => onSelect(standardCost)}>
                        <span>Standard send</span>
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">${standardCost} USD</span>
                    </div>
                     <div className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer" onClick={() => onSelect(premiumCost)}>
                        <span>Premium send</span>
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">${premiumCost} USD</span>
                    </div>
                    <div className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer" onClick={onClose}>
                        <span>None</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function ChatPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: session } = useSession();
  const loggedInUserId = (session?.user as User)?.id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversations/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const data: Conversation = await response.json();
      setConversation(data);
      const participant = data.participants.find((p) => p.id === userId);
      setOtherUser(participant || null);
    } catch (error) {
      console.error(error);
      const mockUser = { id: userId, name: "User", username: "user" } as User;
      setOtherUser(mockUser);
      // Ensure mock conversation has an ID to prevent key errors
      setConversation({ id: `mock-${userId}`, messages: [], messagesRemaining: 0, participants: [mockUser] });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (loggedInUserId && userId) {
      fetchConversation();
    }
  }, [loggedInUserId, userId, fetchConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSendMessage = async (paymentDetails: { amount: number | null, txHash: string } | null = null) => {
    if (!message.trim() || sending) return;

    if (!conversation?.messagesRemaining && !paymentDetails) {
        setShowPaymentModal(true);
        return;
    }
    
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const newMessage: MessageWithSender = {
      id: tempId,
      content: message,
      senderId: loggedInUserId!,
      conversationId: conversation?.id ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'SENT',
      amount: paymentDetails?.amount || null,
      txHash: paymentDetails?.txHash || null,
      recipientId: userId,
      sender: session?.user as User,
    };

    setConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, newMessage]
      };
    });
    
    setMessage('');
    setShowPaymentModal(false);

    try {
        const payload = {
            content: newMessage.content,
            recipientId: userId,
            ...paymentDetails
        };

        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            if(responseData.paymentRequired) {
                setShowPaymentModal(true);
            }
            throw new Error(responseData.error || 'Failed to send message');
        }
        
        // Update the temporary message with the real one from the server
        setConversation(prev => {
          if (!prev) return null;
          const newMessages = prev.messages.map(m => m.id === tempId ? responseData.newMessage : m)
          return {
            ...prev,
            messages: newMessages,
            messagesRemaining: responseData.updatedConversation.messagesRemaining
          };
        });

    } catch (error) {
        const err = error as Error;
        console.error("Sending message failed:", err);
        alert(err.message);
        // Remove the optimistic message on failure
        setConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.filter(m => m.id !== tempId)
          };
        });
    } finally {
      setSending(false);
    }
  };
  
  const handlePaymentSelect = (amount: number | null) => {
    console.log(`Simulating payment of ${amount} USD`);
    const mockTxHash = `0x${Math.random().toString(16).slice(2)}`;
    handleSendMessage({ amount, txHash: mockTxHash });
  };


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading conversation...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="p-3 sticky top-0 z-10 bg-transparent">
        <div className="bg-white p-2 rounded-full shadow-md flex items-center">
            <Link href="/" className="mr-2 p-2">
              <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
            </Link>
            {otherUser && (
                <>
                    <CustomAvatar profile={otherUser} className="w-10 h-10 rounded-full mr-3" />
                    <div>
                        <p className="font-bold text-gray-900">{otherUser.name}</p>
                        <p className="text-sm text-gray-500">@{otherUser.username}</p>
                    </div>
                </>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pt-20">
        {conversation?.messages.map((msg) => {
          const isSender = msg.senderId === loggedInUserId;
          const senderProfile = conversation.participants.find((p) => p.id === msg.senderId);

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
              {!isSender && <CustomAvatar profile={senderProfile || null} className="w-8 h-8 rounded-full" />}
              <div className={`max-w-[80%] min-w-[180px] rounded-2xl bg-white px-4 py-3 text-gray-800`}>
                <div className="mb-1 flex items-center">
                  <p className="text-sm font-bold">{senderProfile?.name}</p>
                  <p className="ml-2 text-xs text-gray-500">@{senderProfile?.username}</p>
                </div>
                <p className="text-sm">{msg.content}</p>
                {msg.amount && (
                    <div className="mt-2 flex items-center justify-between">
                        {msg.status === 'REPLIED' ? (
                            <span className="text-xs text-blue-400 font-bold">claimed!</span>
                        ) : (
                            <div /> 
                        )}
                        <span className="text-xs font-bold text-white bg-orange-500 px-2 py-1 rounded-full">
                            +${msg.amount} USD
                        </span>
                    </div>
                )}
              </div>
              {isSender && <CustomAvatar profile={senderProfile || null} className="w-8 h-8 rounded-full" />}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>
      
      <footer className="p-3 sticky bottom-0 bg-transparent">
        <div className="bg-white p-2 rounded-full shadow-md flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              className="flex-1 w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button onClick={() => handleSendMessage()} className="ml-3 p-2 bg-blue-500 rounded-full text-white" disabled={sending}>
                <PaperAirplaneIcon className="w-6 h-6" />
            </button>
        </div>
      </footer>
      
      {showPaymentModal && <PaymentModal user={otherUser} onSelect={handlePaymentSelect} onClose={() => setShowPaymentModal(false)} />}
    </div>
  );
} 