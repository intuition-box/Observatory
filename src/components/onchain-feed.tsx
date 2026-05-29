import { useState } from 'react';
import { useTriples } from '../intuition';
import type { IntuitionTriple } from '../intuition';

/**
 * Live Ontology Feed — displays real-time onchain triples from the Intuition indexer.
 * This component replaces static data with live protocol data.
 */
export function OnchainFeed() {
  const { data: triples, isLoading, error } = useTriples(30);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">
            Live Onchain Feed
          </h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 items-center">
              <div className="h-8 w-24 bg-[var(--color-surface-raised)] rounded-md" />
              <div className="h-4 w-16 bg-[var(--color-surface-raised)] rounded" />
              <div className="h-8 w-24 bg-[var(--color-surface-raised)] rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-amber-400 text-sm font-medium">⚠ Indexer Unavailable</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Could not connect to the Intuition indexer. Showing local data only.
        </p>
      </div>
    );
  }

  if (!triples?.length) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">
            Live Onchain Feed
          </h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">No onchain triples found yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">
            Live Onchain Feed
          </h3>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {triples.length} triples
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {triples.map((triple) => (
          <TripleRow
            key={triple.id}
            triple={triple}
            isExpanded={expandedId === triple.id}
            onToggle={() => setExpandedId(expandedId === triple.id ? null : triple.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TripleRow({
  triple,
  isExpanded,
  onToggle,
}: {
  triple: IntuitionTriple;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium text-xs truncate max-w-[120px]">
          {triple.subject.label || `Atom #${triple.subject.id}`}
        </span>
        <span className="text-[var(--color-text-muted)] text-xs shrink-0">
          {triple.predicate.label || `→`}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium text-xs truncate max-w-[120px]">
          {triple.object.label || `Atom #${triple.object.id}`}
        </span>
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          #{triple.id}
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-2 border-t border-[var(--color-border)] mt-1 pt-2 text-xs text-[var(--color-text-muted)] space-y-1">
          <div>
            <span className="text-[var(--color-text-muted)]">Creator: </span>
            <span className="font-mono">{triple.creator.slice(0, 8)}...{triple.creator.slice(-6)}</span>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Tx: </span>
            <span className="font-mono">{triple.transactionHash.slice(0, 10)}...</span>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Block: </span>
            <span>{triple.blockNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
}
