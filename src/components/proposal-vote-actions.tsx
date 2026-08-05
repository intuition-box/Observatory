import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { stakeOnTriple } from '../lib/intuition/protocol-write';
import { useIntuitionWriteConfig } from '../lib/intuition/use-intuition-write-config';
import { useIntuitionNetwork } from '../lib/wallet/intuition-network-context';

interface ProposalVoteActionsProps {
  tripleTermId: `0x${string}`;
}

/**
 * Agree or disagree with a proposal, at minimum stake.
 *
 * Disagreement is a first-class action, not the absence of agreement: it
 * deposits into the counter-triple, which is its own term with its own vault.
 * Without it a contested proposal is indistinguishable from an ignored one, and
 * the whole point of settling vocabulary by stake is that dissent is legible.
 *
 * The amount is the protocol minimum deliberately — this is a signal, not a
 * position size. The Portal link alongside is where real exposure belongs.
 */
export function ProposalVoteActions({ tripleTermId }: ProposalVoteActionsProps) {
  const writeConfig = useIntuitionWriteConfig();
  const { graphqlUrl } = useIntuitionNetwork();
  const queryClient = useQueryClient();

  const [pending, setPending] = useState<'for' | 'against' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(
    async (side: 'for' | 'against') => {
      if (!writeConfig || pending) return;
      setPending(side);
      setError(null);
      try {
        await stakeOnTriple(writeConfig, tripleTermId, side);
        await queryClient.invalidateQueries({
          queryKey: ['triple-backers', graphqlUrl, tripleTermId],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stake failed.');
      } finally {
        setPending(null);
      }
    },
    [writeConfig, pending, tripleTermId, queryClient, graphqlUrl]
  );

  const disabled = !writeConfig || pending !== null;
  const title = writeConfig ? undefined : 'Connect a wallet to stake';

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      <VoteButton
        onClick={() => void vote('for')}
        disabled={disabled}
        busy={pending === 'for'}
        title={title ?? 'Agree — stake on this proposal'}
        label="Agree"
        tone="for"
      />
      <VoteButton
        onClick={() => void vote('against')}
        disabled={disabled}
        busy={pending === 'against'}
        title={title ?? 'Disagree — stake on the counter-triple'}
        label="Disagree"
        tone="against"
      />
      {error && (
        <span
          className="max-w-[8rem] truncate text-[10px] text-red-400"
          role="alert"
          title={error}
        >
          {error}
        </span>
      )}
    </span>
  );
}

function VoteButton({
  onClick,
  disabled,
  busy,
  title,
  label,
  tone,
}: {
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  title: string;
  label: string;
  tone: 'for' | 'against';
}) {
  const hover =
    tone === 'for'
      ? 'hover:bg-emerald-500/15 hover:text-emerald-400'
      : 'hover:bg-red-500/15 hover:text-red-400';

  return (
    <button
      type="button"
      onClick={(event) => {
        // The row selects a predicate; voting must not also pick it.
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-busy={busy}
      className={`focus-ring inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${hover}`}
    >
      {busy ? <Spinner /> : tone === 'for' ? <ThumbUpIcon /> : <ThumbDownIcon />}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}
