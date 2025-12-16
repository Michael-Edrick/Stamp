"use client";

import React from 'react';

interface StampPreviewProps {
  imageSrc: string;
  amount: number;
  displayName?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

const StampPreview: React.FC<StampPreviewProps> = ({ imageSrc, amount, displayName, className, style }) => {
  const getInitials = (name?: string | null): string => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div 
      className={`relative w-16 h-16 bg-cover bg-center flex-shrink-0 ${className || ''}`} 
      style={{ ...style, backgroundImage: `url(${imageSrc})` }}
    >
      {/* Initials Overlay - A bit of text shadow for readability */}
      <div className="absolute top-1 right-2 text-white font-bold text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
        {getInitials(displayName)}
      </div>
      {/* Amount Overlay */}
      <div className="absolute bottom-1 left-2 text-white font-bold text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
        ${amount}
      </div>
    </div>
  );
};

export default StampPreview;

