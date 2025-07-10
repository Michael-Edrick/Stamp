"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    bio: "",
    price: 0,
    refundWindow: 72,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
    if (status === "authenticated" && session?.user?.id) {
      setLoading(true);
      fetch("/api/users/me")
        .then((res) => res.json())
        .then((data) => {
          setFormData({
            username: data.username || "",
            name: data.name || "",
            bio: data.bio || "",
            price: data.price || 0,
            refundWindow: data.refundWindow || 72,
          });
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to fetch profile data.");
          setLoading(false);
        });
    }
  }, [status, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess("Profile updated successfully!");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update profile.");
    }
  };

  if (status === "loading" || loading) {
    return <div className="text-center p-10">Loading...</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            value={formData.username}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium">Display Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
          <textarea
            name="bio"
            id="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium">Price per Message (in USDC cents)</label>
          <input
            type="number"
            name="price"
            id="price"
            value={formData.price}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="refundWindow" className="block text-sm font-medium">Refund Window (in hours)</label>
          <input
            type="number"
            name="refundWindow"
            id="refundWindow"
            value={formData.refundWindow}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
        {success && <p className="text-green-500 text-center">{success}</p>}
      </form>
    </div>
  );
} 