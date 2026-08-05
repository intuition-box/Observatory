/**
 * Who is actually backing a claim.
 *
 * A proposal's stake total says how much conviction exists; it does not say
 * *whose*. For a vocabulary decision that distinction matters — one whale and
 * twelve independent builders are very different signals at the same TRUST
 * amount — so this reads the individual positions rather than the aggregate.
 *
 * `positions` are agreement; `counter_positions` are stake on the counter-triple,
 * i.e. explicit disagreement.
 */
import { fetcher } from '@0xintuition/graphql';

import type { TermId } from './canonical';

export interface Backer {
  accountId: string;
  /** Display name if the account has one, otherwise a truncated address. */
  label: string;
  image: string | null;
  shares: bigint;
}

export interface TripleBackers {
  tripleTermId: TermId;
  for: Backer[];
  against: Backer[];
  totalFor: bigint;
  totalAgainst: bigint;
}

const BACKERS_QUERY = `
  query TripleBackers($id: String!, $limit: Int!) {
    triples(where: { term_id: { _eq: $id } }, limit: 1) {
      term_id
      positions(order_by: { shares: desc }, limit: $limit) {
        shares
        account { id label image }
      }
      counter_positions(order_by: { shares: desc }, limit: $limit) {
        shares
        account { id label image }
      }
    }
  }
`;

type RawPosition = {
  shares?: string | null;
  account?: { id?: string | null; label?: string | null; image?: string | null } | null;
};

type BackersResponse = {
  triples?: Array<{
    term_id: string;
    positions?: RawPosition[] | null;
    counter_positions?: RawPosition[] | null;
  }>;
};

function truncate(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function toBackers(rows: RawPosition[] | null | undefined): Backer[] {
  return (rows ?? [])
    .filter((row) => row.account?.id)
    .map((row) => {
      const id = row.account?.id ?? '';
      let shares = 0n;
      try {
        shares = BigInt(row.shares ?? '0');
      } catch {
        shares = 0n;
      }
      return {
        accountId: id,
        label: row.account?.label?.trim() || truncate(id),
        image: row.account?.image ?? null,
        shares,
      };
    })
    // A redeemed position lingers at zero shares; it is no longer backing anything.
    .filter((backer) => backer.shares > 0n);
}

export async function fetchTripleBackers(
  tripleTermId: TermId,
  limit = 100
): Promise<TripleBackers> {
  const data = (await fetcher<BackersResponse, { id: string; limit: number }>(BACKERS_QUERY, {
    id: tripleTermId,
    limit,
  })()) as BackersResponse;

  const triple = data.triples?.[0];
  const forBackers = toBackers(triple?.positions);
  const againstBackers = toBackers(triple?.counter_positions);

  return {
    tripleTermId,
    for: forBackers,
    against: againstBackers,
    totalFor: forBackers.reduce((sum, b) => sum + b.shares, 0n),
    totalAgainst: againstBackers.reduce((sum, b) => sum + b.shares, 0n),
  };
}
