"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { messageEscrowAddress, messageEscrowAbi } from "@/lib/contract";
import { parseEther, keccak256, toBytes } from "viem";

const usdcAddress = "0x6051912FC68729aa994989C8B23666AFfC890204" as const;
const erc20Abi = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
] as const;


export default function NewMessagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("1"); // Default to 1 USDC
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return <div className="text-center p-10">Loading...</div>;
  }

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      const approvalTx = await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [messageEscrowAddress, parseEther(amount)],
      });
      setTxHash(approvalTx);
      setIsApproved(true);
      alert("Approval successful! You can now send the message.");
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
      // 1. Generate a unique message ID
      const messageId = keccak256(toBytes(`${address}-${recipient}-${content}-${Date.now()}`));

      // 2. Call the `sendMessage` function on the smart contract.
      const sendMessageTx = await writeContractAsync({
        address: messageEscrowAddress,
        abi: messageEscrowAbi,
        functionName: 'sendMessage',
        args: [
          recipient as `0x${string}`,
          messageId,
          parseEther(amount),
          BigInt(7 * 24 * 60 * 60) // 7-day expiry
        ]
      });
      setTxHash(sendMessageTx);

      // 3. Call our `/api/messages/send` endpoint
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          content,
          messageId, // Use the same ID
          txHash: sendMessageTx,
          amount: parseFloat(amount)
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save message to the backend.");
      }

      alert("Message sent successfully!");
      router.push("/sent");

    } catch (e) {
      console.error(e);
      setError("An error occurred while sending the message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Send a New Message</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium">Recipient Address</label>
          <input
            type="text"
            name="recipient"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium">Amount (USDC)</label>
          <input
            type="number"
            name="amount"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1"
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium">Message</label>
          <textarea
            name="content"
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div className="space-y-4">
           <button
            type="button"
            onClick={handleApprove}
            disabled={loading || isApproved}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isApproved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {loading ? "Approving..." : isApproved ? "USDC Approved" : "1. Approve USDC"}
          </button>
          <button
            type="submit"
            disabled={loading || !isApproved}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? "Sending..." : "2. Send Message & Payment"}
          </button>
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
        {txHash && <p className="text-green-500 text-center truncate">Tx: {txHash}</p>}
      </form>
    </div>
  );
} 