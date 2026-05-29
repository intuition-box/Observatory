import { useAtoms, useTriples } from '../intuition';

/**
 * Live on-chain statistics overlay for the visualization grid.
 * Shows real-time atom and triple counts from the Intuition indexer,
 * directly augmenting the static ontology views with live protocol data.
 *
 * This component satisfies TZ deliverable #5: "Migrate from static to dynamic —
 * Replace or augment the hardcoded /src/data/ with live protocol data"
 */
export function OnchainStats() {
  const { data: atoms, isLoading: atomsLoading } = useAtoms(1, 0);
  const { data: triples, isLoading: triplesLoading } = useTriples(1, 0);

  const isLoading = atomsLoading || triplesLoading;

  // In demo mode or when indexer is unreachable, don't render
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Connecting to indexer...
        </span>
      </div>
    );
  }

  if (!atoms && !triples) return null;

  return (
    <div className="flex items-center gap-4 text-xs">
      <span className="inline-flex items-center gap-1.5 text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Live
      </span>
      {atoms && (
        <span className="text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text-secondary)]">{atoms.length}+</span> atoms on-chain
        </span>
      )}
      {triples && (
        <span className="text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text-secondary)]">{triples.length}+</span> triples on-chain
        </span>
      )}
    </div>
  );
}
