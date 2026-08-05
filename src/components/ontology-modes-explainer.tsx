import { useIntuitionNetwork } from '../lib/wallet/intuition-network-context';
import {
  INTUITION_PACKAGES_REPO,
  ONTOLOGY_MODES,
  type OntologyMode,
} from '../lib/wallet/ontology-modes';

/**
 * How the three modes relate.
 *
 * They are stages of one pipeline, not interchangeable data sources, and the
 * distinction is load-bearing: the same action costs nothing on Testnet, costs
 * real TRUST on Mainnet, and is not possible at all in Standard. Showing the
 * progression up front is cheaper than letting people discover it by spending.
 */
export function OntologyModesExplainer() {
  const { network, setNetwork } = useIntuitionNetwork();

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            How an idea becomes part of the standard
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Ontology is where the shared vocabulary gets decided. A proposal is tried out, argued
            over with real stake, and — if it reaches clear consensus — adopted into the Intuition
            packages that every other app builds on.
          </p>
        </div>

        <a
          href={INTUITION_PACKAGES_REPO}
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
          <GithubIcon />
          0xIntuition/packages ↗
        </a>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {ONTOLOGY_MODES.map((mode, index) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            isActive={mode.id === network}
            isLast={index === ONTOLOGY_MODES.length - 1}
            onSelect={() => setNetwork(mode.id)}
          />
        ))}
      </ol>
    </section>
  );
}

function ModeCard({
  mode,
  isActive,
  isLast,
  onSelect,
}: {
  mode: OntologyMode;
  isActive: boolean;
  isLast: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
        className={`focus-ring h-full w-full rounded-lg border px-3 py-3 text-left transition-colors ${
          isActive
            ? 'border-[var(--color-accent)]/50 bg-[var(--color-surface-raised)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-raised)]/40 hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black"
            style={{ backgroundColor: mode.color }}
            aria-hidden
          >
            {mode.step}
          </span>
          <span className="text-sm font-semibold text-[var(--color-text)]">{mode.label}</span>
          {isActive && (
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              current
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs font-medium text-[var(--color-text)]">{mode.summary}</p>
        <p className="mt-1 text-xs leading-snug text-[var(--color-text-secondary)]">
          {mode.detail}
        </p>
      </button>

      {!isLast && (
        <span
          className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 text-[var(--color-text-muted)] md:block"
          aria-hidden
        >
          →
        </span>
      )}
    </li>
  );
}

function GithubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}
