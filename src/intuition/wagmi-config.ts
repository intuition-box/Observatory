import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { env } from '../config/env';
import { getIntuitionChain } from './chains';

/**
 * Wagmi configuration wired to the env-selected Intuition chain.
 * Uses RainbowKit's getDefaultConfig for wallet connectors.
 */

const chain = getIntuitionChain();

export const wagmiConfig = getDefaultConfig({
  appName: 'Intuition Ontology',
  projectId: env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [chain],
  transports: {
    [chain.id]: http(env.VITE_RPC_URL),
  },
});

/** The MultiVault contract address */
export const MULTIVAULT_ADDRESS = env.VITE_MULTIVAULT_ADDRESS as `0x${string}`;
