"use client";

import { Fragment, useState, useEffect, useRef } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import CustomAvatar from './CustomAvatar';
import { User as PrismaUser } from '@prisma/client';
import { User as FarcasterUser } from "@neynar/nodejs-sdk/build/api";
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { messageEscrowABI } from '@/lib/contract';
import { CONFIG } from '@/lib/config';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';
import PaymentModal from './PaymentModal';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import InfoModal from './InfoModal';
import SuccessModal from './SuccessModal';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PrismaUser | null;
}

const ComposeModal = ({ isOpen, onClose, currentUser }: ComposeModalProps) => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FarcasterUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FarcasterUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSendingTriggered, setIsSendingTriggered] = useState(false);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({ title: '', message: '' });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const router = useRouter();

  const [debouncedQuery] = useDebounce(searchTerm, 300);

  const recipientDbUserRef = useRef<PrismaUser | null>(null);
  const pendingMessageContentRef = useRef<string | null>(null);
  const onChainMessageIdRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number | null>(null);

  const { data: approveHash, writeContract: approve, isPending: isApproving, error: approveError, reset: resetApprove } = useWriteContract();
  const { data: sendMessageHash, writeContract: sendMessage, isPending: isSendingMessage, error: sendMessageError, reset: resetSendMessage } = useWriteContract();
  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed, error: approveReceiptError } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isConfirmingMessage, isSuccess: isMessageConfirmed, isError: isMessageError, error: sendMessageReceiptError } = useWaitForTransactionReceipt({ hash: sendMessageHash });

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUser(null);
      setMessage('');
      setIsSending(false);
      setShowPaymentModal(false);
      recipientDbUserRef.current = null;
      pendingMessageContentRef.current = null;
      onChainMessageIdRef.current = null;
      pendingAmountRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (debouncedQuery.length > 1 && !selectedUser) {
      const fetchUsers = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/users/search-farcaster?q=${debouncedQuery}`);
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.users);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error("Failed to fetch users:", error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsers();
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, selectedUser]);

  const handleSelectUser = (user: FarcasterUser) => {
    setSelectedUser(user);
    setSearchTerm(user.username);
    setSearchResults([]);
  };

  const handleClearRecipient = () => {
    setSelectedUser(null);
    setSearchTerm('');
  }

  const handleSendMessage = async () => {
    if (!selectedUser || !message.trim() || !currentUser?.walletAddress) return;

    setIsSending(true);
    try {
      const findOrCreateResponse = await fetch('/api/users/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedUser),
      });

      if (!findOrCreateResponse.ok) throw new Error("Failed to find or create user in the database.");
      
      const recipientDbUser: PrismaUser = await findOrCreateResponse.json();
      recipientDbUserRef.current = recipientDbUser;

      const sendMessageResponse = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-wallet-address': currentUser.walletAddress,
        },
        body: JSON.stringify({ 
            content: message, 
            recipientId: recipientDbUser.id,
        })
      });

      const responseData = await sendMessageResponse.json();

      if (sendMessageResponse.ok) {
        router.push(`/chat/${recipientDbUser.id}`);
      } else if (sendMessageResponse.status === 402 && responseData.paymentRequired) {
        pendingMessageContentRef.current = message;
        onChainMessageIdRef.current = responseData.onChainMessageId;
        setShowPaymentModal(true);
      } else {
        throw new Error(responseData.error || 'Failed to send message');
      }

    } catch (error) {
      console.error("Error sending message:", error);
      setInfoModalContent({
        title: 'Error',
        message: (error as Error).message || "An unexpected error occurred. Please try again."
      });
      setInfoModalOpen(true);
    } finally {
      setIsSending(false);
    }
  };

  const handlePaymentSelect = (amount: number) => {
    if (!recipientDbUserRef.current) return;
    
    setShowPaymentModal(false);
    pendingAmountRef.current = amount;
    setIsSendingTriggered(false);

    try {
        const amountInWei = parseUnits(amount.toString(), 6);
        approve({
          address: CONFIG.usdcContractAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONFIG.messageEscrowAddress as `0x${string}`, amountInWei]
        });
    } catch (error) {
        console.error("Approval failed to start:", error);
        alert((error as Error).message);
    }
  };

  useEffect(() => {
    console.log("ComposeModal sendMessage effect triggered. isApprovalConfirmed:", isApprovalConfirmed);
    if (isApprovalConfirmed && onChainMessageIdRef.current && recipientDbUserRef.current?.walletAddress && !isSendingTriggered) {
      setIsSendingTriggered(true);
      const amountForTx = pendingAmountRef.current;

      if (amountForTx == null) {
        console.error("❌ Amount for transaction is null.");
        return;
      }
      
      const expiryDuration = BigInt(172800);
      
      sendMessage({
        address: CONFIG.messageEscrowAddress as `0x${string}`,
        abi: messageEscrowABI,
        functionName: 'sendMessage',
        args: [
          recipientDbUserRef.current.walletAddress as `0x${string}`,
          onChainMessageIdRef.current as `0x${string}`,
          parseUnits(amountForTx.toString(), 6),
          expiryDuration,
        ]
      });
    }
  }, [isApprovalConfirmed, sendMessage, isSendingTriggered]);

  useEffect(() => {
    if (isMessageConfirmed && sendMessageHash) {
        fetch('/api/messages/send', {
            method: 'POST',
            headers: { 
                 'Content-Type': 'application/json',
                'x-wallet-address': currentUser!.walletAddress!,
            },
            body: JSON.stringify({
                content: pendingMessageContentRef.current,
                recipientId: recipientDbUserRef.current!.id,
                amount: pendingAmountRef.current,
                txHash: sendMessageHash,
                onChainMessageId: onChainMessageIdRef.current,
            }),
        }).then(res => {
            if (res.ok) {
                // Fire-and-forget the Farcaster cast notification
                if (recipientDbUserRef.current?.username) {
                    fetch('/api/cast', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recipientUsername: recipientDbUserRef.current.username }),
                    }).catch(castError => {
                        console.error("Failed to submit Farcaster cast:", castError);
                        // We don't alert the user here as the primary message was successful.
                    });
                }
                // router.push(`/chat/${recipientDbUserRef.current!.id}`);
                setIsSuccessModalOpen(true);
            } else {
                throw new Error('Failed to confirm transaction with backend.');
            }
        }).catch(error => {
            console.error("Backend confirmation failed:", error);
            setInfoModalContent({
                title: 'Confirmation Failed',
                message: "Payment was successful, but we failed to update our system. Please contact support."
            });
            setInfoModalOpen(true);
        });
    }
  }, [isMessageConfirmed, sendMessageHash, currentUser, router]);

  useEffect(() => {
    const transactionFailed = approveError || sendMessageError || approveReceiptError || sendMessageReceiptError;
    if (transactionFailed) {
      const getErrorMessage = () => {
        const error = approveError || sendMessageError || approveReceiptError || sendMessageReceiptError;
        console.log("Raw transaction error object:", error); // Log the entire error object
        if (error?.message) {
          if (error.message.includes('insufficient funds')) {
            return "Transaction failed due to insufficient funds. Please ensure you have enough USDC for the message and ETH for gas fees.";
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
    }
  }, [approveError, sendMessageError, isMessageError, approveReceiptError, sendMessageReceiptError]);

  const isProcessingTx = isApproving || isConfirmingApproval || isSendingMessage || isConfirmingMessage;

  const isReadyToSend = selectedUser && message.trim() !== '';

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <div className="fixed inset-0 z-40">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="absolute inset-0 bg-black/30"
              onClick={onClose}
            />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="transform transition ease-in-out duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <div className="absolute bottom-0 h-[85%] w-full">
              <div className="flex h-full flex-col bg-white shadow-xl rounded-t-2xl">
                
                {/* Single Header Bar */}
                <div className="flex items-center p-4 border-b border-gray-200 space-x-2">
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                        <XMarkIcon className="h-5 w-5 text-gray-600" />
                    </button>

                    <div className="flex-1 flex items-center rounded-full bg-gray-100 px-4 py-2 relative min-w-0">
                        {selectedUser ? (
                            <button onClick={handleClearRecipient} className="flex items-center w-full text-left min-w-0">
                                <img src={selectedUser.pfp_url} alt={selectedUser.username} className="w-6 h-6 rounded-full mr-2 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm text-gray-900 block truncate">{selectedUser.display_name}</span>
                                    <span className="text-gray-500 text-sm block truncate">@{selectedUser.username}</span>
                                </div>
                            </button>
                        ) : (
                            <>
                                <span className="text-gray-500 pr-2">To:</span>
                                <input
                                    type="text"
                                    placeholder="@..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base"
                                />
                            </>
                        )}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 w-full rounded-md bg-white shadow-lg z-10">
                                <ul className="max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {searchResults.map((user) => (
                                    <li
                                        key={user.fid}
                                        onClick={() => handleSelectUser(user)}
                                        className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                                    >
                                        <div className="flex items-center">
                                            <img src={user.pfp_url} alt={user.username} className="h-8 w-8 rounded-full" />
                                            <span className="ml-3 block truncate font-semibold">{user.display_name}</span>
                                            <span className="ml-2 truncate text-gray-500">@{user.username}</span>
                                        </div>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSendMessage}
                        disabled={!isReadyToSend}
                        className={`p-2 rounded-full transition-colors flex-shrink-0 flex items-center justify-center ${
                            isReadyToSend ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                        }`}
                        >
                        <PaperAirplaneIcon className="w-6 h-6 -rotate-45" />
                    </button>
                </div>

                <div className="relative flex-1 flex flex-col px-4">
                  <textarea
                    placeholder={selectedUser ? `Message @${selectedUser.username}...` : "Start typing to find a user..."}
                    className="flex-1 w-full resize-none pt-2 text-lg text-gray-900 placeholder-gray-400 focus:outline-none"
                    readOnly={!selectedUser}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (selectedUser && message.trim()) {
                          handleSendMessage();
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition.Root>
      
      {showPaymentModal && 
        <PaymentModal 
            user={recipientDbUserRef.current} 
            onSelect={handlePaymentSelect} 
            onClose={() => setShowPaymentModal(false)} 
            isProcessing={isProcessingTx} 
        />
      }

      {isProcessingTx && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
          <div className="text-white text-lg font-bold">
            {isApproving && "Please approve in your wallet..."}
            {isConfirmingApproval && "Waiting for approval..."}
            {isSendingMessage && "Please sign in your wallet..."}
            {isConfirmingMessage && "Waiting for confirmation..."}
          </div>
        </div>
      )}

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => {
            setInfoModalOpen(false)
            resetApprove();
            resetSendMessage();
        }}
        title={infoModalContent.title}
        message={infoModalContent.message}
      />

      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => {
            setIsSuccessModalOpen(false);
            onClose(); // Close the main compose modal as well
        }}
        onNavigate={() => {
            setIsSuccessModalOpen(false);
            router.push(`/chat/${recipientDbUserRef.current!.id}`);
            onClose(); // Close the main compose modal as well
        }}
        amount={pendingAmountRef.current || 0}
        recipientUsername={recipientDbUserRef.current?.username || ''}
      />
    </>
  );
};

export default ComposeModal;
