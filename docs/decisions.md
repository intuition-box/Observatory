# Architecture Decision Records

Append-only log of non-obvious technical decisions.

---

## ADR-001: Self-contained `src/intuition/` module

**Date:** 2026-04-29
**Status:** Accepted

**Context:** The bounty requires integrating wallet connection, contract calls,
IPFS pinning, and GraphQL queries into a static Vite/React app. Scattering these
across the existing directory structure would create coupling and make the
integration hard to review, test, or extract.

**Decision:** All Intuition-specific code lives under `src/intuition/` with a
barrel export (`index.ts`). The module is self-contained: it owns its ABI
fragments, chain definitions, hooks, services, and types. The rest of the app
imports only from `src/intuition` (the barrel), never from internal paths.

**Consequences:**
- Clean diff: reviewers see exactly what's new vs. what's existing code.
- Extractable: the module can become `@ontology/intuition` if the project grows.
- Barrel import keeps the public API surface minimal and stable.

---

## ADR-002: Lightweight GraphQL over `@0xintuition/graphql`

**Date:** 2026-04-29
**Status:** Accepted

**Context:** The official `@0xintuition/graphql` SDK provides pre-built queries
but pulls in significant bundle weight (graphql-codegen runtime, urql bindings)
and is tightly coupled to a specific GraphQL client.

**Decision:** Implement a thin `graphql.service.ts` using raw `fetch` + typed
response mappers. Queries are plain template strings, not code-generated.

**Consequences:**
- ~50KB smaller bundle than the SDK approach.
- Manual type maintenance for query responses (acceptable: the schema is small).
- No automatic type generation from GraphQL schema (trade-off for simplicity).

---

## ADR-003: Demo mode for zero-config development

**Date:** 2026-04-29
**Status:** Accepted

**Context:** Contributors cloning the repo need to create a `.env` file with
RPC URLs and contract addresses before the app boots. This friction discourages
casual exploration and breaks CI preview deployments.

**Decision:** `src/config/env.ts` falls back to a demo mode when env vars are
missing. Demo mode uses hardcoded testnet defaults and disables write operations.
A visible badge in the UI header indicates the current mode.

**Consequences:**
- `git clone && npm install && npm run dev` works immediately.
- Demo mode cannot submit on-chain transactions (by design).
- CI/CD preview deploys work without secrets configuration.

---

## ADR-004: Branded types for protocol IDs

**Date:** 2026-04-29
**Status:** Accepted

**Context:** Atom IDs, Triple IDs, and Curve IDs are all `bigint` values at the
contract level, but passing a Triple ID where an Atom ID is expected causes
silent data corruption — the contract accepts any `uint256`.

**Decision:** Use TypeScript branded types (`AtomId`, `TripleId`, `CurveId`) to
make these domain-specific at the type level. Helper functions `toAtomId()`,
`toTripleId()`, `toCurveId()` perform the casting.

**Consequences:**
- Compiler catches cross-ID misuse at build time.
- Small cognitive overhead: callers must wrap raw bigints.
- Zero runtime cost (brands are erased at transpile time).

---

## ADR-005: IPFS pinning with retry and LRU cache

**Date:** 2026-04-30
**Status:** Accepted

**Context:** IPFS pinning via the indexer GraphQL endpoint is a network call that
can fail transiently. Duplicate pins for the same atom data waste bandwidth and
create unnecessary IPFS objects.

**Decision:** `ipfs.service.ts` implements exponential backoff retry (3 attempts)
and an in-memory LRU cache (128 entries) keyed by `type:JSON(data)`.

**Consequences:**
- Transient pinning failures don't block the user flow.
- Repeated claim submissions for the same entity reuse cached URIs.
- Cache is lost on page refresh (acceptable for a browser app).
