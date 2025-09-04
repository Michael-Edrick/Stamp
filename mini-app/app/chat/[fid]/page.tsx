"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useParams } from 'next/navigation';
import { User as PrismaUser, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from "@/app/components/CustomAvatar";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { messageEscrowABI, messageEscrowAddress, usdcContractAddress } from '@/lib/contract';
import { parseUnits, bytesToHex, formatUnits } from 'viem';
import { erc20Abi } from 'viem';

// We need to use the Prisma-generated User type, but add optional fields
// that might not be present on every user object we handle.
type User = PrismaUser & {
  standardCost?: number | null;
  premiumCost?: number | null;
};

interface MessageWithSender extends PrismaMessage {
  sender: User;
}

interface Conversation {
  id: string;
  messages: MessageWithSender[];
  participants: User[];
}

const PaymentModal = ({ user, onSelect, onClose, isProcessing }: { user: User | null; onSelect: (amount: number) => void; onClose: () => void; isProcessing: boolean; }) => {
    // Default values if not provided by the user profile
    const standardCost = user?.standardCost ? Number(user.standardCost) : 1;
    const premiumCost = user?.premiumCost ? Number(user.premiumCost) : 5;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-end" onClick={onClose}>
            <div className="bg-black text-white w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Send a message</h2>
                    <button onClick={onClose} disabled={isProcessing}><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-3">
                    <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onSelect(standardCost)} disabled={isProcessing}>
                        <span>Standard send</span>
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">${standardCost} USD</span>
                    </button>
                     <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onSelect(premiumCost)} disabled={isProcessing}>
                        <span>Premium send</span>
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">${premiumCost} USD</span>
                    </button>
                    <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={onClose} disabled={isProcessing}>
                        <span>None</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function ChatPage() {
  const params = useParams();
  const fid = params.fid as string; // Changed from userId to fid

  const { address: selfAddress, isConnected } = useAccount();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [recipientUser, setRecipientUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the logged-in user
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // This ref will hold the content of the message that requires payment
  const pendingMessageContentRef = useRef<string | null>(null);
  // This ref will hold the on-chain message ID from the backend
  const onChainMessageIdRef = useRef<string | null>(null);
  // This ref will hold the amount for the pending transaction
  const pendingAmountRef = useRef<number | null>(null);
  // This ref holds a temporary client-side ID for the optimistic message
  const optimisticIdRef = useRef<string | null>(null);


  const { data: approveHash, writeContract: approve, isPending: isApproving, error: approveError } = useWriteContract();
  const { data: sendMessageHash, writeContract: sendMessage, isPending: isSendingMessage, error: sendMessageError } = useWriteContract();

  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = 
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isConfirmingMessage, isSuccess: isMessageConfirmed, isError: isMessageError } =
    useWaitForTransactionReceipt({ hash: sendMessageHash });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadChatData = async (recipientFid: string, currentUserAddress?: `0x${string}`) => {
        setIsLoading(true);
        try {
            // We need the current user's data first to proceed
            if (!currentUserAddress) {
                setIsLoading(false);
                return;
            }
            const meResponse = await fetch(`/api/users/me?walletAddress=${currentUserAddress}`);
            if (!meResponse.ok) throw new Error("Failed to fetch current user data.");
            const meData: User = await meResponse.json();
            setCurrentUser(meData);

            // Get recipient user data (creating them if they don't exist)
            const userResponse = await fetch(`/api/users/by-fid?fid=${recipientFid}`);

            if (!userResponse.ok) throw new Error(`Failed to fetch recipient user data. Status: ${userResponse.status}`);
            
            const recipientData: User = await userResponse.json();
            setRecipientUser(recipientData);

            // Fetch the conversation between the current user and the recipient
            const convoResponse = await fetch(`/api/conversations/${recipientData.id}`, {
                headers: {
                    'x-wallet-address': currentUserAddress,
                }
            });
            if (convoResponse.ok) {
                const convoData: Conversation = await convoResponse.json();
                setConversation(convoData);
            } else if (convoResponse.status === 404) {
                // No conversation exists yet, which is fine. The state is already null.
                setConversation(null);
            } else {
                throw new Error('Failed to fetch conversation');
            }

        } catch (error) {
            console.error(error);
            // Handle error state in UI
        } finally {
            setIsLoading(false);
        }
    };

    if (isConnected && selfAddress && fid) {
      loadChatData(fid, selfAddress);
    }
  }, [isConnected, selfAddress, fid]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSendMessage = async () => {
    if (!selfAddress) {
      alert("Could not identify sender. Please reconnect your wallet and try again.");
      return;
    }

    if (!message.trim() || isSending || !recipientUser) return;
    
    setIsSending(true);
    const content = message;
    setMessage('');

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-wallet-address': selfAddress as string,
        },
        body: JSON.stringify({ 
            content, 
            recipientId: recipientUser.id, // Send the internal DB ID
            txHash: null, // No transaction yet
            amount: null 
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        // Message sent successfully without payment
        setConversation(prev => {
            if (!prev) return null;
            const newMessages = [...prev.messages, responseData.newMessage];
            return { ...prev, messages: newMessages };
        });
      } else if (response.status === 402 && responseData.paymentRequired) {
        // Payment is required, open the modal
        pendingMessageContentRef.current = content;
        onChainMessageIdRef.current = responseData.onChainMessageId;
        // dbMessageIdRef.current = responseData.messageId; // No longer sent from backend here
        setShowPaymentModal(true);
      } else {
        throw new Error(responseData.error || 'Failed to send message');
      }

    } catch (error) {
      console.error("Sending message failed:", error);
      alert((error as Error).message);
      setMessage(content); // Restore message on failure
    } finally {
      setIsSending(false);
    }
  };
  
  const handlePaymentSelect = async (amount: number) => {
    if (isSendingMessage || isConfirmingMessage) return;
    if (!currentUser) {
      alert("Could not identify current user. Please reconnect and try again.");
      return;
    }
    if (!recipientUser) {
      alert("Recipient user not found.");
      return;
    }

    const meUser = currentUser;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: MessageWithSender = {
      id: tempId,
      content: pendingMessageContentRef.current!,
      senderId: meUser.id,
      conversationId: conversation?.id ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'PENDING_PAYMENT',
      amount: amount,
      txHash: null,
      onChainMessageId: onChainMessageIdRef.current,
      recipientId: recipientUser!.id,
      sender: meUser,
    };
    
    setConversation(prev => {
        if (!prev) return null;
        // Check if message already exists to avoid duplicates on retry
        if (prev.messages.some(m => m.id === optimisticMessage.id)) {
            return prev;
        }
        return { ...prev, messages: [...prev.messages, optimisticMessage] };
    });

    try {
        // Start the blockchain transaction flow
        const amountInWei = parseUnits(amount.toString(), 18); // Assuming 18 decimals for mock USDC
        approve({
          address: usdcContractAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [messageEscrowAddress, amountInWei]
        });
    } catch (error) {
        console.error("Approval failed to start:", error);
        alert((error as Error).message);
        // Clean up optimistic message on failure
        setConversation(prev => {
            if (!prev) return null;
            return { ...prev, messages: prev.messages.filter(m => m.id !== optimisticIdRef.current) };
        });
    }
  };

  useEffect(() => {
    // Step 2: Approval successful, now send the message on-chain
    if (isApprovalConfirmed && onChainMessageIdRef.current && recipientUser?.walletAddress && approveHash) {
      const amountForTx = pendingAmountRef.current;

      if (amountForTx == null) {
        console.error("Could not find amount for transaction, aborting sendMessage.");
        return;
      }
      
      sendMessage({
        address: messageEscrowAddress,
        abi: messageEscrowABI,
        functionName: 'sendMessage',
        args: [
          recipientUser.walletAddress as `0x${string}`,
          onChainMessageIdRef.current as `0x${string}`,
          parseUnits(amountForTx.toString(), 18),
          BigInt(3600), // TODO: Make refund window dynamic
        ]
      });
    }
  }, [isApprovalConfirmed, sendMessage, recipientUser?.walletAddress, approveHash]);

  useEffect(() => {
    // Step 3: On-chain message sent, now confirm with backend
    if (isMessageConfirmed && sendMessageHash) {
        fetch('/api/messages/send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-wallet-address': selfAddress as string,
            },
            body: JSON.stringify({
                // Now we send the full message payload to create it
                content: pendingMessageContentRef.current,
                recipientId: recipientUser!.id,
                amount: pendingAmountRef.current,
                txHash: sendMessageHash,
                onChainMessageId: onChainMessageIdRef.current,
            }),
        }).then(async (res) => {
            if (res.ok) {
                const { newMessage } = await res.json();
                // Replace the optimistic message with the confirmed one
                setConversation(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        messages: prev.messages.map(m => m.id === optimisticIdRef.current ? newMessage : m)
                    };
                });
            } else {
                const { error } = await res.json();
                throw new Error(error || 'Failed to confirm transaction with backend.');
            }
        }).catch(error => {
            console.error("Backend confirmation failed:", error);
            alert("Your payment was successful on-chain, but we failed to update it in our system. Please contact support.");
        }).finally(() => {
            // Clear refs for the next transaction
            optimisticIdRef.current = null;
            onChainMessageIdRef.current = null;
            pendingMessageContentRef.current = null;
            pendingAmountRef.current = null;
        });
    }
  }, [isMessageConfirmed, sendMessageHash]);

  useEffect(() => {
    // Handle any transaction errors
    const transactionFailed = approveError || sendMessageError || (sendMessageHash && isMessageError);
    if (transactionFailed) {
      alert(`Transaction failed: ${approveError?.message || sendMessageError?.message || 'The message transaction failed.'}`);
      
      if (optimisticIdRef.current) {
        // Remove the optimistic message that failed
        setConversation(prev => {
          if (!prev) return null;
          return { ...prev, messages: prev.messages.filter(m => m.id !== optimisticIdRef.current) };
        });
      }
      
      // Reset state
      onChainMessageIdRef.current = null;
      optimisticIdRef.current = null;
      pendingMessageContentRef.current = null;
      pendingAmountRef.current = null;
    }
  }, [approveError, sendMessageError, isMessageError, sendMessageHash]);


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading conversation...</div>;
  }
  
  return (
    <div className="flex flex-col bg-gray-100 font-sans h-full">
      <header className="sticky top-0 z-10 p-3 bg-gray-100">
        <div className="bg-white p-2 rounded-full shadow-md flex items-center">
            <Link href="/" className="mr-2 p-2">
              <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
            </Link>
            {recipientUser && (
                <>
                    <CustomAvatar profile={recipientUser} className="w-10 h-10 rounded-full mr-3" />
                    <div>
                        <p className="font-bold text-gray-900">{recipientUser.name}</p>
                        <p className="text-sm text-gray-500">@{recipientUser.username}</p>
                    </div>
                </>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation?.messages.map((msg) => {
          const isSender = msg.senderId === currentUser?.id;
          const senderProfile = isSender ? currentUser : recipientUser;

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
                            +${formatUnits(BigInt(msg.amount), 18)} USD
                        </span>
                    </div>
                )}
              </div>
              {isSender && <CustomAvatar profile={currentUser || null} className="w-8 h-8 rounded-full" />}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>
      
      <footer className="p-3 bg-transparent">
        <div className="bg-white p-2 rounded-2xl shadow-md flex items-center">
            <textarea
              rows={1}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                // Auto-resize logic
                e.target.style.height = 'inherit';
                e.target.style.height = `${e.target.scrollHeight}px`; 
              }}
              placeholder="Message"
              className="flex-1 w-full px-4 py-2 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none overflow-y-auto"
              style={{maxHeight: '120px'}} // Approx 5 lines of text + padding
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, new line on Shift+Enter
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button onClick={handleSendMessage} className="ml-3 p-2 bg-blue-500 rounded-full text-white" disabled={isSending}>
                <PaperAirplaneIcon className="w-6 h-6" />
            </button>
        </div>
      </footer>
      
      {showPaymentModal && <PaymentModal user={recipientUser} onSelect={handlePaymentSelect} onClose={() => setShowPaymentModal(false)} isProcessing={isApproving || isConfirmingApproval || isSendingMessage || isConfirmingMessage} />}
      
      {(isApproving || isSendingMessage || isConfirmingApproval || isConfirmingMessage) && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
          <div className="text-white text-lg font-bold">
            {isApproving && "Please approve the transaction in your wallet..."}
            {isConfirmingApproval && "Waiting for approval confirmation..."}
            {isSendingMessage && "Please sign the message transaction..."}
            {isConfirmingMessage && "Waiting for message confirmation..."}
          </div>
        </div>
      )}
    </div>
  );
}
