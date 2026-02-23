import { base, baseSepolia } from 'wagmi/chains'

const TESTNET_CONFIG = {
  usdcContractAddress: '0xEa8e15C210Ac3B27D1c33DD3907870eeD16E5F16',
  messageEscrowAddress: '0xd076c2E9F741C3bB1a805f4241B52a6ace3e5aA8',
  chain: baseSepolia,
}

const MAINNET_CONFIG = {
  usdcContractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  messageEscrowAddress: '0x6770b02fa67705BF2C42918658b5485179baeE17',
  chain: base,
}

const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet'

export const CONFIG = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
