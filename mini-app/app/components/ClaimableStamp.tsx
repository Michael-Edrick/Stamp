"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

declare var Peel: any;

const InlinedStampAvatar = ({ profile, displayName, amount, className, style }: any) => {
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
          <filter id="monotone-noise-claimable-inline">
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
          filter: 'url(#monotone-noise-claimable-inline)',
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

interface ClaimableStampProps {
    profile: {
      image?: string | null;
      username?: string | null;
    };
    displayName?: string | null;
    amount: number;
    className?: string;
    style?: React.CSSProperties;
    isClaimed: boolean;
    startClaimAnimation: boolean;
    onAnimationComplete: () => void; // Add the new callback prop
}

const ClaimableStamp: React.FC<ClaimableStampProps> = (props) => {
    const peelRef = useRef<HTMLDivElement>(null);
    const peelInstance = useRef<any>(null);
    const tweenInstance = useRef<any>(null);

    useEffect(() => {
        if (typeof Peel === 'undefined' || !peelRef.current || props.isClaimed) {
            return;
        }

        // Using the working configuration from our test page
        const p = new Peel(peelRef.current, {
             backgroundColor: 'transparent',
             corner: Peel.Corners.TOP_RIGHT // Changed to TOP_RIGHT
        });

        // Updated path for bottom-right peel
        p.setPeelPath(128, 0, 80, 0, 0, 128, -128, 128);
        p.setFadeThreshold(.7);
        
        const target = { t: 0 };
        const tween = gsap.to(target, {
            t: 1,
            duration: 1.5,
            paused: true,
            ease: 'power2.in',
            onUpdate: function() {
                p.setTimeAlongPath(target.t);
            },
            onComplete: () => { // Add the onComplete callback
                if (props.onAnimationComplete) {
                    props.onAnimationComplete();
                }
            }
        });

        peelInstance.current = p;
        tweenInstance.current = tween;

    }, [props.isClaimed]);

    useEffect(() => {
        if (props.startClaimAnimation && tweenInstance.current) {
            tweenInstance.current.seek(0).play();
        }
    }, [props.startClaimAnimation]);

    if (props.isClaimed) {
        return (
            <div className={`relative ${props.className || ''}`} style={{ transform: 'rotate(5.38deg)' }}>
                <img src="/stamp-frame-claimed.png" alt="Claimed Stamp" className="w-full h-full" />
            </div>
        );
    }
    
    // The testing click handler has been removed.
    return (
        <div 
            ref={peelRef} 
            className={`relative peel w-full h-full ${props.className || ''}`} 
            style={{ transform: 'rotate(5.38deg)' }}
        >
            <div className="peel-top">
                <InlinedStampAvatar {...props} />
            </div>
            <div className="peel-back">
                <img 
                    src="/stamp-frame-claimed.png" 
                    alt="Claimed Stamp Back" 
                    className="w-full h-full" 
                   
                />
            </div>
            <div className="peel-bottom">
                <img 
                    src="/stamp-frame-claimed.png" 
                    alt="Claimed Stamp Bottom" 
                    className="w-full h-full" 
                   
                />
            </div>
        </div>
    );
};

export default ClaimableStamp;
