/**
 * IPFS Pinning Service for structured atom data.
 *
 * The Intuition protocol requires atoms (except CAIP-10 addresses) to be
 * pinned to IPFS before on-chain creation. The indexer GraphQL endpoint
 * exposes `pinThing`, `pinPerson`, and `pinOrganization` mutations that
 * wrap Pinata/Helia and return an `ipfs://` URI.
 *
 * This service:
 * 1. Provides typed wrappers for all three pin mutations
 * 2. Implements automatic retry with exponential backoff
 * 3. Caches recent pins to avoid duplicate IPFS uploads
 * 4. Offers a high-level `pinAtomData()` that auto-selects the correct
 *    mutation based on schema.org type detection
 *
 * @see https://docs.intuition.systems/atoms/pinning
 */

import { env } from '../../config/env';

// ─── Types ───────────────────────────────────────────────────────────
export type IpfsUri = `ipfs://${string}`;

/** schema.org Thing — base type for all structured atoms. */
export interface ThingInput {
  name: string;
  description?: string;
  image?: string;
  url?: string;
}

/** schema.org Person — extends Thing with identity fields. */
export interface PersonInput extends ThingInput {
  email?: string;
  identifier?: string;
}

/** schema.org Organization — extends Thing with org fields. */
export interface OrganizationInput extends ThingInput {
  email?: string;
}

/** Discriminated union for type-safe atom pinning. */
export type AtomPinRequest =
  | { type: 'Thing'; data: ThingInput }
  | { type: 'Person'; data: PersonInput }
  | { type: 'Organization'; data: OrganizationInput };

// ─── GraphQL Mutations ───────────────────────────────────────────────

const PIN_THING = `
  mutation PinThing($name: String!, $description: String!, $image: String!, $url: String!) {
    pinThing(thing: { name: $name, description: $description, image: $image, url: $url }) {
      uri
    }
  }
`;

const PIN_PERSON = `
  mutation PinPerson($name: String!, $description: String!, $image: String!, $url: String!, $email: String!, $identifier: String!) {
    pinPerson(person: { name: $name, description: $description, image: $image, url: $url, email: $email, identifier: $identifier }) {
      uri
    }
  }
`;

const PIN_ORGANIZATION = `
  mutation PinOrganization($name: String!, $description: String!, $image: String!, $url: String!, $email: String!) {
    pinOrganization(organization: { name: $name, description: $description, image: $image, url: $url, email: $email }) {
      uri
    }
  }
`;

// ─── LRU Pin Cache ───────────────────────────────────────────────────
const PIN_CACHE = new Map<string, IpfsUri>();
const MAX_CACHE = 128;

function cacheKey(req: AtomPinRequest): string {
  return `${req.type}:${JSON.stringify(req.data)}`;
}

function cacheSet(key: string, uri: IpfsUri): void {
  if (PIN_CACHE.size >= MAX_CACHE) {
    const oldest = PIN_CACHE.keys().next().value;
    if (oldest) PIN_CACHE.delete(oldest);
  }
  PIN_CACHE.set(key, uri);
}

// ─── Retry Logic ─────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Core GraphQL Executor ───────────────────────────────────────────

interface PinResponse {
  [key: string]: { uri?: string | null } | null | undefined;
}

async function executePinMutation(
  query: string,
  variables: Record<string, string>,
): Promise<IpfsUri> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(env.VITE_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });

      if (!res.ok) {
        throw new Error(`IPFS pin failed: HTTP ${res.status} ${res.statusText}`);
      }

      const json = (await res.json()) as { data?: PinResponse; errors?: Array<{ message: string }> };

      if (json.errors?.length) {
        throw new Error(`IPFS pin GraphQL error: ${json.errors[0]?.message ?? 'unknown'}`);
      }

      // Extract URI from whichever mutation key exists
      const data = json.data;
      if (!data) throw new Error('IPFS pin returned no data');

      const mutationResult = Object.values(data).find((v) => v && typeof v === 'object');
      const uri = mutationResult?.uri;

      if (!uri || !uri.startsWith('ipfs://')) {
        throw new Error(`IPFS pin returned invalid URI: ${uri}`);
      }

      return uri as IpfsUri;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error('IPFS pin exhausted retries');
}

// ─── Coerce helpers (optional → empty string for GraphQL) ────────────
function coerce(val: string | undefined): string {
  return val ?? '';
}

// ─── Public API ──────────────────────────────────────────────────────

/** Pin a schema.org Thing to IPFS. */
export async function pinThing(input: ThingInput): Promise<IpfsUri> {
  return executePinMutation(PIN_THING, {
    name: input.name,
    description: coerce(input.description),
    image: coerce(input.image),
    url: coerce(input.url),
  });
}

/** Pin a schema.org Person to IPFS. */
export async function pinPerson(input: PersonInput): Promise<IpfsUri> {
  return executePinMutation(PIN_PERSON, {
    name: input.name,
    description: coerce(input.description),
    image: coerce(input.image),
    url: coerce(input.url),
    email: coerce(input.email),
    identifier: coerce(input.identifier),
  });
}

/** Pin a schema.org Organization to IPFS. */
export async function pinOrganization(input: OrganizationInput): Promise<IpfsUri> {
  return executePinMutation(PIN_ORGANIZATION, {
    name: input.name,
    description: coerce(input.description),
    image: coerce(input.image),
    url: coerce(input.url),
    email: coerce(input.email),
  });
}

/**
 * High-level auto-router: pins atom data based on discriminated type.
 * Implements LRU caching to avoid duplicate IPFS uploads for identical atoms.
 *
 * @example
 * ```ts
 * const uri = await pinAtomData({ type: 'Person', data: { name: 'Vitalik', email: 'vb@ethereum.org' } });
 * // => 'ipfs://Qm...'
 * ```
 */
export async function pinAtomData(request: AtomPinRequest): Promise<IpfsUri> {
  const key = cacheKey(request);
  const cached = PIN_CACHE.get(key);
  if (cached) return cached;

  let uri: IpfsUri;

  switch (request.type) {
    case 'Thing':
      uri = await pinThing(request.data);
      break;
    case 'Person':
      uri = await pinPerson(request.data);
      break;
    case 'Organization':
      uri = await pinOrganization(request.data);
      break;
  }

  cacheSet(key, uri);
  return uri;
}

/**
 * Check if a string looks like a CAIP-10 blockchain address.
 * CAIP-10 atoms are NOT pinned — they're submitted as raw string bytes.
 */
export function isCaip10Address(value: string): boolean {
  // CAIP-10 format: <namespace>:<reference>:<address>
  // e.g., eip155:1:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  return /^[a-z0-9-]+:\d+:0x[a-fA-F0-9]{40}$/.test(value);
}
