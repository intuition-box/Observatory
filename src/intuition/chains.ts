import { defineChain } from 'viem';
import { env } from '../config/env';

/**
 * Intuition L3 chain definitions.
 * The Intuition Network is an Arbitrum Orbit L3 that settles to Base.
 * Not in viem's built-in chain list, so declared via defineChain.
 */

export const intuitionMainnet = defineChain({
  id: 1155,
  name: 'Intuition Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.intuition.systems'] },
  },
  blockExplorers: {
    default: { name: 'Intuition Explorer', url: 'https://explorer.intuition.systems' },
  },
});

export const intuitionTestnet = defineChain({
  id: 13579,
  name: 'Intuition Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.intuition.systems'] },
  },
  blockExplorers: {
    default: { name: 'Intuition Testnet Explorer', url: 'https://explorer-testnet.intuition.systems' },
  },
  testnet: true,
});

export type IntuitionChainId = 1155 | 13579;
export type IntuitionChain = typeof intuitionMainnet | typeof intuitionTestnet;

/** Get the chain definition based on the configured chain ID */
export function getIntuitionChain(chainId?: IntuitionChainId): IntuitionChain {
  const id = chainId ?? env.VITE_CHAIN_ID;
  return id === 1155 ? intuitionMainnet : intuitionTestnet;
}
