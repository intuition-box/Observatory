/**
 * Canonical Intuition identity layer.
 *
 * Every atom in Intuition is a pure function of its bytes:
 *
 *   atomId = keccak256(ATOM_SALT ‖ keccak256(utf8(atomData)))
 *
 * This matters because the app used to mint predicate atoms by hashing a bare
 * label — `createAtomFromString(config, 'created by')`. The canonical registry
 * hashes a JSON-LD `DefinedTerm` document instead, so the two produce different
 * atom ids and claims written here never joined the shared graph.
 *
 * This module is the single boundary between the app and the (alpha) canonical
 * vocabulary packages. Nothing else should import `@0xintuition/ids`,
 * `@0xintuition/predicates` or `@0xintuition/classifications` directly — keeping
 * the blast radius of an alpha bump to this file.
 */
import {
  calculateAtomId,
  calculateCounterTripleId,
  calculatePredicateId,
  calculateTripleId,
  createPredicateAtomData,
} from '@0xintuition/ids';
import {
  LISTED_IN_ID,
  PREDICATE_ATOM_DATA,
  PREDICATE_IDS,
  PREDICATE_RECORDS,
  PREDICATE_REGISTRY_ATOM_DATA,
  PREDICATE_REGISTRY_ATOM_ID,
} from '@0xintuition/predicates';
import {
  CLASSIFICATION_SLUGS,
  CLASSIFICATION_SPECS,
  getClassification,
  getMetadataPredicateMatrixFor,
} from '@0xintuition/classifications';

export type TermId = `0x${string}`;

/** Status of a predicate in the canonical registry. */
export type PredicateStatus = 'enshrined' | 'proposed';

/** How a market treats a claim — drives which UI affordances make sense. */
export type MarketPattern = 'attributive' | 'depositional' | 'comparative';

export interface CanonicalPredicate {
  /** Registry key, e.g. `createdBy`. */
  key: string;
  /** Human-readable name, e.g. `created by`. This is what gets hashed. */
  name: string;
  description: string;
  status: PredicateStatus;
  marketPattern: MarketPattern;
  category: string;
  /** Deterministic atom id — what the MultiVault will derive for these bytes. */
  atomId: TermId;
  /** Canonical JSON-LD `DefinedTerm` bytes. Mint with these verbatim. */
  atomData: string;
  /** Third-person form, when the predicate conjugates (`endorse` → `endorses`). */
  thirdPerson?: string;
  /** Name of the reverse-direction predicate, if it has one. */
  inversePredicate?: string;
}

const RECORDS_BY_KEY = new Map<string, CanonicalPredicate>();
const RECORDS_BY_NAME = new Map<string, CanonicalPredicate>();

for (const record of PREDICATE_RECORDS) {
  const entry: CanonicalPredicate = {
    key: record.key,
    name: record.name,
    description: record.description,
    status: record.status as PredicateStatus,
    marketPattern: record.marketPattern as MarketPattern,
    category: record.category,
    atomId: PREDICATE_IDS[record.key as keyof typeof PREDICATE_IDS] as TermId,
    atomData: PREDICATE_ATOM_DATA[record.key as keyof typeof PREDICATE_ATOM_DATA],
    thirdPerson: record.thirdPerson,
    inversePredicate: record.inversePredicate,
  };
  RECORDS_BY_KEY.set(entry.key, entry);
  RECORDS_BY_NAME.set(entry.name.toLowerCase(), entry);
  if (entry.thirdPerson) {
    // Third-person forms are how several of this app's predicate ids are spelled
    // (`endorses`, `follows`), so index them too for lookup.
    RECORDS_BY_NAME.set(entry.thirdPerson.toLowerCase(), entry);
  }
}

/** All 133 canonical predicates (25 enshrined + 108 proposed). */
export const CANONICAL_PREDICATES: readonly CanonicalPredicate[] = [...RECORDS_BY_KEY.values()];

const RECORDS_BY_ATOM_ID = new Map<string, CanonicalPredicate>(
  [...RECORDS_BY_KEY.values()].map((record) => [record.atomId.toLowerCase(), record])
);

export function getCanonicalPredicate(key: string): CanonicalPredicate | undefined {
  return RECORDS_BY_KEY.get(key);
}

/**
 * Reverse lookup: which canonical predicate does this atom id belong to?
 *
 * Returns undefined for atoms minted outside the registry — including this app's
 * own proposal candidates, which are canonical in *form* but not in the registry.
 */
export function getCanonicalPredicateByAtomId(
  atomId: string
): CanonicalPredicate | undefined {
  return RECORDS_BY_ATOM_ID.get(atomId.toLowerCase());
}

/** Look up by human-readable name or third-person form, case-insensitively. */
export function findCanonicalPredicateByName(name: string): CanonicalPredicate | undefined {
  return RECORDS_BY_NAME.get(name.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Deterministic ids
// ---------------------------------------------------------------------------

/**
 * Atom id for arbitrary canonical bytes.
 *
 * The bytes are hashed exactly as given — no normalisation, no re-serialisation.
 * Pass `atomData` straight through from a builder rather than rebuilding the JSON.
 */
export function canonicalAtomId(atomData: string): TermId {
  return calculateAtomId(atomData) as TermId;
}

/** Atom id for a predicate, derived from its canonical `DefinedTerm` document. */
export function canonicalPredicateId(name: string, description: string): TermId {
  return calculatePredicateId(name, description) as TermId;
}

/**
 * Canonical `DefinedTerm` bytes for a predicate.
 *
 * Fixed key ordering (`@context`, `@type`, `name`, `description`) — the ordering
 * is part of the identity, so this must not be reconstructed by hand.
 */
export function canonicalPredicateAtomData(name: string, description: string): string {
  return createPredicateAtomData(name, description);
}

/** Triple id. Order-dependent: (s, p, o) and (o, p, s) are different triples. */
export function canonicalTripleId(subject: TermId, predicate: TermId, object: TermId): TermId {
  return calculateTripleId(subject, predicate, object) as TermId;
}

/**
 * Counter-triple id — the vault carrying disagreement with a claim.
 *
 * Derived from the *triple* id, not from (s, p, o):
 * `keccak256(COUNTER_SALT ‖ tripleId)`.
 */
export function canonicalCounterTripleId(tripleId: TermId): TermId {
  return calculateCounterTripleId(tripleId) as TermId;
}

// ---------------------------------------------------------------------------
// The predicate registry
// ---------------------------------------------------------------------------

/**
 * The atom every predicate-standardisation argument points at.
 *
 * Ships in `@0xintuition/predicates` as a pre-computed id, but is **not minted
 * on either network** as of 2026-08-05 — so the candidacy flow has to be able to
 * create it.
 */
export const PREDICATE_REGISTRY = {
  atomId: PREDICATE_REGISTRY_ATOM_ID as TermId,
  atomData: PREDICATE_REGISTRY_ATOM_DATA,
  label: 'predicate registry',
} as const;

/**
 * Predicate used to assert registry candidacy: `candidate — listedIn → registry`.
 *
 * Enshrined, and one of only two canonical predicate atoms already live on
 * mainnet. Its inverse `contain` is what the upstream bootstrap
 * (`getLaunchPredicateBootstrapTriples`) uses for *ratified* membership — see
 * plan.md §9.2 for why candidacy and ratification are deliberately different edges.
 */
export const LISTED_IN = {
  atomId: LISTED_IN_ID as TermId,
  key: 'listedIn',
  label: 'listed in',
} as const;

/** Triple id for a predicate's candidacy in the registry. */
export function registryCandidacyTripleId(candidateAtomId: TermId): TermId {
  return canonicalTripleId(candidateAtomId, LISTED_IN.atomId, PREDICATE_REGISTRY.atomId);
}

/** Counter-triple id for rejecting a candidacy. */
export function registryCandidacyCounterTripleId(candidateAtomId: TermId): TermId {
  return canonicalCounterTripleId(registryCandidacyTripleId(candidateAtomId));
}

// ---------------------------------------------------------------------------
// Classifications
// ---------------------------------------------------------------------------

/** The 37 canonical entity classifications. */
export const CANONICAL_CLASSIFICATIONS: readonly string[] = [...CLASSIFICATION_SLUGS];

export function hasCanonicalClassification(slug: string): boolean {
  return getClassification(slug) !== undefined;
}

export type ClassificationCategory =
  | 'Entity'
  | 'Creative Work'
  | 'Media'
  | 'Product'
  | 'Web'
  | 'Blockchain'
  | 'Other';

export interface CanonicalField {
  key: string;
  label: string;
  description: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  schemaProperty?: string;
}

export interface CanonicalClassification {
  slug: string;
  /** schema.org type name, e.g. `Person`. */
  type: string;
  displayName: string;
  description: string;
  category: ClassificationCategory;
  schema: { context: string; type: string } | null;
  fields: readonly CanonicalField[];
  /** Predicate keys the registry recommends for this entity type. */
  metadataPredicates: readonly string[];
}

/**
 * Every classification the installed package defines.
 *
 * Widened to a plain interface immediately: the package types each spec as a
 * distinct literal, and carrying a 37-member union through the UI makes
 * typechecking disproportionately expensive for no benefit.
 */
export const CANONICAL_CLASSIFICATION_SPECS: readonly CanonicalClassification[] =
  CLASSIFICATION_SPECS as readonly CanonicalClassification[];

export function getCanonicalClassification(slug: string): CanonicalClassification | undefined {
  return getClassification(slug) as CanonicalClassification | undefined;
}

/** Category display order — broad concepts first, infrastructure last. */
export const CLASSIFICATION_CATEGORY_ORDER: readonly ClassificationCategory[] = [
  'Entity',
  'Creative Work',
  'Media',
  'Product',
  'Web',
  'Blockchain',
  'Other',
];

export function classificationsByCategory(): {
  category: ClassificationCategory;
  classifications: CanonicalClassification[];
}[] {
  const buckets = new Map<ClassificationCategory, CanonicalClassification[]>();

  for (const spec of CANONICAL_CLASSIFICATION_SPECS) {
    const bucket = buckets.get(spec.category);
    if (bucket) bucket.push(spec);
    else buckets.set(spec.category, [spec]);
  }

  return CLASSIFICATION_CATEGORY_ORDER.filter((category) => buckets.has(category)).map(
    (category) => ({
      category,
      classifications: (buckets.get(category) ?? []).sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      ),
    })
  );
}

/** Canonical predicates recommended for a classification, resolved to records. */
export function recommendedPredicatesFor(slug: string): CanonicalPredicate[] {
  const spec = getCanonicalClassification(slug);
  if (!spec) return [];

  return spec.metadataPredicates
    .map((key) => getCanonicalPredicate(key))
    .filter((predicate): predicate is CanonicalPredicate => predicate !== undefined);
}

export interface CanonicalRelationship {
  /** Predicate key, e.g. `memberOf`. */
  predicate: string;
  /** Resolved predicate record, when the key is in the registry. */
  record?: CanonicalPredicate;
  /** What kinds of object this predicate expects for this subject type. */
  expectedObjects: readonly ExpectedObjectShape[];
  priority?: 'core' | 'recommended' | 'optional';
  notes?: string;
}

export type ExpectedObjectShape =
  | { kind: 'classification'; slug: string }
  | { kind: 'schema'; context: string; type: string }
  | { kind: 'primitive'; valueType: string }
  | { kind: 'same-classification' }
  | { kind: 'any'; reason: string };

/**
 * Typed relationships the registry defines for a subject classification.
 *
 * The shipped matrix is sparse — only a handful of classifications are densely
 * typed — so callers should fall back to `recommendedPredicatesFor` when this
 * returns nothing rather than treating an empty result as "no relationships".
 */
export function relationshipsFor(slug: string): CanonicalRelationship[] {
  const entries = getMetadataPredicateMatrixFor(slug) as readonly {
    predicate: string;
    expectedObjects: readonly ExpectedObjectShape[];
    priority?: 'core' | 'recommended' | 'optional';
    notes?: string;
  }[];

  return entries.map((entry) => ({
    predicate: entry.predicate,
    record: getCanonicalPredicate(entry.predicate),
    expectedObjects: entry.expectedObjects,
    priority: entry.priority,
    notes: entry.notes,
  }));
}

/** Canonical predicates grouped by their registry category, in a stable order. */
export function predicatesByCategory(): { category: string; predicates: CanonicalPredicate[] }[] {
  const buckets = new Map<string, CanonicalPredicate[]>();

  for (const predicate of CANONICAL_PREDICATES) {
    const bucket = buckets.get(predicate.category);
    if (bucket) bucket.push(predicate);
    else buckets.set(predicate.category, [predicate]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, predicates]) => ({
      category,
      // Enshrined first — they are the settled vocabulary.
      predicates: predicates.sort(
        (a, b) =>
          Number(b.status === 'enshrined') - Number(a.status === 'enshrined') ||
          a.name.localeCompare(b.name)
      ),
    }));
}
