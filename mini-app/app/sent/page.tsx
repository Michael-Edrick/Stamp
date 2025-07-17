"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CustomAvatar from "@/app/components/CustomAvatar";
import { User, Message } from "@prisma/client";

interface SentMessage extends Message {
  recipient: Partial<User>;
}

export default function SentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
    if (status === "authenticated") {
      setLoading(true);
      fetch("/api/messages/sent")
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch sent messages");
          }
          return res.json();
        })
        .then((data) => {
          setMessages(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return <div className="text-center p-10">Loading sent messages...</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sent Messages</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <div className="space-y-4">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="bg-gray-800 p-4 rounded-lg flex items-start space-x-4">
              <CustomAvatar profile={msg.recipient} className="w-10 h-10 rounded-full mt-1" />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold">To: {msg.recipient.name || "Anonymous"}</span>
                  <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-300 mt-1 truncate">{msg.content}</p>
                 <p className={`text-xs mt-2 font-semibold ${
                    msg.status === 'SENT' ? 'text-yellow-400' :
                    msg.status === 'REPLIED' ? 'text-green-400' :
                    'text-red-400'
                }`}>
                    Status: {msg.status}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">You haven't sent any messages.</p>
        )}
      </div>
    </div>
  );
} 