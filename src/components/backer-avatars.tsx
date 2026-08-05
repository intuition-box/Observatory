import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { formatTrust } from '../lib/format-trust';
import type { Backer } from '../lib/intuition/triple-backers';
import { useTripleBackers } from '../lib/intuition/use-triple-backers';
import type { TermId } from '../lib/intuition/canonical';

const MAX_VISIBLE = 4;

/**
 * Deterministic colour for an account with no avatar.
 *
 * Derived from the address so the same account is always the same colour —
 * across sessions and across proposals — which makes a repeat backer
 * recognisable at a glance even before reading the label.
 */
function colorFor(accountId: string): string {
  let hash = 0;
  for (let i = 0; i < accountId.length; i += 1) {
    hash = (hash * 31 + accountId.charCodeAt(i)) % 360;
  }
  return `hsl(${hash} 55% 45%)`;
}

function initialsFor(backer: Backer): string {
  const label = backer.label.replace(/^0x/i, '');
  return label.slice(0, 2).toUpperCase();
}

interface BackerAvatarsProps {
  tripleTermId: TermId | null | undefined;
  /** Compact mode hides the count label, for dense lists. */
  compact?: boolean;
}

/**
 * Who is backing a proposal, at a glance and in full.
 *
 * The stack answers "is anyone behind this?" without a click; hovering or
 * focusing opens the complete for/against breakdown. Both matter: scanning a
 * matrix cell should be instant, but the contested proposals are exactly the
 * ones worth reading carefully.
 */
export function BackerAvatars({ tripleTermId, compact = false }: BackerAvatarsProps) {
  const { backers, isLoading, error } = useTripleBackers(tripleTermId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, close]);

  if (isLoading) {
    return <span className="text-[10px] text-[var(--color-text-muted)]">loading…</span>;
  }
  if (error || !backers) return null;

  const total = backers.for.length + backers.against.length;
  if (total === 0) {
    return (
      <span className="text-[10px] text-[var(--color-text-muted)]" title="Nobody has staked yet">
        no backers
      </span>
    );
  }

  // Agreement first — the stack reads as "who is behind this", with dissent
  // shown by ring colour rather than by hiding it.
  const ordered = [...backers.for, ...backers.against];
  const visible = ordered.slice(0, MAX_VISIBLE);
  const overflow = ordered.length - visible.length;
  const againstIds = new Set(backers.against.map((b) => b.accountId));

  return (
    <div
      ref={rootRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${backers.for.length} backing, ${backers.against.length} against`}
        className="focus-ring flex items-center gap-1.5 rounded-full py-0.5"
      >
        <span className="flex items-center">
          {visible.map((backer, index) => (
            <Avatar
              key={backer.accountId}
              backer={backer}
              isAgainst={againstIds.has(backer.accountId)}
              className={index === 0 ? '' : '-ml-2'}
            />
          ))}
          {overflow > 0 && (
            <span
              className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-raised)] text-[9px] font-semibold tabular-nums text-[var(--color-text-secondary)]"
              aria-hidden
            >
              +{overflow}
            </span>
          )}
        </span>

        {!compact && (
          <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
            {backers.for.length}
            {backers.against.length > 0 && (
              <span className="text-red-400"> · {backers.against.length} against</span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Backers"
          className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-xl"
        >
          <div className="max-h-64 overflow-y-auto p-2">
            <BackerList
              title="Agrees"
              tone="for"
              backers={backers.for}
              total={backers.totalFor}
            />
            {backers.against.length > 0 && (
              <BackerList
                title="Disagrees"
                tone="against"
                backers={backers.against}
                total={backers.totalAgainst}
                className="mt-3"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BackerList({
  title,
  tone,
  backers,
  total,
  className = '',
}: {
  title: string;
  tone: 'for' | 'against';
  backers: Backer[];
  total: bigint;
  className?: string;
}) {
  const toneColor = tone === 'for' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${toneColor}`}>
          {title} · {backers.length}
        </p>
        <p className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
          {formatTrust(total)} TRUST
        </p>
      </div>

      {backers.length === 0 ? (
        <p className="px-1 text-[11px] text-[var(--color-text-muted)]">Nobody yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {backers.map((backer) => (
            <li
              key={backer.accountId}
              className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[var(--color-surface-hover)]"
            >
              <Avatar backer={backer} isAgainst={tone === 'against'} />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--color-text)]">
                {backer.label}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-text-muted)]">
                {formatTrust(backer.shares)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Avatar({
  backer,
  isAgainst,
  className = '',
}: {
  backer: Backer;
  isAgainst: boolean;
  className?: string;
}) {
  const ring = isAgainst ? 'ring-1 ring-red-400/70' : '';

  if (backer.image) {
    return (
      <img
        src={backer.image}
        alt=""
        title={backer.label}
        loading="lazy"
        className={`h-6 w-6 shrink-0 rounded-full border-2 border-[var(--color-surface)] object-cover ${ring} ${className}`}
      />
    );
  }

  return (
    <span
      title={backer.label}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-surface)] text-[8px] font-bold text-white ${ring} ${className}`}
      style={{ backgroundColor: colorFor(backer.accountId) }}
      aria-hidden
    >
      {initialsFor(backer)}
    </span>
  );
}
