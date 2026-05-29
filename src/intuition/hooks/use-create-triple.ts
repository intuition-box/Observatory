import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { multivaultWriteAbi } from '../abi/multivault';
import { MULTIVAULT_ADDRESS } from '../wagmi-config';

/**
 * Hook to create a triple onchain via MultiVault.createTriple().
 * A triple links subject → predicate → object atoms.
 */
export function useCreateTriple() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createTriple = (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint,
    value: bigint,
  ) => {
    writeContract({
      address: MULTIVAULT_ADDRESS,
      abi: multivaultWriteAbi,
      functionName: 'createTriple',
      args: [subjectId, predicateId, objectId],
      value,
    });
  };

  return {
    createTriple,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
