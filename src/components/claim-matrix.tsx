import { useEffect, useMemo, useCallback, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@waveso/ui/dialog';
import {
  getEntityMappingsForSubject,
  getEntityMappingsForTypes,
  getAllEntityMappings,
  mappingMatchesTypeFilter,
  type EntityMapping,
} from '../data/semantic-rankings';
import type { PredicateRule } from '../data/predicates';
import { ATOM_TYPES } from '../data/atom-types';
import { getAtomColor } from '../lib/atom-colors';
import { useOnchainOntologyMatrix } from '../lib/intuition/use-onchain-ontology-matrix';
import { useSlotProposals, type SlotProposalView } from '../lib/intuition/use-slot-proposals';
import type { OntologySlotProposal } from '../lib/intuition/ontology-slots';
import { ONTOLOGY_SLOT_PREDICATE_LABEL } from '../lib/intuition/ontology-vocabulary';
import { BackerAvatars } from './backer-avatars';
import { getPredicateRule } from '../lib/intuition/predicate-resolution';
import { useIntuitionNetwork } from '../lib/wallet/intuition-network-context';

type MatrixPredicate = Pick<PredicateRule, 'id' | 'label' | 'description'>;
type MatrixMapping = Omit<EntityMapping, 'group' | 'predicates'> & {
  group: string;
  predicates: MatrixPredicate[];
  source: 'static' | 'onchain';
  subjectLabel?: string;
  objectLabel?: string;
  onchainProposals?: OntologySlotProposal[];
};

interface ClaimMatrixProps {
  subjectTypeId?: string | null;
  filterTypeIds?: Set<string>;
  onSelectClaim?: (subjectTypeId: string, predicateId: string, objectTypeId: string) => void;
  searchQuery?: string;
}

export function ClaimMatrix({
  subjectTypeId,
  filterTypeIds,
  onSelectClaim,
  searchQuery,
}: ClaimMatrixProps) {
  const { graphqlUrl, isStaticNetwork } = useIntuitionNetwork();
  const onchainMatrix = useOnchainOntologyMatrix(!isStaticNetwork, graphqlUrl);
  const allMappings = useMemo(() => {
    let base: MatrixMapping[];
    if (isStaticNetwork) {
      if (subjectTypeId) {
        base = getEntityMappingsForSubject(subjectTypeId).map((mapping) => ({
          ...mapping,
          source: 'static' as const,
        }));
      } else if (filterTypeIds && filterTypeIds.size > 0) {
        base = getEntityMappingsForTypes([...filterTypeIds]).map((mapping) => ({
          ...mapping,
          source: 'static' as const,
        }));
      } else {
        base = getAllEntityMappings().map((mapping) => ({
          ...mapping,
          source: 'static' as const,
        }));
      }
    } else {
      base = onchainMatrix.slots.map((slot) => ({
        subjectType: slot.subjectTypeId,
        objectType: slot.objectTypeId,
        subjectLabel: slot.subjectLabel,
        objectLabel: slot.objectLabel,
        predicates: slot.proposals.map((proposal) => ({
          id: proposal.predicateLabel,
          label: proposal.predicateLabel,
          description: '',
        })),
        group: 'On-chain ontology',
        priority: 0,
        source: 'onchain' as const,
        onchainProposals: slot.proposals,
      }));

      if (subjectTypeId) {
        base = base.filter((m) => m.subjectType === subjectTypeId);
      } else if (filterTypeIds && filterTypeIds.size > 0) {
        base = base.filter((m) =>
          mappingMatchesTypeFilter(m.subjectType, m.objectType, filterTypeIds)
        );
      }
    }

    const sq = (searchQuery ?? '').trim().toLowerCase();
    if (!sq) return base;

    return base.filter((m) => {
      const subjectLabel =
        m.subjectLabel ?? ATOM_TYPES.find((t) => t.id === m.subjectType)?.label ?? m.subjectType;
      const objectLabel =
        m.objectLabel ?? ATOM_TYPES.find((t) => t.id === m.objectType)?.label ?? m.objectType;
      const subjectMatch = subjectLabel.toLowerCase().includes(sq);
      const objectMatch = objectLabel.toLowerCase().includes(sq);
      const predicateMatch = m.predicates.some((p) => p.label.toLowerCase().includes(sq));
      return subjectMatch || objectMatch || predicateMatch;
    });
  }, [subjectTypeId, filterTypeIds, searchQuery, isStaticNetwork, onchainMatrix.slots]);

  const groupedMappings = useMemo(() => {
    const groups: { label: string; mappings: MatrixMapping[] }[] = [];
    let current: { label: string; mappings: MatrixMapping[] } | null = null;

    for (const mapping of allMappings) {
      if (!current || current.label !== mapping.group) {
        current = { label: mapping.group, mappings: [] };
        groups.push(current);
      }
      current.mappings.push(mapping);
    }

    return groups;
  }, [allMappings]);

  const handlePredicateSelect = useCallback(
    (mapping: MatrixMapping, predicateId: string) => {
      onSelectClaim?.(mapping.subjectType, predicateId, mapping.objectType);
    },
    [onSelectClaim]
  );

  const definedTermColor = getAtomColor('DefinedTerm');

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Matrix</h2>
        <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded-full">
          {allMappings.length} {allMappings.length === 1 ? 'slot' : 'slots'}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-5 leading-relaxed">
        Each row is an ontology slot ({ONTOLOGY_SLOT_PREDICATE_LABEL} = open predicate). Open the menu
        to see {isStaticNetwork ? 'local curated rules' : 'on-chain proposals'}, or add yours in the{' '}
        <Link to="/" className="text-[var(--color-accent)] hover:underline">
          Claim Builder
        </Link>
        .
      </p>

      {!isStaticNetwork && onchainMatrix.error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {onchainMatrix.error}
        </p>
      )}

      {!isStaticNetwork && onchainMatrix.isLoading && (
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">Loading on-chain ontology…</p>
      )}

      <div className="hidden sm:grid grid-cols-3 gap-2 mb-2" aria-hidden="true">
        {['Subject', 'Predicate', 'Object'].map((h) => (
          <div key={h} className="text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {h}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1" role="list" aria-label="Ontology type slots">
        {groupedMappings.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            <div className="pt-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent)]/60">
                {group.label}
              </span>
            </div>
            <div className="space-y-1.5">
              {group.mappings.map((mapping) => {
                const rowKey = `${mapping.subjectType}:${mapping.objectType}`;
                return (
                  <Dialog key={rowKey}>
                    <DialogTrigger render={<div role="listitem" />}>
                      <EntityRow
                        mapping={mapping}
                        definedTermColor={definedTermColor}
                        isStaticNetwork={isStaticNetwork}
                      />
                    </DialogTrigger>
                    <DialogContent showCloseButton className="max-w-md">
                      <PredicateDialogBody
                        mapping={mapping}
                        definedTermColor={definedTermColor}
                        onSelect={(predicateId) => handlePredicateSelect(mapping, predicateId)}
                      />
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!onchainMatrix.isLoading && allMappings.length === 0 && (
        <p className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-4 text-sm text-[var(--color-text-muted)]">
          {isStaticNetwork
            ? 'No static ontology slots match this filter.'
            : 'No on-chain ontology proposals found on the selected network.'}
        </p>
      )}
    </div>
  );
}

function EntityRow({
  mapping,
  definedTermColor,
  isStaticNetwork,
}: {
  mapping: MatrixMapping;
  definedTermColor: string;
  isStaticNetwork: boolean;
}) {
  const subjectAtom = ATOM_TYPES.find((t) => t.id === mapping.subjectType);
  const objectAtom = ATOM_TYPES.find((t) => t.id === mapping.objectType);
  const subjectLabel = mapping.subjectLabel ?? subjectAtom?.label ?? mapping.subjectType;
  const objectLabel = mapping.objectLabel ?? objectAtom?.label ?? mapping.objectType;
  const subjectCategory = subjectAtom?.category ?? 'on-chain';
  const objectCategory = objectAtom?.category ?? 'on-chain';

  const subjectColor = getAtomColor(mapping.subjectType);
  const objectColor = getAtomColor(mapping.objectType);

  return (
    <button
      type="button"
      className="focus-ring relative grid w-full grid-cols-1 sm:grid-cols-3 gap-2 group rounded-lg hover:z-10"
      aria-label={`${subjectLabel} — open predicate — ${objectLabel}`}
    >
      <EntityPill label={subjectLabel} color={subjectColor} entityType={subjectCategory} />
      <PredicateSlotPill
        color={definedTermColor}
        curatedCount={mapping.predicates.length}
        isStaticNetwork={isStaticNetwork}
        predicateLabels={mapping.predicates.map((predicate) => predicate.label)}
      />
      <EntityPill label={objectLabel} color={objectColor} entityType={objectCategory} />
    </button>
  );
}

function PredicateDialogBody({
  mapping,
  definedTermColor,
  onSelect,
}: {
  mapping: MatrixMapping;
  definedTermColor: string;
  onSelect: (predicateId: string) => void;
}) {
  const subjectAtom = ATOM_TYPES.find((t) => t.id === mapping.subjectType);
  const objectAtom = ATOM_TYPES.find((t) => t.id === mapping.objectType);
  const firstRef = useRef<HTMLButtonElement>(null);

  const curatedIds = useMemo(
    () => mapping.predicates.map((p) => p.id),
    [mapping.predicates]
  );

  const { proposals, onchainCount, curatedCount, slotDisplayLine, isLoading, error, isStaticNetwork } =
    useSlotProposals(
      mapping.subjectType,
      mapping.objectType,
      curatedIds,
      (id) => getPredicateRule(id)?.label ?? id,
      mapping.source === 'onchain'
        ? {
            onchainProposals: mapping.onchainProposals ?? [],
            slotDisplayLine: `${mapping.subjectLabel ?? mapping.subjectType} — ${ONTOLOGY_SLOT_PREDICATE_LABEL} — ${mapping.objectLabel ?? mapping.objectType}`,
          }
        : undefined
    );

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const curatedProposals = proposals.filter((p) => p.source === 'curated');
  const onchainProposals = proposals.filter((p) => p.source === 'onchain');

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-[var(--color-text)]">
          {slotDisplayLine ??
            `${subjectAtom?.label ?? mapping.subjectType} — ${ONTOLOGY_SLOT_PREDICATE_LABEL} — ${objectAtom?.label ?? mapping.objectType}`}
        </DialogTitle>
        <p className="text-xs text-[var(--color-text-muted)]">
          {isStaticNetwork ? `${curatedCount} static` : `${onchainCount} on-chain`}
          {isLoading ? ' · loading…' : ''}
        </p>
      </DialogHeader>

      {isStaticNetwork && (
        <p className="text-xs text-[var(--color-text-muted)] px-1">
          Static mode uses the local ontology only. Switch to mainnet or testnet to read community
          proposals.
        </p>
      )}

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      <div className="max-h-[min(50vh,320px)] overflow-y-auto space-y-3 py-2">
        {curatedProposals.length > 0 && (
          <ProposalSection
            title="Curated ontology"
            items={curatedProposals}
            definedTermColor={definedTermColor}
            mapping={mapping}
            firstRef={firstRef}
            onSelect={onSelect}
            showRuleDetails
          />
        )}

        {onchainProposals.length > 0 && (
          <ProposalSection
            title="Community proposals"
            items={onchainProposals}
            definedTermColor={definedTermColor}
            mapping={mapping}
            firstRef={curatedProposals.length === 0 ? firstRef : undefined}
            onSelect={(id) => onSelect(id)}
            showRuleDetails={false}
          />
        )}

        {!isLoading && proposals.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] px-2">
            {isStaticNetwork
              ? 'No static predicates for this slot.'
              : 'No on-chain proposals yet for this slot on the selected network. Use the Claim Builder to propose a predicate.'}
          </p>
        )}
      </div>
    </>
  );
}

function ProposalSection({
  title,
  items,
  definedTermColor,
  mapping,
  firstRef,
  onSelect,
  showRuleDetails,
}: {
  title: string;
  items: SlotProposalView[];
  definedTermColor: string;
  mapping: MatrixMapping;
  firstRef?: RefObject<HTMLButtonElement | null>;
  onSelect: (predicateId: string) => void;
  showRuleDetails: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-2 mb-1">
        {title}
      </p>
      <div className="space-y-1" role="list">
        {items.map((item, i) => {
          const predicateId =
            item.predicateId ??
            mapping.predicates.find(
              (p) => p.label.toLowerCase() === item.predicateLabel.toLowerCase()
            )?.id ??
            item.predicateLabel;
          const rule = showRuleDetails ? getPredicateRule(predicateId) : null;

          return (
            // The backer stack sits outside the DialogClose button: opening the
            // list to read who staked must not count as picking the predicate.
            <div
              key={`${item.source}-${predicateId}-${i}`}
              role="listitem"
              className="flex items-center gap-2 rounded-md pr-2 transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <DialogClose
                render={
                  <button
                    ref={i === 0 ? firstRef : undefined}
                    type="button"
                    onClick={() => onSelect(predicateId)}
                    className="focus-ring flex min-w-0 flex-1 flex-col items-stretch rounded-md px-3 py-2.5 text-left sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <span className="text-sm font-medium" style={{ color: definedTermColor }}>
                      {item.displayLine}
                    </span>
                    {rule?.description && (
                      <span className="text-[11px] text-[var(--color-text-muted)] sm:max-w-[45%] sm:text-right">
                        {rule.description}
                      </span>
                    )}
                    {item.source === 'onchain' && !rule && (
                      <span className="text-[10px] text-emerald-400/80">on-chain</span>
                    )}
                  </button>
                }
              />

              {item.tripleTermId && (
                <BackerAvatars tripleTermId={item.tripleTermId} compact />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntityPill({
  label,
  color,
  entityType,
}: {
  label: string;
  color: string;
  entityType: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-3 py-2.5 transition-[transform,box-shadow] group-hover:scale-[1.02] group-hover:shadow-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
      }}
    >
      <span
        className="text-sm font-medium truncate max-w-full text-center leading-tight"
        style={{ color }}
        title={label}
      >
        {label}
      </span>
      <span className="text-[10px] mt-0.5 text-[var(--color-text-muted)] truncate max-w-full">
        {entityType}
      </span>
    </div>
  );
}

function PredicateSlotPill({
  color,
  curatedCount,
  isStaticNetwork,
  predicateLabels,
}: {
  color: string;
  curatedCount: number;
  isStaticNetwork: boolean;
  predicateLabels: string[];
}) {
  const previewLabels = predicateLabels.slice(0, 2).join(', ');
  const overflowCount = Math.max(predicateLabels.length - 2, 0);

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-3 py-2.5 transition-[transform,box-shadow] group-hover:scale-[1.02] group-hover:shadow-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
      }}
    >
      <span className="text-sm font-medium leading-tight" style={{ color }}>
        ?
      </span>
      <span className="text-[10px] mt-0.5 text-[var(--color-text-muted)]">
        {isStaticNetwork
          ? `${curatedCount} static`
          : previewLabels
            ? `${previewLabels}${overflowCount > 0 ? ` +${overflowCount}` : ''}`
            : 'no proposals'}
      </span>
    </div>
  );
}
