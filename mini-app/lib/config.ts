import { base, baseSepolia } from 'wagmi/chains'

const TESTNET_CONFIG = {
  usdcContractAddress: '0xEa8e15C210Ac3B27D1c33DD3907870eeD16E5F16',
  messageEscrowAddress: '0x90A1abbCdf2597c3672fCFD52Bfc6507Dd5EB130',
  chain: baseSepolia,
}

const MAINNET_CONFIG = {
  usdcContractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  messageEscrowAddress: '0xFbb520165C951a1E7A24B8d89EEF3C2d400ac441',
  chain: base,
}

const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet'

export const CONFIG = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
