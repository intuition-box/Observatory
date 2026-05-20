import { defineChain } from 'viem';

/**
 * Intuition L3 chain definitions.
 *
 * The Intuition L3 is not indexed by Etherscan and not present in viem's
 * built-in chains list, so each chain is declared explicitly via
 * `defineChain`. Configuration mirrors the canonical Intuition Fee Proxy
 * Factory SDK chain registry — same RPC URLs, same native-currency symbol
 * (`TRUST` on both networks per upstream convention), and the same
 * Multicall3 deployment so wagmi's `useReadContracts` batching works
 * out of the box.
 */

export const INTUITION_MAINNET_CHAIN_ID = 1155;
export const INTUITION_TESTNET_CHAIN_ID = 13579;

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

export const intuitionMainnet = defineChain({
  id: INTUITION_MAINNET_CHAIN_ID,
  name: 'Intuition Mainnet',
  nativeCurrency: { decimals: 18, name: 'TRUST', symbol: 'TRUST' },
  rpcUrls: {
    default: { http: ['https://rpc.intuition.systems'] },
    public: { http: ['https://rpc.intuition.systems'] },
  },
  blockExplorers: {
    default: {
      name: 'Intuition Explorer',
      url: 'https://explorer.intuition.systems',
    },
  },
  contracts: {
    multicall3: { address: MULTICALL3_ADDRESS },
  },
});

export const intuitionTestnet = defineChain({
  id: INTUITION_TESTNET_CHAIN_ID,
  name: 'Intuition Testnet',
  nativeCurrency: { decimals: 18, name: 'TRUST', symbol: 'TRUST' },
  rpcUrls: {
    default: { http: ['https://testnet.rpc.intuition.systems'] },
    public: { http: ['https://testnet.rpc.intuition.systems'] },
  },
  blockExplorers: {
    default: {
      name: 'Intuition Testnet Explorer',
      url: 'https://testnet.explorer.intuition.systems',
    },
  },
  contracts: {
    multicall3: { address: MULTICALL3_ADDRESS },
  },
  testnet: true,
});

