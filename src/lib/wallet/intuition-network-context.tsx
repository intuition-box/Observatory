import { API_URL_DEV, API_URL_PROD, configureClient } from '@0xintuition/graphql';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { Chain } from 'viem';

import { useLocalStorage } from '../use-local-storage';
import {
  INTUITION_MAINNET_CHAIN_ID,
  INTUITION_TESTNET_CHAIN_ID,
  type IntuitionChainId,
  intuitionMainnet,
  intuitionTestnet,
} from './intuition-chain';

export type IntuitionNetworkId = 'mainnet' | 'testnet' | 'static';
type OnchainIntuitionNetworkId = Exclude<IntuitionNetworkId, 'static'>;

type NetworkDefinition = {
  id: OnchainIntuitionNetworkId;
  label: string;
  chain: Chain;
  chainId: IntuitionChainId;
  graphqlUrl: string;
  /** Intuition Portal — the canonical UI for inspecting a term. */
  portalUrl: string;
};

const NETWORKS: Record<OnchainIntuitionNetworkId, NetworkDefinition> = {
  mainnet: {
    id: 'mainnet',
    label: 'Mainnet',
    chain: intuitionMainnet,
    chainId: INTUITION_MAINNET_CHAIN_ID,
    graphqlUrl: API_URL_PROD,
    portalUrl: 'https://portal.intuition.systems',
  },
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    chain: intuitionTestnet,
    chainId: INTUITION_TESTNET_CHAIN_ID,
    graphqlUrl: API_URL_DEV,
    portalUrl: 'https://dev.portal.intuition.systems',
  },
};

function isIntuitionNetworkId(value: unknown): value is IntuitionNetworkId {
  return value === 'mainnet' || value === 'testnet' || value === 'static';
}

function resolveGraphqlUrl(network: OnchainIntuitionNetworkId): string {
  const envUrl = import.meta.env.VITE_INTUITION_GRAPHQL_URL;
  if (typeof envUrl === 'string' && envUrl.length > 0) return envUrl;
  return NETWORKS[network].graphqlUrl;
}

type IntuitionNetworkContextValue = {
  network: IntuitionNetworkId;
  setNetwork: (network: IntuitionNetworkId) => void;
  activeChain: Chain;
  chainId: IntuitionChainId;
  networkLabel: string;
  graphqlUrl: string;
  isStaticNetwork: boolean;
  /**
   * Portal URL for a triple on the active network, or null in Standard mode
   * where there is no chain to link to.
   */
  portalTripleUrl: (termId: string) => string | null;
  portalAtomUrl: (termId: string) => string | null;
};

const IntuitionNetworkContext = createContext<IntuitionNetworkContextValue | null>(null);

export function IntuitionNetworkProvider({ children }: { children: ReactNode }) {
  // Standard is the default: a first-time visitor should land on the settled,
  // read-only vocabulary rather than on a live network where every action costs
  // TRUST. Testnet and Mainnet are opt-in.
  const [network, setNetworkState] = useLocalStorage<IntuitionNetworkId>(
    'ontology-intuition-network',
    'static',
    { validate: isIntuitionNetworkId }
  );

  const isStaticNetwork = network === 'static';
  const onchainNetwork: OnchainIntuitionNetworkId = isStaticNetwork ? 'mainnet' : network;
  const definition = NETWORKS[onchainNetwork];
  const graphqlUrl = useMemo(
    () => (isStaticNetwork ? '' : resolveGraphqlUrl(onchainNetwork)),
    [isStaticNetwork, onchainNetwork]
  );

  useEffect(() => {
    if (isStaticNetwork) return;
    configureClient({ apiUrl: graphqlUrl });
  }, [graphqlUrl, isStaticNetwork]);

  const setNetwork = useCallback((next: IntuitionNetworkId) => {
    setNetworkState(next);
  }, [setNetworkState]);

  const value = useMemo<IntuitionNetworkContextValue>(
    () => ({
      network,
      setNetwork,
      activeChain: definition.chain,
      chainId: definition.chainId,
      networkLabel: isStaticNetwork ? 'Standard' : definition.label,
      graphqlUrl,
      isStaticNetwork,
      portalTripleUrl: (termId: string) =>
        isStaticNetwork ? null : `${definition.portalUrl}/explore/triple/${termId}`,
      portalAtomUrl: (termId: string) =>
        isStaticNetwork ? null : `${definition.portalUrl}/explore/atom/${termId}`,
    }),
    [network, setNetwork, definition, graphqlUrl, isStaticNetwork]
  );

  return (
    <IntuitionNetworkContext.Provider value={value}>
      {children}
    </IntuitionNetworkContext.Provider>
  );
}

export function useIntuitionNetwork(): IntuitionNetworkContextValue {
  const ctx = useContext(IntuitionNetworkContext);
  if (!ctx) {
    throw new Error('useIntuitionNetwork must be used within IntuitionNetworkProvider');
  }
  return ctx;
}

export function useOptionalIntuitionNetwork(): IntuitionNetworkContextValue | null {
  return useContext(IntuitionNetworkContext);
}
