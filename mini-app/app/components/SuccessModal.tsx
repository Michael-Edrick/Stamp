import React, { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';
import { Bad_Script } from 'next/font/google';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useComposeCast } from '@coinbase/onchainkit/minikit';

// Configure the font
const badScript = Bad_Script({
  weight: '400',
  subsets: ['latin'],
});

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
  amount: number;
  recipientUsername: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, onNavigate, amount, recipientUsername }) => {
  // Hardcoded for now, can be made dynamic later
  const timeframe = "48 hours"; 
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const { composeCast } = useComposeCast();

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);

      // Trigger vibration on devices that support it
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200); // Vibrate for 200ms
      }

      // stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleShare = () => {
    const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Stamp';
    const appUrl: string = process.env.NEXT_PUBLIC_URL || '';
    
    composeCast({
      text: `I just sent a ${amount} Stamp to @${recipientUsername}. Claim it on the Stamp miniapp!`,
      embeds: [appUrl],
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* {isClient && isOpen && <Confetti width={width} height={height} />} */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          {showConfetti && <Confetti width={width} height={height} />}
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center align-middle shadow-xl transition-all">
                
                {/* Postcard Image Container */}
                <div className="relative mx-auto w-full max-w-xs aspect-[4/3] drop-shadow-lg">
                  <Image
                    src="/postcard-frame.png"
                    alt="Postcard"
                    layout="fill"
                    objectFit="contain"
                  />
                  {/* Dynamic Content Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center text-black">
                    <div 
                      className="absolute"
                      style={{ top: '35%', left: '51%', transform: 'translate(-50%, -50%)' }}
                    >
                      <span className="text-2xl font-bold text-white">${amount}</span>
                    </div>
                    <div 
                      className="absolute"
                      style={{ top: '65%', right: '5%', transform: 'rotate(-5.42deg)' }}
                    >
                       <span className={`block max-w-[165px] truncate text-lg font-semibold ${badScript.className}`}>Hey @{recipientUsername}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 text-left">
                    This message has been sent with a Stamp! If @{recipientUsername} replies to this message within {timeframe}, they will be able to claim the money you sent. Otherwise, you can claim it back.
                  </p>
                </div>

                <div className="mt-6 flex flex-col items-center space-y-2">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-full border border-transparent bg-blue-500 px-4 py-3 text-base font-semibold text-white hover:bg-blue-600 focus:outline-none"
                    onClick={handleShare}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-full border border-transparent px-4 py-2 text-sm font-medium text-blue-700 hover:bg-gray-100 focus:outline-none"
                    onClick={onNavigate}
                  >
                    Finish
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SuccessModal;
