import { parseAbi } from 'viem';

/**
 * MultiVault contract ABI fragments.
 *
 * Sourced from the canonical Intuition V2 contracts:
 * https://github.com/0xIntuition/intuition-v2/tree/main/contracts/core
 *
 * The Intuition L3 is not indexed by Etherscan, so the ABI must be declared
 * explicitly. Split into read- and write-only subsets so services that only
 * query state never accidentally hold a payable function reference. A merged
 * `multivaultAbi` is exported for the rare contract instance that needs both.
 *
 * Protocol invariants reflected in the signatures:
 * - All atom/triple/term IDs are `bytes32` (deterministic hashes), never `uint256`.
 * - Atom and triple creation are batch-only (`createAtoms` / `createTriples`).
 * - Deposits/redemptions require an explicit `curveId`; fetch the default once
 *   per session via `getBondingCurveConfig()`.
 */

export const multivaultReadAbi = parseAbi([
  // Cost queries
  'function getAtomCost() view returns (uint256)',
  'function getTripleCost() view returns (uint256)',

  // Existence and vault-type checks
  'function isAtom(bytes32 atomId) view returns (bool)',
  'function isTriple(bytes32 id) view returns (bool)',
  'function isCounterTriple(bytes32 termId) view returns (bool)',
  'function isTermCreated(bytes32 id) view returns (bool)',
  'function getVaultType(bytes32 termId) view returns (uint8)',

  // Atom and triple data
  'function atom(bytes32 atomId) view returns (bytes)',
  'function getAtom(bytes32 atomId) view returns (bytes)',
  'function triple(bytes32 tripleId) view returns (bytes32, bytes32, bytes32)',
  'function getTriple(bytes32 tripleId) view returns (bytes32, bytes32, bytes32)',

  // ID derivation
  'function calculateAtomId(bytes data) pure returns (bytes32)',
  'function calculateTripleId(bytes32 subjectId, bytes32 predicateId, bytes32 objectId) pure returns (bytes32)',
  'function calculateCounterTripleId(bytes32 subjectId, bytes32 predicateId, bytes32 objectId) pure returns (bytes32)',
  'function getCounterIdFromTripleId(bytes32 tripleId) pure returns (bytes32)',
  'function getInverseTripleId(bytes32 tripleId) view returns (bytes32)',

  // Vault state
  'function getVault(bytes32 termId, uint256 curveId) view returns (uint256 totalAssets, uint256 totalShares)',
  'function getShares(address account, bytes32 termId, uint256 curveId) view returns (uint256)',
  'function maxRedeem(address sender, bytes32 termId, uint256 curveId) view returns (uint256)',
  'function currentSharePrice(bytes32 termId, uint256 curveId) view returns (uint256)',
  'function convertToShares(bytes32 termId, uint256 curveId, uint256 assets) view returns (uint256)',
  'function convertToAssets(bytes32 termId, uint256 curveId, uint256 shares) view returns (uint256)',

  // Preview (mandatory before any write)
  'function previewDeposit(bytes32 termId, uint256 curveId, uint256 assets) view returns (uint256 shares, uint256 assetsAfterFees)',
  'function previewRedeem(bytes32 termId, uint256 curveId, uint256 shares) view returns (uint256 assetsAfterFees, uint256 sharesUsed)',
  'function previewAtomCreate(bytes32 termId, uint256 assets) view returns (uint256 shares, uint256 assetsAfterFixedFees, uint256 assetsAfterFees)',
  'function previewTripleCreate(bytes32 termId, uint256 assets) view returns (uint256 shares, uint256 assetsAfterFixedFees, uint256 assetsAfterFees)',

  // Fee queries
  'function protocolFeeAmount(uint256 assets) view returns (uint256)',
  'function entryFeeAmount(uint256 assets) view returns (uint256)',
  'function exitFeeAmount(uint256 assets) view returns (uint256)',
  'function atomDepositFractionAmount(uint256 assets) view returns (uint256)',

  // Configuration
  'function getGeneralConfig() view returns ((address admin, address protocolMultisig, uint256 feeDenominator, address trustBonding, uint256 minDeposit, uint256 minShare, uint256 atomDataMaxLength, uint256 feeThreshold))',
  'function getAtomConfig() view returns ((uint256 atomCreationProtocolFee, uint256 atomWalletDepositFee))',
  'function getTripleConfig() view returns ((uint256 tripleCreationProtocolFee, uint256 atomDepositFractionForTriple))',
  'function getBondingCurveConfig() view returns ((address registry, uint256 defaultCurveId))',
  'function getVaultFees() view returns ((uint256 entryFee, uint256 exitFee, uint256 protocolFee))',

  // Atom wallet
  'function computeAtomWalletAddr(bytes32 atomId) view returns (address)',
]);

export const multivaultWriteAbi = parseAbi([
  // Atom creation (batch-only — `assets[i]` >= getAtomCost(); msg.value = sum(assets))
  'function createAtoms(bytes[] atomDatas, uint256[] assets) payable returns (bytes32[])',

  // Triple creation (batch-only — `assets[i]` >= getTripleCost(); msg.value = sum(assets))
  'function createTriples(bytes32[] subjectIds, bytes32[] predicateIds, bytes32[] objectIds, uint256[] assets) payable returns (bytes32[])',

  // Single deposit and redeem (slippage via minShares / minAssets)
  'function deposit(address receiver, bytes32 termId, uint256 curveId, uint256 minShares) payable returns (uint256)',
  'function redeem(address receiver, bytes32 termId, uint256 curveId, uint256 shares, uint256 minAssets) returns (uint256)',

  // Batch deposit and redeem
  'function depositBatch(address receiver, bytes32[] termIds, uint256[] curveIds, uint256[] assets, uint256[] minShares) payable returns (uint256[])',
  'function redeemBatch(address receiver, bytes32[] termIds, uint256[] curveIds, uint256[] shares, uint256[] minAssets) returns (uint256[])',

  // Approvals
  'function approve(address sender, uint8 approvalType)',

  // Atom wallet
  'function claimAtomWalletDepositFees(bytes32 atomId)',
]);
