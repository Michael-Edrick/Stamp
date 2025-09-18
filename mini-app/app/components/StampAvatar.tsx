import React from 'react';
import Image from 'next/image';

interface StampAvatarProps {
  profile: {
    image?: string | null;
    username?: string | null;
  };
  amount: number;
  className?: string;
  style?: React.CSSProperties;
}

const StampAvatar: React.FC<StampAvatarProps> = ({ profile, amount, className, style }) => {
  if (!profile.image) {
    return null; // Or a fallback
  }

  return (
    <div className={`relative w-24 h-24 flex-shrink-0 ${className || ''}`} style={style}>
      {/* Container for the masked image */}
      <div
        className="w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${profile.image})`,
          WebkitMaskImage: 'url(/stamp-frame.png)',
          maskImage: 'url(/stamp-frame.png)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      {/* Username Overlay */}
      <div className="absolute top-2 left-0 right-0 text-right pr-4 text-white font-bold text-sm drop-shadow-md">
        @{profile.username || 'user'}
      </div>
      {/* Amount Overlay */}
      <div className="absolute bottom-2 left-0 right-0 text-left pl-4 text-white font-bold text-lg drop-shadow-md">
        ${amount}
      </div>
    </div>
  );
};

export default StampAvatar;
