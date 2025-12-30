'use client';

import React from 'react';

interface ClaimConfirmationModalProps {
  show: boolean;
  amount: number | null;
  onClose: () => void;
}

const ClaimConfirmationModal: React.FC<ClaimConfirmationModalProps> = ({ show, amount, onClose }) => {
  if (!show || amount === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative rounded-lg bg-white p-6 text-center shadow-xl">
        <h2 className="text-xl font-semibold text-gray-800">Payment Received!</h2>
        <p className="mt-2 text-gray-600">You have been paid ${(amount * 0.9).toFixed(2)}.</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default ClaimConfirmationModal;

