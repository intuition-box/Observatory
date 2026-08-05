import { useCallback, useEffect, useRef, useState } from 'react';

import { useIntuitionChain } from '../../lib/wallet/use-intuition-chain';
import {
  type IntuitionNetworkId,
  useIntuitionNetwork,
} from '../../lib/wallet/intuition-network-context';
import {
  INTUITION_MAINNET_CHAIN_ID,
  INTUITION_TESTNET_CHAIN_ID,
  type IntuitionChainId,
} from '../../lib/wallet/intuition-chain';
import { getOntologyMode, ONTOLOGY_MODES } from '../../lib/wallet/ontology-modes';
import { ChevronDownIcon } from './wallet-icons';

export function NetworkSwitcher() {
  const { network, setNetwork, networkLabel } = useIntuitionNetwork();
  const activeMode = getOntologyMode(network);
  const { isConnected, switchToActiveNetwork, isSwitching } = useIntuitionChain();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    async (next: IntuitionNetworkId) => {
      if (next === network) {
        setOpen(false);
        return;
      }

      setNetwork(next);
      setOpen(false);

      if (isConnected && next !== 'static') {
        const chainId: IntuitionChainId =
          next === 'testnet' ? INTUITION_TESTNET_CHAIN_ID : INTUITION_MAINNET_CHAIN_ID;
        try {
          await switchToActiveNetwork(chainId);
        } catch (error) {
          console.error('Network switch failed:', error);
        }
      }
    },
    [network, setNetwork, isConnected, switchToActiveNetwork]
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isSwitching}
        className="focus-ring h-8 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Mode: ${networkLabel}`}
      >
        <ModeDot color={activeMode.color} />
        {/* The label rides on the trigger, not just in the menu — which mode you
            are in changes whether an action costs TRUST, so it must never be a
            thing you have to open a dropdown to check. */}
        <span className="font-medium">{activeMode.label}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select Intuition network"
          className="absolute right-0 z-50 mt-1 w-[17rem] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] py-1 shadow-lg"
        >
          {ONTOLOGY_MODES.map((option) => {
            const isActive = option.id === network;
            return (
              <li key={option.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => void handleSelect(option.id)}
                  className="focus-ring flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-surface-hover)]"
                >
                  <ModeDot color={option.color} className="mt-1" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {option.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
                        step {option.step}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-[var(--color-text-secondary)]">
                      {option.summary}
                    </span>
                  </span>
                  {isActive && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-1 shrink-0 text-[var(--color-accent)]"
                      aria-hidden
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Colour-codes the mode so it is recognisable before the label is read. */
function ModeDot({ color, className = '' }: { color: string; className?: string }) {
  return (
    <span
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }}
      aria-hidden
    />
  );
}
