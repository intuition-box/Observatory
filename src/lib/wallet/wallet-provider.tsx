import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { IntuitionNetworkProvider } from './intuition-network-context';
import { IntuitionNetworkSync } from './intuition-network-sync';
import { privyConfig } from './privy-config';
import { wagmiConfig } from './wagmi-config';
import { PRIVY_APP_ID } from './wallet-enabled';

const queryClient = new QueryClient();

/**
 * Providers the whole app needs, wallet or not.
 *
 * Reading the ontology requires only the GraphQL indexer and react-query;
 * Privy and wagmi are needed solely to *write*. Keeping the read stack outside
 * the wallet stack means a deployment without a Privy app id still serves the
 * explorer, the matrix, and the registry read-only instead of showing nothing.
 */
function BaseProviders({ children }: { children: ReactNode }) {
  return (
    <IntuitionNetworkProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntuitionNetworkProvider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  // Read-only mode. Previously this returned *only* a warning banner, which
  // replaced the entire application — an unconfigured optional integration took
  // down the parts of the app that never needed it.
  if (!PRIVY_APP_ID) {
    return <BaseProviders>{children}</BaseProviders>;
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <BaseProviders>
        <WagmiProvider config={wagmiConfig}>
          <IntuitionNetworkSync />
          {children}
        </WagmiProvider>
      </BaseProviders>
    </PrivyProvider>
  );
}
