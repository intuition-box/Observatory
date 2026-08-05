import { useMemo, useState } from 'react';

import {
  predicatesByCategory,
  type CanonicalPredicate,
} from '../lib/intuition/canonical';
import { ProposeCallout } from './propose-callout';
import { RegistryBadge } from './registry-badge';

type StatusFilter = 'all' | 'enshrined' | 'proposed';

interface PackagePredicateExplorerProps {
  searchQuery?: string;
}

/**
 * Every predicate the installed packages define, grouped by registry category.
 *
 * Status is the headline, not a detail: `enshrined` means the semantics are
 * settled, `proposed` means the id is stable but the meaning is still being
 * refined — which is precisely what this app exists to help decide. Staking on a
 * proposed predicate is a vote about the vocabulary, so users need to see which
 * kind they are looking at.
 */
export function PackagePredicateExplorer({ searchQuery }: PackagePredicateExplorerProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = (searchQuery ?? '').trim().toLowerCase();

  const groups = useMemo(() => {
    return predicatesByCategory()
      .map((group) => ({
        ...group,
        predicates: group.predicates.filter((predicate) => {
          if (filter !== 'all' && predicate.status !== filter) return false;
          if (!query) return true;
          return (
            predicate.name.toLowerCase().includes(query) ||
            predicate.key.toLowerCase().includes(query) ||
            predicate.description.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((group) => group.predicates.length > 0);
  }, [filter, query]);

  const counts = useMemo(() => {
    const all = predicatesByCategory().flatMap((group) => group.predicates);
    return {
      total: all.length,
      enshrined: all.filter((p) => p.status === 'enshrined').length,
      proposed: all.filter((p) => p.status === 'proposed').length,
    };
  }, []);

  const shown = groups.reduce((sum, group) => sum + group.predicates.length, 0);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Predicate Explorer</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            All {counts.total} predicates the packages recommend — {counts.enshrined} enshrined,{' '}
            {counts.proposed} proposed.
          </p>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
          {(['all', 'enshrined', 'proposed'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`focus-ring rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                filter === option
                  ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {shown === 0 ? (
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">
          No predicate matches the current filter.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <div key={group.category}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {group.category}
                <span className="ml-1.5 font-normal tabular-nums">
                  {group.predicates.length}
                </span>
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {group.predicates.map((predicate) => (
                  <PredicateCard
                    key={predicate.key}
                    predicate={predicate}
                    isExpanded={expanded === predicate.key}
                    onToggle={() =>
                      setExpanded(expanded === predicate.key ? null : predicate.key)
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <ProposeCallout
        className="mt-6"
        what="predicate"
        to="/registry"
        hint="Need a verb the standard does not have? Propose it for the registry and let stake rank it."
      />
    </section>
  );
}

function PredicateCard({
  predicate,
  isExpanded,
  onToggle,
}: {
  predicate: CanonicalPredicate;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="focus-ring w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-2 text-left transition-colors hover:border-[var(--color-accent)]/40"
      >
        <div className="flex items-center gap-1.5">
          <span className="flex-1 truncate text-sm text-[var(--color-text)]">
            {predicate.name}
          </span>
          <RegistryBadge provenance={predicate.status} />
        </div>
        <p
          className={`mt-1 text-[11px] leading-snug text-[var(--color-text-secondary)] ${
            isExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {predicate.description}
        </p>
        {isExpanded && (
          <dl className="mt-2 space-y-0.5 text-[10px] text-[var(--color-text-muted)]">
            <div className="flex gap-1.5">
              <dt>key</dt>
              <dd className="font-mono text-[var(--color-text-secondary)]">{predicate.key}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>market</dt>
              <dd className="text-[var(--color-text-secondary)]">{predicate.marketPattern}</dd>
            </div>
            {predicate.inversePredicate && (
              <div className="flex gap-1.5">
                <dt>inverse</dt>
                <dd className="text-[var(--color-text-secondary)]">
                  {predicate.inversePredicate}
                </dd>
              </div>
            )}
          </dl>
        )}
      </button>
    </li>
  );
}
