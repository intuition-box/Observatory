/**
 * Reconciliation between this app's curated predicates and the canonical
 * `@0xintuition/predicates` registry.
 *
 * Three outcomes per predicate:
 *
 * - **`direct`** — the app's phrasing and the registry's agree on direction.
 * - **`inverse`** — same relation, opposite direction. The app writes the
 *   *canonical* direction by swapping subject and object at submit time. This is
 *   mint-time canonicalisation: upstream audit A1 flags inverse pairs as
 *   "economically unsound" because `⟨A,employs,B⟩` and `⟨B,employedBy,A⟩` are one
 *   fact hashing to two triple ids and two vaults, splitting stake. Their fix
 *   (implementation-plan item A8) has not shipped, so we do it here.
 * - **`candidate`** — no canonical equivalent exists. These are the app's
 *   contribution: proposed to the registry via `listedIn`, carrying canonical
 *   `DefinedTerm` bytes so the id already matches if upstream adopts them.
 */
import {
  canonicalPredicateAtomData,
  canonicalPredicateId,
  findCanonicalPredicateByName,
  getCanonicalPredicate,
  type CanonicalPredicate,
  type TermId,
} from './canonical';

export type MappingKind = 'direct' | 'inverse' | 'candidate';

interface MappedEntry {
  kind: 'direct' | 'inverse';
  canonicalKey: string;
  note?: string;
}

interface CandidateEntry {
  kind: 'candidate';
  /** Name to mint the canonical `DefinedTerm` with. */
  name: string;
  description: string;
  note?: string;
}

type Entry = MappedEntry | CandidateEntry;

/**
 * Keyed by the app's predicate id (see `src/data/predicates.ts`).
 *
 * Directions were verified against each canonical predicate's own description
 * rather than inferred from its name — several read the opposite way from what
 * the name suggests (`founder` is "the subject *organization* was founded by the
 * object person", so the app's `founder of` maps to `founded`, not `founder`).
 */
const MAP: Record<string, Entry> = {
  // ---- direct ------------------------------------------------------------
  trusts: { kind: 'direct', canonicalKey: 'trust' },
  follows: { kind: 'direct', canonicalKey: 'follow' },
  endorses: { kind: 'direct', canonicalKey: 'endorse' },
  recommends: { kind: 'direct', canonicalKey: 'recommend' },
  'member of': { kind: 'direct', canonicalKey: 'memberOf' },
  'founder of': {
    kind: 'direct',
    canonicalKey: 'founded',
    note: '`founded` is actor→organization, matching this app. `founder` is the reverse.',
  },
  'works at': { kind: 'direct', canonicalKey: 'employedBy' },
  'contributor to': { kind: 'direct', canonicalKey: 'contributedTo' },
  'expert in': { kind: 'direct', canonicalKey: 'expertIn' },
  advocates: {
    kind: 'direct',
    canonicalKey: 'support',
    note: 'Registry `support` is explicitly broader than `endorse` — covers causes and policies.',
  },
  uses: { kind: 'direct', canonicalKey: 'use' },
  likes: { kind: 'direct', canonicalKey: 'like' },
  reviewed: { kind: 'direct', canonicalKey: 'reviewed' },
  'located in': { kind: 'direct', canonicalKey: 'locatedIn' },
  'partners with': { kind: 'direct', canonicalKey: 'partnerOf' },
  'competitor of': { kind: 'direct', canonicalKey: 'competeWith' },
  supports: { kind: 'direct', canonicalKey: 'support' },
  'created by': { kind: 'direct', canonicalKey: 'createdBy' },
  'tagged with': { kind: 'direct', canonicalKey: 'hasTag' },
  implements: { kind: 'direct', canonicalKey: 'implement' },
  'depends on': { kind: 'direct', canonicalKey: 'dependOn' },
  'alternative to': { kind: 'direct', canonicalKey: 'alternativeTo' },
  'fork of': { kind: 'direct', canonicalKey: 'forkedFrom' },
  'controlled by': { kind: 'direct', canonicalKey: 'governedBy' },
  'authored by': { kind: 'direct', canonicalKey: 'authoredBy' },
  'published by': { kind: 'direct', canonicalKey: 'publisher' },
  'review of': { kind: 'direct', canonicalKey: 'itemReviewed' },
  'is a': {
    kind: 'direct',
    canonicalKey: 'hasType',
    note: '`hasType` is for structured taxonomy terms; `hasTag` is the free-form sibling.',
  },
  'part of': {
    kind: 'direct',
    canonicalKey: 'listedIn',
    note: '`listedIn` is the declared inverse of `contain` and matches this direction.',
  },

  // ---- inverse (submit-time direction flip) -------------------------------
  created: {
    kind: 'inverse',
    canonicalKey: 'createdBy',
    note: 'App reads actor→work; canonical reads work→actor.',
  },
  'organized event': {
    kind: 'inverse',
    canonicalKey: 'organizer',
    note: 'Canonical `organizer` is event→organiser.',
  },
  employs: {
    kind: 'inverse',
    canonicalKey: 'employedBy',
    note: 'Canonical `employedBy` is person→organization.',
  },
  sponsors: {
    kind: 'inverse',
    canonicalKey: 'sponsoredBy',
    note: 'Canonical `sponsoredBy` is event→sponsor.',
  },
  offers: {
    kind: 'inverse',
    canonicalKey: 'provider',
    note: 'Canonical `provider` is service→provider.',
  },
  manufactures: {
    kind: 'inverse',
    canonicalKey: 'manufacturer',
    note: 'Canonical `manufacturer` is product→manufacturer.',
  },
  'brand of': {
    kind: 'inverse',
    canonicalKey: 'brand',
    note: 'Canonical `brand` is product/organization→brand.',
  },

  // ---- candidates (no canonical equivalent) -------------------------------
  knows: {
    kind: 'candidate',
    name: 'knows',
    description:
      'The subject has a direct personal or professional acquaintance with the object actor',
  },
  'interested in': {
    kind: 'candidate',
    name: 'interested in',
    description:
      'The subject expresses interest in the object topic, domain, or entity without claiming expertise',
  },
  'attended event': {
    kind: 'candidate',
    name: 'attended event',
    description: 'The subject actor was present at the object event',
  },
  'advised by': {
    kind: 'candidate',
    name: 'advised by',
    description:
      'The subject receives formal advisory input from the object person or organization',
  },
  'acquired by': {
    kind: 'candidate',
    name: 'acquired by',
    description:
      'The subject organization or asset was purchased by and absorbed into the object organization',
  },
  develops: {
    kind: 'candidate',
    name: 'develops',
    description:
      'The subject actor actively builds and advances the object software, product, or protocol',
  },
  maintains: {
    kind: 'candidate',
    name: 'maintains',
    description:
      'The subject actor is responsible for the ongoing upkeep of the object project or resource',
  },
  'headquartered in': {
    kind: 'candidate',
    name: 'headquartered in',
    description:
      'The subject organization has its primary place of business at the object location. Narrower than `located in`',
  },
  'developed by': {
    kind: 'candidate',
    name: 'developed by',
    description:
      'The subject software, product, or protocol is actively built by the object actor. The inverse of `develops`',
  },
  'maintained by': {
    kind: 'candidate',
    name: 'maintained by',
    description:
      'The subject project or resource is kept up to date by the object actor. The inverse of `maintains`',
  },
  'owned by': {
    kind: 'candidate',
    name: 'owned by',
    description:
      'The subject asset, account, or entity is legally or cryptographically owned by the object',
  },
  'deployed on': {
    kind: 'candidate',
    name: 'deployed on',
    description:
      'The subject contract or application is deployed to the object blockchain network or platform',
  },
  'token of': {
    kind: 'candidate',
    name: 'token of',
    description:
      'The subject token represents economic rights in the object protocol, organization, or asset',
  },
  about: {
    kind: 'candidate',
    name: 'about',
    description: 'The subject content concerns or discusses the object topic or entity',
  },
  'reply to': {
    kind: 'candidate',
    name: 'reply to',
    description: 'The subject post or comment is a direct response to the object',
  },
  'sold by': {
    kind: 'candidate',
    name: 'sold by',
    description: 'The subject product or service is offered for sale by the object seller',
  },
  'hosted by': {
    kind: 'candidate',
    name: 'hosted by',
    description:
      'The subject event, service, or content is hosted or operated by the object entity',
  },
  'related to': {
    kind: 'candidate',
    name: 'related to',
    description:
      'The subject and object share an unspecified association. Deliberately weak — prefer a specific predicate where one exists',
  },
  'sub concept of': {
    kind: 'candidate',
    name: 'sub concept of',
    description:
      'The subject term is a narrower or more specific concept within the object concept',
  },
  'opposite of': {
    kind: 'candidate',
    name: 'opposite of',
    description: 'The subject concept is the semantic opposite or antonym of the object concept',
  },
};

export interface DirectResolution {
  kind: 'direct' | 'inverse';
  /** Whether the app's subject/object must be swapped to write canonically. */
  flip: boolean;
  predicate: CanonicalPredicate;
  note?: string;
}

export interface CandidateResolution {
  kind: 'candidate';
  flip: false;
  name: string;
  description: string;
  atomId: TermId;
  atomData: string;
  note?: string;
}

export type PredicateResolution = DirectResolution | CandidateResolution;

/**
 * Resolve an app predicate id to its canonical form.
 *
 * Falls back to a name lookup for predicates not in the table (users can type
 * free-form predicates), and finally to a candidate built from the raw label.
 */
export function resolveCanonicalPredicate(appPredicateId: string): PredicateResolution {
  const entry = MAP[appPredicateId];

  if (entry && entry.kind !== 'candidate') {
    const predicate = getCanonicalPredicate(entry.canonicalKey);
    if (predicate) {
      return {
        kind: entry.kind,
        flip: entry.kind === 'inverse',
        predicate,
        note: entry.note,
      };
    }
  }

  if (entry?.kind === 'candidate') {
    return {
      kind: 'candidate',
      flip: false,
      name: entry.name,
      description: entry.description,
      atomId: canonicalPredicateId(entry.name, entry.description),
      atomData: canonicalPredicateAtomData(entry.name, entry.description),
      note: entry.note,
    };
  }

  // Not in the table — the user may have typed a predicate that happens to match
  // the registry by name or third-person form.
  const byName = findCanonicalPredicateByName(appPredicateId);
  if (byName) {
    return { kind: 'direct', flip: false, predicate: byName };
  }

  const description = `User-proposed predicate from the Ontology app: ${appPredicateId}`;
  return {
    kind: 'candidate',
    flip: false,
    name: appPredicateId,
    description,
    atomId: canonicalPredicateId(appPredicateId, description),
    atomData: canonicalPredicateAtomData(appPredicateId, description),
    note: 'Free-form predicate — not part of this app’s curated set.',
  };
}

/** The atom id a predicate resolves to, whichever branch it takes. */
export function canonicalAtomIdForPredicate(appPredicateId: string): TermId {
  const resolved = resolveCanonicalPredicate(appPredicateId);
  return resolved.kind === 'candidate' ? resolved.atomId : resolved.predicate.atomId;
}

/** Canonical bytes to mint, whichever branch it takes. */
export function canonicalAtomDataForPredicate(appPredicateId: string): string {
  const resolved = resolveCanonicalPredicate(appPredicateId);
  return resolved.kind === 'candidate' ? resolved.atomData : resolved.predicate.atomData;
}

/** Reconciliation summary — powers the coverage view and the upstream export. */
export function reconciliationSummary() {
  const entries = Object.entries(MAP);
  return {
    total: entries.length,
    direct: entries.filter(([, e]) => e.kind === 'direct').length,
    inverse: entries.filter(([, e]) => e.kind === 'inverse').length,
    candidates: entries.filter(([, e]) => e.kind === 'candidate').length,
  };
}

/** Every app predicate id that has no canonical equivalent yet. */
export function candidatePredicateIds(): string[] {
  return Object.entries(MAP)
    .filter(([, e]) => e.kind === 'candidate')
    .map(([id]) => id);
}

export function mappingKindFor(appPredicateId: string): MappingKind {
  return MAP[appPredicateId]?.kind ?? 'candidate';
}
