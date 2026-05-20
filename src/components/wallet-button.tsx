import { type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBalance, useDisconnect } from 'wagmi';
import { formatUnits } from 'viem';

/**
 * Wallet UI for the Ontology header.
 *
 * Wraps RainbowKit's headless `ConnectButton.Custom` so the modal/state
 * machinery stays canonical, while the visible chrome reuses Ontology's
 * existing CSS tokens (`--color-surface-raised`, `--color-border`, etc.)
 * and the same `h-8` rhythm as the tutorial / theme buttons.
 *
 * States:
 * - disconnected → outlined pill "Connect", click opens RainbowKit modal
 * - wrong network → destructive-tinted pill, click switches chain
 * - connected → round avatar (ENS image, or deterministic gradient
 *   derived from the address) + inline dropdown surfacing wallet
 *   address, balance, network, and actions (copy / explorer / disconnect)
 *
 * Pattern adapted from intuition-fee-proxy-template's `Layout.tsx`
 * `WalletDropdown` to match the Intuition ecosystem's dapp UX.
 */
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account !== undefined &&
          chain !== undefined &&
          (authenticationStatus === undefined ||
            authenticationStatus === 'authenticated');

        const wrapperProps: HTMLAttributes<HTMLDivElement> = !ready
          ? {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            }
          : {};

        return (
          <div {...wrapperProps} className="flex items-center gap-2">
            {!connected && (
              <button
                type="button"
                onClick={openConnectModal}
                className="focus-ring h-8 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]"
              >
                <WalletIcon />
                <span className="hidden sm:inline">Connect</span>
              </button>
            )}
            {connected && chain.unsupported === true && (
              <button
                type="button"
                onClick={openChainModal}
                className="focus-ring h-8 inline-flex items-center gap-2 rounded-md border border-[var(--destructive)]/40 bg-[var(--color-surface-raised)] px-3 text-sm font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <WarningIcon />
                <span className="hidden sm:inline">Wrong network</span>
              </button>
            )}
            {connected && chain.unsupported !== true && (
              <WalletDropdown
                account={account}
                chain={chain}
                onOpenChainModal={openChainModal}
              />
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

interface RKAccount {
  address: string;
  displayName: string;
  displayBalance?: string;
  ensAvatar?: string;
}

interface RKChain {
  id: number;
  name?: string;
  iconUrl?: string;
}

/**
 * Inline dropdown surfacing wallet identity and quick actions.
 * Single round avatar trigger; click reveals wallet address + balance,
 * network, and copy / switch network / explorer / disconnect actions —
 * keeps RainbowKit modal density on the page without launching a full
 * modal for the most common flows.
 */
function WalletDropdown({
  account,
  chain,
  onOpenChainModal,
}: {
  account: RKAccount;
  chain: RKChain;
  onOpenChainModal: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();
  // Force the balance query to the connected chain. wagmi defaults to the
  // active chain, but being explicit avoids edge cases where the wallet
  // installed an older RPC for the same chain ID and our transport
  // resolution diverges.
  const { data: balance } = useBalance({
    address: account.address as `0x${string}`,
    chainId: chain.id,
  });
  const formattedBalance =
    balance !== undefined
      ? (() => {
          const amount = parseFloat(formatUnits(balance.value, balance.decimals));
          return Number.isFinite(amount)
            ? `${amount.toFixed(4)} ${balance.symbol}`
            : undefined;
        })()
      : undefined;

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Deterministic gradient avatar derived from the address — gives every
  // connected wallet a unique visual signature when no ENS avatar is set.
  const gradient = (() => {
    if (account.ensAvatar !== undefined) return undefined;
    const raw = account.address.toLowerCase().replace(/^0x/, '');
    const h1 = parseInt(raw.slice(2, 5), 16) % 360;
    const h2 = parseInt(raw.slice(5, 8), 16) % 360;
    return `linear-gradient(135deg, hsl(${h1} 70% 60%), hsl(${h2} 70% 50%))`;
  })();

  const explorerUrl = EXPLORER_BY_CHAIN[chain.id];
  const explorerAddressUrl =
    explorerUrl !== undefined ? `${explorerUrl}/address/${account.address}` : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Wallet menu"
        aria-expanded={open}
        className="focus-ring h-8 w-8 rounded-full border border-[var(--color-border)] overflow-hidden transition-colors hover:border-[var(--color-accent)]"
        style={{ background: gradient }}
      >
        {account.ensAvatar !== undefined && (
          <img
            src={account.ensAvatar}
            alt=""
            className="h-full w-full object-cover"
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/30 overflow-hidden z-30"
        >
          <div className="px-4 py-3 space-y-3">
            <DetailRow label="Wallet">
              <span
                className="h-2 w-2 rounded-full bg-[var(--success)] shrink-0"
                aria-hidden
              />
              <span className="font-mono text-[var(--color-text)]">
                {account.displayName}
              </span>
              {formattedBalance !== undefined && (
                <span className="ml-auto text-[var(--color-text-muted)] text-xs font-mono tabular-nums">
                  {formattedBalance}
                </span>
              )}
            </DetailRow>
            <button
              type="button"
              onClick={() => {
                onOpenChainModal();
                setOpen(false);
              }}
              className="group w-full text-left rounded-md -mx-2 px-2 py-1 hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">
                Network
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="h-2 w-2 rounded-full bg-[var(--success)] shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[var(--color-text)]">
                    {chain.name ?? '—'}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    Chain ID: {chain.id}
                  </div>
                </div>
                <ChevronRightIcon />
              </div>
            </button>
          </div>
          <div className="border-t border-[var(--color-border)] py-1">
            <MenuItem
              icon={<CopyIcon />}
              label="Copy address"
              onClick={() => {
                navigator.clipboard.writeText(account.address).catch(() => undefined);
                setOpen(false);
              }}
            />
            {explorerAddressUrl !== undefined && (
              <MenuItem
                icon={<ExternalIcon />}
                label="View on Explorer"
                href={explorerAddressUrl}
                onClick={() => setOpen(false)}
              />
            )}
            <MenuItem
              icon={<LogoutIcon />}
              label="Disconnect"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Block-explorer roots per supported Intuition chain. Kept inline here
 * (rather than reaching into intuition/chains.ts) so the wallet UI stays
 * self-contained and one place owns the explorer fallback logic.
 */
const EXPLORER_BY_CHAIN: Record<number, string> = {
  1155: 'https://explorer.intuition.systems',
  13579: 'https://testnet.explorer.intuition.systems',
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-2 text-sm">{children}</div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    'flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors';
  if (href !== undefined) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
        role="menuitem"
      >
        <span className="text-[var(--color-text-muted)]">{icon}</span>
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} role="menuitem">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function WalletIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
      <path d="M21 12h-4a2 2 0 1 0 0 4h4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
