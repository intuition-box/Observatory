import { useQuery } from '@tanstack/react-query';
import { getAtoms, searchAtoms } from '../services/graphql.service';
import type { IntuitionAtom } from '../types';

/**
 * React Query hook to fetch live atoms from the Intuition indexer.
 * Falls back gracefully if the indexer is unreachable.
 */
export function useAtoms(limit = 50, offset = 0) {
  return useQuery<IntuitionAtom[]>({
    queryKey: ['intuition-atoms', limit, offset],
    queryFn: () => getAtoms(limit, offset),
    staleTime: 30_000, // 30s cache
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Search atoms by label with debounced query.
 */
export function useSearchAtoms(searchTerm: string, limit = 20) {
  return useQuery<IntuitionAtom[]>({
    queryKey: ['intuition-atoms-search', searchTerm, limit],
    queryFn: () => searchAtoms(searchTerm, limit),
    enabled: searchTerm.length >= 2,
    staleTime: 30_000,
    retry: 1,
  });
}
