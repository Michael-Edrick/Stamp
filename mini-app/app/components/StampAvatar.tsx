import React from 'react';
import Image from 'next/image';

interface StampAvatarProps {
  profile: {
    image?: string | null;
    username?: string | null;
  };
  displayName?: string | null;
  amount: number;
  className?: string;
  style?: React.CSSProperties;
}

const StampAvatar: React.FC<StampAvatarProps> = ({ profile, displayName, amount, className, style }) => {
  if (!profile.image) {
    return null; // Or a fallback
  }

  const getInitials = (name?: string | null): string => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className={`relative w-24 h-24 flex-shrink-0 ${className || ''}`} style={style}>
      {/* SVG filter definition for the noise effect */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="monotone-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.32 0" />
          </filter>
        </defs>
      </svg>

      {/* Container for the masked image */}
      <div
        className="w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(185, 185, 185, 0.1), rgba(185, 185, 185, 0.1)), url(${profile.image})`,
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
      {/* Noise Overlay */}
      <div 
        className="absolute inset-0 w-full h-full" 
        style={{ 
          backgroundColor: '#A04B00',
          filter: 'url(#monotone-noise)',
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
      {/* Initials Overlay */}
      <div className="absolute top-2 left-0 right-0 text-right pr-4 text-white font-bold text-lg drop-shadow-md">
        {getInitials(displayName)}
      </div>
      {/* Amount Overlay */}
      <div className="absolute bottom-2 left-0 right-0 text-left pl-4 text-white font-bold text-lg drop-shadow-md">
        ${amount}
      </div>
    </div>
  );
};

export default StampAvatar;
