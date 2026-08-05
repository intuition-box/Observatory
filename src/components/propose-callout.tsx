import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useIntuitionNetwork } from '../lib/wallet/intuition-network-context';

interface ProposeCalloutProps {
  /** What is being proposed, e.g. "entity type" or "predicate". */
  what: string;
  hint: string;
  className?: string;
  /** Where to send the user once they are on a live network. */
  to?: string;
}

/**
 * Invitation to extend the standard from wherever the gap was noticed.
 *
 * Standard mode is read-only by definition — it shows what has already been
 * adopted — so proposing anything means moving to Mainnet first. Rather than
 * dead-ending, this switches the user there and takes them to the right place.
 */
export function ProposeCallout({ what, hint, className = '', to = '/' }: ProposeCalloutProps) {
  const { network, setNetwork } = useIntuitionNetwork();
  const navigate = useNavigate();

  const isLive = network !== 'static';

  const handleClick = useCallback(() => {
    if (!isLive) setNetwork('mainnet');
    navigate(to);
  }, [isLive, setNetwork, navigate, to]);

  return (
    <div
      className={`rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)]/50 px-3 py-2.5 ${className}`}
    >
      <p className="text-xs leading-snug text-[var(--color-text-secondary)]">{hint}</p>
      <button
        type="button"
        onClick={handleClick}
        className="focus-ring mt-2 inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-black transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        <PlusIcon />
        Propose a new {what}
        {!isLive && <span className="opacity-70">· switches to Mainnet</span>}
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
