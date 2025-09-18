"use client";

import { useState, useEffect, useRef, Fragment } from 'react';
import {
  ChevronLeftIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/solid";
import { Menu, Transition } from '@headlessui/react'
import Link from "next/link";
import { useAccount } from "wagmi";
import { useParams } from 'next/navigation';
import { User as PrismaUser, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from "@/app/components/CustomAvatar";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { messageEscrowABI, messageEscrowAddress, usdcContractAddress } from '@/lib/contract';
import { parseUnits, bytesToHex, formatUnits } from 'viem';
import { erc20Abi } from 'viem';
import PaymentModal from '@/app/components/PaymentModal';

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

export default function ChatPage() {
  const params = useParams();
  // The parameter from the URL is now the universal 'userId'.
  const userId = params.userId as string;

  const { address: selfAddress, isConnected } = useAccount();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [recipientUser, setRecipientUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for the logged-in user
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  const { data: refundHash, writeContract: claimRefund, isPending: isClaimingRefund, error: refundError } = useWriteContract();
  
  const { isLoading: isConfirmingRefund, isSuccess: isRefundConfirmed } =
    useWaitForTransactionReceipt({ hash: refundHash });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // The function now loads data based on the universal 'userId'.
    const loadChatData = async (recipientId: string, currentUserAddress?: `0x${string}`) => {
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

            // Fetch recipient user data using the new, non-conflicting endpoint.
            const userResponse = await fetch(`/api/users/by-id/${recipientId}`);

            if (!userResponse.ok) throw new Error(`Failed to fetch recipient user data. Status: ${userResponse.status}`);
            
            const recipientData: User = await userResponse.json();
            setRecipientUser(recipientData);

            // Fetch the conversation between the current user and the recipient.
            // This part already correctly used the recipient's database ID.
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

    if (isConnected && selfAddress && userId) {
      loadChatData(userId, selfAddress);
    }
  }, [isConnected, selfAddress, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSaveEdit = async () => {
    if (!selfAddress) return;
    try {
      const response = await fetch(`/api/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': selfAddress,
        },
        body: JSON.stringify({ content: editingContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const updatedMessage = await response.json();

      setConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === editingMessageId ? updatedMessage : msg
          ),
        };
      });

      setEditingMessageId(null);
      setEditingContent('');
      setOpenMenuId(null);

    } catch (error) {
      console.error('Error saving message:', error);
      alert('Failed to save message. Please try again.');
    }
  };

  const handleClaimRefund = async (messageId: string, onChainMessageId: string) => {
    if (!selfAddress || !onChainMessageId) {
      alert("Cannot process refund: required information is missing.");
      return;
    }

    try {
      claimRefund({
        address: messageEscrowAddress,
        abi: messageEscrowABI,
        functionName: 'claimRefund',
        args: [onChainMessageId as `0x${string}`]
      });
      // We'll handle the DB update in the useEffect hook watching for isRefundConfirmed
    } catch (error) {
      console.error("Refund failed to start:", error);
      alert((error as Error).message);
    }
  };

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
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
      }
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

    setShowPaymentModal(false);

    // Store the pending transaction details in refs
    pendingAmountRef.current = amount;
    optimisticIdRef.current = `temp_${Date.now()}`;

    const meUser = currentUser;

    const optimisticMessage: MessageWithSender = {
      id: optimisticIdRef.current,
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
        // If there's no previous conversation, create a shell
        if (!prev) {
            return {
                id: `temp-convo-${recipientUser!.id}`,
                participants: [currentUser, recipientUser!],
                messages: [optimisticMessage],
                createdAt: new Date(),
                updatedAt: new Date(),
                messagesRemaining: 0,
            };
        }
        // If conversation exists, just add the message
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
          BigInt(1), // Changed from 3600 to 1 second for near-instant expiry
        ]
      });
    }
  }, [isApprovalConfirmed, sendMessage, recipientUser?.walletAddress, approveHash]);

  useEffect(() => {
    // Step 3 (Refund): On-chain refund sent, now confirm with backend
    if (isRefundConfirmed && refundHash) {
      // Find the message that was refunded to get its DB ID
      const refundedMessage = conversation?.messages.find(msg => msg.onChainMessageId && bytesToHex(msg.onChainMessageId as any) === refundHash);

      // This part is tricky because the refundHash is the TX hash, not the on-chain ID.
      // We need a way to link the refund transaction back to a message.
      // Let's store the ID of the message being refunded in a ref.
      const messageIdToRefund = optimisticIdRef.current; // Re-using a ref for now.
      
      if (messageIdToRefund) {
        fetch(`/api/messages/${messageIdToRefund}/refund`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-wallet-address': selfAddress as string,
            },
        }).then(async (res) => {
            if (res.ok) {
                const { updatedMessage } = await res.json();
                // Replace the old message with the refunded one
                setConversation(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        messages: prev.messages.map(m => m.id === messageIdToRefund ? updatedMessage : m)
                    };
                });
            } else {
                const { error } = await res.json();
                throw new Error(error || 'Failed to confirm refund with backend.');
            }
        }).catch(error => {
            console.error("Backend refund confirmation failed:", error);
            alert("Your refund was successful on-chain, but we failed to update it in our system. Please contact support.");
        }).finally(() => {
            optimisticIdRef.current = null; // Clear the ref
            setOpenMenuId(null);
        });
      }
    }
  }, [isRefundConfirmed, refundHash, selfAddress, conversation?.messages]);


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
    <div className="flex flex-col bg-[#ECECEC] font-sans h-full">
      <header className="p-3 bg-transparent">
        <div className="bg-[#F4F4F4] p-2 rounded-full flex items-center">
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

          // Check if the refund option should be available
          const isPaidMessage = msg.amount && msg.amount > 0;
          const isPendingReply = msg.status === 'SENT'; // Refundable when SENT, not PENDING_PAYMENT
          const canRefund = isSender && isPaidMessage && isPendingReply;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 relative ${
                isSender ? "justify-end z-10" : "justify-start"
              }`}
            >
              {!isSender && (
                <CustomAvatar
                  profile={senderProfile || null}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div
                ref={bubbleRef}
                className={`max-w-[80%] min-w-[180px] rounded-2xl bg-white px-4 py-3 text-gray-800 relative break-words`}
              >
                {isSender && (
                  <div className="absolute top-1 left-1">
                      <Menu as="div" className="relative inline-block text-left">
                        <div>
                          <Menu.Button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              // Determine if this specific message can be refunded to adjust menu height
                              const isPaidMessage = msg.amount && msg.amount > 0;
                              const isPendingReply = msg.status === 'SENT';
                              const canRefundThisMessage = isSender && isPaidMessage && isPendingReply;

                              setMenuPosition({
                                top: rect.top - (canRefundThisMessage ? 80 : 52),
                                left: rect.left - 5,
                              });
                            }}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <EllipsisHorizontalIcon
                              className="w-4 h-4 text-gray-400"
                              aria-hidden="true"
                            />
                          </Menu.Button>
                        </div>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items
                            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                            className="fixed w-56 origin-bottom-left rounded-md bg-white ring-1 ring-black/5 focus:outline-none"
                          >
                            <div className="px-1 py-1 ">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingContent(msg.content);
                                    }}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                                  >
                                    Edit message
                                  </button>
                                )}
                              </Menu.Item>
                              {canRefund && msg.onChainMessageId && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                       onClick={() => {
                                        if (msg.onChainMessageId) {
                                            optimisticIdRef.current = msg.id;
                                            handleClaimRefund(msg.id, msg.onChainMessageId)
                                        }
                                      }}
                                      className={`${
                                        active ? 'bg-gray-100' : ''
                                      } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600`}
                                    >
                                      Unsend stamp and withdraw ${msg.amount}
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  )}
                  <div
                    className={`flex justify-between items-center mb-1 ${
                      isSender ? "pt-4" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <p className="text-sm font-bold">{senderProfile?.name}</p>
                      <p className="ml-2 text-xs text-gray-500">
                        @{senderProfile?.username}
                      </p>
                    </div>
                  </div>
                  {editingMessageId === msg.id ? (
                    <div>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  {msg.amount && (
                    <div className="mt-2 flex items-center justify-between">
                      {msg.status === "REPLIED" ? (
                        <span className="text-xs text-blue-400 font-bold">
                          claimed!
                        </span>
                      ) : (
                        <div />
                      )}
                      <span className="text-xs font-bold text-white bg-orange-500 px-2 py-1 rounded-full">
                        +${msg.amount} USD
                      </span>
                    </div>
                  )}
                </div>
                {isSender && (
                  <CustomAvatar
                    profile={currentUser || null}
                    className="w-8 h-8 rounded-full"
                  />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </main>
        
        <footer className="p-3 bg-transparent">
          <div className="bg-white p-2 rounded-full flex items-center">
              <textarea
                ref={textareaRef}
                rows={1}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  // Auto-resize logic
                  e.target.style.height = 'inherit';
                  e.target.style.height = `${e.target.scrollHeight}px`; 
                }}
                placeholder="Message"
                className="flex-1 w-full px-4 py-2 bg-white rounded-full focus:outline-none text-base resize-none overflow-y-auto"
                style={{maxHeight: '120px'}} // Approx 5 lines of text + padding
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, new line on Shift+Enter
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
          </div>
        </footer>
      
      {showPaymentModal && <PaymentModal user={recipientUser} onSelect={handlePaymentSelect} onClose={() => setShowPaymentModal(false)} isProcessing={isApproving || isConfirmingApproval || isSendingMessage || isConfirmingMessage} />}
      
      {(isApproving || isSendingMessage || isConfirmingApproval || isConfirmingMessage || isClaimingRefund || isConfirmingRefund) && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
          <div className="text-white text-lg font-bold">
            {isApproving && "Please approve the transaction in your wallet..."}
            {isConfirmingApproval && "Waiting for approval confirmation..."}
            {isSendingMessage && "Please sign the message transaction..."}
            {isConfirmingMessage && "Waiting for message confirmation..."}
            {isClaimingRefund && "Processing refund, please check your wallet..."}
            {isConfirmingRefund && "Waiting for refund confirmation..."}
          </div>
        </div>
      )}
    </div>
  );
}
