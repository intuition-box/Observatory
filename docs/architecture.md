# Architecture

## System Overview

The Ontology app bridges a local claim-building UI with the Intuition Protocol's
on-chain knowledge graph. Claims authored in the browser are transformed into
Intuition atoms and triples, pinned to IPFS, and submitted to the MultiVault
smart contract on the Intuition L3 chain.

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Pages    │→ │Components│→ │  OnchainFeed     │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
│       ▼              ▼                 ▼             │
│  ┌───────────────────────────────────────────────┐  │
│  │              React Hooks Layer                 │  │
│  │  useAtoms · useTriples · useCreateAtom         │  │
│  │  useCreateTriple · useIntuitionSession         │  │
│  └──────────────┬────────────────────┬───────────┘  │
│                 │                    │               │
│       ┌─────────┘                    └─────────┐    │
│       ▼                                        ▼    │
│  ┌──────────────────┐          ┌────────────────┐   │
│  │ GraphQL Service   │          │  IPFS Service   │  │
│  │ (indexer queries) │          │  (pin mutations) │  │
│  └────────┬─────────┘          └────────┬───────┘   │
│           │                             │           │
│           ▼                             ▼           │
│  ┌──────────────────────────────────────────────┐   │
│  │              wagmi / viem                     │   │
│  │  (wallet connect, contract reads/writes)      │   │
│  └──────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Intuition│  │ Intuition│  │   IPFS   │
    │ L3 Chain │  │ Indexer  │  │ (Pinata) │
    │(MultiVault)│ │(GraphQL) │  │          │
    └──────────┘  └──────────┘  └──────────┘
```

## Layer Rules

Import direction is strictly top-down. Reverse imports are violations.

| Layer | Allowed imports | Forbidden |
|-------|----------------|-----------|
| `pages/` | components, hooks, lib | services directly |
| `components/` | hooks, lib, types | services, config, contract calls |
| `hooks/` | services, lib, config, wagmi | JSX, DOM access |
| `services/` | lib, config, types, viem | React, components, hooks |
| `lib/` | types, config (constants) | services, hooks, components |
| `config/` | lib, types, zod | side effects, React |

## Module: `src/intuition/`

Self-contained protocol integration module. Can be extracted as a standalone
package if needed.

```
src/intuition/
├── abi/
│   └── multivault.ts       # Read + Write ABI fragments
├── hooks/
│   ├── use-atoms.ts         # Fetch atoms from indexer
│   ├── use-triples.ts       # Fetch triples from indexer
│   ├── use-create-atom.ts   # Write: create atom on-chain
│   ├── use-create-triple.ts # Write: create triple on-chain
│   └── use-intuition-session.ts  # Session state (costs, vault ID)
├── services/
│   ├── graphql.service.ts   # Indexer queries (atoms, triples, search)
│   └── ipfs.service.ts      # IPFS pinning with retry + cache
├── chains.ts                # Intuition L3 chain definitions
├── types.ts                 # Branded AtomId / TripleId / CurveId
├── wagmi-config.ts          # wagmi createConfig
└── index.ts                 # Barrel export
```

## Data Flow: Claim → On-Chain Triple

```
1. User fills ClaimBuilder (subject, predicate, object)
2. Each entity is checked: CAIP-10 address → raw bytes, else → IPFS pin
3. pinAtomData() pins structured data, returns ipfs:// URI
4. URI encoded as bytes via viem's toHex()
5. MultiVault.createAtom(bytes) called for each new atom
6. MultiVault.createTriple(subjectId, predicateId, objectId) links them
7. OnchainFeed auto-refreshes via React Query to show the new triple
```

## Environment

All env vars are read exclusively through `src/config/env.ts` (zod-validated).
The app supports three modes:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Demo** | No `.env` file | Read-only UI, no wallet, static data |
| **Testnet** | `VITE_CHAIN_ID=13579` | Full functionality, Base Sepolia faucet |
| **Mainnet** | `VITE_CHAIN_ID=1155` | Production, real ETH required |

## Key Dependencies

| Package | Purpose | Why chosen |
|---------|---------|------------|
| `wagmi` + `viem` | Contract interaction | Industry standard for React dapps |
| `@rainbow-me/rainbowkit` | Wallet UI | Best UX, maintained by Rainbow team |
| `@tanstack/react-query` | Async state | Required by wagmi, handles caching |
| `zod` | Schema validation | Type-safe env loading at boot |
