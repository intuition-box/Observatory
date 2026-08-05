import { useEffect, useState } from 'react';

import {
  fetchSlotProposalsForTypes,
  slotRefFromTypes,
  type OntologySlotProposal,
} from './ontology-slots';
import { ONTOLOGY_SLOT_PREDICATE_LABEL } from './ontology-vocabulary';
import { useIntuitionNetwork } from '../wallet/intuition-network-context';

export type SlotProposalView = {
  predicateLabel: string;
  predicateId?: string;
  source: 'curated' | 'onchain';
  displayLine: string;
  /**
   * The on-chain triple carrying this proposal, when there is one.
   *
   * Needed to read who staked on it — the aggregate total says how much
   * conviction exists, this says whose.
   */
  tripleTermId?: `0x${string}`;
};

export function useSlotProposals(
  subjectTypeId: string | null,
  objectTypeId: string | null,
  curatedPredicateIds: string[],
  getPredicateLabel: (id: string) => string,
  options?: {
    onchainProposals?: OntologySlotProposal[];
    slotDisplayLine?: string;
  }
) {
  const { isStaticNetwork } = useIntuitionNetwork();
  const [onchainProposals, setOnchainProposals] = useState<OntologySlotProposal[]>([]);
  const [slotDisplayLine, setSlotDisplayLine] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaticNetwork && options?.onchainProposals) {
      setOnchainProposals(options.onchainProposals);
      setSlotDisplayLine(options.slotDisplayLine ?? null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!subjectTypeId || !objectTypeId || isStaticNetwork) {
      setOnchainProposals([]);
      setSlotDisplayLine(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void fetchSlotProposalsForTypes(subjectTypeId, objectTypeId)
      .then(({ slot, proposals }) => {
        if (cancelled) return;
        setSlotDisplayLine(
          `${slot.subjectLabel} — ${ONTOLOGY_SLOT_PREDICATE_LABEL} — ${slot.objectLabel}`
        );
        setOnchainProposals(proposals);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOnchainProposals([]);
        setSlotDisplayLine(null);
        setError(err instanceof Error ? err.message : 'Failed to load proposals');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    subjectTypeId,
    objectTypeId,
    isStaticNetwork,
    options?.onchainProposals,
    options?.slotDisplayLine,
  ]);

  const curated: SlotProposalView[] = curatedPredicateIds.map((id) => ({
    predicateId: id,
    predicateLabel: getPredicateLabel(id),
    source: 'curated' as const,
    displayLine: '',
  }));

  const onchain: SlotProposalView[] = onchainProposals.map((p) => ({
    predicateLabel: p.predicateLabel,
    source: 'onchain' as const,
    displayLine: '',
    tripleTermId: p.metaTripleTermId,
  }));

  const visibleProposals = isStaticNetwork ? curated : onchain;
  const localSlotDisplayLine =
    subjectTypeId && objectTypeId
      ? `${slotRefFromTypes(subjectTypeId, objectTypeId).subjectLabel} — ${ONTOLOGY_SLOT_PREDICATE_LABEL} — ${slotRefFromTypes(subjectTypeId, objectTypeId).objectLabel}`
      : null;
  const displaySlotLine = slotDisplayLine ?? localSlotDisplayLine;

  const all: SlotProposalView[] = visibleProposals.map((item) => ({
    ...item,
    displayLine: displaySlotLine
      ? `${displaySlotLine.split(' — ')[0]} — ${item.predicateLabel} — ${displaySlotLine.split(' — ')[2]}`
      : item.predicateLabel,
  }));

  return {
    proposals: all,
    onchainCount: onchain.length,
    curatedCount: curated.length,
    slotDisplayLine: displaySlotLine,
    isLoading,
    error,
    isStaticNetwork,
  };
}
