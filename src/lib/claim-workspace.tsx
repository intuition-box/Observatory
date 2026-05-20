import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ClaimBuilderHandle } from '../components/claim-builder';
import { addToHistory } from '../components/claim-history';
import type { ClaimEntry } from '../types';
import { ClaimWorkspaceContext, type ClaimWorkspace } from './claim-workspace-context';
import { ClaimEntryListSchema } from './schemas';
import { useLocalStorage } from './use-local-storage';

function isClaimEntryList(v: unknown): v is ClaimEntry[] {
  return ClaimEntryListSchema.safeParse(v).success;
}

interface ClaimWorkspaceProviderProps {
  searchQuery: string;
  children: ReactNode;
}

/**
 * Provides the ClaimWorkspace context — history, batch, selection, search,
 * the claim-builder handle, and all action callbacks.
 *
 * History is validated against `ClaimEntryListSchema` on load so stale
 * shapes (renamed atom types, removed predicates, old versions) get wiped
 * rather than crashing downstream components.
 */
export function ClaimWorkspaceProvider({ searchQuery, children }: ClaimWorkspaceProviderProps) {
  const [history, setHistory] = useLocalStorage<ClaimEntry[]>('ontology-history', [], {
    validate: isClaimEntryList,
  });
  const [batch, setBatch] = useState<ClaimEntry[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedPredicateId, setSelectedPredicateId] = useState<string | null>(null);
  const claimBuilderRef = useRef<ClaimBuilderHandle>(null);

  const saveClaim = useCallback(
    (claim: Omit<ClaimEntry, 'id' | 'timestamp'>) => {
      setHistory((prev) => addToHistory(prev, claim));
    },
    [setHistory]
  );

  const addToBatch = useCallback((claim: Omit<ClaimEntry, 'id' | 'timestamp'>): boolean => {
    const isDuplicate = batch.some(
      (e) =>
        e.subject === claim.subject &&
        e.subjectType === claim.subjectType &&
        e.predicateId === claim.predicateId &&
        e.object === claim.object &&
        e.objectType === claim.objectType
    );
    if (isDuplicate) return false;
    const entry: ClaimEntry = {
      ...claim,
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setBatch((prev) => [...prev, entry]);
    return true;
  }, [batch]);

  const restoreClaim = useCallback((entry: ClaimEntry) => {
    claimBuilderRef.current?.restoreClaim(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fillFromMatrix = useCallback(
    (subjectTypeId: string, predicateId: string, objectTypeId: string) => {
      claimBuilderRef.current?.fillFromMatrix(subjectTypeId, predicateId, objectTypeId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  const value = useMemo<ClaimWorkspace>(
    () => ({
      history,
      batch,
      setBatch,
      clearHistory,
      selectedTypeId,
      setSelectedTypeId,
      selectedPredicateId,
      setSelectedPredicateId,
      searchQuery,
      claimBuilderRef,
      saveClaim,
      addToBatch,
      restoreClaim,
      fillFromMatrix,
    }),
    [
      history,
      batch,
      clearHistory,
      selectedTypeId,
      selectedPredicateId,
      searchQuery,
      saveClaim,
      addToBatch,
      restoreClaim,
      fillFromMatrix,
    ]
  );

  return (
    <ClaimWorkspaceContext.Provider value={value}>{children}</ClaimWorkspaceContext.Provider>
  );
}
