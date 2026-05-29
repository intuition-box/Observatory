import { parseAbi } from 'viem';

/**
 * MultiVault contract ABI fragments.
 * Sourced from the canonical Intuition V2 contracts.
 * Split into read and write subsets for safety.
 */

/** Read-only ABI fragments for queries and cost checks */
export const multivaultReadAbi = parseAbi([
  // Cost queries
  'function atomCost() view returns (uint256)',
  'function tripleCost() view returns (uint256)',
  'function getAtomCost() view returns (uint256)',
  'function getTripleCost() view returns (uint256)',

  // Existence checks
  'function isAtomId(uint256 atomId) view returns (bool)',
  'function isTripleId(uint256 tripleId) view returns (bool)',

  // Atom data
  'function atoms(uint256 atomId) view returns (bytes)',
  'function atomsByHash(bytes32 hash) view returns (uint256)',

  // Triple data
  'function triples(uint256 tripleId) view returns (uint256 subjectId, uint256 predicateId, uint256 objectId)',

  // Vault state
  'function getVaultTotalAssets(uint256 vaultId) view returns (uint256)',
  'function getVaultTotalShares(uint256 vaultId) view returns (uint256)',

  // Preview functions
  'function previewDeposit(uint256 assets, uint256 vaultId) view returns (uint256)',
  'function previewRedeem(uint256 shares, uint256 vaultId) view returns (uint256)',

  // Config
  'function defaultCurveId() view returns (uint256)',
]);

/** Write ABI fragments for creating atoms/triples and managing deposits */
export const multivaultWriteAbi = parseAbi([
  // Create
  'function createAtom(bytes atomData) payable returns (uint256)',
  'function batchCreateAtom(bytes[] atomData) payable returns (uint256[])',
  'function createTriple(uint256 subjectId, uint256 predicateId, uint256 objectId) payable returns (uint256)',
  'function batchCreateTriple(uint256[] subjectIds, uint256[] predicateIds, uint256[] objectIds) payable returns (uint256[])',

  // Deposit / Redeem
  'function depositAtom(address receiver, uint256 atomId) payable returns (uint256)',
  'function depositTriple(address receiver, uint256 tripleId) payable returns (uint256)',
  'function redeemAtom(uint256 shares, address receiver, uint256 atomId) returns (uint256)',
  'function redeemTriple(uint256 shares, address receiver, uint256 tripleId) returns (uint256)',
]);

/** Combined ABI for consumers that need both read and write */
export const multivaultAbi = [...multivaultReadAbi, ...multivaultWriteAbi] as const;
