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
} from '../services/claim-submission.service';
import type { AtomId, TripleId } from '../types';
import { useIntuitionSession } from './use-intuition-session';

/**
 * Discriminated state for the on-chain claim submission flow.
 *
 * The hook is pure orchestration: it maps service phases to UI state
 * and surfaces terminal states (`confirmed`, `error`). All business
 * logic lives in `ClaimSubmissionService`.
 */
export type SubmissionState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'creating-atoms'; atomCount: number }
  | { status: 'creating-triple' }
  | {
      status: 'confirmed';
      tripleId: TripleId;
      subjectAtomId: AtomId;
      predicateAtomId: AtomId;
      objectAtomId: AtomId;
      atomTxHash: Hex | undefined;
      tripleTxHash: Hex | undefined;
    }
  | { status: 'error'; error: Error };

export type ClaimDraft = ClaimSubmissionDraft;

export interface UseSubmitClaimReturn {
  submit: (draft: ClaimDraft) => Promise<void>;
  reset: () => void;
  state: SubmissionState;
  isReady: boolean;
}

/**
 * React binding around `ClaimSubmissionService`.
 *
 * Responsibilities (and ONLY these):
 *  - Read connection state and protocol session from wagmi/TanStack.
 *  - Build the service tree once per (publicClient, walletClient) pair.
 *  - Forward `submit(draft)` to the service, mapping phase callbacks
 *    to the local discriminated state.
 *
 * No contract calls, no GraphQL queries, no business decisions.
 */
export function useSubmitClaim(): UseSubmitClaimReturn {
  const [state, setState] = useState<SubmissionState>({ status: 'idle' });
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
    async (draft: ClaimDraft) => {
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

      try {
        const result = await services.claimSubmission.submit({
          draft,
          context: {
            account: address,
            chain,
            chainId,
            session: session.data,
          },
          onPhase: (phase: ClaimSubmissionPhase) => setState(phase),
        });
        setState({
          status: 'confirmed',
          tripleId: result.tripleId,
          subjectAtomId: result.subjectAtomId,
          predicateAtomId: result.predicateAtomId,
          objectAtomId: result.objectAtomId,
          atomTxHash: result.atomTxHash,
          tripleTxHash: result.tripleTxHash,
        });
        // Refresh every live query so the graph and tree views pick up
        // the freshly-published claim without waiting for staleTime to
        // expire. Retry twice with a delay because the indexer lags
        // the chain by a few seconds — the first refetch typically
        // misses the new triple.
        const refresh = (): void => {
          void queryClient.invalidateQueries({ queryKey: ['intuition'] });
        };
        refresh();
        setTimeout(refresh, 4000);
        setTimeout(refresh, 12000);
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
