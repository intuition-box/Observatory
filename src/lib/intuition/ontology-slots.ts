import type { WriteConfig } from '@0xintuition/sdk';

import { ATOM_TYPES } from '../../data/atom-types';
import { getAtomTypeLabel } from '../../data/ontology-claim-patterns';
import {
  findAtomByTermId,
  findAtomsByLabel,
  queryTriples,
  type IndexedTriple,
} from './ontology-graphql';
import {
  ONTOLOGY_META_PREDICATE_ATOM_ID,
  ONTOLOGY_META_PREDICATE_LABEL,
  ONTOLOGY_SLOT_PREDICATE_LABEL,
} from './ontology-vocabulary';
import { writeAtomFromLabel, writeTripleFromTermIds } from './protocol-write';

export type OntologySlotRef = {
  subjectTypeId: string;
  objectTypeId: string;
  subjectLabel: string;
  objectLabel: string;
};

export type OntologySlotProposal = {
  predicateLabel: string;
  predicateTermId: `0x${string}`;
  metaTripleTermId: `0x${string}`;
  source: 'onchain';
};

export type OnchainOntologySlot = {
  subjectTypeId: string;
  objectTypeId: string;
  subjectLabel: string;
  objectLabel: string;
  slotTermId: `0x${string}`;
  proposals: OntologySlotProposal[];
};

export function slotRefFromTypes(
  subjectTypeId: string,
  objectTypeId: string
): OntologySlotRef {
  return {
    subjectTypeId,
    objectTypeId,
    subjectLabel: getAtomTypeLabel(subjectTypeId),
    objectLabel: getAtomTypeLabel(objectTypeId),
  };
}

export function formatSlotDisplayLine(ref: OntologySlotRef): string {
  return `${ref.subjectLabel} — ${ONTOLOGY_SLOT_PREDICATE_LABEL} — ${ref.objectLabel}`;
}

export async function findAtomTermIdByLabel(
  label: string,
  limit = 5
): Promise<`0x${string}` | null> {
  const atoms = await findAtomsByLabel(label, limit);
  const exactMatch = atoms.find(
    (atom) =>
      atom.term_id?.startsWith('0x') &&
      atom.label?.trim().toLowerCase() === label.trim().toLowerCase()
  );
  const fallbackMatch = atoms.find((atom) => atom.term_id?.startsWith('0x'));
  const termId = (exactMatch ?? fallbackMatch)?.term_id;
  return termId?.startsWith('0x') ? (termId as `0x${string}`) : null;
}

async function resolveAtomTermId(
  config: WriteConfig,
  label: string,
  onProgress?: (message: string) => void
): Promise<`0x${string}`> {
  const existingTermId = await findAtomTermIdByLabel(label, 5);
  if (existingTermId) return existingTermId;
  return writeAtomFromLabel(config, label, onProgress);
}

export async function findOntologySlotTriple(
  ref: OntologySlotRef
): Promise<IndexedTriple | null> {
  const triples = await queryTriples(
    {
      _and: [
        { subject: { label: { _eq: ref.subjectLabel } } },
        { predicate: { label: { _eq: ONTOLOGY_SLOT_PREDICATE_LABEL } } },
        { object: { label: { _eq: ref.objectLabel } } },
      ],
    },
    5
  );

  return triples[0] ?? null;
}

/**
 * Ensures the slot triple exists (Person — ? — Organisation).
 * Only called when the slot is missing — not on every proposal.
 */
export async function ensureOntologySlotTriple(
  config: WriteConfig,
  ref: OntologySlotRef,
  onProgress?: (message: string) => void
): Promise<`0x${string}`> {
  const existing = await findOntologySlotTriple(ref);
  if (existing?.term_id?.startsWith('0x')) {
    return existing.term_id as `0x${string}`;
  }

  onProgress?.(`Creating ontology slot ${formatSlotDisplayLine(ref)}…`);

  const subjectTermId = await resolveAtomTermId(config, ref.subjectLabel, onProgress);
  const slotPredicateTermId = await resolveAtomTermId(
    config,
    ONTOLOGY_SLOT_PREDICATE_LABEL,
    onProgress
  );
  const objectTermId = await resolveAtomTermId(config, ref.objectLabel, onProgress);

  const { tripleTermId } = await writeTripleFromTermIds(
    config,
    subjectTermId,
    slotPredicateTermId,
    objectTermId,
    onProgress
  );

  return tripleTermId;
}

/**
 * Every term id the meta-predicate might be stored under.
 *
 * Reads must match both: the canonical `DefinedTerm` atom, and the legacy atom
 * minted from the bare label `'is best usage for'` before canonicalisation.
 * Dropping the legacy id would make every pre-existing proposal disappear.
 */
export async function resolveMetaPredicateTermIds(): Promise<`0x${string}`[]> {
  const ids: `0x${string}`[] = [];

  const canonical = await findAtomByTermId(ONTOLOGY_META_PREDICATE_ATOM_ID);
  if (canonical?.term_id?.startsWith('0x')) {
    ids.push(canonical.term_id as `0x${string}`);
  }

  const legacy = await findAtomTermIdByLabel(ONTOLOGY_META_PREDICATE_LABEL, 3);
  if (legacy && !ids.includes(legacy)) {
    ids.push(legacy);
  }

  return ids;
}

export async function findMetaProposalTriple(
  slotTermId: `0x${string}`,
  proposedPredicateTermId: `0x${string}`
): Promise<IndexedTriple | null> {
  const metaTermIds = await resolveMetaPredicateTermIds();
  if (metaTermIds.length === 0) return null;

  const triples = await queryTriples(
    {
      _and: [
        { subject_id: { _eq: proposedPredicateTermId } },
        { predicate_id: { _in: metaTermIds } },
        { object_id: { _eq: slotTermId } },
      ],
    },
    3
  );

  return triples[0] ?? null;
}

export async function fetchSlotProposals(
  slotTermId: `0x${string}`
): Promise<OntologySlotProposal[]> {
  const metaTermIds = await resolveMetaPredicateTermIds();
  if (metaTermIds.length === 0) return [];

  const triples = await queryTriples(
    {
      _and: [
        { predicate_id: { _in: metaTermIds } },
        { object_id: { _eq: slotTermId } },
      ],
    },
    100
  );

  return triples
    .filter((t) => t.subject?.label && t.term_id?.startsWith('0x'))
    .map((t) => ({
      predicateLabel: t.subject!.label!.trim(),
      predicateTermId: t.subject_id as `0x${string}`,
      metaTripleTermId: t.term_id as `0x${string}`,
      source: 'onchain' as const,
    }));
}

function typeIdFromOnchainLabel(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'organisation') return 'Organization';

  const match = ATOM_TYPES.find(
    (type) =>
      type.id.toLowerCase() === normalized ||
      type.label.trim().toLowerCase() === normalized ||
      type.schemaOrgType?.toLowerCase() === normalized
  );
  return match?.id ?? null;
}

export async function fetchOnchainOntologySlots(): Promise<OnchainOntologySlot[]> {
  const slotTriples = await queryTriples(
    {
      predicate: { label: { _eq: ONTOLOGY_SLOT_PREDICATE_LABEL } },
    },
    500
  );

  const slotsByTermId = new Map(
    slotTriples
      .filter((triple) => triple.term_id?.startsWith('0x'))
      .map((triple) => [triple.term_id as `0x${string}`, triple])
  );
  const slotTermIds = [...slotsByTermId.keys()];
  if (slotTermIds.length === 0) return [];

  const metaTermIds = await resolveMetaPredicateTermIds();
  const proposalsBySlot = new Map<`0x${string}`, OntologySlotProposal[]>();

  if (metaTermIds.length > 0) {
    const metaTriples = await queryTriples(
      {
        _and: [
          { predicate_id: { _in: metaTermIds } },
          { object_id: { _in: slotTermIds } },
        ],
      },
      500
    );

    for (const triple of metaTriples) {
      const slotTermId = triple.object_id;
      if (!slotTermId.startsWith('0x') || !slotsByTermId.has(slotTermId as `0x${string}`)) continue;
      if (!triple.subject?.label || !triple.term_id?.startsWith('0x')) continue;

      const proposals = proposalsBySlot.get(slotTermId as `0x${string}`) ?? [];
      proposals.push({
        predicateLabel: triple.subject.label.trim(),
        predicateTermId: triple.subject_id as `0x${string}`,
        metaTripleTermId: triple.term_id as `0x${string}`,
        source: 'onchain',
      });
      proposalsBySlot.set(slotTermId as `0x${string}`, proposals);
    }
  }

  return [...slotsByTermId.entries()]
    .map(([slotTermId, slotTriple]) => {
      const subjectLabel = slotTriple?.subject?.label?.trim();
      const objectLabel = slotTriple?.object?.label?.trim();
      if (!subjectLabel || !objectLabel) return null;

      const subjectTypeId = typeIdFromOnchainLabel(subjectLabel);
      const objectTypeId = typeIdFromOnchainLabel(objectLabel);
      if (!subjectTypeId || !objectTypeId) return null;

      return {
        subjectTypeId,
        objectTypeId,
        subjectLabel,
        objectLabel,
        slotTermId,
        proposals: proposalsBySlot.get(slotTermId) ?? [],
      } satisfies OnchainOntologySlot;
    })
    .filter((slot): slot is OnchainOntologySlot => slot !== null)
    .sort(
      (a, b) =>
        a.subjectLabel.localeCompare(b.subjectLabel) ||
        a.objectLabel.localeCompare(b.objectLabel)
    );
}

export async function fetchSlotProposalsForTypes(
  subjectTypeId: string,
  objectTypeId: string
): Promise<{
  slot: OntologySlotRef;
  slotTermId: `0x${string}` | null;
  proposals: OntologySlotProposal[];
}> {
  const slot = slotRefFromTypes(subjectTypeId, objectTypeId);
  const slotTriple = await findOntologySlotTriple(slot);
  if (!slotTriple?.term_id?.startsWith('0x')) {
    return { slot, slotTermId: null, proposals: [] };
  }

  const slotTermId = slotTriple.term_id as `0x${string}`;
  const proposals = await fetchSlotProposals(slotTermId);
  return { slot, slotTermId, proposals };
}
