"use client";

import { useAccount, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

export function NetworkSwitcher() {
  const { chain } = useAccount();
  const { chains, switchChain } = useSwitchChain();

  const isSepolia = chain?.id === baseSepolia.id;

  const handleSwitch = () => {
    if (!switchChain) return;
    // Switch to the other network (Sepolia if on Mainnet, Mainnet if on Sepolia)
    const targetChainId = isSepolia ? base.id : baseSepolia.id;
    switchChain({ chainId: targetChainId });
  };

  if (!chain) {
    return null; // Don't render anything if not connected
  }

  return (
    <div className="flex items-center space-x-2">
        <span className={`text-xs px-2 py-1 rounded-full ${isSepolia ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
            {chain.name}
        </span>
        <button
            onClick={handleSwitch}
            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
            disabled={!switchChain}
        >
            Switch to {isSepolia ? 'Mainnet' : 'Sepolia'}
        </button>
    </div>
  );
}
