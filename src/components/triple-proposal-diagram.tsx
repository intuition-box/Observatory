import { useMemo } from 'react';

import {
  getCanonicalClassification,
  relationshipsFor,
  type CanonicalPredicate,
} from '../lib/intuition/canonical';
import { ProposeCallout } from './propose-callout';

/** Semantic roles, kept consistent with the claim builder's colour language. */
const ENTITY = '#c9a227';
const OPEN = '#2563eb';

interface TripleProposalDiagramProps {
  /** Classification slug to illustrate. Falls back to `person`. */
  selectedSlug: string | null;
}

/**
 * What proposing actually does to the graph.
 *
 * A proposal never invents a free-form sentence — it fills a *hole* in a known
 * shape. There are only two holes worth arguing about, and they behave
 * differently:
 *
 *   Person — has type — ?     the object is open: what can be said about a type
 *   Person — ?  — Company     the predicate is open: how two types connect
 *
 * Candidates compete for the same hole, which is what makes the outcome
 * decidable: they share one slot, so stake on them is comparable rather than
 * scattered across unrelated claims.
 *
 * The relationship panel is real package data — the predicates shown genuinely
 * compete for that pair today. The describe panel's objects are illustrative,
 * because the object of a `has type` claim is user-supplied by definition.
 */
export function TripleProposalDiagram({ selectedSlug }: TripleProposalDiagramProps) {
  const slug = selectedSlug ?? 'person';
  const spec = getCanonicalClassification(slug) ?? getCanonicalClassification('person');

  const pair = useMemo(() => {
    if (!spec) return null;

    const byTarget = new Map<string, CanonicalPredicate[]>();
    for (const row of relationshipsFor(spec.slug)) {
      const target = row.expectedObjects.find((o) => o.kind === 'classification');
      if (!target || !row.record) continue;
      const bucket = byTarget.get(target.slug) ?? [];
      bucket.push(row.record);
      byTarget.set(target.slug, bucket);
    }

    // The most contested pair makes the best illustration — several predicates
    // arguing over one slot is exactly the situation this app exists to resolve.
    const best = [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!best) return null;

    return {
      targetSlug: best[0],
      targetLabel: getCanonicalClassification(best[0])?.displayName ?? best[0],
      candidates: best[1],
    };
  }, [spec]);

  if (!spec) return null;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          What proposing looks like
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          A proposal fills a hole in a known shape rather than inventing a sentence. Candidates
          compete for the same slot, so the stake on them is directly comparable — that is what
          makes the argument decidable.
        </p>
      </div>

      <div className="mt-5 flex justify-center">
        <Chip label={spec.displayName} color={ENTITY} size="lg" />
      </div>

      <div className="mt-5 space-y-4">
        <SlotPanel
          title="Describe one entity"
          subtitle="The object is open — anyone can propose what a Person can be."
          candidates={['Trustworthy', 'Helpful', 'Core contributor']}
          candidatesAreExamples
          triple={[
            { label: spec.displayName, color: ENTITY },
            { label: 'has type', color: 'fixed' },
            { label: '?', color: OPEN },
          ]}
        />

        {pair && (
          <SlotPanel
            title="Connect two entities"
            subtitle={`The predicate is open — these ${pair.candidates.length} currently compete for ${spec.displayName} → ${pair.targetLabel}.`}
            candidates={pair.candidates.map((c) => c.name)}
            triple={[
              { label: spec.displayName, color: ENTITY },
              { label: '?', color: OPEN },
              { label: pair.targetLabel, color: ENTITY },
            ]}
          />
        )}
      </div>

      <ProposeCallout
        className="mt-5"
        what="triple shape"
        to="/matrix"
        hint="Once proposed, the shape is minted as an atom, staked on, and open to counter-triples. Whatever reaches clear consensus is what gets adopted into the packages."
      />
    </section>
  );
}

interface TriplePart {
  label: string;
  color: string | 'fixed';
}

function SlotPanel({
  title,
  subtitle,
  candidates,
  candidatesAreExamples = false,
  triple,
}: {
  title: string;
  subtitle: string;
  candidates: string[];
  candidatesAreExamples?: boolean;
  triple: TriplePart[];
}) {
  return (
    <div
      className="rounded-lg border border-dashed p-4"
      style={{ borderColor: `${ENTITY}66`, backgroundColor: `${ENTITY}0d` }}
    >
      <div className="mb-3">
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>

      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex shrink-0 items-stretch gap-0">
          <ul className="flex flex-col gap-1.5">
            {candidates.map((candidate) => (
              <li key={candidate}>
                <Chip label={candidate} color={OPEN} />
              </li>
            ))}
            <li>
              <span
                className="inline-flex items-center rounded-full border border-dashed px-3 py-1.5 text-xs"
                style={{ borderColor: `${OPEN}80`, color: 'var(--color-text-muted)' }}
              >
                + yours
              </span>
            </li>
          </ul>

          {/* Bracket: many candidates converge on one slot. */}
          <div
            className="my-3 ml-2 hidden w-3 rounded-l border-b-2 border-l-2 border-t-2 md:block"
            style={{ borderColor: 'var(--color-border)' }}
            aria-hidden
          />
          <span
            className="hidden self-center text-lg text-[var(--color-text-muted)] md:inline"
            aria-hidden
          >
            →
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[var(--color-surface-raised)] px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {triple.map((part, index) => (
              <Chip
                key={`${part.label}-${index}`}
                label={part.label}
                color={part.color === 'fixed' ? undefined : part.color}
              />
            ))}
          </div>
        </div>
      </div>

      {candidatesAreExamples && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          Objects shown are illustrative — a <code>has type</code> object is whatever the
          proposer supplies.
        </p>
      )}
    </div>
  );
}

function Chip({
  label,
  color,
  size = 'md',
}: {
  label: string;
  color?: string;
  size?: 'md' | 'lg';
}) {
  const sizeClasses = size === 'lg' ? 'px-5 py-2 text-sm' : 'px-3 py-1.5 text-xs';

  if (!color) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-text-secondary)] ${sizeClasses}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white ${sizeClasses}`}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
