import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AtomRecord } from '../services/graphql.service';
import { useIndexer } from './use-indexer';

/**
 * Default rolling window of atoms surfaced to the views.
 *
 * Tradeoff: large enough to give visualization views something to chew
 * on, small enough to avoid overwhelming the GraphQL endpoint or the
 * client renderer on initial load. The graph view typically displays
 * ~50-100 nodes comfortably; consumers wanting paginated browsing
 * should pass an explicit `limit` and walk pages.
 */
const DEFAULT_LIMIT = 100;

export interface UseLiveAtomsArgs {
  limit?: number;
  offset?: number;
  /** TanStack Query staleness in ms. Defaults to 30s. */
  staleTime?: number;
  /** When false, the query is skipped entirely. */
  enabled?: boolean;
}

/**
 * Lists the most recently created atoms from the Intuition indexer.
 *
 * Returns the raw TanStack Query handle so consumers can branch on
 * `isLoading` / `error` and fall back to static seed data when the
 * indexer is unreachable or returns an empty page.
 */
export function useLiveAtoms(
  args: UseLiveAtomsArgs = {}
): UseQueryResult<AtomRecord[], Error> {
  const indexer = useIndexer();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const offset = args.offset ?? 0;
  return useQuery({
    queryKey: ['intuition', 'atoms', { limit, offset }],
    queryFn: () => indexer.listAtoms({ limit, offset }),
    staleTime: args.staleTime ?? 30_000,
    enabled: args.enabled ?? true,
  });
}
