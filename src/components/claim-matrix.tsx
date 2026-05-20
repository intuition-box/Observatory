import { useEffect, useMemo, useCallback, useRef } from 'react';
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
  type EntityMapping,
} from '../data/semantic-rankings';
import { ATOM_TYPES } from '../data/atom-types';
import { getAtomColor } from '../lib/atom-colors';
import { useLiveTriples } from '../intuition/hooks/use-live-triples';
import {
  useLiveTripleCounts,
  keyOfTypePair,
} from '../intuition/hooks/use-live-triple-counts';
import type { JoinedTripleRecord } from '../intuition/services/graphql.service';

interface ClaimMatrixProps {
  /** Single subject type filter (home page use case) */
  subjectTypeId?: string | null;
  /** Multi-type filter via tag cloud (matrix page use case) */
  filterTypeIds?: Set<string>;
  onSelectClaim?: (subjectTypeId: string, predicateId: string, objectTypeId: string) => void;
  searchQuery?: string;
}

export function ClaimMatrix({ subjectTypeId, filterTypeIds, onSelectClaim, searchQuery }: ClaimMatrixProps) {
  // Live triples from the indexer surface the most recent on-chain
  // claims as instance-level rows — the visible counterpart to the
  // schema-only grid below. Falls back gracefully when the indexer
  // is empty or unreachable (the section just hides).
  const liveTriplesQuery = useLiveTriples({ limit: 5000 });
  const recentLiveClaims = useMemo(() => {
    const triples = liveTriplesQuery.data;
    if (triples === undefined) return [];
    return triples.filter(
      (t): t is JoinedTripleRecord & {
        subject: NonNullable<JoinedTripleRecord['subject']>;
        predicate: NonNullable<JoinedTripleRecord['predicate']>;
        object: NonNullable<JoinedTripleRecord['object']>;
      } =>
        t.subject !== null && t.predicate !== null && t.object !== null
    );
  }, [liveTriplesQuery.data]);

  // Per-(subjectType, objectType) onchain density used to badge each
  // schema row that carries actual indexed activity. The counts come
  // from a wider window than `recentLiveClaims` (200 vs 50) so the
  // signal stays meaningful even for less-traversed type pairs.
  const liveCounts = useLiveTripleCounts({ limit: 5000 });

  const allMappings = useMemo(() => {
    let base: EntityMapping[];
    if (subjectTypeId) {
      base = getEntityMappingsForSubject(subjectTypeId);
    } else if (filterTypeIds && filterTypeIds.size > 0) {
      base = getEntityMappingsForTypes([...filterTypeIds]);
    } else {
      base = getAllEntityMappings();
    }

    const sq = (searchQuery ?? '').trim().toLowerCase();
    if (!sq) return base;

    return base.filter((m) => {
      const subjectAtom = ATOM_TYPES.find((t) => t.id === m.subjectType);
      const objectAtom = ATOM_TYPES.find((t) => t.id === m.objectType);
      const subjectMatch = subjectAtom?.label.toLowerCase().includes(sq) ?? false;
      const objectMatch = objectAtom?.label.toLowerCase().includes(sq) ?? false;
      const predicateMatch = m.predicates.some((p) => p.label.toLowerCase().includes(sq));
      return subjectMatch || objectMatch || predicateMatch;
    });
  }, [subjectTypeId, filterTypeIds, searchQuery]);

  const groupedMappings = useMemo(() => {
    const groups: { label: string; mappings: EntityMapping[] }[] = [];
    let current: { label: string; mappings: EntityMapping[] } | null = null;

    for (const mapping of allMappings) {
      if (!current || current.label !== mapping.group) {
        current = { label: mapping.group, mappings: [] };
        groups.push(current);
      }
      current.mappings.push(mapping);
    }

    return groups;
  }, [allMappings]);

  const handleRowClick = useCallback(
    (mapping: EntityMapping) => {
      const only = mapping.predicates.length === 1 ? mapping.predicates[0] : null;
      if (only) onSelectClaim?.(mapping.subjectType, only.id, mapping.objectType);
    },
    [onSelectClaim]
  );

  const handlePredicateClick = useCallback(
    (mapping: EntityMapping, predicateId: string) => {
      onSelectClaim?.(mapping.subjectType, predicateId, mapping.objectType);
    },
    [onSelectClaim]
  );


  const definedTermColor = getAtomColor('DefinedTerm');

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Matrix</h2>
        <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded-full">
          {allMappings.length} {allMappings.length === 1 ? 'combination' : 'combinations'}
        </span>
      </div>

      <RecentLiveClaims claims={recentLiveClaims} definedTermColor={definedTermColor} />

      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-3 gap-2 mb-2" aria-hidden="true">
        {['Subject', 'Predicate', 'Object'].map((h, i) => (
          <div key={i} className="text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {h}
            </span>
          </div>
        ))}
      </div>
      {/* Screen reader column labels */}
      <div className="sr-only">Subject Entity, Predicate Entity (DefinedTerm), Object Entity</div>

      {/* Entity mappings grouped by semantic category */}
      <div className="space-y-1" role="list" aria-label="Entity type combinations">
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
                const hasMultiple = mapping.predicates.length > 1;
                const liveCount =
                  liveCounts.byPair.get(
                    keyOfTypePair(mapping.subjectType, mapping.objectType)
                  ) ?? 0;

                if (hasMultiple) {
                  return (
                    <Dialog key={rowKey}>
                      <DialogTrigger render={<div role="listitem" />}>
                        <EntityRow
                          mapping={mapping}
                          definedTermColor={definedTermColor}
                          liveCount={liveCount}
                        />
                      </DialogTrigger>
                      <DialogContent showCloseButton>
                        <PredicateDialogBody
                          mapping={mapping}
                          definedTermColor={definedTermColor}
                          onSelect={(predId) => handlePredicateClick(mapping, predId)}
                        />
                      </DialogContent>
                    </Dialog>
                  );
                }

                return (
                  <div key={rowKey} role="listitem">
                    <EntityRow
                      mapping={mapping}
                      definedTermColor={definedTermColor}
                      onClick={() => handleRowClick(mapping)}
                      liveCount={liveCount}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── Live Sections ───────────────────────────────────────────

type LiveClaim = JoinedTripleRecord & {
  subject: NonNullable<JoinedTripleRecord['subject']>;
  predicate: NonNullable<JoinedTripleRecord['predicate']>;
  object: NonNullable<JoinedTripleRecord['object']>;
};

/**
 * Lists the most recent on-chain claims with their actual atom labels —
 * the instance-level counterpart to the schema-only matrix below. The
 * section hides itself when the indexer has nothing to show, keeping
 * the existing static layout untouched in offline mode.
 */
function RecentLiveClaims({
  claims,
  definedTermColor,
}: {
  claims: LiveClaim[];
  definedTermColor: string;
}) {
  const top = claims.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <div className="mb-5 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent)]">
          Recent onchain claims
        </span>
      </div>
      <ul className="space-y-1.5">
        {top.map((claim) => {
          const subjectColor = liveAtomColor(claim.subject.type);
          const objectColor = liveAtomColor(claim.object.type);
          return (
            <li
              key={claim.term_id}
              className="flex items-center gap-2 font-mono text-xs"
            >
              <span style={{ color: subjectColor }} className="truncate max-w-[200px]">
                {claim.subject.label || '(unlabeled)'}
              </span>
              <span className="text-[var(--color-text-muted)]">—</span>
              <span style={{ color: definedTermColor }} className="truncate max-w-[200px]">
                {claim.predicate.label || '(unlabeled)'}
              </span>
              <span className="text-[var(--color-text-muted)]">—</span>
              <span style={{ color: objectColor }} className="truncate max-w-[200px]">
                {claim.object.label || '(unlabeled)'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Resolves a color for a live atom's type, falling back to a neutral
 * shade when the indexer reports a type that doesn't appear in our
 * static palette (e.g., legacy `TextObject` rows).
 */
function liveAtomColor(type: string): string {
  if (ATOM_TYPES.some((t) => t.id === type)) {
    return getAtomColor(type);
  }
  return 'var(--color-text-secondary)';
}

// ─── Row Components ──────────────────────────────────────────

function EntityRow({
  mapping,
  definedTermColor,
  onClick,
  liveCount = 0,
}: {
  mapping: EntityMapping;
  definedTermColor: string;
  onClick?: () => void;
  /** Total live triples observed for this (subject type, object type)
   *  pair across the indexer's recent window. Surfaced as an accent
   *  badge on the row so users can see at a glance which schema
   *  combinations are actually exercised on-chain. */
  liveCount?: number;
}) {
  const subjectAtom = ATOM_TYPES.find((t) => t.id === mapping.subjectType);
  const objectAtom = ATOM_TYPES.find((t) => t.id === mapping.objectType);
  if (!subjectAtom || !objectAtom) return null;

  const subjectColor = getAtomColor(mapping.subjectType);
  const objectColor = getAtomColor(mapping.objectType);

  const predicateCount = mapping.predicates.length;
  const onlyPredicate = predicateCount === 1 ? mapping.predicates[0] : null;
  const predicateLabel = onlyPredicate?.label ?? `${predicateCount} predicates`;

  return (
    <button
      onClick={onClick}
      className={`focus-ring relative grid w-full grid-cols-1 sm:grid-cols-3 gap-2 group rounded-lg hover:z-10 ${
        liveCount > 0
          ? 'ring-1 ring-[var(--color-accent)]/30'
          : ''
      }`}
      aria-label={`${subjectAtom.label} — ${predicateLabel} — ${objectAtom.label}${
        liveCount > 0 ? ` (${liveCount} onchain)` : ''
      }`}
    >
      {liveCount > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-bg)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--color-accent)]"
          title={`${liveCount} onchain triples for this type pair`}
        >
          <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" aria-hidden />
          {liveCount} live
        </span>
      )}
      <EntityPill
        label={subjectAtom.label}
        color={subjectColor}
        entityType={subjectAtom.category}
      />

      {onlyPredicate ? (
        <EntityPill
          label={onlyPredicate.label}
          color={definedTermColor}
          entityType="DefinedTerm"
        />
      ) : (
        <PredicateCountPill
          count={predicateCount}
          color={definedTermColor}
        />
      )}

      <EntityPill
        label={objectAtom.label}
        color={objectColor}
        entityType={objectAtom.category}
      />
    </button>
  );
}

function PredicateDialogBody({
  mapping,
  definedTermColor,
  onSelect,
}: {
  mapping: EntityMapping;
  definedTermColor: string;
  onSelect: (predicateId: string) => void;
}) {
  const subjectAtom = ATOM_TYPES.find((t) => t.id === mapping.subjectType);
  const objectAtom = ATOM_TYPES.find((t) => t.id === mapping.objectType);
  const firstPredicateRef = useRef<HTMLButtonElement>(null);

  // Move focus to the first predicate when the dialog opens so keyboard users
  // aren't stranded on the close button (the @waveso/ui default).
  useEffect(() => {
    firstPredicateRef.current?.focus();
  }, []);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-[var(--color-text)]">
          {subjectAtom?.label ?? mapping.subjectType} → {objectAtom?.label ?? mapping.objectType}
        </DialogTitle>
        <p className="text-xs text-[var(--color-text-muted)]">
          {mapping.predicates.length} available predicates
        </p>
      </DialogHeader>
      <div className="space-y-1 py-2" role="list">
        {mapping.predicates.map((p, i) => (
          <DialogClose
            key={p.id}
            render={
              <button
                ref={i === 0 ? firstPredicateRef : undefined}
                onClick={() => onSelect(p.id)}
                className="focus-ring flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
                role="listitem"
                aria-label={`${p.label}: ${p.description}`}
              />
            }
          >
            <span className="text-sm font-medium" style={{ color: definedTermColor }}>
              {p.label}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] ml-2 truncate max-w-[60%] text-right">
              {p.description}
            </span>
          </DialogClose>
        ))}
      </div>
    </>
  );
}

// ─── Pills ───────────────────────────────────────────────────

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

function PredicateCountPill({
  count,
  color,
}: {
  count: number;
  color: string;
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
        className="text-sm font-medium leading-tight"
        style={{ color }}
      >
        ?
      </span>
      <span className="text-[10px] mt-0.5 text-[var(--color-text-muted)]">
        {count} {count === 1 ? 'combination' : 'combinations'}
      </span>
    </div>
  );
}

