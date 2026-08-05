# Intuition Ontology

A playground for **agreeing on an ontology, using Intuition itself as the agreement
mechanism**.

Every other Intuition app *consumes* a vocabulary. This one *produces* it: which entity
types exist, which predicates are legitimate, and which predicate belongs in a given
`Subject — ? — Object` slot are proposed, staked on, and contested on chain.

Live at [ontology.intuition.box](https://ontology.intuition.box).

## Why this exists

Some vocabulary decisions have no principled answer, and no team can legitimately make them
alone. Today they get settled by fiat — a default in a spec, an alphabetical tiebreak — and
the arbitrariness becomes invisible once frozen into a builder.

For example, upstream currently resolves the canonical direction of inverse predicate pairs
with "lexicographically smaller key wins", which decides `citedBy` over `reference` because
`c` sorts before `r`. That is a coin flip wearing the costume of a rule.

This app makes such decisions contestable and settles them by stake.

## The three levels

| Level | Question | Mechanism |
|---|---|---|
| **Slot** | Which predicate is best for `Person — ? — Organisation`? | `predicate — is best usage for → slot triple` |
| **Membership** | Does this predicate belong in the standard at all? | `candidate — listed in → predicate registry` |
| **Claim** | Ordinary statements about entities | `subject — predicate → object` |

## Canonical identity

Every atom in Intuition is a pure function of its bytes:

```
atomId = keccak256(ATOM_SALT ‖ keccak256(utf8(atomData)))
```

Predicates are canonical JSON-LD `DefinedTerm` documents, **not** bare labels. Hashing
`"created by"` and hashing the registry's document for `createdBy` produce different ids —
so an app that mints from labels writes atoms nobody else can find.

All canonical-vocabulary access goes through
[`src/lib/intuition/canonical.ts`](src/lib/intuition/canonical.ts), the single boundary to
the (alpha) `@0xintuition/*` packages. Nothing else imports them directly, so an alpha bump
has one blast radius.

Two reconciliation tables map this app's curated data onto the registry:

- [`predicate-registry-map.ts`](src/lib/intuition/predicate-registry-map.ts) — 56 predicates:
  29 direct, 7 requiring a direction flip, 20 proposal candidates.
- [`classification-map.ts`](src/lib/intuition/classification-map.ts) — 39 entity types:
  32 direct, 4 renamed upstream, 3 app-local.

### Direction flips

Seven predicates read the opposite way from their canonical counterpart — this app's
`employs` is the registry's `employedBy`. Submitting swaps subject and object so the write
lands on the canonical triple.

This matters economically: `⟨A, employs, B⟩` and `⟨B, employedBy, A⟩` are one fact hashing to
two triple ids and therefore two vaults, splitting stake across both. Upstream flags this as
blocking (audit A1) and plans mint-time canonicalisation; until that ships, this app does it
locally. The claim builder discloses the swap before you stake.

## Running locally

```bash
pnpm install
pnpm dev
```

Requires Node ≥ 20.19 and pnpm 9.

```bash
pnpm build      # tsc -b && vite build
pnpm lint
```

## Configuration

Copy `.env.example` to `.env.local`. Every variable is **build-time** — Vite inlines
`import.meta.env.VITE_*` during `vite build`, and this is a static site with no server
process to read the environment at runtime.

`VITE_PRIVY_APP_ID` is optional. Without it the app runs **read-only**: browsing, the
matrix, the graph and the registry all work; connecting a wallet and submitting claims do
not. The read-only bundle is ~860 kB versus ~5.6 MB with the wallet stack, because Privy and
wagmi tree-shake out entirely.

See `.env.example` for deployment notes, including the Coolify build-variable requirement.

## Architecture

```
src/
  data/            Curated static vocabulary — atom types, predicates, patterns
  lib/intuition/   Canonical identity, registry reconciliation, protocol reads/writes
  lib/wallet/      Privy + wagmi wiring, network switching, read-only fallbacks
  components/      Claim builder, visualisations, wallet UI
  pages/           Explorer, Matrix, Protocol, Registry, Contributing
```

Static data is retained as a selectable "examples" mode alongside live mainnet and testnet
data — useful for exploring the shape of the ontology without touching a chain.

## Status

The canonical registry is **not yet minted on any network**. `@0xintuition/predicates` ships
25 enshrined predicates plus a `predicateRegistry` atom as pre-computed ids that nobody has
written on chain. See [`plan.md`](plan.md) for the full analysis and the open questions for
the Intuition team.
