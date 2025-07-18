"use client"

import { Avatar } from "@coinbase/onchainkit/identity";

const SearchModal = ({ onClose }: { onClose: () => void }) => {
    const mockProfiles = [
      { id: '0x1234567890123456789012345678901234567890', name: 'Clemens Scherf', username: 'Clemens' },
      { id: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Vitalik Buterin', username: 'vitalik' },
      { id: '0x1111111111111111111111111111111111111111', name: 'Hayden Adams', username: 'hayden' },
    ];
    const tags = ['BASE', 'LBS', 'WEB 3', 'LUCID', 'SOLANA', 'ETH'];
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-end z-50" onClick={onClose}>
        <div 
          className="bg-black w-full max-w-md h-[60vh] rounded-t-3xl p-4 text-white flex flex-col transform transition-transform duration-300 ease-in-out animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-4 cursor-grab"></div>
          
          <h2 className="text-lg font-bold mb-3">Profiles</h2>
          <div className="space-y-3 mb-6">
            {mockProfiles.map(p => <ModalProfileCard key={p.id} profile={p} />)}
          </div>
  
          <h2 className="text-lg font-bold mb-3">Relevant Tags</h2>
          <div className="flex flex-wrap gap-2 mb-auto">
            {tags.map(tag => <Tag key={tag} name={tag} />)}
          </div>
  
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full bg-gray-800 rounded-full py-3 pl-11 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>
    );
  };
  
  const ModalProfileCard = ({ profile }: { profile: any }) => (
    <div className="flex items-center justify-between bg-gray-900 rounded-xl p-3">
      <div className="flex items-center">
        <Avatar address={profile.id as `0x${string}`} className="w-10 h-10 rounded-full mr-3" />
        <div>
          <p className="font-semibold">{profile.name}</p>
          <p className="text-sm text-gray-400">@{profile.username}</p>
        </div>
      </div>
      <button className="p-2 rounded-full bg-blue-600 hover:bg-blue-700">
        <SendIcon />
      </button>
    </div>
  );
  
  const Tag = ({ name }: { name: string }) => {
    const colors: { [key: string]: string } = {
      BASE: 'bg-blue-500',
      LBS: 'bg-orange-500',
      'WEB 3': 'bg-purple-500',
      LUCID: 'bg-indigo-900',
      SOLANA: 'bg-pink-500',
      ETH: 'bg-gray-500'
    };
    return <span className={`text-white text-sm font-bold px-3 py-1.5 rounded-full ${colors[name] || 'bg-gray-600'}`}>{name}</span>
  };
  
  const SendIcon = () => (<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>);
  const SearchIcon = ({ className }: { className?: string }) => (<svg className={`w-6 h-6 text-white ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>);
  
  export default SearchModal; 