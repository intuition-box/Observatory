import { formatEther } from 'viem';

/**
 * Compact TRUST display for stake figures.
 *
 * Vault totals span many orders of magnitude, so full precision is noise in a
 * ranked list. Negative values are meaningful here — net stake goes negative
 * when a candidacy is contested harder than it is supported.
 */
export function formatTrust(wei: bigint): string {
  const negative = wei < 0n;
  const value = Number(formatEther(negative ? -wei : wei));
  const sign = negative ? '−' : '';

  if (value === 0) return '0';
  if (value < 0.001) return `${sign}<0.001`;
  if (value < 1) return `${sign}${value.toFixed(3)}`;
  if (value < 1_000) return `${sign}${value.toFixed(2)}`;
  if (value < 1_000_000) return `${sign}${(value / 1_000).toFixed(1)}k`;
  return `${sign}${(value / 1_000_000).toFixed(1)}M`;
}
