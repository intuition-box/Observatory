import { useMemo } from 'react';
import { GraphQLClient } from 'graphql-request';
import { env } from '../../config/env';
import { IndexerService } from '../services/graphql.service';

/**
 * React-side wiring for the read-only Intuition indexer.
 *
 * Owns the env-coupled construction of the `GraphQLClient` and the
 * `IndexerService` so consumer hooks (TanStack Query) get a stable
 * service reference. No wallet or `walletClient` needed — this is the
 * lightweight read-only counterpart to `createIntuitionServices`,
 * usable by views and lists that don't issue any on-chain write.
 */
export function useIndexer(): IndexerService {
  return useMemo(() => new IndexerService(new GraphQLClient(env.graphqlUrl)), []);
}
