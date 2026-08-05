import {
  createAtomFromString,
  createTripleStatement,
  multiVaultDeposit,
  multiVaultGetAtomCost,
  multiVaultGetGeneralConfig,
  multiVaultGetInverseTripleId,
  multiVaultGetTripleCost,
  wait,
} from '@0xintuition/sdk';
import type { WriteConfig } from '@0xintuition/sdk';
import { formatEther } from 'viem';

import {
  findOntologySlotTriple,
  type OntologySlotRef,
} from './ontology-slots';
import { LISTED_IN, PREDICATE_REGISTRY } from './canonical';
import { findAtomByTermId, findAtomsByLabel, findExistingTermIds } from './ontology-graphql';
import { ONTOLOGY_META_PREDICATE_LABEL } from './ontology-vocabulary';
import type { ProtocolAtomResolution } from './types';

/** GraphQL indexing poll — matches SDK example defaults. */
const INDEX_WAIT_OPTIONS = {
  pollingInterval: 1000,
  timeout: 30_000,
} as const;

type TripleCreatedState = Awaited<ReturnType<typeof createTripleStatement>>['state'];

function parseTripleTermId(state: TripleCreatedState): `0x${string}` | null {
  const first = state[0];
  const termId = first?.args?.termId;
  return termId ?? null;
}

/** Protocol fee + minimum vault deposit required per triple (see SDK sync helper). */
async function getTripleAssetsPerStatement(config: WriteConfig): Promise<bigint> {
  const [tripleCost, generalConfig] = await Promise.all([
    multiVaultGetTripleCost(config),
    multiVaultGetGeneralConfig(config),
  ]);
  return tripleCost + generalConfig.minDeposit;
}

/** Estimate TRUST for ontology nested proposal (atoms + slot if missing + meta triple). */
export async function estimateOntologyProposalCost(
  config: WriteConfig,
  proposedPredicateResolution: ProtocolAtomResolution,
  slotRef: OntologySlotRef
): Promise<bigint> {
  const [atomCost, triplePayment] = await Promise.all([
    multiVaultGetAtomCost(config),
    getTripleAssetsPerStatement(config),
  ]);

  let newAtoms = proposedPredicateResolution.mode === 'create' ? 1 : 0;

  const metaExists = (await findAtomsByLabel(ONTOLOGY_META_PREDICATE_LABEL, 1)).length > 0;
  if (!metaExists) newAtoms += 1;

  const slotTriple = await findOntologySlotTriple(slotRef);
  if (!slotTriple) {
    newAtoms += 3;
    return atomCost * BigInt(newAtoms) + triplePayment * 2n;
  }

  return atomCost * BigInt(newAtoms) + triplePayment;
}

/**
 * Stake on a proposal — agreement or dissent.
 *
 * Agreeing deposits into the triple's own vault. Disagreeing deposits into the
 * *counter-triple's* vault, which is a distinct term with its own id; the
 * contract derives it, so we ask the chain rather than assuming.
 *
 * The amount defaults to the protocol's `minDeposit`. A vote here is a signal,
 * not a position size — anyone wanting real exposure should use the Portal,
 * which is built for it.
 */
export async function stakeOnTriple(
  config: WriteConfig,
  tripleTermId: `0x${string}`,
  side: 'for' | 'against',
  onProgress?: (message: string) => void
): Promise<`0x${string}`> {
  const account = config.walletClient.account;
  if (!account) {
    throw new Error('Wallet account is not available.');
  }

  const generalConfig = await multiVaultGetGeneralConfig(config);
  const amount = generalConfig.minDeposit;

  let termId = tripleTermId;
  if (side === 'against') {
    onProgress?.('Resolving counter-triple…');
    termId = await multiVaultGetInverseTripleId(config, { args: [tripleTermId] });
  }

  await assertWalletBalance(config, amount);

  onProgress?.(side === 'for' ? 'Staking in favour…' : 'Staking against…');

  const txHash = await multiVaultDeposit(config, {
    // [receiver, termId, curveId, minShares] — curve 1 is the default bonding
    // curve the indexer reports positions against.
    args: [account.address, termId, 1n, 0n],
    value: amount,
  });

  if (!txHash) {
    throw new Error('Deposit failed.');
  }

  onProgress?.('Indexing your stake…');
  await wait(txHash, INDEX_WAIT_OPTIONS);

  return txHash;
}

/**
 * Estimate TRUST for a registry proposal: ⟨candidate, listedIn, registry⟩.
 *
 * Up to three atoms may need minting (the candidate, `listedIn`, and the
 * registry atom itself — none of which are guaranteed to exist), plus one
 * triple. Deterministic ids let us check exactly which are missing rather than
 * assuming the worst case.
 */
export async function estimateRegistryProposalCost(
  config: WriteConfig,
  candidateAtomId: `0x${string}`
): Promise<bigint> {
  const [atomCost, triplePayment] = await Promise.all([
    multiVaultGetAtomCost(config),
    getTripleAssetsPerStatement(config),
  ]);

  const required: `0x${string}`[] = [
    candidateAtomId,
    LISTED_IN.atomId,
    PREDICATE_REGISTRY.atomId,
  ];
  const existing = await findExistingTermIds(required);
  const missing = required.filter((id) => !existing.has(id)).length;

  return atomCost * BigInt(missing) + triplePayment;
}

/** @deprecated Use estimateOntologyProposalCost for ontology claims. */
export async function estimateClaimOnchainCost(
  config: WriteConfig,
  subjectResolution: ProtocolAtomResolution,
  predicateResolution: ProtocolAtomResolution,
  objectResolution: ProtocolAtomResolution
): Promise<bigint> {
  const [atomCost, triplePayment] = await Promise.all([
    multiVaultGetAtomCost(config),
    getTripleAssetsPerStatement(config),
  ]);

  const resolutions = [subjectResolution, predicateResolution, objectResolution];
  const newAtoms = resolutions.filter((r) => r.mode === 'create').length;

  return atomCost * BigInt(newAtoms) + triplePayment;
}

export async function assertSufficientTrustBalance(
  config: WriteConfig,
  required: bigint
): Promise<void> {
  await assertWalletBalance(config, required);
}

async function assertWalletBalance(config: WriteConfig, required: bigint): Promise<void> {
  const account = config.walletClient.account;
  if (!account) {
    throw new Error('Wallet account is not available.');
  }

  const balance = await config.publicClient.getBalance({ address: account.address });
  if (balance < required) {
    throw new Error(
      `Insufficient TRUST balance. Need at least ${formatEther(required)} TRUST for this step (wallet has ${formatEther(balance)} TRUST).`
    );
  }
}

/**
 * Create an on-chain atom from a plain string label.
 * @see https://www.docs.intuition.systems/docs/intuition-sdk/examples/create-atom-from-string
 */
export async function writeAtomFromLabel(
  config: WriteConfig,
  label: string,
  onProgress?: (message: string) => void
): Promise<`0x${string}`> {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Atom label cannot be empty.');
  }

  onProgress?.(`Creating atom «${trimmed}»…`);

  const atom = await createAtomFromString(config, trimmed as `${string}`);

  onProgress?.(`Indexing atom «${trimmed}»…`);
  await wait(atom.transactionHash, INDEX_WAIT_OPTIONS);

  return atom.state.termId;
}

/**
 * Create an atom from canonical bytes, reusing it if the id already exists.
 *
 * `createAtomFromString` writes `toHex(data)` verbatim, and an atom's id is
 * `keccak256(ATOM_SALT ‖ keccak256(utf8(data)))` — so passing a canonical
 * JSON-LD document here produces exactly the id the rest of the ecosystem
 * derives for it. That is the whole fix: the app used to pass a bare label
 * (`'created by'`), which hashed to something no other app would ever look up.
 *
 * Because the id is known before submitting, we can check the indexer first and
 * skip minting a duplicate — free, synchronous, and no wallet required.
 */
export async function writeCanonicalAtom(
  config: WriteConfig,
  atomData: string,
  expectedTermId: `0x${string}`,
  displayLabel: string,
  onProgress?: (message: string) => void
): Promise<`0x${string}`> {
  const existing = await findAtomByTermId(expectedTermId);
  if (existing?.term_id?.startsWith('0x')) {
    onProgress?.(`Reusing canonical atom «${displayLabel}»…`);
    return existing.term_id as `0x${string}`;
  }

  onProgress?.(`Creating canonical atom «${displayLabel}»…`);
  const atom = await createAtomFromString(config, atomData as `${string}`);

  onProgress?.(`Indexing atom «${displayLabel}»…`);
  await wait(atom.transactionHash, INDEX_WAIT_OPTIONS);

  const mintedTermId = atom.state.termId;
  if (mintedTermId.toLowerCase() !== expectedTermId.toLowerCase()) {
    // The contract derives the id from the same bytes we hashed, so a mismatch
    // means our derivation drifted from the chain's — never silently continue.
    throw new Error(
      `Canonical id mismatch for «${displayLabel}»: expected ${expectedTermId}, chain returned ${mintedTermId}. ` +
        'The @0xintuition/ids derivation may have changed — do not stake against this atom.'
    );
  }

  return mintedTermId;
}

/**
 * Link subject, predicate, and object atoms into a triple statement.
 * @see https://www.docs.intuition.systems/docs/intuition-sdk/examples/create-triple-statement
 */
export async function writeTripleFromTermIds(
  config: WriteConfig,
  subjectTermId: `0x${string}`,
  predicateTermId: `0x${string}`,
  objectTermId: `0x${string}`,
  onProgress?: (message: string) => void
): Promise<{
  tripleTransactionHash: `0x${string}`;
  tripleTermId: `0x${string}`;
}> {
  onProgress?.('Creating triple on Intuition…');

  const assetsPerTriple = await getTripleAssetsPerStatement(config);
  await assertWalletBalance(config, assetsPerTriple);

  const triple = await createTripleStatement(config, {
    args: [
      [subjectTermId],
      [predicateTermId],
      [objectTermId],
      [assetsPerTriple],
    ],
    value: assetsPerTriple,
  });

  const tripleTermId = parseTripleTermId(triple.state);
  if (!tripleTermId) {
    throw new Error('Triple created but term id was not found in the receipt.');
  }

  onProgress?.('Indexing triple on Intuition…');
  await wait(triple.transactionHash, INDEX_WAIT_OPTIONS);

  return {
    tripleTransactionHash: triple.transactionHash,
    tripleTermId,
  };
}
