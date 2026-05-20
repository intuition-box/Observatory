import { useMemo } from 'react';
import { useLiveTriples } from './use-live-triples';

/**
 * Aggregated live-triple counts indexed by `(subjectType, objectType)`
 * pair, used by the claim-matrix view to badge schema combinations
 * that carry actual on-chain activity.
 *
 * The keying matches the matrix's `EntityMapping` shape — each row
 * represents a (subject type, object type) tuple with N candidate
 * predicates. We sum counts across predicates so the row badge
 * reflects total onchain density for the row, regardless of which
 * specific predicate produced each triple.
 */
export interface LiveTripleCounts {
  /** Total triples seen for the recent indexer window. */
  total: number;
  /** Per-(subjectType, objectType) count. Use `keyOf` to look up. */
  byPair: Map<string, number>;
}

export const keyOfTypePair = (subjectType: string, objectType: string): string =>
  `${subjectType}->${objectType}`;

const DEFAULT_LIMIT = 200;

export interface UseLiveTripleCountsArgs {
  limit?: number;
  staleTime?: number;
}

/**
 * Returns a `LiveTripleCounts` snapshot derived from the indexer's
 * recent triples. Callers can read `byPair.get(keyOfTypePair(s, o))`
 * to check whether a particular schema combination has any onchain
 * activity. Values reflect the most recent `limit` triples (default
 * 200) — large enough to be representative, small enough to keep the
 * indexer response light.
 */
export function useLiveTripleCounts(
  args: UseLiveTripleCountsArgs = {}
): LiveTripleCounts {
  const limit = args.limit ?? DEFAULT_LIMIT;
  const { data: triples } = useLiveTriples({
    limit,
    staleTime: args.staleTime,
  });

  return useMemo<LiveTripleCounts>(() => {
    const byPair = new Map<string, number>();
    if (triples === undefined) {
      return { total: 0, byPair };
    }
    let total = 0;
    for (const triple of triples) {
      const { subject, object } = triple;
      if (subject === null || object === null) continue;
      total += 1;
      const key = keyOfTypePair(subject.type, object.type);
      byPair.set(key, (byPair.get(key) ?? 0) + 1);
    }
    return { total, byPair };
  }, [triples]);
}
