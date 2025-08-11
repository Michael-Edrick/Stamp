import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { miniAppConnector } from '@farcaster/miniapp-wagmi-connector';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    miniAppConnector(),
    injected()
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http()
  },
}) 