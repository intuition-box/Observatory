import { useReadContract } from 'wagmi';
import { multivaultReadAbi } from '../abi/multivault';
import { MULTIVAULT_ADDRESS } from '../wagmi-config';
import { toCurveId } from '../types';
import type { IntuitionSessionState } from '../types';

/**
 * Hook that caches protocol session data: atomCost, tripleCost, defaultCurveId.
 * Returns a discriminated union: loading | error | success.
 */
export function useIntuitionSession(): IntuitionSessionState {
  const { data: atomCost, isLoading: loadingAtom, error: errorAtom } = useReadContract({
    address: MULTIVAULT_ADDRESS,
    abi: multivaultReadAbi,
    functionName: 'getAtomCost',
  });

  const { data: tripleCost, isLoading: loadingTriple, error: errorTriple } = useReadContract({
    address: MULTIVAULT_ADDRESS,
    abi: multivaultReadAbi,
    functionName: 'getTripleCost',
  });

  const { data: curveId, isLoading: loadingCurve, error: errorCurve } = useReadContract({
    address: MULTIVAULT_ADDRESS,
    abi: multivaultReadAbi,
    functionName: 'defaultCurveId',
  });

  const isLoading = loadingAtom || loadingTriple || loadingCurve;
  const error = errorAtom || errorTriple || errorCurve;

  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error: error as Error };

  return {
    status: 'success',
    atomCost: atomCost as bigint,
    tripleCost: tripleCost as bigint,
    defaultCurveId: toCurveId((curveId as bigint) ?? 0n),
  };
}
