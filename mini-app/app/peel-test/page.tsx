"use client";

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

declare var Peel: any;

export default function PeelTestPage() {
    const peelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof Peel === 'undefined' || !peelRef.current) {
            return;
        }

        const p = new Peel(peelRef.current, {
            corner: Peel.Corners.TOP_RIGHT,
            backgroundColor: 'transparent'
        });

        p.setPeelPath(128, 0, 80, 0, 0, 128, -128, 128);
        p.setFadeThreshold(.7);

        const target = { t: 0 };
        const tween = gsap.to(target, {
            t: 1,
            duration: 1.5,
            ease: 'power2.in',
            paused: true,
            onUpdate: function() {
                p.setTimeAlongPath(target.t);
            },
        });

        const peelElement = peelRef.current;
        const clickHandler = () => {
            tween.seek(0).play();
        };

        peelElement.addEventListener('click', clickHandler);

        return () => {
            peelElement.removeEventListener('click', clickHandler);
        };
    }, []);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div ref={peelRef} className="relative peel cursor-pointer" style={{ width: '128px', height: '128px' }}>
                <div className="peel-top">
                    <img src="/stamp-frame.png" alt="Top Layer" className="w-full h-full" />
                </div>
                <div className="peel-back">
                    <img src="/stamp-frame-claimed.png" alt="Back Layer" className="w-full h-full" />
                </div>
                <div className="peel-bottom">
                    <img src="/stamp-frame-claimed.png" alt="Bottom Layer" className="w-full h-full" />
                </div>
            </div>
        </div>
    );
} 
