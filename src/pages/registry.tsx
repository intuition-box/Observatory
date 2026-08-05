import { useCallback, useMemo, useState } from 'react';

import { PredicateRegistryBadge, RegistryBadge } from '../components/registry-badge';
import { PREDICATES } from '../data/predicates';
import { formatTrust } from '../lib/format-trust';
import { useIntuitionWriteConfig } from '../lib/intuition/use-intuition-write-config';
import { proposeToRegistry } from '../lib/intuition/registry-candidacy';
import { useRegistryCandidates } from '../lib/intuition/use-registry-candidates';
import {
  candidatePredicateIds,
  reconciliationSummary,
  resolveCanonicalPredicate,
} from '../lib/intuition/predicate-registry-map';
import { classificationSummary } from '../lib/intuition/classification-map';
import { useIntuitionNetwork } from '../lib/wallet/intuition-network-context';

export function RegistryPage() {
  const { isStaticNetwork, networkLabel } = useIntuitionNetwork();
  const writeConfig = useIntuitionWriteConfig();
  const { candidates, isLoading, error, refresh } = useRegistryCandidates();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const predicateSummary = useMemo(() => reconciliationSummary(), []);
  const typeSummary = useMemo(() => classificationSummary(), []);
  const unmapped = useMemo(() => candidatePredicateIds(), []);

  const proposedAtomIds = useMemo(
    () => new Set(candidates.map((c) => c.candidateAtomId.toLowerCase())),
    [candidates]
  );

  const handlePropose = useCallback(
    async (appPredicateId: string) => {
      if (!writeConfig) return;
      setBusyId(appPredicateId);
      setSubmitError(null);
      setProgress(null);
      try {
        await proposeToRegistry(writeConfig, appPredicateId, setProgress);
        refresh();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Proposal failed.');
      } finally {
        setBusyId(null);
        setProgress(null);
      }
    },
    [writeConfig, refresh]
  );

  return (
    <main className="px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Standard
        </p>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Predicate registry</h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Some vocabulary decisions have no principled answer, and no team can make them alone.
          This page is where they get settled by stake instead of by fiat. A predicate is proposed
          as{' '}
          <code className="rounded bg-[var(--color-surface-raised)] px-1 text-xs">
            candidate — listed in → predicate registry
          </code>
          , and conviction ranks the result.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          title="Predicates reconciled"
          value={`${predicateSummary.direct + predicateSummary.inverse} / ${predicateSummary.total}`}
          detail={`${predicateSummary.direct} direct · ${predicateSummary.inverse} direction-flipped · ${predicateSummary.candidates} candidates`}
        />
        <SummaryCard
          title="Entity types reconciled"
          value={`${typeSummary.direct + typeSummary.renamed} / ${typeSummary.total}`}
          detail={`${typeSummary.direct} direct · ${typeSummary.renamed} renamed upstream · ${typeSummary.appLocal} app-local`}
        />
      </section>

      {isStaticNetwork ? (
        <Notice>
          Showing static example data. Switch to Intuition mainnet or testnet to see live registry
          candidacy and to propose predicates.
        </Notice>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Live candidacy on {networkLabel}
              </h2>
              <button
                onClick={refresh}
                className="focus-ring text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Refresh
              </button>
            </div>

            {error && <Notice tone="error">{error}</Notice>}
            {isLoading && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}

            {!isLoading && !error && candidates.length === 0 && (
              <Notice>
                No predicate has been proposed yet. The canonical registry atom has not been minted
                on any network — the first proposal below creates it.
              </Notice>
            )}

            {candidates.length > 0 && (
              <ol className="space-y-2">
                {candidates.map((candidate, index) => (
                  <li
                    key={candidate.tripleTermId}
                    className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate text-sm text-[var(--color-text)]">
                      {candidate.label}
                    </span>
                    <RegistryBadge provenance={candidate.status} />
                    <span
                      className="shrink-0 text-xs tabular-nums text-[var(--color-text-secondary)]"
                      title={`${formatTrust(candidate.stakeFor)} for · ${formatTrust(candidate.stakeAgainst)} against`}
                    >
                      {formatTrust(candidate.netStake)} TRUST
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              This app’s predicates without a canonical equivalent
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {unmapped.length} of this app’s {PREDICATES.length} curated predicates have no match in
              the canonical registry. Each carries canonical <code className="text-xs">DefinedTerm</code>{' '}
              bytes, so if the registry adopts one, its id already matches.
            </p>

            {submitError && <Notice tone="error">{submitError}</Notice>}
            {progress && <Notice>{progress}</Notice>}
            {!writeConfig && (
              <Notice>Connect a wallet to propose a predicate for the standard.</Notice>
            )}

            <ul className="grid gap-2 sm:grid-cols-2">
              {unmapped.map((id) => {
                const resolved = resolveCanonicalPredicate(id);
                const atomId = resolved.kind === 'candidate' ? resolved.atomId : resolved.predicate.atomId;
                const alreadyProposed = proposedAtomIds.has(atomId.toLowerCase());

                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-[var(--color-text)]">{id}</span>
                      <PredicateRegistryBadge appPredicateId={id} />
                    </span>
                    <button
                      onClick={() => handlePropose(id)}
                      disabled={!writeConfig || busyId !== null || alreadyProposed}
                      className="focus-ring shrink-0 rounded-md bg-[var(--color-surface-raised)] px-2 py-1 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {alreadyProposed ? 'Proposed' : busyId === id ? 'Proposing…' : 'Propose'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
      <p className="text-xs text-[var(--color-text-muted)]">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{detail}</p>
    </div>
  );
}

function Notice({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'error';
}) {
  const toneClasses =
    tone === 'error'
      ? 'border-red-500/40 bg-red-500/10'
      : 'border-[var(--color-border)] bg-[var(--color-surface)]';

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm text-[var(--color-text-secondary)] ${toneClasses}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {children}
    </div>
  );
}
