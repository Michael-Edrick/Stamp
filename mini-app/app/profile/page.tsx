"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Reusable Components (Ideally in a separate file) ---

const UserCircleIcon = ({ className = "w-8 h-8 text-gray-400" }: { className?: string }) => (<svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" /></svg>);

const CustomAvatar = ({ profile, className }: { profile: any, className: string }) => {
  if (profile?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.image} alt={profile.name || 'User avatar'} className={className} />;
  }
  const sizeClass = className.split(' ').find(c => c.startsWith('w-') || c.startsWith('h-')) || 'w-10 h-10';
  return <UserCircleIcon className={`${sizeClass} text-gray-400`} />;
}

const ProfileCardPreview = ({ profile }: { profile: any }) => (
  <div className="bg-gray-800 rounded-2xl p-4 mb-6 shadow-lg">
    <div className="flex items-center">
      <CustomAvatar profile={profile} className="w-12 h-12 rounded-full mr-4" />
      <div>
        <p className="font-bold text-xl">{profile.name || "Anonymous"}</p>
        <p className="text-sm text-gray-400">@{profile.username || (profile.walletAddress ? profile.walletAddress.slice(0, 8) : '')}</p>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-700">
      <p className="text-sm text-gray-300 mb-4">{profile.bio || 'Your bio will appear here.'}</p>
      {profile.x_social && (
        <div className="flex items-center justify-between text-sm bg-gray-900 p-2 rounded-lg mb-2">
          <span>X (Twitter)</span>
          <span className="text-blue-400">@{profile.x_social}</span>
        </div>
      )}
      {profile.instagram && (
        <div className="flex items-center justify-between text-sm bg-gray-900 p-2 rounded-lg">
          <span>Instagram</span>
          <span className="text-purple-400">@{profile.instagram}</span>
        </div>
      )}
    </div>
  </div>
);


// --- Main Profile Page Component ---

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
    if (status === 'authenticated') {
      fetch('/api/users/me')
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load profile.');
          setLoading(false);
        });
    }
  }, [status, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/users/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save profile');
      }
      alert('Profile saved successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  if (loading) return <div className="text-center p-10 text-white">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans p-4">
       <header className="py-4 flex items-center">
        <Link href="/" className="text-xl">&larr;</Link>
        <h1 className="text-2xl font-bold text-center flex-1">Your Profile</h1>
        <div className="w-8"></div>
      </header>

      {profile && <ProfileCardPreview profile={profile} />}

      <form onSubmit={handleSave} className="space-y-6">
        <h2 className="text-xl font-semibold border-t border-gray-700 pt-6">Edit Details</h2>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-400">Display Name</label>
          <input type="text" name="name" id="name" value={profile?.name || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-blue-500 focus:ring-blue-500"/>
        </div>
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-400">Username</label>
          <input type="text" name="username" id="username" value={profile?.username || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-blue-500 focus:ring-blue-500"/>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-400">Bio</label>
          <textarea name="bio" id="bio" rows={4} value={profile?.bio || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-blue-500 focus:ring-blue-500"/>
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-400">Profile Picture URL</label>
          <input type="text" name="image" id="image" value={profile?.image || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-blue-500 focus:ring-blue-500"/>
        </div>

        <div>
          <label htmlFor="x_social" className="block text-sm font-medium text-gray-400">X (Twitter) Handle</label>
          <input type="text" name="x_social" id="x_social" value={profile?.x_social || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-blue-500 focus:ring-blue-500" placeholder="without the @"/>
        </div>

        <div>
          <label htmlFor="instagram" className="block text-sm font-medium text-gray-400">Instagram Handle</label>
          <input type="text" name="instagram" id="instagram" value={profile?.instagram || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-blue-500 focus:ring-blue-500" placeholder="without the @"/>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        <button type="submit" className="w-full py-3 px-4 rounded-full text-base font-bold bg-blue-600 hover:bg-blue-700 transition-colors">Save Profile</button>
      </form>
    </div>
  );
} 