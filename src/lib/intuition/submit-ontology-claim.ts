import type { WriteConfig } from '@0xintuition/sdk';

import { getAtomTypeLabel } from '../../data/ontology-claim-patterns';
import type { ClaimEntry } from '../../types';
import {
  ensureOntologySlotTriple,
  findMetaProposalTriple,
  formatSlotDisplayLine,
  slotRefFromTypes,
} from './ontology-slots';
import {
  ONTOLOGY_META_PREDICATE_ATOM_DATA,
  ONTOLOGY_META_PREDICATE_ATOM_ID,
  ONTOLOGY_META_PREDICATE_LABEL,
} from './ontology-vocabulary';
import { resolveCanonicalPredicate } from './predicate-registry-map';
import {
  assertSufficientTrustBalance,
  estimateOntologyProposalCost,
  writeCanonicalAtom,
  writeTripleFromTermIds,
} from './protocol-write';
import type { ProtocolAtomResolution, SubmitClaimResult } from './types';

/**
 * Resolve the proposed predicate to an on-chain atom using **canonical** bytes.
 *
 * The app used to mint predicate atoms from bare labels, which hashed to ids no
 * other Intuition app would ever derive. Routing through the registry map means
 * a predicate that exists canonically (`created by` → `createdBy`) reuses the
 * ecosystem's atom, and one that does not carries canonical `DefinedTerm` bytes
 * so its id already matches if upstream later adopts it.
 */
async function resolveCanonicalPredicateAtom(
  config: WriteConfig,
  resolution: ProtocolAtomResolution,
  onProgress?: (label: string) => void
): Promise<{ termId: `0x${string}`; resolved: ReturnType<typeof resolveCanonicalPredicate> }> {
  const resolved = resolveCanonicalPredicate(resolution.label.trim());

  if (resolution.mode === 'existing') {
    return { termId: resolution.termId, resolved };
  }

  const atomData =
    resolved.kind === 'candidate' ? resolved.atomData : resolved.predicate.atomData;
  const atomId = resolved.kind === 'candidate' ? resolved.atomId : resolved.predicate.atomId;

  const termId = await writeCanonicalAtom(
    config,
    atomData,
    atomId,
    resolution.label.trim(),
    onProgress
  );

  return { termId, resolved };
}

/**
 * Ontology submit: only creates
 *   [proposedPredicate] — is best usage for — [slot triple termId]
 * Never creates a flat Person — follows — Organisation triple.
 */
export async function submitOntologyClaimOnchain(
  config: WriteConfig,
  claim: Omit<ClaimEntry, 'id' | 'timestamp'>,
  proposedPredicateResolution: ProtocolAtomResolution,
  onProgress?: (label: string) => void
): Promise<SubmitClaimResult> {
  if (!claim.subjectType || !claim.objectType) {
    throw new Error('Subject and object types are required for ontology claims.');
  }

  const proposedLabel = proposedPredicateResolution.label.trim();
  if (!proposedLabel) {
    throw new Error('Predicate label is required for on-chain submission.');
  }

  const slotRef = slotRefFromTypes(claim.subjectType, claim.objectType);

  onProgress?.('Checking TRUST balance…');
  const estimatedCost = await estimateOntologyProposalCost(
    config,
    proposedPredicateResolution,
    slotRef
  );
  await assertSufficientTrustBalance(config, estimatedCost);

  onProgress?.('Resolving ontology atoms…');
  const { termId: proposedPredicateTermId } = await resolveCanonicalPredicateAtom(
    config,
    proposedPredicateResolution,
    onProgress
  );

  // `writeCanonicalAtom` reuses the atom when the deterministic id already
  // exists, so this covers both the first-ever write and every later one.
  const metaPredicateTermId = await writeCanonicalAtom(
    config,
    ONTOLOGY_META_PREDICATE_ATOM_DATA,
    ONTOLOGY_META_PREDICATE_ATOM_ID,
    ONTOLOGY_META_PREDICATE_LABEL,
    onProgress
  );

  const slotTermId = await ensureOntologySlotTriple(config, slotRef, onProgress);

  const existingMeta = await findMetaProposalTriple(slotTermId, proposedPredicateTermId);
  if (existingMeta) {
    throw new Error(
      `MultiVault_TripleExists: predicate « ${proposedLabel} » is already proposed for slot « ${formatSlotDisplayLine(slotRef)} ».`
    );
  }

  onProgress?.(
    `Proposing « ${proposedLabel} » for ${formatSlotDisplayLine(slotRef)}…`
  );

  const { tripleTransactionHash, tripleTermId } = await writeTripleFromTermIds(
    config,
    proposedPredicateTermId,
    metaPredicateTermId,
    slotTermId,
    onProgress
  );

  return {
    tripleTransactionHash,
    tripleTermId,
    slotTermId,
    proposedPredicateTermId,
    metaPredicateTermId,
    subjectTermId: proposedPredicateTermId,
    predicateTermId: metaPredicateTermId,
    objectTermId: slotTermId,
    subjectTypeId: claim.subjectType,
    objectTypeId: claim.objectType,
    slotDisplayLine: formatSlotDisplayLine(slotRef),
    proposedPredicateLabel: proposedLabel,
  };
}

/** Labels used for atom resolution when submitting from the builder. */
export function ontologySubmitLabels(
  claim: Pick<ClaimEntry, 'subject' | 'subjectType' | 'object' | 'objectType'>
): {
  subjectLabel: string;
  objectLabel: string;
} {
  return {
    subjectLabel: claim.subject.trim() || getAtomTypeLabel(claim.subjectType),
    objectLabel: claim.object.trim() || getAtomTypeLabel(claim.objectType),
  };
}
