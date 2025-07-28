"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { messageEscrowAddress, messageEscrowABI, usdcContractAddress } from "@/lib/contract";
import { parseEther, keccak256, toBytes } from "viem";
import Link from "next/link";
import CustomAvatar from "@/app/components/CustomAvatar";

const usdcAddress = usdcContractAddress;
const erc20Abi = [{ "constant": false, "inputs": [{ "name": "spender", "type": "address" }, { "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }] as const;

function NewMessageForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const recipientAddress = searchParams.get('recipient');
    const name = searchParams.get('name');
    if (recipientAddress) setRecipient(recipientAddress);
    if (name) setRecipientName(name);
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="text-center p-10 text-white">Loading session...</div>;
  }
  
  if (!recipient) {
     return (
        <div className="text-center p-10 text-white">
            <p>Recipient not found.</p>
            <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">
                &larr; Go Back
            </Link>
        </div>
     )
  }

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [messageEscrowAddress, parseEther(amount)],
      });
      setIsApproved(true);
    } catch (e) {
      console.error(e);
      setError("Approval failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApproved) {
      setError("You must approve USDC spending first.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const messageId = keccak256(toBytes(`${address}-${recipient}-${content}-${Date.now()}`));
      const sendMessageTx = await writeContractAsync({
        address: messageEscrowAddress,
        abi: messageEscrowAbi,
        functionName: 'sendMessage',
        args: [recipient as `0x${string}`, messageId, parseEther(amount), BigInt(7 * 24 * 60 * 60)]
      });
      
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, content, messageId, txHash: sendMessageTx, amount: parseFloat(amount) }),
      });

      router.push("/sent");
    } catch (e) {
      console.error(e);
      setError("An error occurred while sending the message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans">
      <header className="p-4 flex items-center">
        <Link href="/" className="text-xl">&larr;</Link>
        <h1 className="text-xl font-bold text-center flex-1">New Message</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 p-4 flex flex-col">
        <div className="flex items-center mb-6">
          <span className="text-gray-400 mr-2">To:</span>
          <CustomAvatar profile={{ name: recipientName }} className="w-8 h-8 rounded-full mr-3" />
          <span className="font-semibold">{recipientName}</span>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message..."
            className="w-full flex-1 bg-gray-900 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            required
          />

          <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Amount (USDC)</label>
              <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setAmount("5")} className={`px-4 py-2 rounded-full text-sm font-semibold ${amount === '5' ? 'bg-blue-600' : 'bg-gray-800'}`}>$5</button>
                  <button type="button" onClick={() => setAmount("10")} className={`px-4 py-2 rounded-full text-sm font-semibold ${amount === '10' ? 'bg-blue-600' : 'bg-gray-800'}`}>$10</button>
                  <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-gray-800 rounded-full px-4 py-2 w-24 text-center"
                      placeholder="Custom"
                  />
              </div>
          </div>
          
          <div className="space-y-3 mt-auto">
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading || isApproved}
              className={`w-full py-3 px-4 rounded-full text-base font-bold transition-colors ${isApproved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-600`}
            >
              {loading && !isApproved ? "Approving..." : isApproved ? "✓ Approved" : "1. Approve USDC"}
            </button>
            <button
              type="submit"
              disabled={loading || !isApproved}
              className="w-full py-3 px-4 rounded-full text-base font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 transition-colors"
            >
              {loading && isApproved ? "Sending..." : "2. Send Message"}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </main>
    </div>
  );
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="text-center p-10 text-white">Loading...</div>}>
      <NewMessageForm />
    </Suspense>
  );
} 