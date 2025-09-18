"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { User as PrismaUser } from '@prisma/client';

// We need to use the Prisma-generated User type, but add optional fields
// that might not be present on every user object we handle.
type User = PrismaUser & {
  standardCost?: number | null;
  premiumCost?: number | null;
};

interface PaymentModalProps {
    user: User | null;
    onSelect: (amount: number) => void;
    onClose: () => void;
    isProcessing: boolean;
}

const PaymentModal = ({ user, onSelect, onClose, isProcessing }: PaymentModalProps) => {
    // Default values if not provided by the user profile
    const standardCost = user?.standardCost ? Number(user.standardCost) : 1;
    const premiumCost = user?.premiumCost ? Number(user.premiumCost) : 5;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-end z-50" onClick={onClose}>
            <div className="bg-black text-white w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Send a message</h2>
                    <button onClick={onClose} disabled={isProcessing}><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-3">
                    <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onSelect(standardCost)} disabled={isProcessing}>
                        <span>Standard send</span>
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">${standardCost} USD</span>
                    </button>
                     <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onSelect(premiumCost)} disabled={isProcessing}>
                        <span>Premium send</span>
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">${premiumCost} USD</span>
                    </button>
                    <button className="bg-neutral-900 p-4 rounded-lg flex justify-between items-center cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed" onClick={onClose} disabled={isProcessing}>
                        <span>None</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
