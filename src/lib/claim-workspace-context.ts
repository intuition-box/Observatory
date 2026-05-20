import { createContext, type RefObject } from 'react';

import type { ClaimBuilderHandle } from '../components/claim-builder';
import type { ClaimEntry } from '../types';

/**
 * Shared state for the Claim Builder workspace — history, batch, selection,
 * search, and the claim-builder imperative handle. Split from the provider
 * component so the hook lives in its own file (keeps React Fast Refresh
 * happy: components and hooks must not share a file).
 */
export interface ClaimWorkspace {
  /** Persisted history of saved claims. */
  history: ClaimEntry[];
  /** Unpersisted in-memory batch being assembled for export. */
  batch: ClaimEntry[];
  setBatch: (updater: ClaimEntry[] | ((prev: ClaimEntry[]) => ClaimEntry[])) => void;
  clearHistory: () => void;

  /** Currently highlighted atom type across panels (graph ↔ tree ↔ schema). */
  selectedTypeId: string | null;
  setSelectedTypeId: (id: string | null) => void;
  /** Currently selected predicate in the explorer/builder. */
  selectedPredicateId: string | null;
  setSelectedPredicateId: (id: string | null) => void;

  /** Debounced query fanned out to every search-aware panel. */
  searchQuery: string;

  /** Imperative handle for programmatic builder control (matrix fill, restore). */
  claimBuilderRef: RefObject<ClaimBuilderHandle | null>;

  /** Append a claim to history. */
  saveClaim: (claim: Omit<ClaimEntry, 'id' | 'timestamp'>) => void;
  /** Append a claim to the current export batch. Returns false when a
   *  semantically identical entry (same subject+predicate+object) is
   *  already queued — duplicates would publish to the same onchain
   *  triple twice, which the protocol rejects. */
  addToBatch: (claim: Omit<ClaimEntry, 'id' | 'timestamp'>) => boolean;
  /** Restore a past claim into the builder form. */
  restoreClaim: (entry: ClaimEntry) => void;
  /** Fill the builder from a (subject, predicate, object) triple selection. */
  fillFromMatrix: (subjectTypeId: string, predicateId: string, objectTypeId: string) => void;
}

export const ClaimWorkspaceContext = createContext<ClaimWorkspace | null>(null);
