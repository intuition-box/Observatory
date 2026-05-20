import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { JoinedTripleRecord } from '../services/graphql.service';
import { useIndexer } from './use-indexer';

const DEFAULT_LIMIT = 100;

export interface UseLiveTriplesArgs {
  limit?: number;
  offset?: number;
  /** TanStack Query staleness in ms. Defaults to 30s. */
  staleTime?: number;
  /** When false, the query is skipped entirely. */
  enabled?: boolean;
}

/**
 * Lists the most recently created triples from the Intuition indexer
 * with subject, predicate, and object atoms joined inline — a single
 * GraphQL round-trip yields everything needed to render a labeled
 * edge in the relationship graph or a populated cell in the matrix.
 *
 * Returns the raw TanStack Query handle so consumers can branch on
 * `isLoading` / `error` and fall back to static example claims when
 * the indexer is unreachable or returns an empty page.
 */
export function useLiveTriples(
  args: UseLiveTriplesArgs = {}
): UseQueryResult<JoinedTripleRecord[], Error> {
  const indexer = useIndexer();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const offset = args.offset ?? 0;
  return useQuery({
    queryKey: ['intuition', 'triples', 'recent', { limit, offset }],
    queryFn: () => indexer.listRecentTriples({ limit, offset }),
    staleTime: args.staleTime ?? 30_000,
    enabled: args.enabled ?? true,
  });
}
