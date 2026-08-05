import {
  fetcher,
  FindAtomIdsDocument,
  GetTriplesDocument,
  type GetTriplesQuery,
} from '@0xintuition/graphql';

export type IndexedTriple = GetTriplesQuery['triples'][number];

export async function findAtomsByLabel(
  label: string,
  limit = 10
): Promise<Array<{ term_id: string; label?: string | null }>> {
  const trimmed = label.trim();
  if (!trimmed) return [];

  const result = (await fetcher(FindAtomIdsDocument, {
    where: { label: { _eq: trimmed } },
    limit,
  })()) as { atoms?: Array<{ term_id: string; label?: string | null }> };

  return result.atoms ?? [];
}

/**
 * Look an atom up by its deterministic term id.
 *
 * This is the read half of canonical identity: because an atom's id is a pure
 * function of its bytes, we can compute the id offline and ask whether it has
 * been minted — no label matching, no fuzzy resolution, no duplicates.
 */
export async function findAtomByTermId(
  termId: `0x${string}`
): Promise<{ term_id: string; label?: string | null } | null> {
  const result = (await fetcher(FindAtomIdsDocument, {
    where: { term_id: { _eq: termId } },
    limit: 1,
  })()) as { atoms?: Array<{ term_id: string; label?: string | null }> };

  return result.atoms?.[0] ?? null;
}

/** Which of the given term ids already exist on chain. */
export async function findExistingTermIds(
  termIds: `0x${string}`[]
): Promise<Set<string>> {
  if (termIds.length === 0) return new Set();

  const result = (await fetcher(FindAtomIdsDocument, {
    where: { term_id: { _in: termIds } },
    limit: termIds.length,
  })()) as { atoms?: Array<{ term_id: string }> };

  return new Set((result.atoms ?? []).map((atom) => atom.term_id));
}

export async function queryTriples(
  where: Record<string, unknown>,
  limit = 50
): Promise<IndexedTriple[]> {
  const result = (await fetcher(GetTriplesDocument, { where, limit })()) as GetTriplesQuery;
  return result.triples ?? [];
}
