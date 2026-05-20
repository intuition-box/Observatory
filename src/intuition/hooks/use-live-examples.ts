import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { PREDICATES } from '../../data/predicates';
import { EXAMPLE_CLAIMS } from '../../data/example-claims';
import { useIndexer } from './use-indexer';

/**
 * Shape consumed by the claim builder's example-row UI: the same
 * subject / predicate / object triplet the user can click to fill the
 * form. Re-exported here so consumers don't reach into the static
 * seed file directly — the indexer-driven path is the canonical
 * source, with the curated `EXAMPLE_CLAIMS` seed retained as the
 * offline fallback.
 */
export interface ExampleClaim {
  subject: string;
  subjectType: string;
  predicateId: string;
  predicateLabel: string;
  object: string;
  objectType: string;
}

const DEFAULT_INDEXER_LIMIT = 100;
const DEFAULT_EXAMPLES_RETURNED = 3;

export interface UseLiveExamplesArgs {
  /** When null, the query is skipped — examples only make sense once
   *  a subject type has been picked. */
  subjectTypeId: string | null;
  /** Max examples returned to the consumer (post-filtering). */
  limit?: number;
  /** TanStack Query staleness in ms. Defaults to 60s. */
  staleTime?: number;
}

/**
 * Surfaces real on-chain claims as inspiration in the claim-builder
 * subject input.
 *
 * Fetches the most recent triples whose subject atom matches the
 * selected type, then filters them down to the ones whose predicate
 * label maps to a known static predicate (so the form's validation
 * rules and predicate selector can handle the click). Returns at most
 * `limit` examples (default 3) to keep the UI compact.
 *
 * When the indexer is unreachable, still loading, or returns no
 * examples for the selected type, the curated `EXAMPLE_CLAIMS` static
 * seed is used as a fallback so the UI is never empty in offline
 * development or for atom types with no on-chain activity yet.
 */
export function useLiveExamples(
  args: UseLiveExamplesArgs
): UseQueryResult<ExampleClaim[], Error> & { examples: ExampleClaim[] } {
  const indexer = useIndexer();
  const enabled =
    args.subjectTypeId !== null && args.subjectTypeId !== undefined;
  const subjectTypeId = args.subjectTypeId ?? '';

  const query = useQuery<ExampleClaim[], Error>({
    queryKey: ['intuition', 'examples', subjectTypeId],
    enabled,
    staleTime: args.staleTime ?? 60_000,
    queryFn: async () => {
      // Fetch a wider window of recent triples and filter client-side
      // by subject type. The Hasura nested filter on the `atom_type`
      // scalar is unreliable across indexer versions, so this avoids
      // an empty-result trap that would silently force the static
      // fallback even when matching live data exists.
      const triples = await indexer.listRecentTriples({
        limit: DEFAULT_INDEXER_LIMIT,
      });
      const examples: ExampleClaim[] = [];
      const seen = new Set<string>();
      const maxExamples = args.limit ?? DEFAULT_EXAMPLES_RETURNED;
      for (const triple of triples) {
        const { subject, predicate, object } = triple;
        if (subject === null || predicate === null || object === null) continue;
        if (subject.type !== subjectTypeId) continue;
        // Only surface examples whose predicate label maps to a known
        // static predicate — the form's validation rules and predicate
        // selector both key on the static predicate id.
        const staticPredicate = PREDICATES.find(
          (p) => p.label === predicate.label || p.id === predicate.label
        );
        if (staticPredicate === undefined) continue;
        if (subject.label === '' || object.label === '') continue;
        const key = `${subject.label}::${staticPredicate.id}::${object.label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        examples.push({
          subject: subject.label,
          subjectType: subject.type,
          predicateId: staticPredicate.id,
          predicateLabel: staticPredicate.label,
          object: object.label,
          objectType: object.type,
        });
        if (examples.length >= maxExamples) break;
      }
      return examples;
    },
  });

  // Convenience field that backs the live result with a curated
  // static fallback whenever the live list is empty (offline dev,
  // unmapped subject type, indexer lag for fresh atom types). The
  // fallback uses the `subjectTypeId` to look up the same shape from
  // the static seed file.
  const examples = useMemo<ExampleClaim[]>(() => {
    const live = query.data ?? [];
    if (live.length > 0) return live;
    const fallback = EXAMPLE_CLAIMS[subjectTypeId];
    if (fallback === undefined) return [];
    return fallback.slice(0, args.limit ?? DEFAULT_EXAMPLES_RETURNED);
  }, [query.data, subjectTypeId, args.limit]);
  return Object.assign(query, { examples });
}
