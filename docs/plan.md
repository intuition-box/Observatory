# Plan — Intuition Onchain Integration

Two-branch delivery (see ADR-003).

- **Foundation branch:** `chore/intuition-foundation` — adds the self-contained `src/intuition/` module plus `src/config/env.ts`. No modification of existing files.
- **Bounty branch:** `feat/intuition-onchain-integration` — branched off foundation. Wires the module into the existing UI to satisfy bounty `intuition-box/Ontology#8`.

Status legend: ✅ done · 🟡 in-progress · ⬜ pending

## Foundation ✅

| Commit | Description | Status |
|--------|-------------|--------|
| C1 | `chore(deps): add onchain stack and migrate to bun lockfile` | ✅ |
| C2 | `feat(config): typed env loader with zod validation` | ✅ |
| C3 | `feat(intuition): chain definitions for Intuition L3` | ✅ |
| ⎯ | `chore: untrack personal tooling per gitignore policy` | ✅ |
| C4 | `feat(intuition/abi): MultiVault read+write ABI fragments` | ✅ |
| C5 | `feat(intuition/types): branded AtomId / TripleId / CurveId + assertNever` | ✅ |
| C6 | `feat(intuition/services): GraphQL service skeleton` | ✅ |
| C7 | `feat(intuition/services): IPFS pinning service` (initial draft) | ✅ |
| C8 | `feat(intuition/hooks): useIntuitionSession with discriminated state` | ✅ |
| C7' | `refactor(intuition/ipfs): use GraphQL pinThing mutations` (per ADR-004) | ✅ |
| C9 | `feat(intuition): wagmi config for Intuition L3` | ✅ |
| ⎯ | `fix(intuition/ipfs): coerce optional pin inputs to empty strings` | ✅ |
| ⎯ | `fix(intuition/graphql): skip TextObject in canonical predicate resolution` | ✅ |
| ⎯ | `chore(config): annotate boundary on chain ID enum transform` | ✅ |

**Gate result (2026-04-29):** build green · `architecture-reviewer` PASS · `typing-reviewer` PASS WITH WARNINGS (resolved by `chore(config)` annotation) · `intuition-reviewer` PASS (after `fix(intuition/ipfs)` + `fix(intuition/graphql)` addressed two BLOCKING findings on Hasura nullable variables and TextObject filter) · zero modification of existing code.

## Bounty ⬜

Branched off foundation when the gate is green.

### Phase B1 — Wallet provider (1 commit)
- `feat(app): mount WagmiProvider and RainbowKit ConnectButton in App.tsx`

**Gate:** wallet connects to testnet (chain 13579) via the ConnectButton, no UI regressions.

### Phase B2 — Onchain claim submission (3 commits)
- `feat(intuition/services): claim → triple translation, predicate resolution`
- `feat(intuition/hooks): useSubmitClaim orchestrating pin → createAtoms → createTriples`
- `feat(claim-builder): wire onchain submission with state feedback`

**Gate:** real testnet tx documented in PR description (chain 13579 via `testnet.explorer.intuition.systems`).

### Phase B3 — Live data migration (4 commits)
- `feat(intuition/hooks): useLiveTriples / useLiveAtoms with static fallback`
- `feat(relationship-graph): consume live triples`
- `feat(atom-tree): consume live atoms`
- `feat(claim-matrix): consume live triples`

**Gate:** the three views render testnet data; fallback verified offline.

### Phase B4 — UX polish (3 commits)
- `feat(intuition/hooks): useUserPositions (wallet's onchain positions via GraphQL)`
- `feat(claim-history): show onchain positions for the connected wallet`
- `feat(claim-preview): agree/disagree deposit buttons (triple vs counter-triple)`

**Gate:** real testnet deposits on triple + counter-triple, two tx hashes documented.

### Phase B5 — Ship (1 commit)
- `docs: README mission section, deploy notes, PR description preparation`

**Gate:** production build · PR description complete with tx hashes, screenshots, and criteria mapping.

## Testnet tx log

| Phase | Description | Tx hash | Block explorer |
|-------|-------------|---------|----------------|
| B2 | First claim onchain — `createAtoms` (3 atoms: max, Web3 & Crypto, interestedIn) | `0x35188721a38bf49c2315e1a34de7e16414b038101e4ea8f279f48781e94e1204` | [explorer](https://testnet.explorer.intuition.systems/tx/0x35188721a38bf49c2315e1a34de7e16414b038101e4ea8f279f48781e94e1204) |
| B2 | First claim onchain — `createTriples` (max — interestedIn — Web3 & Crypto) | `0xd5ede8b714f4978d080dcacf83963492d467ebfc06e21c0a9560310ff6c49b48` | [explorer](https://testnet.explorer.intuition.systems/tx/0xd5ede8b714f4978d080dcacf83963492d467ebfc06e21c0a9560310ff6c49b48) |
