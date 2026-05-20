# Architecture

This document describes the strict layering of the Ontology codebase. Imports flow in **one direction only**:

```
pages → components → hooks → services → lib
                              ↘ config ↙
```

Reverse imports are violations. The `architecture-reviewer` agent enforces this at every phase gate.

## Layers

### `src/pages/`

Route-level assembly. Composes components into a page. No business logic, no service calls — wires components and reads from hooks.

**Allowed imports:** `components/`, `hooks/`, `lib/`, external pkgs.
**Forbidden:** `services/` directly.

### `src/components/`

Pure presentation. Props in, callbacks out. Stateless or with purely UI-local state (collapse, hover, form draft).

**Allowed:** `hooks/`, `lib/`, `types/`, external React/UI pkgs.
**Forbidden:** `services/`, `config/`, direct contract or fetch calls, `import.meta.env`.

### `src/hooks/`

**Orchestrators.** Each hook composes one or more services into React state. Manages loading/error machines, debouncing, caching via TanStack Query.

A hook should be readable as: "call service A, then service B, expose the result as state."

**Allowed:** `services/`, `lib/`, `config/`, `types/`, React, wagmi, TanStack Query.
**Forbidden:** business rules (delegate to a service), JSX (return data, not UI), DOM access.

### `src/services/`

**Business logic.** Pure TypeScript modules or classes. Domain-specific operations: build a triple from a claim, derive an atom ID, decide whether IPFS pinning is needed, compute fee-adjusted assets.

Services are unit-testable in isolation without React.

**Allowed:** `lib/`, `config/`, `types/`, viem, graphql-request, zod, external pure pkgs.
**Forbidden:** `react`, `react-dom`, JSX, anything from `components/`, `hooks/`, `pages/`, DOM globals.

Subdivide by domain:

- `services/intuition/` — atom + triple creation, deposit, redeem, GraphQL queries.
- `services/ipfs/` — pinning structured atom data.
- `services/claim/` — claim → onchain triple translation, predicate resolution.

### `src/lib/`

Pure utilities, helpers, ABIs, chain definitions, schemas.

**Allowed:** `types/`, `config/` (for constants only), external pkgs.
**Forbidden:** `services/`, `hooks/`, `components/`, `pages/`, React.

Subdivide:

- `lib/abi/` — `parseAbi(...)` fragments per contract.
- `lib/chains.ts` — `defineChain` for Intuition L3.
- `lib/schemas/` — zod schemas shared across layers.
- `lib/types/` — branded types and protocol-specific type definitions.
- `lib/conjugate.ts`, `lib/atom-colors.ts`, etc. — pure helpers.

### `src/config/`

Typed env-var loader and constants.

**Allowed:** `lib/`, `types/`, zod.
**Forbidden:** Side effects, network calls, anything React.

`src/config/env.ts` is the **only** file that reads `import.meta.env.*`. All other code imports from here.

### `src/types/`

Cross-cutting type definitions.

**Allowed:** other types, branded type primitives.
**Forbidden:** implementations, runtime code.

### `src/data/`

Static seeds: atom types, predicates, hierarchy, glossary atoms, semantic rankings, example claims.

These remain as **fallback data** for the read views when the GraphQL indexer is unreachable, and as **default seeding** for atoms not yet on-chain.

**Allowed:** `types/`.
**Forbidden:** mutations, dynamic loading.

## Naming conventions

| Kind | Pattern | Example |
|------|---------|---------|
| Component | `PascalCase.tsx` | `ClaimBuilder.tsx` |
| Hook | `use-kebab-case.ts` exporting `useCamelCase` | `use-submit-claim.ts` → `useSubmitClaim` |
| Service module | `kebab-case.service.ts` exporting named functions | `intuition.service.ts` |
| Service class | `PascalCaseService` | `IntuitionService` |
| ABI | `lib/abi/<contract>.ts` exporting `<contract>Abi` | `multivault.ts` → `multivaultAbi` |
| Schema | `lib/schemas/<entity>.schema.ts` | `claim.schema.ts` |
| Branded type | `lib/types/<domain>.ts` | `intuition.ts` exporting `AtomId`, `TripleId` |

## Implementation strategy

Per ADR-003, the bounty work ships as two branches. The foundation branch leaves all existing code untouched and adds a self-contained `src/intuition/` module that mirrors the layered structure internally:

```
src/
  config/
    env.ts                        # zod-validated env loader (only reader of import.meta.env)
  intuition/                      # self-contained domain module
    chains.ts                     # defineChain for Intuition L3 mainnet + testnet
    types.ts                      # branded AtomId / TripleId / CurveId + assertNever
    wagmi-config.ts               # wagmi createConfig wired to env-selected chain
    abi/
      multivault.ts               # MultiVault read + write ABI fragments
    services/                     # business logic, no React deps
      graphql.service.ts          # indexer queries (atoms, triples, predicate resolution)
      ipfs.service.ts             # IPFS pinning via GraphQL mutations (see ADR-004)
    hooks/                        # React orchestrators
      use-intuition-session.ts    # cached atomCost / tripleCost / defaultCurveId
```

Existing folders (`components/`, `lib/`, `data/`, `pages/`) are not modified by the foundation branch. The bounty branch (built on top) wires the new module into the existing UI: provider in `App.tsx`, submission in `claim-builder.tsx`, live data in the visualization components.
