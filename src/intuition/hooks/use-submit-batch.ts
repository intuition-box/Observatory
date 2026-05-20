import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
} from 'wagmi';
import type { Hex } from 'viem';

import { env } from '../../config/env';
import { createIntuitionServices } from '../services/factory';
import type {
  ClaimSubmissionDraft,
  ClaimSubmissionPhase,
  ClaimSubmissionResult,
} from '../services/claim-submission.service';
import { useIntuitionSession } from './use-intuition-session';

/**
 * Discriminated state for the batched on-chain submission flow.
 *
 * Mirrors `useSubmitClaim`'s state machine with the same phase order
 * — preparing → creating-atoms → creating-triple → confirmed/error —
 * so consumers can share the rendering pattern. The `confirmed`
 * variant carries the per-draft results; every entry shares the same
 * pair of tx hashes since the whole batch is a 2-tx flow regardless
 * of size.
 */
export type BatchSubmissionState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'creating-atoms'; atomCount: number }
  | { status: 'creating-triple' }
  | {
      status: 'confirmed';
      results: ClaimSubmissionResult[];
      atomTxHash: Hex | undefined;
      tripleTxHash: Hex | undefined;
    }
  | { status: 'error'; error: Error };

export interface UseSubmitBatchReturn {
  submit: (drafts: ClaimSubmissionDraft[]) => Promise<void>;
  reset: () => void;
  state: BatchSubmissionState;
  isReady: boolean;
}

/**
 * React binding around `ClaimSubmissionService.submitBatch`.
 *
 * Same shape as `useSubmitClaim` — read connection state from wagmi,
 * memoize the service tree against the connected (publicClient,
 * walletClient) pair, forward `submit(drafts)` to the service, and
 * map service phase callbacks into local state.
 *
 * The submission goes through in 2 transactions regardless of how
 * many drafts the caller supplies: ONE `createAtoms` for every
 * unique atom missing on-chain, ONE `createTriples` for every triple.
 * Wallet popups are therefore bounded — the user signs twice for the
 * whole batch.
 */
export function useSubmitBatch(): UseSubmitBatchReturn {
  const [state, setState] = useState<BatchSubmissionState>({ status: 'idle' });
  const { address, chain } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const session = useIntuitionSession();
  const queryClient = useQueryClient();

  const services = useMemo(() => {
    if (publicClient === undefined || walletClient === undefined) {
      return null;
    }
    return createIntuitionServices({
      publicClient,
      walletClient,
      graphqlUrl: env.graphqlUrl,
      multivaultAddress: env.multivaultAddress,
    });
  }, [publicClient, walletClient]);

  const isReady =
    address !== undefined &&
    chain !== undefined &&
    services !== null &&
    session.status === 'success';

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const submit = useCallback(
    async (drafts: ClaimSubmissionDraft[]) => {
      if (
        services === null ||
        address === undefined ||
        chain === undefined ||
        session.status !== 'success'
      ) {
        setState({
          status: 'error',
          error: new Error(
            'Wallet not connected or Intuition session not loaded'
          ),
        });
        return;
      }
      if (drafts.length === 0) return;

      try {
        const results = await services.claimSubmission.submitBatch({
          drafts,
          context: {
            account: address,
            chain,
            chainId,
            session: session.data,
          },
          onPhase: (phase: ClaimSubmissionPhase) => setState(phase),
        });
        // `atomTxHash` is shared across the batch (single createAtoms
        // call). `tripleTxHash` is per-draft: `undefined` for entries
        // whose triple already existed on-chain, the shared
        // `createTriples` hash otherwise. Surface the shared hash by
        // picking the first non-undefined entry — `undefined` only when
        // the entire batch was duplicates.
        const sharedTripleTxHash = results.find(
          (r) => r.tripleTxHash !== undefined
        )?.tripleTxHash;
        setState({
          status: 'confirmed',
          results,
          atomTxHash: results[0]?.atomTxHash,
          tripleTxHash: sharedTripleTxHash,
        });
        // Refresh every live query (atoms, triples, positions...) so the
        // graph and tree views pick up the freshly-published claims
        // without waiting for the default staleTime to expire.
        void queryClient.invalidateQueries({ queryKey: ['intuition'] });
      } catch (error) {
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
    [services, address, chain, chainId, session, queryClient]
  );

  return { submit, reset, state, isReady };
}
