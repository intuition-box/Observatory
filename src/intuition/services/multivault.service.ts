import type {
  Account,
  Address,
  Chain,
  Hex,
  PublicClient,
  WalletClient,
} from 'viem';

import { multivaultReadAbi, multivaultWriteAbi } from '../abi/multivault';
import { asAtomId, asTripleId, type AtomId, type Bytes32, type TripleId } from '../types';

/**
 * Read-side wrapper around the MultiVault contract.
 *
 * Owns every `readContract` call against the contract and returns
 * branded values so callers cannot accidentally mix atom and triple IDs
 * downstream. The class is intentionally thin: validation lives in the
 * branded constructors, business decisions (skip-if-exists, batch math)
 * live in `ClaimSubmissionService` one layer up.
 */
export class MultiVaultReadService {
  private readonly publicClient: PublicClient;
  private readonly address: Address;

  constructor(publicClient: PublicClient, address: Address) {
    this.publicClient = publicClient;
    this.address = address;
  }

  async calculateAtomId(data: Hex): Promise<AtomId> {
    const id = await this.publicClient.readContract({
      address: this.address,
      abi: multivaultReadAbi,
      functionName: 'calculateAtomId',
      args: [data],
    });
    return asAtomId(id);
  }

  async calculateTripleId(
    subjectId: AtomId,
    predicateId: AtomId,
    objectId: AtomId
  ): Promise<TripleId> {
    const id = await this.publicClient.readContract({
      address: this.address,
      abi: multivaultReadAbi,
      functionName: 'calculateTripleId',
      args: [subjectId, predicateId, objectId],
    });
    return asTripleId(id);
  }

  async isTermCreated(id: Bytes32): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.address,
      abi: multivaultReadAbi,
      functionName: 'isTermCreated',
      args: [id],
    });
  }
}

export interface CreateAtomsArgs {
  datas: Hex[];
  assets: bigint[];
  value: bigint;
  account: Address | Account;
  chain: Chain;
}

export interface CreateTriplesArgs {
  subjectIds: AtomId[];
  predicateIds: AtomId[];
  objectIds: AtomId[];
  assets: bigint[];
  value: bigint;
  account: Address | Account;
  chain: Chain;
}

/**
 * Write-side wrapper around the MultiVault contract.
 *
 * Each method submits the transaction and awaits its receipt before
 * resolving — so callers can treat a resolved promise as "mined".
 * The orchestrator never touches `walletClient.writeContract` or the
 * write ABI directly; that surface is fully encapsulated here.
 */
export class MultiVaultWriteService {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;
  private readonly address: Address;

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient,
    address: Address
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.address = address;
  }

  async createAtoms(args: CreateAtomsArgs): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.address,
      abi: multivaultWriteAbi,
      functionName: 'createAtoms',
      args: [args.datas, args.assets],
      value: args.value,
      account: args.account,
      chain: args.chain,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async createTriples(args: CreateTriplesArgs): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.address,
      abi: multivaultWriteAbi,
      functionName: 'createTriples',
      args: [args.subjectIds, args.predicateIds, args.objectIds, args.assets],
      value: args.value,
      account: args.account,
      chain: args.chain,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }
}
