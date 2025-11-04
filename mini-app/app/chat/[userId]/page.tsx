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
import { useParams, useRouter } from 'next/navigation';
import { User as PrismaUser, Message as PrismaMessage } from '@prisma/client';
import CustomAvatar from "@/app/components/CustomAvatar";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { readContract } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { messageEscrowABI, messageEscrowAddress, usdcContractAddress } from '@/lib/contract';
import { parseUnits, bytesToHex, formatUnits } from 'viem';
import { erc20Abi } from 'viem';
import PaymentModal from '@/app/components/PaymentModal';
import StampAvatar from '@/app/components/StampAvatar';
import InfoModal from '@/app/components/InfoModal';

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
  const router = useRouter();
  const userId = params.userId as string;

  const { address: selfAddress, isConnected } = useAccount();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [recipientUser, setRecipientUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({ title: '', message: '' });
  const [isSendingTriggered, setIsSendingTriggered] = useState(false);

  const pendingMessageContentRef = useRef<string | null>(null);
  const onChainMessageIdRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number | null>(null);
  const optimisticIdRef = useRef<string | null>(null);


  const { data: approveHash, writeContract: approve, isPending: isApproving, error: approveError, reset: resetApprove } = useWriteContract();
  const { data: sendMessageHash, writeContract: sendMessage, isPending: isSendingMessage, error: sendMessageError, reset: resetSendMessage } = useWriteContract();

  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed, error: approveReceiptError } = 
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isConfirmingMessage, isSuccess: isMessageConfirmed, isError: isMessageError, error: sendMessageReceiptError } =
    useWaitForTransactionReceipt({ hash: sendMessageHash });

  const { data: refundHash, writeContract: claimRefund, isPending: isClaimingRefund, error: refundError, reset: resetRefund } = useWriteContract();
  
  const { isLoading: isConfirmingRefund, isSuccess: isRefundConfirmed } =
    useWaitForTransactionReceipt({ hash: refundHash });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadChatData = async (recipientId: string, currentUserAddress?: `0x${string}`) => {
        setIsLoading(true);
        try {
            if (!currentUserAddress) {
                setIsLoading(false);
                return;
            }
            const meResponse = await fetch(`/api/users/me?walletAddress=${currentUserAddress}`);
            if (!meResponse.ok) throw new Error("Failed to fetch current user data.");
            const meData: User = await meResponse.json();
            setCurrentUser(meData);

            const userResponse = await fetch(`/api/users/by-id/${recipientId}`);

            if (!userResponse.ok) throw new Error(`Failed to fetch recipient user data. Status: ${userResponse.status}`);
            
            const recipientData: User = await userResponse.json();
            setRecipientUser(recipientData);

            const convoResponse = await fetch(`/api/conversations/${recipientData.id}`, {
                headers: {
                    'x-wallet-address': currentUserAddress,
                }
            });
            if (convoResponse.ok) {
                const convoData: Conversation = await convoResponse.json();
                setConversation(convoData);
            } else if (convoResponse.status === 404) {
                setConversation(null);
            } else {
                throw new Error('Failed to fetch conversation');
            }

        } catch (error) {
            console.error(error);
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
      setInfoModalContent({
        title: "Error",
        message: "Failed to save message. Please try again."
      });
      setInfoModalOpen(true);
    }
  };

  const handleClaimRefund = async (messageId: string, onChainMessageId: string) => {
    if (!selfAddress || !onChainMessageId) {
      setInfoModalContent({
        title: "Error",
        message: "Cannot process refund: required information is missing."
      });
      setInfoModalOpen(true);
      return;
    }

    try {
      const messageData = await readContract(config, {
        address: messageEscrowAddress,
        abi: messageEscrowABI,
        functionName: 'messages',
        args: [onChainMessageId as `0x${string}`],
      });

      const [_recipient, _sender, _amount, expiry, _isReleased] = messageData as [string, string, bigint, bigint, boolean];
      const expiryTimestamp = Number(expiry) * 1000;
      const now = Date.now();

      if (now < expiryTimestamp) {
        const remainingTime = expiryTimestamp - now;
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        setInfoModalContent({
          title: "Refund Not Yet Available",
          message: `You can only unsend after 48 hours. Please wait for ${hours}h ${minutes}m.`
        });
        setInfoModalOpen(true);
        return;
      }

      optimisticIdRef.current = messageId;
      claimRefund({
        address: messageEscrowAddress,
        abi: messageEscrowABI,
        functionName: 'claimRefund',
        args: [onChainMessageId as `0x${string}`]
      });

    } catch (error) {
      console.error("Failed to check expiry or claim refund:", error);
      setInfoModalContent({
        title: "Error",
        message: "Could not process refund. Please try again."
      });
      setInfoModalOpen(true);
    }
  };

  const handleSendMessage = async () => {
    if (!selfAddress) {
      setInfoModalContent({
        title: "Wallet Not Connected",
        message: "Could not identify sender. Please reconnect your wallet and try again."
      });
      setInfoModalOpen(true);
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
            recipientId: recipientUser.id,
            txHash: null,
            amount: null 
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        setConversation(prev => {
            if (!prev) return null;
            const newMessages = [...prev.messages, responseData.newMessage];
            return { ...prev, messages: newMessages };
        });
      } else if (response.status === 402 && responseData.paymentRequired) {
        pendingMessageContentRef.current = content;
        onChainMessageIdRef.current = responseData.onChainMessageId;
        setShowPaymentModal(true);
      } else {
        throw new Error(responseData.error || 'Failed to send message');
      }

    } catch (error) {
      console.error("Sending message failed:", error);
      setInfoModalContent({
        title: "Error Sending Message",
        message: (error as Error).message
      });
      setInfoModalOpen(true);
      setMessage(content);
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
      }
    }
  };
  
  const handlePaymentSelect = (amount: number) => {
    setShowPaymentModal(false);
    pendingAmountRef.current = amount;
    optimisticIdRef.current = `temp_${Date.now()}`;
    setIsSendingTriggered(false);

    const meUser = currentUser;
    if (!meUser) {
      setInfoModalContent({
        title: "Error",
        message: "Cannot send message: current user not loaded."
      });
      setInfoModalOpen(true);
      return;
    }

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
        if (!prev) {
            return {
                id: `temp-convo-${recipientUser!.id}`,
                participants: [currentUser, recipientUser!],
                messages: [optimisticMessage],
            };
        }
        if (prev.messages.some(m => m.id === optimisticMessage.id)) {
            return prev;
        }
        return { ...prev, messages: [...prev.messages, optimisticMessage] };
    });

    try {
        const amountInWei = parseUnits(amount.toString(), 18);
        approve({
          address: usdcContractAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [messageEscrowAddress, amountInWei]
        });
    } catch (error) {
        console.error("Approval failed to start:", error);
        setInfoModalContent({
            title: "Approval Failed",
            message: (error as Error).message
        });
        setInfoModalOpen(true);
        setConversation(prev => {
            if (!prev) return null;
            return { ...prev, messages: prev.messages.filter(m => m.id !== optimisticIdRef.current) };
        });
    }
  };

  useEffect(() => {
    console.log("ChatPage sendMessage effect triggered. isApprovalConfirmed:", isApprovalConfirmed);
    if (isApprovalConfirmed && onChainMessageIdRef.current && recipientUser?.walletAddress && !isSendingTriggered) {
      setIsSendingTriggered(true);
      const amountForTx = pendingAmountRef.current;

      if (amountForTx == null) {
        console.error("Could not find amount for transaction, aborting sendMessage.");
        return;
      }
      
      const expiryDuration = BigInt(172800);
      
      sendMessage({
        address: messageEscrowAddress,
        abi: messageEscrowABI,
        functionName: 'sendMessage',
        args: [
          recipientUser.walletAddress as `0x${string}`,
          onChainMessageIdRef.current as `0x${string}`,
          parseUnits(amountForTx.toString(), 18),
          expiryDuration,
        ]
      });
    }
  }, [isApprovalConfirmed, sendMessage, recipientUser?.walletAddress, isSendingTriggered]);

  useEffect(() => {
    if (isRefundConfirmed && refundHash) {
      const messageIdToRefund = optimisticIdRef.current;
      
      if (messageIdToRefund) {
        fetch(`/api/messages/${messageIdToRefund}/refund`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-wallet-address': selfAddress as string,
            },
        }).then(async (res) => {
            if (res.ok) {
                const { deletedMessageId } = await res.json();
                setConversation(prev => {
                    if (!prev) return null;
                    const updatedMessages = prev.messages.filter(m => m.id !== deletedMessageId);
                    
                    if (updatedMessages.length === 0) {
                      router.push('/');
                      return null;
                    }

                    return {
                        ...prev,
                        messages: updatedMessages
                    };
                });
                if (conversation && conversation.messages.length > 1) {
                } else {
                   router.push('/');
                }

            } else {
                const { error } = await res.json();
                throw new Error(error || 'Failed to confirm unsend with backend.');
            }
        }).catch(error => {
            console.error("Backend refund confirmation failed:", error);
            setInfoModalContent({
                title: 'Update Failed',
                message: "Your refund was successful on-chain, but we failed to update it in our system. Please contact support."
            });
            setInfoModalOpen(true);
        }).finally(() => {
            optimisticIdRef.current = null;
            setOpenMenuId(null);
        });
      }
    }
  }, [isRefundConfirmed, refundHash, selfAddress, router]);


  useEffect(() => {
    if (isMessageConfirmed && sendMessageHash) {
        fetch('/api/messages/send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-wallet-address': selfAddress as string,
            },
            body: JSON.stringify({
                content: pendingMessageContentRef.current,
                recipientId: recipientUser!.id,
                amount: pendingAmountRef.current,
                txHash: sendMessageHash,
                onChainMessageId: onChainMessageIdRef.current,
            }),
        }).then(async (res) => {
            if (res.ok) {
                const { newMessage } = await res.json();
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
            setInfoModalContent({
                title: 'Update Failed',
                message: "Your payment was successful on-chain, but we failed to update it in our system. Please contact support."
            });
            setInfoModalOpen(true);
        }).finally(() => {
            optimisticIdRef.current = null;
            onChainMessageIdRef.current = null;
            pendingMessageContentRef.current = null;
            pendingAmountRef.current = null;
        });
    }
  }, [isMessageConfirmed, sendMessageHash]);

  useEffect(() => {
    const transactionFailed = approveError || sendMessageError || (sendMessageHash && (approveReceiptError || sendMessageReceiptError)) || refundError;
    if (transactionFailed) {
        const getErrorMessage = () => {
            const error = approveError || sendMessageError || refundError || approveReceiptError || sendMessageReceiptError;
            if (error?.message) {
                console.log("Raw transaction error:", error.message); // Log the raw error
                if (error.message.includes('insufficient funds')) {
                    return "Transaction failed due to insufficient funds. Please ensure you have enough tokens for the transaction and ETH/base for gas fees.";
                }
                if (error.message.includes('rejected')) {
                    return "The transaction was rejected in your wallet.";
                }
            }
            return "An error occured while processing the transaction. Please check your wallet and token. ";
        };
        setInfoModalContent({
            title: "Transaction Failed",
            message: getErrorMessage()
        });
        setInfoModalOpen(true);
      
      if (optimisticIdRef.current) {
        setConversation(prev => {
          if (!prev) return null;
          return { ...prev, messages: prev.messages.filter(m => m.id !== optimisticIdRef.current) };
        });
      }
      
      onChainMessageIdRef.current = null;
      optimisticIdRef.current = null;
      pendingMessageContentRef.current = null;
      pendingAmountRef.current = null;
    }
  }, [approveError, sendMessageError, isMessageError, sendMessageHash, refundError, approveReceiptError, sendMessageReceiptError]);


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

      <main className="flex-1 overflow-y-auto p-4 flex flex-col-reverse space-y-4">
        <div ref={messagesEndRef} />
        {conversation?.messages.slice().reverse().map((msg) => {
          const isSender = msg.senderId === currentUser?.id;
          const senderProfile = isSender ? currentUser : recipientUser;

          const isPaidMessage = msg.amount && msg.amount > 0;
          const isPendingReply = msg.status === 'SENT';
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
                className={`max-w-[80%] rounded-2xl bg-white p-4 text-gray-800 relative break-words`}
              >
                {isSender && (
                  <div className="absolute top-1 left-1">
                      <Menu as="div" className="relative inline-block text-left">
                        <div>
                          <Menu.Button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
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
                  
                  {msg.amount && msg.amount > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="mb-2">
                        <StampAvatar
                          profile={senderProfile || {}}
                          amount={msg.amount}
                          className="w-32 h-32"
                          style={{ transform: 'rotate(5.38deg)' }}
                        />
                </div>
                <p className="text-sm">{msg.content}</p>
                    </div>
                  ) : (
                    <>
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
                      <p className="text-sm">{msg.content}</p>
                    </>
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
      </main>
      
      <footer className="p-3 bg-transparent">
        <div className="bg-white p-2 rounded-full flex items-center">
            <textarea
                ref={textareaRef}
              rows={1}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                e.target.style.height = 'inherit';
                e.target.style.height = `${e.target.scrollHeight}px`; 
              }}
              placeholder="Message"
                className="flex-1 w-full px-4 py-2 bg-white rounded-full focus:outline-none text-base resize-none overflow-y-auto text-gray-900"
                style={{maxHeight: '120px'}}
              disabled={isSending}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className={`p-2 rounded-full transition-colors ml-2 ${
                    message.trim() ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}
            >
                <PaperAirplaneIcon className="w-6 h-6 -rotate-45" />
            </button>
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

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => {
            setInfoModalOpen(false);
            resetApprove();
            resetSendMessage();
            resetRefund();
        }}
        title={infoModalContent.title}
        message={infoModalContent.message}
      />
    </div>
  );
}
