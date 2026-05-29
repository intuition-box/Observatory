import { env } from '../../config/env';
import type { IntuitionAtom, IntuitionTriple } from '../types';

/**
 * GraphQL service for querying the Intuition indexer.
 * Fetches atoms, triples, and positions from the knowledge graph.
 */

const GRAPHQL_URL = env.VITE_GRAPHQL_URL;

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

/** Fetch recent atoms from the indexer */
export async function getAtoms(limit = 50, offset = 0): Promise<IntuitionAtom[]> {
  const query = `
    query GetAtoms($limit: Int!, $offset: Int!) {
      atoms(limit: $limit, offset: $offset, order_by: { blockTimestamp: desc }) {
        id
        vaultId
        label
        type
        image
        creator { id }
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  try {
    const data = await gqlFetch<{ atoms: Array<Record<string, unknown>> }>(query, { limit, offset });
    return (data.atoms || []).map(mapAtom);
  } catch (err) {
    console.warn('Failed to fetch atoms from indexer:', err);
    return [];
  }
}

/** Fetch recent triples from the indexer */
export async function getTriples(limit = 50, offset = 0): Promise<IntuitionTriple[]> {
  const query = `
    query GetTriples($limit: Int!, $offset: Int!) {
      triples(limit: $limit, offset: $offset, order_by: { blockTimestamp: desc }) {
        id
        vaultId
        subject { id vaultId label type image creator { id } blockNumber blockTimestamp transactionHash }
        predicate { id vaultId label type image creator { id } blockNumber blockTimestamp transactionHash }
        object { id vaultId label type image creator { id } blockNumber blockTimestamp transactionHash }
        creator { id }
        blockNumber
        blockTimestamp
        transactionHash
        counterVaultId
      }
    }
  `;

  try {
    const data = await gqlFetch<{ triples: Array<Record<string, unknown>> }>(query, { limit, offset });
    return (data.triples || []).map(mapTriple);
  } catch (err) {
    console.warn('Failed to fetch triples from indexer:', err);
    return [];
  }
}

/** Search atoms by label */
export async function searchAtoms(searchTerm: string, limit = 20): Promise<IntuitionAtom[]> {
  const query = `
    query SearchAtoms($search: String!, $limit: Int!) {
      atoms(where: { label: { _ilike: $search } }, limit: $limit, order_by: { blockTimestamp: desc }) {
        id
        vaultId
        label
        type
        image
        creator { id }
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  try {
    const data = await gqlFetch<{ atoms: Array<Record<string, unknown>> }>(query, {
      search: `%${searchTerm}%`,
      limit,
    });
    return (data.atoms || []).map(mapAtom);
  } catch (err) {
    console.warn('Failed to search atoms:', err);
    return [];
  }
}

/** Get triples for a specific atom (as subject, predicate, or object) */
export async function getTriplesForAtom(atomId: string, limit = 50): Promise<IntuitionTriple[]> {
  const query = `
    query GetTriplesForAtom($atomId: String!, $limit: Int!) {
      triples(
        where: {
          _or: [
            { subject: { id: { _eq: $atomId } } }
            { predicate: { id: { _eq: $atomId } } }
            { object: { id: { _eq: $atomId } } }
          ]
        }
        limit: $limit
        order_by: { blockTimestamp: desc }
      ) {
        id
        vaultId
        subject { id vaultId label type image creator { id } blockNumber blockTimestamp transactionHash }
        predicate { id vaultId label type image creator { id } blockNumber blockTimestamp transactionHash }
        object { id vaultId label type image creator { id } blockNumber blockTimestamp transactionHash }
        creator { id }
        blockNumber
        blockTimestamp
        transactionHash
        counterVaultId
      }
    }
  `;

  try {
    const data = await gqlFetch<{ triples: Array<Record<string, unknown>> }>(query, { atomId, limit });
    return (data.triples || []).map(mapTriple);
  } catch (err) {
    console.warn('Failed to fetch triples for atom:', err);
    return [];
  }
}

// ─── Mappers ──────────────────────────────────────────

function mapAtom(raw: Record<string, unknown>): IntuitionAtom {
  return {
    id: String(raw.id ?? ''),
    vaultId: String(raw.vaultId ?? ''),
    label: String(raw.label ?? ''),
    type: String(raw.type ?? ''),
    image: raw.image ? String(raw.image) : undefined,
    creator: String((raw.creator as Record<string, unknown>)?.id ?? ''),
    blockNumber: String(raw.blockNumber ?? ''),
    blockTimestamp: String(raw.blockTimestamp ?? ''),
    transactionHash: String(raw.transactionHash ?? ''),
  };
}

function mapTriple(raw: Record<string, unknown>): IntuitionTriple {
  return {
    id: String(raw.id ?? ''),
    vaultId: String(raw.vaultId ?? ''),
    subject: mapAtom(raw.subject as Record<string, unknown>),
    predicate: mapAtom(raw.predicate as Record<string, unknown>),
    object: mapAtom(raw.object as Record<string, unknown>),
    creator: String((raw.creator as Record<string, unknown>)?.id ?? ''),
    blockNumber: String(raw.blockNumber ?? ''),
    blockTimestamp: String(raw.blockTimestamp ?? ''),
    transactionHash: String(raw.transactionHash ?? ''),
    counterVaultId: raw.counterVaultId ? String(raw.counterVaultId) : undefined,
  };
}
