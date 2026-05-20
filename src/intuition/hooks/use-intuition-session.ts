import { useReadContracts } from 'wagmi';
import { env } from '../../config/env';
import { multivaultReadAbi } from '../abi/multivault';
import { asCurveId, type IntuitionSession } from '../types';

export type { IntuitionSession };

export type UseIntuitionSessionResult =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: IntuitionSession };

const SESSION_CONTRACTS = [
  {
    address: env.multivaultAddress,
    abi: multivaultReadAbi,
    functionName: 'getAtomCost',
  },
  {
    address: env.multivaultAddress,
    abi: multivaultReadAbi,
    functionName: 'getTripleCost',
  },
  {
    address: env.multivaultAddress,
    abi: multivaultReadAbi,
    functionName: 'getBondingCurveConfig',
  },
] as const;

/**
 * Reads and caches the protocol constants required for every onchain write.
 *
 * `atomCost`, `tripleCost`, and `defaultCurveId` change only on governance
 * actions, so we treat the response as stable for the session
 * (`staleTime: Infinity`) and refetch only on explicit invalidation.
 *
 * Consumers (claim submission, deposit, etc.) must gate their UI on
 * `status === 'success'` — submitting before the session is loaded would
 * either revert (`MultiVault_InsufficientAssets`) or hit a stale curve.
 *
 * Returned as a discriminated union so each call site handles the three
 * states explicitly. Adding a new variant becomes a compile-time error
 * at every consumer.
 */
export function useIntuitionSession(): UseIntuitionSessionResult {
  const { data, isLoading, error } = useReadContracts({
    contracts: SESSION_CONTRACTS,
    query: { staleTime: Number.POSITIVE_INFINITY },
  });

  if (isLoading) {
    return { status: 'loading' };
  }

  if (error) {
    return { status: 'error', error };
  }

  if (data === undefined) {
    return { status: 'loading' };
  }

  const [atomCostResult, tripleCostResult, curveConfigResult] = data;

  if (
    atomCostResult === undefined ||
    tripleCostResult === undefined ||
    curveConfigResult === undefined
  ) {
    return {
      status: 'error',
      error: new Error('Incomplete session response from MultiVault'),
    };
  }

  if (atomCostResult.status !== 'success') {
    return { status: 'error', error: atomCostResult.error };
  }
  if (tripleCostResult.status !== 'success') {
    return { status: 'error', error: tripleCostResult.error };
  }
  if (curveConfigResult.status !== 'success') {
    return { status: 'error', error: curveConfigResult.error };
  }

  return {
    status: 'success',
    data: {
      atomCost: atomCostResult.result,
      tripleCost: tripleCostResult.result,
      defaultCurveId: asCurveId(curveConfigResult.result.defaultCurveId),
    },
  };
}
