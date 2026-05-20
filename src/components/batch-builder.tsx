import { useState, useCallback } from 'react';
import { getAtomColor } from '../lib/atom-colors';
import { conjugateForSelf, isSelfSubject } from '../lib/conjugate';
import { downloadClaimsAsJson, generateShareableUrl, copyToClipboard, claimsToJsonLd } from '../lib/claim-export';
import { useClaimWorkspace } from '../lib/use-claim-workspace';
import { COPY_FEEDBACK_MS } from '../lib/timings';
import type { ClaimEntry } from '../types';
import { useSubmitBatch, type BatchSubmissionState } from '../intuition/hooks/use-submit-batch';

interface BatchBuilderProps {
  searchQuery?: string;
  /** Forwarded from the page so each per-result 'See on graph' button
   *  in the post-publish summary can drive the live graph's selection
   *  to the matching subject atom. */
  onFocusOnGraph?: (atomId: string) => void;
}

export function BatchBuilder({ searchQuery, onFocusOnGraph }: BatchBuilderProps) {
  const { batch, setBatch } = useClaimWorkspace();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);
  // Snapshot the batch entries at submit time so we can render the
  // post-publish summary with the original labels even if the user
  // edits the live batch list afterwards.
  const [submittedSnapshot, setSubmittedSnapshot] = useState<ClaimEntry[]>([]);

  const onchainBatch = useSubmitBatch();
  const isPublishing =
    onchainBatch.state.status === 'preparing' ||
    onchainBatch.state.status === 'creating-atoms' ||
    onchainBatch.state.status === 'creating-triple';

  const handleRemove = useCallback((id: string) => {
    setBatch((prev) => prev.filter((c) => c.id !== id));
  }, [setBatch]);

  const handleClear = useCallback(() => {
    // Wipe the staging batch AND the post-publish confirmation card —
    // once the user empties the list, the prior confirmation no longer
    // refers to anything visible and would otherwise display stale
    // labels next to a fresh batch the user is about to compose.
    setBatch([]);
    setSubmittedSnapshot([]);
    onchainBatch.reset();
  }, [setBatch, onchainBatch]);

  const handleDownload = useCallback(() => {
    downloadClaimsAsJson(batch);
  }, [batch]);

  const handleCopyJsonLd = useCallback(async () => {
    const jsonLd = claimsToJsonLd(batch);
    const ok = await copyToClipboard(JSON.stringify(jsonLd, null, 2));
    if (ok) {
      setCopiedFeedback('json');
      setTimeout(() => setCopiedFeedback(null), COPY_FEEDBACK_MS);
    }
  }, [batch]);

  const handleCopyShareUrl = useCallback(async () => {
    const url = generateShareableUrl(batch);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedFeedback('url');
      setTimeout(() => setCopiedFeedback(null), COPY_FEEDBACK_MS);
    }
  }, [batch]);

  const handlePublishBatchOnchain = useCallback(() => {
    if (batch.length === 0) return;
    setSubmittedSnapshot(batch);
    void onchainBatch.submit(
      batch.map((c) => ({
        subject: c.subject,
        subjectType: c.subjectType,
        predicateLabel: c.predicateLabel,
        object: c.object,
        objectType: c.objectType,
      }))
    );
  }, [batch, onchainBatch]);

  if (batch.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="focus-ring flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <BatchIcon />
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Batch
          </span>
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded-full">
            {batch.length}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <polyline points="2 4 6 7 10 4" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          <div className="max-h-48 overflow-y-auto">
            {batch.map((entry, i) => {
              const sq = (searchQuery ?? '').trim().toLowerCase();
              const matches = !sq ||
                entry.subject.toLowerCase().includes(sq) ||
                entry.predicateLabel.toLowerCase().includes(sq) ||
                entry.object.toLowerCase().includes(sq);
              return (
                <BatchRow
                  key={entry.id}
                  index={i + 1}
                  entry={entry}
                  onRemove={() => handleRemove(entry.id)}
                  dimmed={sq ? !matches : false}
                />
              );
            })}
          </div>

          {/* Export actions */}
          <div className="border-t border-[var(--color-border)] px-4 py-2.5 flex flex-wrap items-center gap-2">
            <button
              onClick={handlePublishBatchOnchain}
              disabled={!onchainBatch.isReady || isPublishing}
              title={
                !onchainBatch.isReady
                  ? 'Connect your wallet to publish onchain'
                  : `Publish ${batch.length} claim${batch.length > 1 ? 's' : ''} in 2 transactions`
              }
              className="focus-ring rounded-md px-2.5 py-1.5 text-xs font-medium border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--color-accent)] transition-colors"
            >
              {isPublishing ? 'Publishing…' : `Publish all onchain (${batch.length})`}
            </button>
            <button
              onClick={handleDownload}
              className="focus-ring rounded-md px-2.5 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Download JSON-LD
            </button>
            <button
              onClick={handleCopyJsonLd}
              className="focus-ring rounded-md px-2.5 py-1.5 text-xs font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              {copiedFeedback === 'json' ? 'Copied!' : 'Copy JSON-LD'}
            </button>
            <button
              onClick={handleCopyShareUrl}
              className="focus-ring rounded-md px-2.5 py-1.5 text-xs font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              {copiedFeedback === 'url' ? 'Copied!' : 'Share URL'}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleClear}
              className="focus-ring rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Clear batch
            </button>
          </div>

          <BatchSubmissionStatus
            state={onchainBatch.state}
            onReset={() => {
              // Wipe both the submission state machine AND the staging
              // batch + draft snapshot so a follow-up batch starts from
              // a clean slate. Without this, the just-published entries
              // would still sit in the list and the next add-to-batch
              // would mix them with new drafts. (For the error case the
              // entries are kept so the user can retry.)
              const wasConfirmed = onchainBatch.state.status === 'confirmed';
              onchainBatch.reset();
              if (wasConfirmed) {
                setBatch([]);
                setSubmittedSnapshot([]);
              }
            }}
            submittedDrafts={submittedSnapshot}
            onFocusOnGraph={onFocusOnGraph}
          />
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<BatchSubmissionState['status'], string> = {
  idle: '',
  preparing: 'Pinning atoms and resolving predicates…',
  'creating-atoms': 'Creating atoms onchain…',
  'creating-triple': 'Creating triples onchain…',
  confirmed: 'Batch published onchain',
  error: 'Batch submission failed',
};

const EXPLORER_BY_CHAIN: Record<number, string> = {
  1155: 'https://explorer.intuition.systems',
  13579: 'https://testnet.explorer.intuition.systems',
};

function BatchSubmissionStatus({
  state,
  onReset,
  submittedDrafts,
  onFocusOnGraph,
}: {
  state: BatchSubmissionState;
  onReset: () => void;
  submittedDrafts: ClaimEntry[];
  onFocusOnGraph?: (atomId: string) => void;
}) {
  if (state.status === 'idle') return null;

  const explorerBase = (() => {
    const id = Number(import.meta.env.VITE_CHAIN_ID);
    return Number.isFinite(id) ? EXPLORER_BY_CHAIN[id] : undefined;
  })();

  return (
    <div
      role="status"
      className={`mx-3 mb-3 rounded-md border px-3 py-2 text-xs ${
        state.status === 'error'
          ? 'border-red-400/40 bg-red-400/5 text-red-300'
          : state.status === 'confirmed'
            ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-300'
            : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">
          {state.status === 'confirmed' &&
          state.tripleTxHash === undefined &&
          state.results.length > 0
            ? 'All claims were already onchain'
            : STATUS_LABELS[state.status]}
          {state.status === 'confirmed' &&
            state.tripleTxHash !== undefined &&
            state.results.some((r) => r.tripleTxHash === undefined) && (
              <span className="ml-1 text-[var(--color-text-muted)]">
                (some were already onchain)
              </span>
            )}
          {state.status === 'creating-atoms' && state.atomCount > 0 ? (
            <span className="ml-1 text-[var(--color-text-muted)]">
              ({state.atomCount} atom{state.atomCount > 1 ? 's' : ''})
            </span>
          ) : null}
        </span>
        {(state.status === 'confirmed' || state.status === 'error') && (
          <button
            onClick={onReset}
            className="focus-ring text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {state.status === 'confirmed' && (
        <>
          <div className="mt-1.5 space-y-0.5 font-mono text-[11px]">
            {state.atomTxHash !== undefined && explorerBase !== undefined && (
              <a
                href={`${explorerBase}/tx/${state.atomTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                Atoms tx ↗ {truncateHash(state.atomTxHash)}
              </a>
            )}
            {state.tripleTxHash !== undefined && explorerBase !== undefined && (
              <a
                href={`${explorerBase}/tx/${state.tripleTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                Triples tx ↗ {truncateHash(state.tripleTxHash)} ({state.results.length} claim{state.results.length > 1 ? 's' : ''})
              </a>
            )}
          </div>
          {state.results.length > 0 && (
            <ul className="mt-2 space-y-1">
              {state.results.map((result, i) => {
                const draft = submittedDrafts[i];
                if (draft === undefined) return null;
                const subjectColor = getAtomColor(draft.subjectType);
                const objectColor = getAtomColor(draft.objectType);
                const wasAlreadyOnchain = result.tripleTxHash === undefined;
                return (
                  <li
                    key={result.tripleId}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-[var(--color-surface-hover)]/40 transition-colors"
                  >
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] w-4 shrink-0 text-right">
                      {i + 1}.
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 font-mono text-[11px]">
                      <span className="truncate" style={{ color: subjectColor }}>
                        {draft.subject}
                      </span>
                      <span className="text-[var(--color-text-muted)] shrink-0">—</span>
                      <span className="text-[var(--color-accent)] shrink-0">
                        {draft.predicateLabel}
                      </span>
                      <span className="text-[var(--color-text-muted)] shrink-0">—</span>
                      <span className="truncate" style={{ color: objectColor }}>
                        {draft.object}
                      </span>
                    </div>
                    {wasAlreadyOnchain && (
                      <span
                        className="shrink-0 rounded-md border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                        title="This triple was already published — no new transaction was needed"
                      >
                        already onchain
                      </span>
                    )}
                    {onFocusOnGraph !== undefined && (
                      <button
                        type="button"
                        onClick={() => onFocusOnGraph(result.subjectAtomId)}
                        className="focus-ring shrink-0 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                        title={`Focus ${draft.subject} in the live graph`}
                      >
                        See on graph ↓
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {state.status === 'error' && (
        <p className="mt-1.5 break-words text-[11px] text-red-300/80">
          {state.error.message}
        </p>
      )}
    </div>
  );
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function BatchRow({
  index,
  entry,
  onRemove,
  dimmed = false,
}: {
  index: number;
  entry: ClaimEntry;
  onRemove: () => void;
  dimmed?: boolean;
}) {
  const subjectColor = getAtomColor(entry.subjectType);
  const objectColor = getAtomColor(entry.objectType);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 hover:bg-[var(--color-surface-hover)] transition-all group ${dimmed ? 'opacity-30' : ''}`}>
      <span className="text-[10px] text-[var(--color-text-muted)] font-mono w-5 shrink-0 text-right">
        {index}.
      </span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 font-mono text-xs">
        <span className="truncate" style={{ color: subjectColor }}>
          {isSelfSubject(entry.subjectType) ? 'I' : entry.subject}
        </span>
        <span className="text-[var(--color-text-muted)] shrink-0">—</span>
        <span className="text-[var(--color-accent)] shrink-0">
          {isSelfSubject(entry.subjectType)
            ? conjugateForSelf(entry.predicateId, entry.predicateLabel)
            : entry.predicateLabel}
        </span>
        <span className="text-[var(--color-text-muted)] shrink-0">—</span>
        <span className="truncate" style={{ color: objectColor }}>{entry.object}</span>
      </div>
      <button
        onClick={onRemove}
        className="focus-ring rounded p-0.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
        aria-label={`Remove claim ${index}`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>
    </div>
  );
}

function BatchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}
