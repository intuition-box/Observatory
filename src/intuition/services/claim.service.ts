import { stringToHex, type Hex } from 'viem';
import type {
  OrganizationInput,
  PersonInput,
  ThingInput,
} from './ipfs.service';

/**
 * Classifies an Ontology atom-type ID into the on-chain materialization
 * strategy used to create the corresponding atom.
 *
 * - `caip10`: blockchain accounts and contracts. The atom data is the
 *   CAIP-10 URI directly (`caip10:eip155:<chainId>:<addr>`); no IPFS
 *   pinning required.
 * - `person`: human or AI-agent atoms. Pinned via the indexer's
 *   `pinPerson` mutation.
 * - `organization`: collective atoms (companies, DAOs, brands, local
 *   businesses). Pinned via `pinOrganization`.
 * - `thing`: everything else — articles, products, places, concepts,
 *   media. Pinned via `pinThing` (the catch-all schema.org Thing).
 *
 * The atom-type IDs mirror `src/data/atom-types.ts`. New types added
 * there fall through to `thing` by default — safe but generic. Surface
 * this file in code review so authors can opt into a more specific
 * classification when warranted.
 */
export type AtomPinKind = 'thing' | 'person' | 'organization' | 'caip10';

const CAIP10_TYPES = new Set([
  'EthereumAccount',
  'EthereumSmartContract',
  'EthereumERC20',
]);
const PERSON_TYPES = new Set(['Person', 'AIAgent']);
const ORGANIZATION_TYPES = new Set([
  'Organization',
  'LocalBusiness',
  'Brand',
]);

export function getAtomPinKind(atomTypeId: string): AtomPinKind {
  if (CAIP10_TYPES.has(atomTypeId)) return 'caip10';
  if (PERSON_TYPES.has(atomTypeId)) return 'person';
  if (ORGANIZATION_TYPES.has(atomTypeId)) return 'organization';
  return 'thing';
}

/** Discriminated union describing what the hook layer should do with an atom. */
export type AtomPinSpec =
  | { kind: 'thing'; input: ThingInput }
  | { kind: 'person'; input: PersonInput }
  | { kind: 'organization'; input: OrganizationInput }
  | { kind: 'caip10'; uri: `caip10:${string}` };

/**
 * Builds the atom-pin spec for a `(value, atomType)` pair from the claim
 * builder. Pure function — the hook layer dispatches on the discriminator
 * and calls the matching pin mutation, or encodes the CAIP-10 URI directly.
 *
 * The user-supplied `value` is the canonical name of the atom; richer
 * metadata (description, image, url) can be added by extending the input
 * shapes here once the claim builder collects them.
 */
export function buildAtomPinSpec(
  value: string,
  atomTypeId: string,
  chainId: number
): AtomPinSpec {
  const kind = getAtomPinKind(atomTypeId);

  if (kind === 'caip10') {
    const normalized = value.toLowerCase();
    return { kind: 'caip10', uri: `caip10:eip155:${chainId}:${normalized}` };
  }

  const input = { name: value };
  if (kind === 'person') return { kind: 'person', input };
  if (kind === 'organization') return { kind: 'organization', input };
  return { kind: 'thing', input };
}

/**
 * Encodes an atom URI (`ipfs://...` from a pin mutation, or `caip10:...`
 * for an EVM address) into the bytes payload accepted by `createAtoms`.
 *
 * Centralized here so the hook never reaches into viem encoding
 * primitives directly — keeps the orchestration code focused on the
 * state machine.
 */
export function encodeAtomData(uri: string): Hex {
  return stringToHex(uri);
}
