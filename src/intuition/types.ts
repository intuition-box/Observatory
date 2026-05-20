import type { Hex } from 'viem';

/**
 * 32-byte hex value: `0x` followed by 64 hex characters.
 *
 * All term IDs in the Intuition protocol — atom IDs, triple IDs,
 * counter-triple IDs — are bytes32 (deterministic hashes), never uint256.
 */
export type Bytes32 = Hex;

const BYTES32_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function isBytes32(value: Hex): value is Bytes32 {
  return BYTES32_REGEX.test(value);
}

/**
 * Branded type for atom IDs.
 *
 * Atom IDs and triple IDs share the same EVM representation (bytes32) but
 * are not interchangeable. Depositing into a triple vault expecting an atom
 * vault — or vice versa — corrupts protocol state silently. The brand makes
 * the mismatch a compile-time error.
 */
declare const atomIdBrand: unique symbol;
export type AtomId = Bytes32 & { readonly [atomIdBrand]: 'AtomId' };

/** Branded type for triple IDs. See `AtomId` for the brand rationale. */
declare const tripleIdBrand: unique symbol;
export type TripleId = Bytes32 & { readonly [tripleIdBrand]: 'TripleId' };

/**
 * Branded type for the bonding-curve ID.
 *
 * Fetched once per session via `getBondingCurveConfig()`. Branding prevents
 * accidental mixing with other bigint values (assets, shares, fees).
 */
declare const curveIdBrand: unique symbol;
export type CurveId = bigint & { readonly [curveIdBrand]: 'CurveId' };

// boundary: branded constructors validate inputs at the I/O boundary
// (rpc/graphql responses, parsed env, computed IDs) and assert into the
// branded type. These are the only sanctioned `as` casts in the codebase.

export function asAtomId(value: Hex): AtomId {
  if (!isBytes32(value)) {
    throw new Error(`Invalid AtomId: expected bytes32, got ${value}`);
  }
  return value as AtomId;
}

export function asTripleId(value: Hex): TripleId {
  if (!isBytes32(value)) {
    throw new Error(`Invalid TripleId: expected bytes32, got ${value}`);
  }
  return value as TripleId;
}

export function asCurveId(value: bigint): CurveId {
  if (value < 0n) {
    throw new Error(`Invalid CurveId: must be non-negative, got ${value}`);
  }
  return value as CurveId;
}

/**
 * Per-session protocol constants read once from the MultiVault.
 *
 * Lives at the type-only layer so both the hook (which fetches via
 * wagmi) and the services (which consume the snapshot to compute fees
 * and curve usage) can refer to a single canonical shape — services
 * stay React-free.
 */
export interface IntuitionSession {
  /** Wei cost to create one atom (sum of protocol fees deducted from each `assets[i]`). */
  atomCost: bigint;
  /** Wei cost to create one triple. */
  tripleCost: bigint;
  /** Default bonding-curve ID for deposit/redeem operations. */
  defaultCurveId: CurveId;
}
