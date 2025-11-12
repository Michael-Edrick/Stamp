import { base, baseSepolia } from 'wagmi/chains'

const TESTNET_CONFIG = {
  usdcContractAddress: '0x6051912FC68729aa994989C8B23666AFfC890204',
  messageEscrowAddress: '0x90A1abbCdf2597c3672fCFD52Bfc6507Dd5EB130',
  chain: baseSepolia,
}

const MAINNET_CONFIG = {
  usdcContractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
  messageEscrowAddress: '0xYOUR_MAINNET_ESCROW_CONTRACT_ADDRESS_HERE', // TODO: Replace with actual address after deployment
  chain: base,
}

const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet'

export const CONFIG = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
