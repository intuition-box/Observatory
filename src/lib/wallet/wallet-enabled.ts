/**
 * Whether this build can talk to a wallet.
 *
 * `VITE_PRIVY_APP_ID` is inlined by Vite at build time, so this is a constant
 * for the lifetime of a deployment — it cannot be configured at runtime, and a
 * missing value is a deploy-time mistake rather than a user-facing state.
 *
 * Lives in its own module so hooks can branch on it without importing the
 * provider (which would pull Privy into every read-only code path).
 */
function getPrivyAppId(): string | undefined {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;
  return typeof appId === 'string' && appId.length > 0 ? appId : undefined;
}

export const PRIVY_APP_ID = getPrivyAppId();

export const isWalletEnabled = PRIVY_APP_ID !== undefined;
