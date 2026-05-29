import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { multivaultWriteAbi } from '../abi/multivault';
import { MULTIVAULT_ADDRESS } from '../wagmi-config';

/**
 * Hook to create an atom onchain via MultiVault.createAtom().
 * The atom data is encoded as UTF-8 bytes.
 */
export function useCreateAtom() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createAtom = (label: string, value: bigint) => {
    const atomData = new TextEncoder().encode(label);
    writeContract({
      address: MULTIVAULT_ADDRESS,
      abi: multivaultWriteAbi,
      functionName: 'createAtom',
      args: [atomData as unknown as `0x${string}`],
      value,
    });
  };

  return {
    createAtom,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
