import { useWallets } from '@privy-io/react-auth';
import { useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';

import { useIntuitionNetwork } from './intuition-network-context';
import { type IntuitionChainId, isIntuitionChainId } from './intuition-chain';
import { isWalletEnabled } from './wallet-enabled';

function useIntuitionChainWithWallet() {
  const { chainId: targetChainId, networkLabel, isStaticNetwork } = useIntuitionNetwork();
  const { address, chainId, isConnected } = useAccount();
  const { wallets } = useWallets();
  const { switchChain, isPending: isWagmiSwitching } = useSwitchChain();

  const isWrongNetwork =
    !isStaticNetwork &&
    isConnected &&
    chainId !== undefined &&
    (chainId !== targetChainId || !isIntuitionChainId(chainId));

  const switchToIntuitionChain = useCallback(
    async (chainIdToSwitch: IntuitionChainId = targetChainId) => {
      const ethereumWallet = wallets.find((wallet) => wallet.type === 'ethereum');

      if (ethereumWallet) {
        try {
          await ethereumWallet.switchChain(chainIdToSwitch);
          return;
        } catch (privyError) {
          console.warn('Privy switchChain failed, trying wagmi:', privyError);
        }
      }

      await switchChain({ chainId: chainIdToSwitch });
    },
    [wallets, switchChain, targetChainId]
  );

  return {
    address: address as `0x${string}` | undefined,
    chainId: chainId as number | undefined,
    isConnected,
    isWrongNetwork,
    targetChainId,
    networkLabel,
    isStaticNetwork,
    switchToIntuitionChain,
    /** @deprecated Use switchToIntuitionChain */
    switchToIntuitionMainnet: () => switchToIntuitionChain(targetChainId),
    switchToActiveNetwork: switchToIntuitionChain,
    isSwitching: isWagmiSwitching,
  };
}

/**
 * Read-only stand-in used when the build has no Privy app id.
 *
 * Calling wagmi or Privy hooks without their providers throws, so this variant
 * touches neither — it only reports the network the user is browsing.
 */
function useIntuitionChainReadOnly(): ReturnType<typeof useIntuitionChainWithWallet> {
  const { chainId: targetChainId, networkLabel, isStaticNetwork } = useIntuitionNetwork();

  const switchToIntuitionChain = useCallback(async () => {
    /* no wallet to switch */
  }, []);

  return {
    address: undefined,
    chainId: undefined,
    isConnected: false,
    isWrongNetwork: false,
    targetChainId,
    networkLabel,
    isStaticNetwork,
    switchToIntuitionChain,
    switchToIntuitionMainnet: switchToIntuitionChain,
    switchToActiveNetwork: switchToIntuitionChain,
    isSwitching: false,
  };
}

/**
 * Chosen once at module load. `isWalletEnabled` derives from a build-time
 * constant, so the selection can never change between renders — this is not a
 * conditional hook.
 */
export const useIntuitionChain = isWalletEnabled
  ? useIntuitionChainWithWallet
  : useIntuitionChainReadOnly;
