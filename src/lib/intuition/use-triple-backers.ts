import { useQuery } from '@tanstack/react-query';

import type { TermId } from './canonical';
import { useIntuitionNetwork } from '../wallet/intuition-network-context';
import { fetchTripleBackers, type TripleBackers } from './triple-backers';

/**
 * Backers for one triple.
 *
 * Disabled in Standard mode — there is no chain to read positions from — and
 * keyed on the network so mainnet and testnet backing never bleed together.
 */
export function useTripleBackers(tripleTermId: TermId | null | undefined) {
  const { graphqlUrl, isStaticNetwork } = useIntuitionNetwork();

  const query = useQuery<TripleBackers>({
    queryKey: ['triple-backers', graphqlUrl, tripleTermId],
    queryFn: () => fetchTripleBackers(tripleTermId as TermId),
    enabled: Boolean(tripleTermId) && !isStaticNetwork,
    staleTime: 60_000,
  });

  return {
    backers: query.data ?? null,
    isLoading: query.isPending && Boolean(tripleTermId) && !isStaticNetwork,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
