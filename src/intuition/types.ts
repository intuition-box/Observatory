/**
 * Branded ID types for type-safe contract interactions.
 * Prevents mixing up atom IDs with triple IDs at the type level.
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for an Atom in the MultiVault */
export type AtomId = Brand<bigint, 'AtomId'>;

/** Unique identifier for a Triple in the MultiVault */
export type TripleId = Brand<bigint, 'TripleId'>;

/** Unique identifier for a bonding curve */
export type CurveId = Brand<bigint, 'CurveId'>;

/** Helper to create branded IDs from raw bigints */
export const toAtomId = (id: bigint): AtomId => id as AtomId;
export const toTripleId = (id: bigint): TripleId => id as TripleId;
export const toCurveId = (id: bigint): CurveId => id as CurveId;

/** Exhaustiveness check helper */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

/** Intuition Atom from the indexer */
export interface IntuitionAtom {
  id: string;
  vaultId: string;
  label: string;
  type: string;
  image?: string;
  creator: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

/** Intuition Triple from the indexer */
export interface IntuitionTriple {
  id: string;
  vaultId: string;
  subject: IntuitionAtom;
  predicate: IntuitionAtom;
  object: IntuitionAtom;
  creator: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  counterVaultId?: string;
}

/** Session state for Intuition protocol costs */
export type IntuitionSessionState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | {
      status: 'success';
      atomCost: bigint;
      tripleCost: bigint;
      defaultCurveId: CurveId;
    };
