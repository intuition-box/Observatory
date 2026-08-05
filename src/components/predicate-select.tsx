import { useEffect, useId, useState, type KeyboardEvent } from 'react';

import {
  getPredicateRule,
  isKnownPredicateId,
  matchPredicateForSubject,
  predicateDisplayLabel,
  resolvePredicateIdFromInput,
} from '../lib/intuition/predicate-resolution';
import { provenanceForPredicate } from '../lib/intuition/predicate-provenance';
import { resolveCanonicalPredicate } from '../lib/intuition/predicate-registry-map';
import { predicatesForClaimBuilder } from '../lib/claim-readiness';
import { ATOM_TYPES } from '../data/atom-types';
import { LockNote } from './lock-note';
import { RegistryBadge } from './registry-badge';


interface PredicateSelectProps {
  subjectType: string | null;
  value: string | null;
  onChange: (predicateId: string | null) => void;
  disabled: boolean;
  enforceCuratedTypeRules?: boolean;
}

export function PredicateSelect({
  subjectType,
  value,
  onChange,
  disabled,
  enforceCuratedTypeRules = false,
}: PredicateSelectProps) {
  const listId = useId();
  const predicates = predicatesForClaimBuilder(subjectType, enforceCuratedTypeRules);
  const knownRule = value ? getPredicateRule(value) : undefined;
  const isCustom = Boolean(value?.trim() && !knownRule);

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(value ? predicateDisplayLabel(value) : '');
  }, [value]);

  const commitInput = (text: string) => {
    const resolved = resolvePredicateIdFromInput(text, subjectType);
    onChange(resolved);
    if (resolved) {
      setInputValue(predicateDisplayLabel(resolved));
    }
  };

  const handleChange = (text: string) => {
    setInputValue(text);
    const trimmed = text.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const match = matchPredicateForSubject(trimmed, subjectType);
    if (match) {
      onChange(match.id);
      return;
    }
    onChange(trimmed);
  };

  const handleBlur = () => {
    commitInput(inputValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput(inputValue);
    }
  };

  const subjectAtom = subjectType ? ATOM_TYPES.find((t) => t.id === subjectType) : undefined;
  const onlyPredicate = predicates.length === 1 ? predicates[0] : null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-text-secondary)]">Predicate</label>
      <div className={`relative ${disabled ? 'opacity-60' : ''}`}>
        <input
          type="text"
          list={disabled ? undefined : listId}
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled
              ? 'Enter a subject first'
              : 'Type or pick a predicate (e.g. follows)'
          }
          className={`focus-ring w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-text)] placeholder-[var(--color-text-muted)] transition-colors focus:border-[var(--color-accent)] ${
            disabled ? 'cursor-not-allowed' : ''
          } ${isCustom ? 'border-[var(--color-accent)]/40' : ''}`}
          aria-describedby={isCustom ? `${listId}-custom` : undefined}
        />
        <datalist id={listId}>
          {predicates.map((p) => (
            <option key={p.id} value={p.label} label={p.description} />
          ))}
        </datalist>
      </div>

      {isCustom && !disabled && (
        <p id={`${listId}-custom`} className="text-xs text-[var(--color-accent)]/90">
          Custom predicate — will create «{value}» on-chain if needed.
        </p>
      )}

      {knownRule && (
        <p className="text-xs text-[var(--color-text-muted)]">{knownRule.description}</p>
      )}

      {value && !disabled && <CanonicalNote appPredicateId={value} />}

      {enforceCuratedTypeRules &&
        !disabled &&
        onlyPredicate &&
        subjectAtom &&
        isKnownPredicateId(onlyPredicate.id) && (
          <LockNote>
            Suggested for{' '}
            <code className="text-[var(--color-text-secondary)]">{subjectAtom.label}</code>:{' '}
            <code className="text-[var(--color-text-secondary)]">{onlyPredicate.label}</code>
            . You can still type another predicate.
          </LockNote>
        )}

      {enforceCuratedTypeRules && !disabled && predicates.length === 0 && subjectType && (
        <p className="text-xs text-amber-400">
          No curated predicates for {subjectType} — type your own relationship.
        </p>
      )}
    </div>
  );
}

/**
 * Shows what the selected predicate resolves to on chain.
 *
 * Two things need disclosing before someone stakes TRUST:
 *
 * 1. Whether the predicate is canonical vocabulary or a proposal.
 * 2. Whether writing it **flips subject and object**. Picking `employs` writes
 *    the canonical `employed by` with the operands swapped, so one fact lands in
 *    one vault instead of splitting stake across two directions. That is correct,
 *    but it would be a nasty surprise if it happened silently.
 */
function CanonicalNote({ appPredicateId }: { appPredicateId: string }) {
  const resolved = resolveCanonicalPredicate(appPredicateId);
  const provenance = provenanceForPredicate(appPredicateId);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      <RegistryBadge provenance={provenance} />
      {resolved.kind === 'candidate' ? (
        <span>Not in the canonical registry — proposing it creates new vocabulary.</span>
      ) : (
        <span>
          Writes as{' '}
          <code className="rounded bg-[var(--color-surface-raised)] px-1 text-[var(--color-text-secondary)]">
            {resolved.predicate.name}
          </code>
          {resolved.flip && (
            <>
              {' '}
              <span className="text-[var(--color-accent)]">
                with subject and object swapped
              </span>
            </>
          )}
          .
        </span>
      )}
    </div>
  );
}
