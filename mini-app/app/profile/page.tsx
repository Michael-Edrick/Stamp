"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, UserCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { User } from '@prisma/client';

// --- Reusable Components ---

const CustomAvatar = ({ profile, className }: { profile: Partial<User> | null, className: string }) => {
  if (profile?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.image} alt={profile.name || 'User avatar'} className={className} />;
  }
  return <UserCircleIcon className={`${className} text-gray-500`} />;
};

const ProfilePreview = ({ profile }: { profile: Partial<User> | null }) => {
  const tagColors = ['#4A90E2', '#F5A623', '#9013FE', '#4CAF50', '#2196F3', '#FF5722', '#607D8B'];
  const userTags = profile?.tags && profile.tags.length > 0 ? profile.tags : [];

  return (
    <div className="bg-white rounded-3xl p-4 shadow-md border border-gray-200 text-gray-900">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center">
            <CustomAvatar profile={profile} className="w-10 h-10 rounded-full mr-3" />
            <div>
                <p className="font-bold text-gray-900">{profile?.name || 'Anonymous'}</p>
                <p className="text-sm text-gray-500">@{profile?.username || 'username'}</p>
            </div>
        </div>
        <PaperAirplaneIcon className="w-6 h-6 text-blue-500 -rotate-45" />
      </div>

      {/* Expanded Content */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-gray-700 text-sm mb-4">{profile?.bio || '...'}</p>
        {profile?.x_social && <SocialLink platform="X" handle={profile.x_social} />}
        {profile?.instagram && <SocialLink platform="Instagram" handle={profile.instagram} />}
      </div>
      
      {/* Tags */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {userTags.map((tag: string, index: number) => (
          <Tag key={tag} text={tag} color={tagColors[index % tagColors.length]} />
        ))}
      </div>
    </div>
  );
};

const Tag = ({ text, color }: { text: string, color: string }) => (
  <div className={`text-xs text-white font-semibold px-2.5 py-1 rounded-full`} style={{ backgroundColor: color }}>
    {text}
  </div>
);

const SocialLink = ({ platform, handle }: { platform: 'Instagram' | 'X', handle: string }) => {
    const Icon = () => platform === 'Instagram'
        ? <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.2,5.2 0 0,1 16.2,21.4H7.8C4.6,21.4 2,18.8 2,15.6V7.8A5.2,5.2 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" /></svg>
        : <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
    return (
         <div className="flex items-center justify-between text-sm py-2">
          <div className="flex items-center text-gray-800">
            <Icon />
            <span className="ml-2">@{handle}</span>
          </div>
          <span className="text-blue-500 text-xs font-bold">verified</span>
        </div>
    );
};

// --- Main Profile Page Component ---

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<User>>({});
  const [initialProfile, setInitialProfile] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(() => {
    if (address) {
      setLoading(true);
      fetch(`/api/users/me?walletAddress=${address}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch profile'))
        .then(data => {
          setProfile(data);
          setInitialProfile(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [address]);

  useEffect(() => {
    if (!isConnected) {
      // If wallet disconnects, send them back to the homepage
      router.push('/');
    } else {
      fetchProfile();
    }
  }, [isConnected, router, fetchProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      // For number fields, if the input is empty, we'll treat it as null.
      // Otherwise, we parse it to an integer.
      const numValue = parseInt(value, 10);
      if (value === '') {
        setProfile(prev => ({ ...prev, [name]: null }));
      } else if (!isNaN(numValue)) {
        // Only update state for valid numbers
        setProfile(prev => ({ ...prev, [name]: numValue }));
      }
      // If input is not a valid number (e.g. "abc"), we do nothing,
      // preserving the last valid state in the input.
    } else {
      // For non-number fields, we just take the string value.
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setProfile(prev => ({ ...prev, tags: value.split(',').map(tag => tag.trim()) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Wallet is not connected.");
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/users/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, walletAddress: address }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save');
      // Update initial state to match saved state
      setInitialProfile(profile);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setSaving(false);
    }
  };
  
  const hasChanges = JSON.stringify(profile) !== JSON.stringify(initialProfile);

  if (loading) return <div className="min-h-screen bg-black text-center pt-20 text-white">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-[#202020] text-white font-sans">
      <div 
        className="w-full max-w-md mx-auto px-6" 
        style={{ paddingTop: '104px', paddingBottom: '144px'}}
      >
        <header className="fixed top-0 left-0 right-0 z-10 max-w-md mx-auto flex items-center justify-between p-4 bg-[#202020]">
           <Link href="/" className="p-2"><ArrowLeftIcon className="w-6 h-6 text-white" /></Link>
        </header>

        <main className="space-y-12">
          {/* --- Profile Preview --- */}
          <ProfilePreview profile={profile} />

          {/* --- Edit Form --- */}
          <form onSubmit={handleSave} className="space-y-3">
              {/* --- Section 1: Identity --- */}
              <div className="bg-black rounded-3xl px-6">
                <FormRow label="PFP"><CustomAvatar profile={profile} className="w-10 h-10 rounded-full" /></FormRow>
                <FormRow label="Name"><input type="text" name="name" value={profile.name || ''} onChange={handleInputChange} className="bg-transparent w-full text-left focus:outline-none text-gray-500" disabled /></FormRow>
                <FormRow label="#"><input type="text" name="username" value={profile.username || ''} onChange={handleInputChange} className="bg-transparent w-full text-left focus:outline-none text-gray-500" disabled /></FormRow>
                <FormRow label="Tags"><input type="text" name="tags" value={profile.tags?.join(', ') || ''} onChange={handleTagsChange} className="bg-transparent w-full text-left focus:outline-none" placeholder="e.g. BASE, LBS, WEB 3"/></FormRow>
                <FormRow label={<SocialIcon platform="Instagram"/>}><input type="text" name="instagram" value={profile.instagram || ''} onChange={handleInputChange} className="bg-transparent w-full text-left focus:outline-none" /></FormRow>
                <FormRow label={<SocialIcon platform="X"/>} isLast={true}><input type="text" name="x_social" value={profile.x_social || ''} onChange={handleInputChange} className="bg-transparent w-full text-left focus:outline-none" /></FormRow>
              </div>

              {/* --- Section 2: Bio --- */}
              <div className="bg-black rounded-3xl p-6">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                <textarea id="bio" name="bio" rows={4} value={profile.bio || ''} onChange={handleInputChange} className="block w-full rounded-lg bg-[#1C1C1E] border-transparent p-3 focus:border-blue-500 focus:ring-blue-500"/>
              </div>

              {/* --- Section 3: Settings --- */}
              <div className="bg-black rounded-3xl px-6">
                <FormRow label="Standard cost to message you:"><input type="number" name="standardCost" value={profile.standardCost ?? ''} onChange={handleInputChange} className="bg-transparent w-20 text-left focus:outline-none" /> USD</FormRow>
                <FormRow label="Premium cost to message you:"><input type="number" name="premiumCost" value={profile.premiumCost ?? ''} onChange={handleInputChange} className="bg-transparent w-20 text-left focus:outline-none" /> USD</FormRow>
                <FormRow label="Wallet" isLast={true}><span className="text-gray-500 truncate block">{profile.walletAddress}</span></FormRow>
              </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={saving || !hasChanges} 
                className="w-full py-3 px-4 rounded-full text-base font-bold bg-blue-600 hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

// --- Form Components ---
const FormRow = ({ label, children, isLast = false }: { label: string | React.ReactNode, children: React.ReactNode, isLast?: boolean }) => (
    <div className={`flex items-center justify-between py-4 ${!isLast && 'border-b border-gray-700'}`}>
        <span className="text-gray-400 font-medium flex-shrink-0">{label}</span>
        <div className="text-left text-white flex-1 ml-4 flex items-center overflow-hidden">
            {children}
        </div>
    </div>
);

const SocialIcon = ({platform}: {platform: 'Instagram' | 'X'}) => {
    if (platform === 'Instagram') {
        return <svg className="w-6 h-6 text-white" viewBox="0 0 24 24"><path fill="currentColor" d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.2,5.2 0 0,1 16.2,21.4H7.8C4.6,21.4 2,18.8 2,15.6V7.8A5.2,5.2 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" /></svg>
    }
    return <svg className="w-6 h-6 text-white" viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
}

// These are no longer needed as we use FormRow
// const FormInput = ({ name, label, ...props }: { name: string, label: string, [key: string]: any }) => (
//   <div>
//     <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
//     <input id={name} name={name} {...props} className="block w-full rounded-lg bg-gray-800 border-transparent p-3 focus:border-blue-500 focus:ring-blue-500"/>
//   </div>
// );

// const FormTextarea = ({ name, label, ...props }: { name: string, label: string, [key: string]: any }) => (
//   <div>
//     <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
//     <textarea id={name} name={name} rows={4} {...props} className="block w-full rounded-lg bg-gray-800 border-transparent p-3 focus:border-blue-500 focus:ring-blue-500"/>
//   </div>
// ); 