import { useQuery } from '@tanstack/react-query';
import { getTriples, getTriplesForAtom } from '../services/graphql.service';
import type { IntuitionTriple } from '../types';

/**
 * React Query hook to fetch live triples from the Intuition indexer.
 */
export function useTriples(limit = 50, offset = 0) {
  return useQuery<IntuitionTriple[]>({
    queryKey: ['intuition-triples', limit, offset],
    queryFn: () => getTriples(limit, offset),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch triples related to a specific atom.
 */
export function useTriplesForAtom(atomId: string | undefined, limit = 50) {
  return useQuery<IntuitionTriple[]>({
    queryKey: ['intuition-triples-atom', atomId, limit],
    queryFn: () => getTriplesForAtom(atomId!, limit),
    enabled: !!atomId,
    staleTime: 30_000,
    retry: 1,
  });
}
