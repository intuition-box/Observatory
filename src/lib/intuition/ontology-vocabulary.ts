/**
 * This app's own meta-vocabulary — the predicates it uses to argue *about*
 * predicates, rather than to make ordinary claims.
 *
 * Neither has a canonical equivalent upstream: the registry's 10 comparative
 * predicates are all pairwise (`betterThan`, `rankedAbove`, …) and none takes a
 * context argument, so "X is the best predicate for slot S" is not expressible.
 * They are therefore proposal candidates in their own right.
 *
 * Both now carry canonical `DefinedTerm` bytes so that if upstream adopts them,
 * the atom id already matches.
 *
 * ⚠️ Legacy: before canonicalisation these were minted as bare label strings,
 * which hash differently. `LEGACY_*_LABEL` is retained so existing on-chain
 * proposals stay readable — see `resolveMetaPredicateTermIds`.
 */
import { canonicalPredicateAtomData, canonicalPredicateId, type TermId } from './canonical';

/** Middle atom label for ontology matrix slots: Person — ? — Organisation */
export const ONTOLOGY_SLOT_PREDICATE_LABEL = '?';

/** Meta-predicate linking a proposed predicate atom to a slot triple term id. */
export const ONTOLOGY_META_PREDICATE_LABEL = 'is best usage for';

const META_PREDICATE_DESCRIPTION =
  'The subject predicate is asserted to be the most suitable verb for the object ontology slot, ' +
  'which is itself a triple of the form ⟨subject type, ?, object type⟩';

const SLOT_PREDICATE_DESCRIPTION =
  'Placeholder predicate marking an unfilled position in an ontology slot triple, ' +
  'used to pose the question "which verb belongs between these two entity types?"';

/** Canonical `DefinedTerm` bytes for the meta-predicate. Mint verbatim. */
export const ONTOLOGY_META_PREDICATE_ATOM_DATA = canonicalPredicateAtomData(
  ONTOLOGY_META_PREDICATE_LABEL,
  META_PREDICATE_DESCRIPTION
);

export const ONTOLOGY_META_PREDICATE_ATOM_ID: TermId = canonicalPredicateId(
  ONTOLOGY_META_PREDICATE_LABEL,
  META_PREDICATE_DESCRIPTION
);

export const ONTOLOGY_SLOT_PREDICATE_ATOM_DATA = canonicalPredicateAtomData(
  ONTOLOGY_SLOT_PREDICATE_LABEL,
  SLOT_PREDICATE_DESCRIPTION
);

export const ONTOLOGY_SLOT_PREDICATE_ATOM_ID: TermId = canonicalPredicateId(
  ONTOLOGY_SLOT_PREDICATE_LABEL,
  SLOT_PREDICATE_DESCRIPTION
);

/**
 * Both meta-predicates as proposal candidates for the canonical registry.
 *
 * `is best usage for` fills a real gap — there is no context-scoped ranking
 * predicate upstream. `?` is more speculative and is listed for completeness.
 */
export const ONTOLOGY_PROPOSAL_CANDIDATES = [
  {
    name: ONTOLOGY_META_PREDICATE_LABEL,
    description: META_PREDICATE_DESCRIPTION,
    atomId: ONTOLOGY_META_PREDICATE_ATOM_ID,
    atomData: ONTOLOGY_META_PREDICATE_ATOM_DATA,
    rationale:
      'No canonical predicate expresses "best for context C" — all 10 comparative predicates are pairwise.',
  },
] as const;
