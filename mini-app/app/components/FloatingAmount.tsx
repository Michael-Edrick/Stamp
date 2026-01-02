'use client';

import React from 'react';

interface FloatingAmountProps {
  amount: number;
  show: boolean;
}

const FloatingAmount: React.FC<FloatingAmountProps> = ({ amount, show }) => {
  if (!show) {
    return null;
  }

  const displayAmount = (amount * 0.9).toFixed(2);

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="animate-float-up text-4xl font-bold text-green-400 bg-black bg-opacity-60 px-6 py-3 rounded-xl shadow-lg border border-green-500/50">
        +${displayAmount}
      </div>
    </div>
  );
};

export default FloatingAmount;

