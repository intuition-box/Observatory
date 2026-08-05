import { mappingKindFor, resolveCanonicalPredicate } from './predicate-registry-map';

/**
 * Where a predicate stands relative to the canonical registry.
 *
 * - `enshrined` — canonical, stable semantics.
 * - `proposed`  — canonical id, semantics still being refined upstream.
 * - `candidate` — no canonical equivalent; this app is proposing it.
 * - `app-local` — deliberately outside the shared vocabulary.
 */
export type Provenance = 'enshrined' | 'proposed' | 'candidate' | 'app-local';

export function provenanceForPredicate(appPredicateId: string): Provenance {
  const resolved = resolveCanonicalPredicate(appPredicateId);
  if (resolved.kind !== 'candidate') return resolved.predicate.status;
  return mappingKindFor(appPredicateId) === 'candidate' ? 'candidate' : 'app-local';
}
