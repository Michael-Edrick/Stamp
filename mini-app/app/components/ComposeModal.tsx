"use client";

import { Fragment, useState, useEffect, useRef } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import StampIcon from './StampIcon';
import Link from 'next/link';
import CustomAvatar from './CustomAvatar';
import { User as PrismaUser } from '@prisma/client';
import { User as FarcasterUser } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { messageEscrowABI, messageEscrowAddress, usdcContractAddress } from '@/lib/contract';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';
import PaymentModal from './PaymentModal'; // Reusable Payment Modal

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PrismaUser | null;
}

const ComposeModal = ({ isOpen, onClose, currentUser }: ComposeModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FarcasterUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FarcasterUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  const [debouncedQuery] = useDebounce(searchQuery, 300);

  // Refs for the payment flow
  const recipientDbUserRef = useRef<PrismaUser | null>(null);
  const pendingMessageContentRef = useRef<string | null>(null);
  const onChainMessageIdRef = useRef<string | null>(null);
  const pendingAmountRef = useRef<number | null>(null);

  // Wagmi hooks for contract interactions
  const { data: approveHash, writeContract: approve, isPending: isApproving, error: approveError } = useWriteContract();
  const { data: sendMessageHash, writeContract: sendMessage, isPending: isSendingMessage, error: sendMessageError } = useWriteContract();
  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isConfirmingMessage, isSuccess: isMessageConfirmed, isError: isMessageError } = useWaitForTransactionReceipt({ hash: sendMessageHash });

  // Reset component state when it's closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
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
    setSearchQuery(user.username);
    setSearchResults([]);
  };

  const handleClearRecipient = () => {
    setSelectedUser(null);
    setSearchQuery('');
  }

  const handleSendMessage = async () => {
    if (!selectedUser || !message.trim() || !currentUser?.walletAddress) return;

    setIsSending(true);
    try {
      // Step 1: Find or create the user in our DB and get their full profile
      const findOrCreateResponse = await fetch('/api/users/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedUser),
      });

      if (!findOrCreateResponse.ok) throw new Error("Failed to find or create user in the database.");
      
      const recipientDbUser: PrismaUser = await findOrCreateResponse.json();
      recipientDbUserRef.current = recipientDbUser; // Store the full user object

      // Step 2: Now that we have the user, proceed with sending the message
      const sendMessageResponse = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-wallet-address': currentUser.walletAddress,
        },
        body: JSON.stringify({ 
            content: message, 
            recipientId: recipientDbUser.id, // Use the ID from the user we just found/created
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
      alert((error as Error).message || "An error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  const handlePaymentSelect = (amount: number) => {
    if (!recipientDbUserRef.current) return;
    
    setShowPaymentModal(false);
    pendingAmountRef.current = amount;
    
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
        alert((error as Error).message);
    }
  };

  useEffect(() => {
    console.log("--- Checking sendMessage trigger ---");
    console.log("isApprovalConfirmed:", isApprovalConfirmed);
    console.log("onChainMessageIdRef.current:", onChainMessageIdRef.current);
    console.log("recipientDbUserRef.current?.walletAddress:", recipientDbUserRef.current?.walletAddress);
    console.log("approveHash:", approveHash);

    if (isApprovalConfirmed && onChainMessageIdRef.current && recipientDbUserRef.current?.walletAddress && approveHash) {
      console.log("✅ All conditions met. Sending message...");
      const amountForTx = pendingAmountRef.current;
      if (amountForTx == null) {
        console.error("❌ Amount for transaction is null.");
        return;
      }
      
      const expiryDuration = BigInt(172800); // 48 hours in seconds
      console.log("Sending expiryDuration from ComposeModal:", expiryDuration);

      sendMessage({
        address: messageEscrowAddress,
        abi: messageEscrowABI,
        functionName: 'sendMessage',
        args: [
          recipientDbUserRef.current.walletAddress as `0x${string}`,
          onChainMessageIdRef.current as `0x${string}`,
          parseUnits(amountForTx.toString(), 18),
          expiryDuration,
        ]
      });
    }
  }, [isApprovalConfirmed, sendMessage, approveHash, recipientDbUserRef.current]);

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
                router.push(`/chat/${recipientDbUserRef.current!.id}`);
            } else {
                throw new Error('Failed to confirm transaction with backend.');
            }
        }).catch(error => {
            console.error("Backend confirmation failed:", error);
            alert("Payment was successful, but we failed to update our system. Please contact support.");
        });
    }
  }, [isMessageConfirmed, sendMessageHash, currentUser, router]);

  useEffect(() => {
    const transactionFailed = approveError || sendMessageError || isMessageError;
    if (transactionFailed) {
      alert(`Transaction failed: ${approveError?.message || sendMessageError?.message || 'The message transaction failed.'}`);
    }
  }, [approveError, sendMessageError, isMessageError]);

  const isProcessingTx = isApproving || isConfirmingApproval || isSendingMessage || isConfirmingMessage;

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <div className="fixed inset-0 z-40">
          {/* Backdrop */}
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

          {/* Sliding Panel */}
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
              <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl rounded-t-2xl p-4">

                {/* Content */}
                <div className="relative flex-1 flex flex-col">
                  <div className="py-2">
                      <div className="relative">
                          <div className="flex items-center rounded-full bg-gray-100 px-4 py-2">
                              {selectedUser ? (
                                  <button onClick={handleClearRecipient} className="pr-2">
                                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                                  </button>
                              ) : (
                                  <span className="text-gray-500 pr-2">To:</span>
                              )}
                              {selectedUser ? (
                                  <div className="flex items-center">
                                      <img src={selectedUser.pfp_url} alt={selectedUser.username} className="w-6 h-6 rounded-full mr-2" />
                                      <span className="font-semibold">{selectedUser.display_name}</span>
                                      <span className="text-gray-500 ml-1">@{selectedUser.username}</span>
                                  </div>
                              ) : (
                                  <input
                                      type="text"
                                      placeholder="@..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="w-full bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
                                  />
                              )}
                          </div>
                          {searchResults.length > 0 && (
                              <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-10">
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
                  </div>
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
    </>
  );
};

export default ComposeModal;
