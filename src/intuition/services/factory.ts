import { GraphQLClient } from 'graphql-request';
import type { Address, PublicClient, WalletClient } from 'viem';

import { ClaimSubmissionService } from './claim-submission.service';
import { IndexerService } from './graphql.service';
import { PinningService } from './ipfs.service';
import {
  MultiVaultReadService,
  MultiVaultWriteService,
} from './multivault.service';

/**
 * Wires the Intuition service tree from raw infrastructure clients.
 *
 * One GraphQL client is shared across the indexer and pinning services
 * (same endpoint). The MultiVault read and write services are split so
 * a read-only flow never holds a wallet-bound instance — pass
 * `walletClient: null` when the caller is not connected.
 *
 * The factory is the single integration seam between the React layer
 * (which owns the client lifecycle) and the service layer (which owns
 * the business logic). Tests can replace this with a stub that returns
 * mocked services.
 */
export interface IntuitionServiceTreeArgs {
  publicClient: PublicClient;
  walletClient: WalletClient;
  graphqlUrl: string;
  multivaultAddress: Address;
}

export interface IntuitionServiceTree {
  indexer: IndexerService;
  pinning: PinningService;
  multivaultRead: MultiVaultReadService;
  multivaultWrite: MultiVaultWriteService;
  claimSubmission: ClaimSubmissionService;
}

export function createIntuitionServices(
  args: IntuitionServiceTreeArgs
): IntuitionServiceTree {
  const graphql = new GraphQLClient(args.graphqlUrl);
  const indexer = new IndexerService(graphql);
  const pinning = new PinningService(graphql);
  const multivaultRead = new MultiVaultReadService(
    args.publicClient,
    args.multivaultAddress
  );
  const multivaultWrite = new MultiVaultWriteService(
    args.publicClient,
    args.walletClient,
    args.multivaultAddress
  );
  const claimSubmission = new ClaimSubmissionService({
    indexer,
    pinning,
    multivaultRead,
    multivaultWrite,
  });
  return { indexer, pinning, multivaultRead, multivaultWrite, claimSubmission };
}
