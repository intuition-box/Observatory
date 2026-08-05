import type { IntuitionNetworkId } from './intuition-network-context';

/**
 * The three modes, in the order a contribution travels through them.
 *
 * This is a pipeline, not a set of alternatives: an idea is tried on Testnet,
 * argued for real on Mainnet, and — if it reaches clear consensus — adopted into
 * the `@0xintuition/*` packages, which is what Standard reads from.
 *
 * Ordered testnet → mainnet → standard everywhere it is displayed, so the
 * switcher reads as the journey rather than as an arbitrary list.
 */
export interface OntologyMode {
  id: IntuitionNetworkId;
  /** Short name shown in the switcher. */
  label: string;
  /** One-line purpose, shown in the dropdown and on the home page. */
  summary: string;
  /** Longer explanation for the home page. */
  detail: string;
  /** Accent colour for badges and the mode timeline. */
  color: string;
  step: number;
}

export const ONTOLOGY_MODES: readonly [OntologyMode, OntologyMode, OntologyMode] = [
  {
    id: 'testnet',
    label: 'Testnet',
    summary: 'Experiment freely',
    detail:
      'A sandbox for learning the app. Atoms and triples are real on-chain writes, but on a throwaway network — nothing here is expected to last, and mistakes cost nothing.',
    color: '#eab308',
    step: 1,
  },
  {
    id: 'mainnet',
    label: 'Mainnet',
    summary: 'Real ontology work, shared globally',
    detail:
      'The live shared graph. Claims here are permanent, visible to every Intuition builder, and backed by staked TRUST. This is where the vocabulary is genuinely argued about.',
    color: '#22c55e',
    step: 2,
  },
  {
    id: 'static',
    label: 'Standard',
    summary: 'Adopted into the packages',
    detail:
      'What reached clear consensus and was adopted into the @0xintuition packages. Read-only here: this view is generated from the installed package version, so it updates when the packages do.',
    color: '#38bdf8',
    step: 3,
  },
];

export function getOntologyMode(id: IntuitionNetworkId): OntologyMode {
  return ONTOLOGY_MODES.find((mode) => mode.id === id) ?? ONTOLOGY_MODES[2];
}

/** Public source of truth for everything the Standard mode displays. */
export const INTUITION_PACKAGES_REPO = 'https://github.com/0xIntuition/packages';

/** Documentation for the canonical vocabulary. */
export const INTUITION_DOCS_URL = 'https://unchained.intuition.systems/docs';
