import { useMemo } from 'react';
import { ATOM_TYPES, ATOM_CATEGORIES } from '../data/atom-types';
import { getAtomColor } from '../lib/atom-colors';
import { useLiveTriples } from '../intuition/hooks/use-live-triples';
import type { JoinedTripleRecord } from '../intuition/services/graphql.service';

export interface RecentLiveClaimsCardProps {
  /** When set, the matching subject/object row is rendered with an
   *  accent border so the card mirrors a graph-side selection. */
  selectedAtomId?: string | null;
  /** Click handlers — each segment of a row (subject / object) calls
   *  this with its atom term_id so the parent can drive a sibling
   *  graph (or any other surface) into a focused state. */
  onSelectAtom?: (atomId: string | null) => void;
}

/**
 * Sidebar card listing the most recent on-chain claims with their
 * resolved atom labels — the textual companion to the
 * `LiveInstanceGraph`. Side-by-side on the Explorer page so the user
 * can scan the latest triples without navigating away.
 *
 * Each row is two clickable atom labels joined by the predicate label;
 * tapping a label drives the connected graph's selection so the user
 * can pivot fluently between the textual feed and the visual layout.
 */
export function RecentLiveClaimsCard({
  selectedAtomId = null,
  onSelectAtom,
}: RecentLiveClaimsCardProps = {}) {
  const liveTriplesQuery = useLiveTriples({ limit: 5000 });
  const claims = useMemo(() => {
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

  const definedTermColor = ATOM_CATEGORIES.abstract.color;

  const handleSelect = (atomId: string): void => {
    if (onSelectAtom === undefined) return;
    onSelectAtom(selectedAtomId === atomId ? null : atomId);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] h-[940px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Recent claims
          </h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {liveTriplesQuery.isLoading ? (
          <p className="text-xs text-[var(--color-text-muted)]">Loading…</p>
        ) : claims.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            No claims indexed yet — publish one to populate this list.
          </p>
        ) : (
          <ul className="space-y-1">
            {claims.map((claim) => {
              const subjectColor = liveAtomColor(claim.subject.type);
              const objectColor = liveAtomColor(claim.object.type);
              const isSubjectSelected = selectedAtomId === claim.subject.term_id;
              const isObjectSelected = selectedAtomId === claim.object.term_id;
              const isHighlighted = isSubjectSelected || isObjectSelected;
              return (
                <li
                  key={claim.term_id}
                  className={`flex items-center gap-1.5 font-mono text-[11px] rounded px-1.5 py-0.5 transition-colors ${
                    isHighlighted ? 'bg-[var(--color-accent)]/10' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(claim.subject.term_id)}
                    style={{ color: subjectColor }}
                    className={`focus-ring truncate max-w-[110px] rounded transition-opacity hover:opacity-80 ${
                      isSubjectSelected ? 'underline underline-offset-2' : ''
                    }`}
                    title={`Focus ${claim.subject.label || '(unlabeled)'} in the graph`}
                  >
                    {claim.subject.label || '(unlabeled)'}
                  </button>
                  <span className="text-[var(--color-text-muted)] shrink-0">—</span>
                  <span
                    style={{ color: definedTermColor }}
                    className="truncate max-w-[110px]"
                  >
                    {claim.predicate.label || '(unlabeled)'}
                  </span>
                  <span className="text-[var(--color-text-muted)] shrink-0">—</span>
                  <button
                    type="button"
                    onClick={() => handleSelect(claim.object.term_id)}
                    style={{ color: objectColor }}
                    className={`focus-ring truncate max-w-[110px] rounded transition-opacity hover:opacity-80 ${
                      isObjectSelected ? 'underline underline-offset-2' : ''
                    }`}
                    title={`Focus ${claim.object.label || '(unlabeled)'} in the graph`}
                  >
                    {claim.object.label || '(unlabeled)'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function liveAtomColor(type: string): string {
  if (ATOM_TYPES.some((t) => t.id === type)) {
    return getAtomColor(type);
  }
  return 'var(--color-text-secondary)';
}

