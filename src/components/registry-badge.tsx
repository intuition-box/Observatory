import {
  provenanceForPredicate,
  type Provenance,
} from '../lib/intuition/predicate-provenance';

const STYLES: Record<Provenance, { label: string; color: string; title: string }> = {
  enshrined: {
    label: 'enshrined',
    color: '#22c55e',
    title: 'Part of the canonical Intuition registry, with stable semantics.',
  },
  proposed: {
    label: 'proposed',
    color: '#eab308',
    title: 'In the canonical registry with a stable id, but semantics are still being refined.',
  },
  candidate: {
    label: 'candidate',
    color: '#a855f7',
    title:
      'No canonical equivalent yet. Carries canonical DefinedTerm bytes, so its id already matches if the registry adopts it.',
  },
  'app-local': {
    label: 'app-local',
    color: '#64748b',
    title: 'Specific to this app — deliberately not part of the shared vocabulary.',
  },
};

interface RegistryBadgeProps {
  provenance: Provenance;
  size?: 'sm' | 'md';
}

/**
 * Shows whether a predicate is canonical vocabulary or a proposal.
 *
 * This is a first-class signal in this app rather than decoration: arguing about
 * which predicates *should* be canonical is the point, so users need to see the
 * current standing of whatever they are staking on.
 */
export function RegistryBadge({ provenance, size = 'sm' }: RegistryBadgeProps) {
  const { label, color, title } = STYLES[provenance];
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded font-medium uppercase tracking-wide ${sizeClasses}`}
      style={{ backgroundColor: `${color}1a`, color, border: `1px solid ${color}40` }}
      title={title}
    >
      {label}
    </span>
  );
}

export function PredicateRegistryBadge({
  appPredicateId,
  size,
}: {
  appPredicateId: string;
  size?: 'sm' | 'md';
}) {
  return <RegistryBadge provenance={provenanceForPredicate(appPredicateId)} size={size} />;
}
