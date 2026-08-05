import { usePrivy } from '@privy-io/react-auth';
import { useCallback } from 'react';

import { isWalletEnabled } from './wallet-enabled';

function useWalletSessionWithPrivy() {
  const { ready, authenticated, login, logout, connectWallet } = usePrivy();

  const connect = useCallback(async () => {
    try {
      if (authenticated) {
        await connectWallet();
      } else {
        await login();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  }, [authenticated, connectWallet, login]);

  const disconnect = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Wallet disconnect failed:', error);
    }
  }, [logout]);

  return { ready, authenticated, connect, disconnect };
}

/** Inert session for builds without a Privy app id — `usePrivy` would throw. */
function useWalletSessionReadOnly(): ReturnType<typeof useWalletSessionWithPrivy> {
  const noop = useCallback(async () => {}, []);
  return { ready: true, authenticated: false, connect: noop, disconnect: noop };
}

/** Selected at module load from a build-time constant — not a conditional hook. */
export const useWalletSession = isWalletEnabled
  ? useWalletSessionWithPrivy
  : useWalletSessionReadOnly;
