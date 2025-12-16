"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { User as PrismaUser } from '@prisma/client';
import StampPreview from './StampPreview';
import PriorityStampPreview from './PriorityStampPreview';
import Sparkle from './Sparkle';
import { useMemo } from 'react';

// We need to use the Prisma-generated User type, but add optional fields
// that might not be present on every user object we handle.
type User = PrismaUser & {
  standardCost?: number | null;
  premiumCost?: number | null;
};

interface PaymentModalProps {
    user: User | null; // This is the recipient
    sender: User | null;
    onSelect: (amount: number) => void;
    onClose: () => void;
    isProcessing: boolean;
}

const PaymentModal = ({ user, sender, onSelect, onClose, isProcessing }: PaymentModalProps) => {
    // Default values if not provided by the user profile
    const standardCost = user?.standardCost ? Number(user.standardCost) : 1;
    const premiumCost = user?.premiumCost ? Number(user.premiumCost) : 5;

    // Memoize sparkles so they don't re-render on every state change
    const sparkles = useMemo(() => {
        // Manually position sparkles to surround the stamp, based on the design
        return [
            { top: '-15%', left: '10%', animationDelay: '0s' },
            { top: '-10%', left: '80%', animationDelay: '0.5s' },
            { top: '80%', left: '95%', animationDelay: '1s' },
            { top: '90%', left: '0%', animationDelay: '1.5s' },
            { top: '40%', left: '-20%', animationDelay: '2s' },
            { top: '50%', left: '105%', animationDelay: '2.5s' },
        ];
    }, []);
    
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-end z-50" onClick={onClose}>
            <div className="bg-black text-white w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Send a message</h2>
                    <button onClick={onClose} disabled={isProcessing}><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-3">
                    <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onSelect(standardCost)} disabled={isProcessing}>
                        <div className="flex items-center">
                            <span className="text-white px-4 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#F19400' }}>${standardCost}</span>
                            <span className="ml-4">Standard Stamp</span>
                        </div>
                        <StampPreview
                            imageSrc="/standard-stamp.png"
                            amount={standardCost}
                            displayName={sender?.name}
                            style={{ transform: 'rotate(7deg)' }}
                        />
                    </button>
                     <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onSelect(premiumCost)} disabled={isProcessing}>
                        <div className="flex items-center">
                            <span className="text-white px-4 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FF5208' }}>${premiumCost}</span>
                            <span className="ml-4">Priority Stamp</span>
                        </div>
                        <div className="gradient-border-wrapper" style={{ transform: 'rotate(-7deg)' }}>
                            {sparkles.map((style, i) => (
                                <Sparkle key={i} style={style} />
                            ))}
                            <PriorityStampPreview
                                imageSrc="/standard-stamp.png"
                                amount={premiumCost}
                                displayName={sender?.name}
                                className="z-10"
                            />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
