import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { env } from '../config/env';
import { intuitionMainnet, intuitionTestnet } from './chains';

/**
 * Wagmi configuration for the Intuition L3.
 *
 * Built via RainbowKit's `getDefaultConfig` which supplies the curated
 * connector list (injected, browser-extension, mobile via WalletConnect)
 * and a sensible default `http()` transport per chain. Transports
 * resolve to each chain's `rpcUrls.default.http[0]` declared in
 * `chains.ts` — kept aligned with the canonical Intuition Fee Proxy
 * Factory SDK so wagmi's batching, balance lookups, and contract reads
 * all hit the same RPCs that other ecosystem dapps rely on.
 *
 * `ssr: false` because Ontology is a client-only Vite SPA — no server
 * rendering pass to hydrate.
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'Intuition Ontology',
  projectId: env.walletConnectProjectId,
  chains: [intuitionMainnet, intuitionTestnet],
  ssr: false,
});
