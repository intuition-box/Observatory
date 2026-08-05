import { useMemo } from 'react';

import {
  getCanonicalClassification,
  recommendedPredicatesFor,
  relationshipsFor,
  type ExpectedObjectShape,
} from '../lib/intuition/canonical';
import { ProposeCallout } from './propose-callout';
import { RegistryBadge } from './registry-badge';

interface PackageEntityRelationshipProps {
  selectedSlug: string | null;
}

function describeExpected(shape: ExpectedObjectShape): string {
  switch (shape.kind) {
    case 'classification':
      return getCanonicalClassification(shape.slug)?.displayName ?? shape.slug;
    case 'schema':
      return `${shape.type} (schema.org)`;
    case 'primitive':
      return shape.valueType;
    case 'same-classification':
      return 'same type';
    case 'any':
      return 'any';
  }
}

/**
 * Which predicates connect this entity type to which others.
 *
 * Two sources, in order of specificity. The package's metadata-predicate matrix
 * types the object side — "a movie's `director` is a person" — but it only
 * covers a handful of classifications so far. Where it has nothing, the
 * classification's own `metadataPredicates` still names the verbs, just without
 * typed objects. Distinguishing the two matters: an untyped row is a gap in the
 * standard, which is exactly the kind of thing worth proposing a fix for.
 */
export function PackageEntityRelationship({ selectedSlug }: PackageEntityRelationshipProps) {
  const spec = selectedSlug ? getCanonicalClassification(selectedSlug) : undefined;

  const typed = useMemo(
    () => (selectedSlug ? relationshipsFor(selectedSlug) : []),
    [selectedSlug]
  );

  const untyped = useMemo(() => {
    if (!selectedSlug) return [];
    const typedKeys = new Set(typed.map((row) => row.predicate));
    return recommendedPredicatesFor(selectedSlug).filter(
      (predicate) => !typedKeys.has(predicate.key)
    );
  }, [selectedSlug, typed]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="shrink-0">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Entity Relationship</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {spec
            ? `How ${spec.displayName} connects to other types`
            : 'Select a type to see its relationships'}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        {!spec ? (
          <p className="text-sm text-[var(--color-text-muted)]">No type selected.</p>
        ) : typed.length === 0 && untyped.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            The packages define no relationships for {spec.displayName} yet.
          </p>
        ) : (
          <div className="space-y-4">
            {typed.length > 0 && (
              <section className="space-y-1.5">
                {typed.map((row) => (
                  <div
                    key={row.predicate}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1.5"
                  >
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <code className="text-xs font-medium text-[var(--color-text)]">
                        {row.record?.name ?? row.predicate}
                      </code>
                      {row.record && <RegistryBadge provenance={row.record.status} />}
                      {row.priority && (
                        <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                          {row.priority}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                      → {row.expectedObjects.map(describeExpected).join(', ')}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {untyped.length > 0 && (
              <section>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Recommended, object type not yet specified
                </p>
                <div className="flex flex-wrap gap-1">
                  {untyped.map((predicate) => (
                    <span
                      key={predicate.key}
                      title={predicate.description}
                      className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
                    >
                      {predicate.name}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <ProposeCallout
        className="mt-4 shrink-0"
        what="relationship"
        to="/matrix"
        hint="A pairing the standard does not cover yet? Propose which predicate belongs between two types."
      />
    </div>
  );
}
