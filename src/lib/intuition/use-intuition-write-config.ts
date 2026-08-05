import { getMultiVaultAddressFromChainId } from '@0xintuition/sdk';
import type { WriteConfig } from '@0xintuition/sdk';
import { useMemo } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

import { useIntuitionNetwork } from '../wallet/intuition-network-context';
import { isWalletEnabled } from '../wallet/wallet-enabled';

function useIntuitionWriteConfigWithWallet(): WriteConfig | null {
  const { chainId, isStaticNetwork } = useIntuitionNetwork();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (isStaticNetwork) return null;
    if (!publicClient || !walletClient) return null;

    return {
      address: getMultiVaultAddressFromChainId(chainId),
      publicClient,
      walletClient,
    } satisfies WriteConfig;
  }, [publicClient, walletClient, chainId, isStaticNetwork]);
}

/**
 * Writing needs a wallet; without one there is nothing to configure.
 *
 * Selected at module load from a build-time constant, so wagmi hooks are never
 * called outside a `WagmiProvider`.
 */
export const useIntuitionWriteConfig = isWalletEnabled
  ? useIntuitionWriteConfigWithWallet
  : (): WriteConfig | null => null;
