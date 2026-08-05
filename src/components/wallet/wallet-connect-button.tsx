import { useIntuitionChain } from '../../lib/wallet/use-intuition-chain';
import { useWalletSession } from '../../lib/wallet/use-wallet-session';
import { isWalletEnabled } from '../../lib/wallet/wallet-enabled';
import { WalletAddressMenu } from './wallet-address-menu';
import { WalletConnectLoading } from './wallet-connect-loading';
import { WalletConnectPrompt } from './wallet-connect-prompt';

/**
 * Shown when the build has no Privy app id.
 *
 * An honest disabled state beats a Connect button that silently does nothing —
 * and it names the missing variable, since only a redeploy can fix it.
 */
function WalletUnavailable() {
  return (
    <span
      className="inline-flex h-8 items-center rounded-md bg-[var(--color-surface-raised)] px-3 text-xs font-medium text-[var(--color-text-muted)]"
      title="This deployment was built without VITE_PRIVY_APP_ID, so wallet features are unavailable. Browsing and reading the ontology still work."
    >
      Read-only
    </span>
  );
}

export function WalletConnectButton() {
  if (!isWalletEnabled) {
    return <WalletUnavailable />;
  }

  return <ConnectedWalletButton />;
}

function ConnectedWalletButton() {
  const { ready, authenticated, connect, disconnect } = useWalletSession();
  const {
    address,
    isConnected,
    isWrongNetwork,
    switchToIntuitionChain,
    networkLabel,
    targetChainId,
    isSwitching,
  } = useIntuitionChain();

  const handleSwitchNetwork = async () => {
    try {
      await switchToIntuitionChain(targetChainId);
    } catch (error) {
      console.error('Network switch failed:', error);
    }
  };

  if (!ready) {
    return <WalletConnectLoading />;
  }

  if (!authenticated || !isConnected || !address) {
    return <WalletConnectPrompt onConnect={() => void connect()} />;
  }

  return (
    <WalletAddressMenu
      address={address}
      isWrongNetwork={isWrongNetwork}
      isSwitching={isSwitching}
      switchNetworkLabel={networkLabel}
      onSwitchNetwork={() => void handleSwitchNetwork()}
      onDisconnect={() => void disconnect()}
    />
  );
}
