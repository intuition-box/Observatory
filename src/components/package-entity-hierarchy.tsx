import { useMemo } from 'react';

import {
  classificationsByCategory,
  type CanonicalClassification,
} from '../lib/intuition/canonical';
import { ProposeCallout } from './propose-callout';

const CATEGORY_COLORS: Record<string, string> = {
  Entity: '#38bdf8',
  'Creative Work': '#a855f7',
  Media: '#f472b6',
  Product: '#f59e0b',
  Web: '#22d3ee',
  Blockchain: '#34d399',
  Other: '#94a3b8',
};

interface PackageEntityHierarchyProps {
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  searchQuery?: string;
}

/**
 * The entity hierarchy exactly as the installed `@0xintuition/classifications`
 * package defines it.
 *
 * Nothing here is hardcoded — categories, display names and counts all come from
 * the package, so bumping it and redeploying is the whole update process. The
 * root is the package's own `thing` classification when it defines one.
 */
export function PackageEntityHierarchy({
  selectedSlug,
  onSelect,
  searchQuery,
}: PackageEntityHierarchyProps) {
  const query = (searchQuery ?? '').trim().toLowerCase();

  const groups = useMemo(() => {
    const all = classificationsByCategory();
    if (!query) return all;

    return all
      .map((group) => ({
        ...group,
        classifications: group.classifications.filter(
          (spec) =>
            spec.displayName.toLowerCase().includes(query) ||
            spec.slug.includes(query) ||
            spec.type.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.classifications.length > 0);
  }, [query]);

  const total = useMemo(
    () => groups.reduce((sum, group) => sum + group.classifications.length, 0),
    [groups]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Hierarchy</h2>
        <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
          {total} {total === 1 ? 'type' : 'types'}
        </span>
      </div>
      <p className="mt-1 shrink-0 text-xs text-[var(--color-text-secondary)]">
        Generated from the installed packages.
      </p>

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        {groups.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No entity type matches “{searchQuery}”.
          </p>
        ) : (
          <ul className="space-y-4">
            {groups.map((group) => (
              <li key={group.category}>
                <p
                  className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: CATEGORY_COLORS[group.category] ?? '#94a3b8' }}
                >
                  {group.category}
                </p>
                <ul className="space-y-0.5">
                  {group.classifications.map((spec) => (
                    <EntityRow
                      key={spec.slug}
                      spec={spec}
                      color={CATEGORY_COLORS[group.category] ?? '#94a3b8'}
                      isSelected={spec.slug === selectedSlug}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProposeCallout
        className="mt-4 shrink-0"
        what="entity type"
        hint="Missing a type? Propose it on Mainnet and let stake decide."
      />
    </div>
  );
}

function EntityRow({
  spec,
  color,
  isSelected,
  onSelect,
}: {
  spec: CanonicalClassification;
  color: string;
  isSelected: boolean;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(isSelected ? null : spec.slug)}
        aria-pressed={isSelected}
        title={spec.description}
        className={`focus-ring flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors ${
          isSelected
            ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
        }`}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="flex-1 truncate">{spec.displayName}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-text-muted)]">
          {spec.fields.length}
        </span>
      </button>
    </li>
  );
}
