import { useIntuitionNetwork } from '../lib/wallet/intuition-network-context';

interface PortalTripleLinkProps {
  termId: string;
  /** Show a text label alongside the icon. */
  withLabel?: boolean;
  className?: string;
}

/**
 * Open a triple in the Intuition Portal.
 *
 * This app shows a proposal in ontology terms — which predicate fills which
 * slot. The Portal is the canonical place to see the term itself: full position
 * history, share price, deposits and redemptions. Rather than reimplement that,
 * link out to it, on whichever network the user is currently reading.
 *
 * Renders nothing in Standard mode: package data has no on-chain term to open.
 */
export function PortalTripleLink({
  termId,
  withLabel = false,
  className = '',
}: PortalTripleLinkProps) {
  const { portalTripleUrl, networkLabel } = useIntuitionNetwork();
  const href = portalTripleUrl(termId);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      // The row is a predicate picker; opening the Portal must not also select.
      onClick={(event) => event.stopPropagation()}
      title={`Open this triple in the Intuition Portal (${networkLabel})`}
      aria-label={`Open this triple in the Intuition Portal (${networkLabel})`}
      className={`focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] ${className}`}
    >
      <ExternalLinkIcon />
      {withLabel && <span>Portal</span>}
    </a>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
