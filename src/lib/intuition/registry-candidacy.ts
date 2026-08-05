/**
 * Registry candidacy — proposing a predicate for the canonical standard.
 *
 *   ⟨candidate predicate⟩ — listed in → ⟨predicate registry⟩
 *
 * `listedIn` is enshrined, and its object is the `predicateRegistry` atom that
 * ships pre-computed in `@0xintuition/predicates`. Neither the registry atom nor
 * most of the canonical predicate atoms were minted on either network as of
 * 2026-08-05, so this flow has to be able to create them.
 *
 * Candidacy is deliberately a *different edge* from ratified membership. The
 * upstream bootstrap records settled membership as ⟨registry, contain, X⟩; a
 * proposal is not yet true, so it must not be written that way. Stake on the
 * candidacy triple ranks candidates; its counter-triple carries rejection.
 */
import { fetcher } from '@0xintuition/graphql';
import type { WriteConfig } from '@0xintuition/sdk';

import {
  getCanonicalPredicate,
  getCanonicalPredicateByAtomId,
  LISTED_IN,
  PREDICATE_REGISTRY,
  registryCandidacyTripleId,
  type TermId,
} from './canonical';
import { resolveCanonicalPredicate } from './predicate-registry-map';
import {
  assertSufficientTrustBalance,
  estimateRegistryProposalCost,
  writeCanonicalAtom,
  writeTripleFromTermIds,
} from './protocol-write';

export type CandidateStatus = 'enshrined' | 'proposed' | 'candidate';

export interface RegistryCandidate {
  candidateAtomId: TermId;
  label: string;
  tripleTermId: TermId;
  /** TRUST staked in favour of this predicate joining the standard. */
  stakeFor: bigint;
  /** TRUST staked against, via the counter-triple. */
  stakeAgainst: bigint;
  /** Net conviction — what the list is ranked by. */
  netStake: bigint;
  /** Whether the predicate is already in the canonical registry. */
  status: CandidateStatus;
}

const CANDIDATES_QUERY = `
  query RegistryCandidates($predicate: String!, $object: String!) {
    triples(
      where: { predicate_id: { _eq: $predicate }, object_id: { _eq: $object } }
      limit: 500
    ) {
      term_id
      subject_id
      subject { label }
      term { total_assets }
      counter_term { total_assets }
    }
  }
`;

type CandidatesResponse = {
  triples?: Array<{
    term_id: string;
    subject_id: string;
    subject?: { label?: string | null } | null;
    term?: { total_assets?: string | null } | null;
    counter_term?: { total_assets?: string | null } | null;
  }>;
};

function toBigInt(value: string | null | undefined): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/**
 * Canonical status of a proposed atom.
 *
 * `enshrined` / `proposed` mean the predicate is already in the upstream
 * registry — worth surfacing, since proposing one that is already enshrined is
 * usually a mistake. `candidate` means genuinely new vocabulary.
 */
function statusForAtomId(atomId: string): CandidateStatus {
  return getCanonicalPredicateByAtomId(atomId)?.status ?? 'candidate';
}

/**
 * Every predicate currently proposed for the registry, ranked by net stake.
 *
 * Ranking is conviction, not a comparative predicate — the same way Intuition's
 * existing "top" lists work.
 */
export async function fetchRegistryCandidates(): Promise<RegistryCandidate[]> {
  const data = (await fetcher<CandidatesResponse, Record<string, string>>(CANDIDATES_QUERY, {
    predicate: LISTED_IN.atomId,
    object: PREDICATE_REGISTRY.atomId,
  })()) as CandidatesResponse;

  const rows = data.triples ?? [];

  return rows
    .filter((row) => row.term_id?.startsWith('0x') && row.subject_id?.startsWith('0x'))
    .map((row) => {
      const stakeFor = toBigInt(row.term?.total_assets);
      const stakeAgainst = toBigInt(row.counter_term?.total_assets);
      return {
        candidateAtomId: row.subject_id as TermId,
        label: row.subject?.label?.trim() || row.subject_id,
        tripleTermId: row.term_id as TermId,
        stakeFor,
        stakeAgainst,
        netStake: stakeFor - stakeAgainst,
        status: statusForAtomId(row.subject_id),
      } satisfies RegistryCandidate;
    })
    .sort((a, b) => (b.netStake > a.netStake ? 1 : b.netStake < a.netStake ? -1 : 0));
}

/** Whether a predicate has already been proposed. */
export async function findCandidacyTriple(candidateAtomId: TermId): Promise<TermId | null> {
  const expected = registryCandidacyTripleId(candidateAtomId);
  const data = (await fetcher<
    { triples?: Array<{ term_id: string }> },
    Record<string, string>
  >(
    `query CandidacyTriple($id: String!) { triples(where: { term_id: { _eq: $id } }, limit: 1) { term_id } }`,
    { id: expected }
  )()) as { triples?: Array<{ term_id: string }> };

  const found = data.triples?.[0]?.term_id;
  return found?.startsWith('0x') ? (found as TermId) : null;
}

export interface RegistryProposalResult {
  transactionHash: TermId;
  tripleTermId: TermId;
  candidateAtomId: TermId;
  label: string;
  /** True when the predicate already exists in the canonical registry. */
  alreadyCanonical: boolean;
}

/**
 * Propose a predicate for the canonical registry.
 *
 * Mints whatever is missing — the candidate atom, `listedIn`, and the registry
 * atom itself — then writes the candidacy triple. Every atom is content-addressed,
 * so each step is idempotent: an atom that already exists is reused, never
 * duplicated.
 */
export async function proposeToRegistry(
  config: WriteConfig,
  appPredicateId: string,
  onProgress?: (message: string) => void
): Promise<RegistryProposalResult> {
  const resolved = resolveCanonicalPredicate(appPredicateId);

  const label = resolved.kind === 'candidate' ? resolved.name : resolved.predicate.name;
  const atomData =
    resolved.kind === 'candidate' ? resolved.atomData : resolved.predicate.atomData;
  const atomId = resolved.kind === 'candidate' ? resolved.atomId : resolved.predicate.atomId;

  const existing = await findCandidacyTriple(atomId);
  if (existing) {
    throw new Error(
      `« ${label} » has already been proposed for the predicate registry.`
    );
  }

  onProgress?.('Checking TRUST balance…');
  const estimatedCost = await estimateRegistryProposalCost(config, atomId);
  await assertSufficientTrustBalance(config, estimatedCost);

  const listedIn = getCanonicalPredicate(LISTED_IN.key);
  if (!listedIn) {
    throw new Error('Canonical predicate `listedIn` is missing from the registry package.');
  }

  // Order matters only for readable progress — each write is independent.
  const candidateTermId = await writeCanonicalAtom(config, atomData, atomId, label, onProgress);
  const listedInTermId = await writeCanonicalAtom(
    config,
    listedIn.atomData,
    listedIn.atomId,
    listedIn.name,
    onProgress
  );
  const registryTermId = await writeCanonicalAtom(
    config,
    PREDICATE_REGISTRY.atomData,
    PREDICATE_REGISTRY.atomId,
    PREDICATE_REGISTRY.label,
    onProgress
  );

  onProgress?.(`Proposing « ${label} » for the predicate registry…`);

  const { tripleTransactionHash, tripleTermId } = await writeTripleFromTermIds(
    config,
    candidateTermId,
    listedInTermId,
    registryTermId,
    onProgress
  );

  return {
    transactionHash: tripleTransactionHash,
    tripleTermId,
    candidateAtomId: candidateTermId,
    label,
    alreadyCanonical: resolved.kind !== 'candidate',
  };
}
