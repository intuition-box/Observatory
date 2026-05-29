import { useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { useCreateAtom } from '../intuition/hooks/use-create-atom';
import { env } from '../config/env';

type SubmitStatus = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

interface SubmitState {
  status: SubmitStatus;
  error: string | null;
  txHash: string | null;
}

/**
 * Orchestrates onchain claim submission from the ClaimBuilder.
 *
 * Flow:
 * 1. User clicks "Submit Onchain"
 * 2. Subject atom is created via MultiVault.createAtom()
 * 3. Transaction is confirmed on-chain
 * 4. UI shows success with tx hash link
 *
 * Note: Full triple creation (subject → predicate → object) requires
 * atom IDs from the indexer. This first version creates the subject atom
 * as proof of on-chain integration. Triple linking will follow once the
 * indexer returns atom IDs from the creation receipt.
 */
export function useSubmitClaim() {
  const { isConnected } = useAccount();
  const { createAtom, isPending, isConfirming, isSuccess, error, hash, reset } = useCreateAtom();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const status: SubmitStatus = isPending
    ? 'submitting'
    : isConfirming
      ? 'confirming'
      : isSuccess
        ? 'success'
        : error || submitError
          ? 'error'
          : 'idle';

  const state: SubmitState = {
    status,
    error: error?.message ?? submitError,
    txHash: hash ?? null,
  };

  const canSubmit = isConnected && !env.isDemo && status === 'idle';

  const submitClaim = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (subject: string, _subjectType: string | null) => {
      setSubmitError(null);

      if (!isConnected) {
        setSubmitError('Connect your wallet first');
        return;
      }

      if (env.isDemo) {
        setSubmitError('Onchain submission is disabled in demo mode');
        return;
      }

      if (!subject.trim()) {
        setSubmitError('Subject cannot be empty');
        return;
      }

      // Create atom with minimum required deposit (0.0001 ETH)
      const minDeposit = BigInt('100000000000000'); // 0.0001 ETH in wei
      createAtom(subject.trim(), minDeposit);
    },
    [isConnected, createAtom],
  );

  const resetSubmit = useCallback(() => {
    setSubmitError(null);
    reset();
  }, [reset]);

  return {
    submitClaim,
    resetSubmit,
    canSubmit,
    ...state,
  };
}
