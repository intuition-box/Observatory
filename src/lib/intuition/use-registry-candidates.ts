import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useIntuitionNetwork } from '../wallet/intuition-network-context';
import { fetchRegistryCandidates, type RegistryCandidate } from './registry-candidacy';

export interface RegistryCandidatesState {
  candidates: RegistryCandidate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: RegistryCandidate[] = [];

/**
 * Predicates currently proposed for the canonical registry, ranked by net stake.
 *
 * Keyed on `graphqlUrl` because candidacy lives on chain — mainnet and testnet
 * have entirely separate argument histories, and switching networks must not
 * show one network's stake against the other's.
 */
export function useRegistryCandidates(): RegistryCandidatesState {
  const { graphqlUrl, isStaticNetwork } = useIntuitionNetwork();

  const query = useQuery({
    queryKey: ['registry-candidates', graphqlUrl],
    queryFn: fetchRegistryCandidates,
    enabled: !isStaticNetwork,
    staleTime: 30_000,
  });

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  if (isStaticNetwork) {
    return { candidates: EMPTY, isLoading: false, error: null, refresh };
  }

  return {
    candidates: query.data ?? EMPTY,
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
