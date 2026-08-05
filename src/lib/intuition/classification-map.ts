/**
 * Reconciliation between this app's `ATOM_TYPES` and the canonical
 * `@0xintuition/classifications` registry (37 slugs across 7 categories).
 *
 * Of the app's 39 types: 32 map by name, 4 were renamed upstream, and 3 have no
 * canonical equivalent. The upstream registry has one type the app lacks
 * (`social-media-account`).
 *
 * App-local types are not a gap to close. `Self` in particular is a *deictic*
 * atom — it resolves to whoever is staking, at stake time — which has no
 * counterpart upstream and is a genuine contribution of this app.
 */
import { hasCanonicalClassification, type TermId } from './canonical';

export type ClassificationMapping =
  | { kind: 'direct'; slug: string }
  | { kind: 'renamed'; slug: string; note: string }
  | { kind: 'app-local'; note: string };

/** Keyed by the app's atom type id (see `src/data/atom-types.ts`). */
const MAP: Record<string, ClassificationMapping> = {
  // ---- renamed upstream ---------------------------------------------------
  Organization: {
    kind: 'renamed',
    slug: 'company',
    note: 'Upstream narrowed `Organization` to `company`.',
  },
  Place: {
    kind: 'renamed',
    slug: 'location',
    note: 'Upstream uses `location` for the schema.org Place concept.',
  },
  ImageObject: {
    kind: 'renamed',
    slug: 'image',
    note: 'Upstream shortened `ImageObject` to `image`.',
  },
  SoftwareSourceCode: {
    kind: 'renamed',
    slug: 'software',
    note: 'Upstream uses `software` for source-code repositories.',
  },

  // ---- app-local (no canonical equivalent) --------------------------------
  Self: {
    kind: 'app-local',
    note: 'Deictic atom — resolves to the connected wallet at stake time. No upstream equivalent; compare `I_SUBJECT` in @0xintuition/predicates.',
  },
  AIAgent: {
    kind: 'app-local',
    note: 'No canonical classification for autonomous agents yet — a proposal candidate.',
  },
  Account: {
    kind: 'app-local',
    note: 'Generic account type; upstream splits this into `ethereum-account` and `social-media-account`.',
  },

  // ---- direct -------------------------------------------------------------
  AggregateRating: { kind: 'direct', slug: 'aggregate-rating' },
  Article: { kind: 'direct', slug: 'article' },
  Book: { kind: 'direct', slug: 'book' },
  Brand: { kind: 'direct', slug: 'brand' },
  Comment: { kind: 'direct', slug: 'comment' },
  Dataset: { kind: 'direct', slug: 'dataset' },
  DefinedTerm: { kind: 'direct', slug: 'defined-term' },
  EthereumAccount: { kind: 'direct', slug: 'ethereum-account' },
  EthereumERC20: { kind: 'direct', slug: 'ethereum-erc20' },
  EthereumSmartContract: { kind: 'direct', slug: 'ethereum-smart-contract' },
  Event: { kind: 'direct', slug: 'event' },
  JobPosting: { kind: 'direct', slug: 'job-posting' },
  LocalBusiness: { kind: 'direct', slug: 'local-business' },
  MobileApplication: { kind: 'direct', slug: 'mobile-application' },
  Movie: { kind: 'direct', slug: 'movie' },
  MusicAlbum: { kind: 'direct', slug: 'music-album' },
  MusicGroup: { kind: 'direct', slug: 'music-group' },
  MusicRecording: { kind: 'direct', slug: 'music-recording' },
  NewsArticle: { kind: 'direct', slug: 'news-article' },
  Person: { kind: 'direct', slug: 'person' },
  PodcastEpisode: { kind: 'direct', slug: 'podcast-episode' },
  PodcastSeries: { kind: 'direct', slug: 'podcast-series' },
  Product: { kind: 'direct', slug: 'product' },
  Review: { kind: 'direct', slug: 'review' },
  Service: { kind: 'direct', slug: 'service' },
  SocialMediaPosting: { kind: 'direct', slug: 'social-media-posting' },
  SoftwareApplication: { kind: 'direct', slug: 'software-application' },
  Thing: { kind: 'direct', slug: 'thing' },
  TVSeries: { kind: 'direct', slug: 'tv-series' },
  VideoObject: { kind: 'direct', slug: 'video-object' },
  WebPage: { kind: 'direct', slug: 'web-page' },
  WebSite: { kind: 'direct', slug: 'web-site' },
};

export function classificationFor(atomTypeId: string): ClassificationMapping | undefined {
  return MAP[atomTypeId];
}

/** Canonical slug for an app atom type, or null when the type is app-local. */
export function canonicalSlugFor(atomTypeId: string): string | null {
  const mapping = MAP[atomTypeId];
  if (!mapping || mapping.kind === 'app-local') return null;
  return mapping.slug;
}

export function isAppLocalType(atomTypeId: string): boolean {
  return MAP[atomTypeId]?.kind === 'app-local';
}

/**
 * Slugs referenced by the map that the installed `classifications` package does
 * not actually define. Should always be empty — surfaced so an alpha bump that
 * renames a slug fails loudly instead of silently producing broken atoms.
 */
export function driftedSlugs(): string[] {
  return Object.values(MAP)
    .filter((m): m is Exclude<ClassificationMapping, { kind: 'app-local' }> => m.kind !== 'app-local')
    .map((m) => m.slug)
    .filter((slug) => !hasCanonicalClassification(slug));
}

export function classificationSummary() {
  const values = Object.values(MAP);
  return {
    total: values.length,
    direct: values.filter((m) => m.kind === 'direct').length,
    renamed: values.filter((m) => m.kind === 'renamed').length,
    appLocal: values.filter((m) => m.kind === 'app-local').length,
  };
}

export type { TermId };
