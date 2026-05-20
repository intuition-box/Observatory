# Architecture Decision Records

Append-only log of non-obvious technical decisions. Format per entry:

```markdown
## ADR-NNN: <title>

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by ADR-MMM
**Context:** ...
**Decision:** ...
**Consequences:** ...
**References:** ...
```

---

## ADR-001: Strict layering (pages → components → hooks → services → lib)

**Date:** 2026-04-29
**Status:** Accepted
**Context:** The bounty integration adds wallet connection, contract calls, IPFS pinning, and GraphQL discovery to a previously static Vite/React app. Without layering, business logic risks landing inside React components, making it unreliable and untestable. The current `lib/` folder already mixes hooks, contexts, schemas, and pure utils.
**Decision:** Adopt one-direction imports across five layers. Components are pure, hooks orchestrate, services hold business logic with no React deps, lib contains pure utilities, config owns env access. Enforced by the `architecture-reviewer` agent at every phase gate.
**Consequences:**
- `services/*` files are unit-testable without a DOM.
- Hooks remain thin and readable as "call A then B".
- Adds friction when a quick component-level fetch would suffice — accepted trade-off, the bounty rewards maintainability.
**References:** `CLAUDE.md`, `docs/architecture.md`.

## ADR-002: Bun as exclusive package manager

**Date:** 2026-04-29
**Status:** Accepted
**Context:** Vite 7 requires Node 20.19+ / 22.12+. The project shipped with `package-lock.json` from npm but the local environment uses bun.
**Decision:** Use bun for all package management and script execution. `npm`/`npx`/`yarn`/`pnpm` denied at the settings level. `package-lock.json` will be replaced by `bun.lockb` after the first `bun install`.
**Consequences:**
- Faster installs, single tool.
- Contributors must have bun 1.x installed.
- Vite's dev-server crypto issue with Node 18 means we also pin Node ≥20.19 in the README.
**References:** `.claude/settings.json`, `CLAUDE.md`.

## ADR-003: Two-branch delivery — foundation first, bounty PR second

**Date:** 2026-04-29
**Status:** Accepted
**Context:** The bounty integration adds a sizeable amount of new code (chain definitions, ABI, types, services, hooks, wagmi config) on top of changes to existing UI files. Bundling everything into one PR makes review harder and entangles concerns: a maintainer who wants to question a layering choice should not block a working integration, and a maintainer evaluating the integration should not have to review unrelated infrastructure.
**Decision:** Ship the work as two branches/PRs:
1. `chore/intuition-foundation` — adds the self-contained `src/intuition/` module plus `src/config/env.ts`. **No modification of existing files**, no UI changes, build green at every commit. Reviewable in isolation as "we added an Intuition module to the codebase."
2. `feat/intuition-onchain-integration` — branched off the foundation. Wires the module into the existing UI (provider in `App.tsx`, claim submission in `claim-builder.tsx`, live data in the visualization components). Reviewable as "we used the module to satisfy the bounty acceptance criteria."

**Consequences:**
- Two PRs to manage, but each is small enough to review in one sitting.
- If the foundation has style/naming feedback, it doesn't gate the bounty delivery.
- The bounty PR has a tight scope (every changed file maps directly to an acceptance criterion).
- We must keep the foundation branch green during the entire bounty work — no "fix-up later" commits.

**References:** `docs/plan.md`, `docs/architecture.md`.

## ADR-004: IPFS pinning via Intuition GraphQL mutations (no separate endpoint)

**Date:** 2026-04-29
**Status:** Accepted
**Context:** The first draft of the `IpfsService` assumed a generic POST/JSON-LD endpoint configured via a `VITE_IPFS_PIN_ENDPOINT` env var. While reviewing the canonical Sofia extension implementation (`/home/max/Project/sofia-core/core/apps/extension/lib/services/AtomService.ts`) we found that Intuition exposes pinning as **GraphQL mutations on the same endpoint as the read queries** — `pinThing`, `pinPerson`, `pinOrganization`, each accepting a typed input and returning `PinOutput { uri }`. There is no separate REST/IPFS endpoint to configure; the indexer wraps the underlying pinning provider (Pinata/Helia/etc.) behind these mutations.

**Decision:**
- Remove `VITE_IPFS_PIN_ENDPOINT` from `src/config/env.ts` and `.env.example`.
- `src/intuition/services/ipfs.service.ts` issues GraphQL mutations against `env.graphqlUrl` (the same endpoint already used for reads).
- The exported function surface (`pinThing`, `pinPerson`, `pinOrganization` returning a branded `ipfs://` URI) is unchanged, so the rest of the foundation module is unaffected.

**Consequences:**
- One fewer env var for deployers to provision.
- The pinning service shares the same connectivity, auth, and error-handling story as the read service — no need for two clients with different lifecycles.
- We follow the upstream pattern, so any indexer evolution (auth headers, rate limiting, batching) lands in one place.
- The `assertIpfsUri` boundary check stays — the schema declares `uri` as nullable, so we still validate the response shape before returning.

**References:** Sofia `AtomService.ts` `pinAtomToIPFS`, `core/packages/graphql/src/generated/index.ts` (`PinThingInput` / `PinOutput`), `intuition` skill `reference/schemas.md`.

## ADR-005: IPFS pin mutations always send the full field shape

**Date:** 2026-04-29
**Status:** Accepted
**Context:** During the foundation gate review, the `intuition-reviewer` flagged that `pinThing` / `pinPerson` / `pinOrganization` declared their optional inputs (`description`, `image`, `url`, `email`, `identifier`) as nullable GraphQL variables. The Intuition indexer's Hasura request-transformation template references every field; sending an undefined or null variable causes a "Request Transformation Failed" error at the gateway. The canonical sofia-core `AtomService.pinAtomToIPFS` works around this by coercing missing fields to either an empty string or a sentinel default.
**Decision:** All pin mutations always send a value for every input field. The TS-level input interfaces keep the optional shape (caller-friendly), but the service coerces undefined to `''` immediately before issuing the mutation.
**Consequences:**
- The wire payload always carries the full mutation shape regardless of caller input.
- Behavior matches the canonical sofia-core implementation; future schema evolution (nullable → non-null tightening) lands without code changes here.
- Slight cost: a small amount of normalization code per mutation. Acceptable for correctness.
**References:** sofia-core `AtomService.pinAtomToIPFS` (`description: atomData.description || "..."` pattern), foundation gate review verdict, commit `fix(intuition/ipfs): coerce optional pin inputs to empty strings`.

## ADR-006: TextObject predicate atoms are never reused

**Date:** 2026-04-29
**Status:** Accepted
**Context:** The Intuition indexer surfaces atoms of two coexisting kinds for predicate roles: structured atoms (Thing / Person / Organization, IPFS-pinned with metadata) and legacy `TextObject` atoms (plain-string labels persisted before IPFS pinning was the convention). The skill's predicate-resolution rule mandates skipping TextObject results — reusing them perpetuates legacy atoms and forks the predicate graph. The first draft of `findPredicateAtomsByLabel` returned all candidates ordered by usage, leaving callers free to pick `result[0]` and silently inherit a TextObject.
**Decision:** Two helpers wrap the raw query:
- `pickCanonicalPredicate(candidates)` — returns the first non-TextObject candidate, or `null` when only TextObject candidates exist.
- `resolveCanonicalPredicateByLabel(label)` — chains `findPredicateAtomsByLabel` + `pickCanonicalPredicate` so consumer hooks have a one-call path that cannot fall through to TextObject.

The raw `findPredicateAtomsByLabel` is kept exported for debug views and predicate analytics, but its docstring steers normal callers toward the resolver.
**Consequences:**
- When `resolveCanonicalPredicateByLabel` returns `null`, callers know to pin a structured replacement (Thing) and use the new atom going forward.
- Predicate-resolution code paths cannot accidentally introduce TextObject atoms into new triples.
**References:** Intuition skill predicate-resolution convention, foundation gate review, commit `fix(intuition/graphql): skip TextObject in canonical predicate resolution`.
