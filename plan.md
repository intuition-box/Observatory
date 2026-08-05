# Ontology — Alignment Plan

**Date:** 2026-08-05
**Branch:** `dev` (PR [#16](https://github.com/intuition-box/Ontology/pull/16) → `main`)
**Preview:** https://16.ontology.intuition.box/

---

## 1. What this app is for

Ontology is a playground for **agreeing on an ontology, using Intuition itself as the
agreement mechanism**. Rather than a committee publishing a fixed schema, the vocabulary —
which entity types exist, which predicates are legitimate, which predicate belongs in a
given `Subject — ? — Object` slot — is proposed, staked on, and contested onchain.

It began as a web2 POC: static TypeScript data, D3 visualisations (radial tree, force
graph, matrix), a claim builder, `localStorage` persistence. [Mission 01](https://github.com/intuition-box/Ontology/issues/8)
(closed) took it live on the protocol.

The premise worth preserving: **Ontology is where the vocabulary itself is argued about.**
Every other Intuition app *consumes* a vocabulary. This one *produces* it.

### The sharper thesis

Some vocabulary decisions have no principled answer, and no team can legitimately make them
alone. Today they get resolved by fiat — a default in a spec, an alphabetical tiebreak — and
the arbitrariness is invisible once frozen into a builder.

**Ontology's job is to make those decisions contestable and settle them by stake.**

This is not hypothetical. The upstream monorepo currently resolves **17 such decisions**
(10 inverse pairs + 7 symmetric predicates, §9.2) with the rule *"lexicographically smaller
key is canonical."* That yields `citedBy` beating `reference` because `c` sorts before `r`,
and `founded` beating `founder` on the same basis. These are coin flips wearing the costume
of a rule, and they are exactly the class of decision this app exists to resolve.

The open surface, right now:

| Underdetermined decision | Count | Currently decided by |
|---|---|---|
| Canonical direction per inverse pair | 10 | alphabetical order |
| Canonical ordering for symmetric predicates | 7 | atom-ID sort |
| Which proposed predicates get enshrined | 108 | unspecified |
| Ontology predicates with no upstream mapping | 40 | nothing yet |
| Sparse `METADATA_PREDICATE_MATRIX` coverage | most classifications | unfilled |

Mint-time canonicalization (item A8) has **not shipped**. Until it does, these remain open —
which is a closing window, not a standing invitation.

---

## 2. Where the codebase stands

Mission 01 is delivered. 92 source files, ~10.5k LOC.

| Deliverable | State |
|---|---|
| Wallet connection | Privy + `@privy-io/wagmi` + wagmi v3 |
| Intuition SDK integration | `@0xintuition/sdk` v2 read/write |
| Onchain claim submission | `createAtomFromString` + `createTripleStatement` |
| Live ontology data | GraphQL indexer, mainnet/testnet switcher |
| Static → dynamic migration | Static data retained as a selectable "examples" mode |

Beyond the mission brief it also grew a genuinely novel mechanism in
`src/lib/intuition/ontology-slots.ts` + `ontology-vocabulary.ts`: a **meta-claim** pattern
where a `Person — ? — Organisation` slot triple is itself an atom, and predicates compete
to fill it via an `is best usage for` meta-predicate. That is the "agree on ontology"
thesis expressed onchain, and **nothing upstream replaces it.** It is the part worth
building the next phase around.

---

## 3. What changed upstream

The Intuition team shipped ten packages ([docs](https://unchained.intuition.systems/docs))
that formalise exactly the layer this app hand-rolled.

| Package | Version | Provides |
|---|---|---|
| `@0xintuition/ids` | `0.1.0-alpha.0` | `calculateAtomId`, `calculateTripleId`, `calculateCounterTripleId`, `calculatePredicateId` |
| `@0xintuition/classifications` | `0.1.0-alpha.0` | **37 entity types / 7 categories**, field specs, metadata-predicate matrix |
| `@0xintuition/predicates` | `0.1.0-alpha.0` | **133 predicates** (25 enshrined + 108 proposed) / 14 categories, typed semantics |
| `@0xintuition/primitives` | `0.1.0-alpha.0` | Typed JSON-LD builders (`buildSoftwareApplication`, …) |
| `@0xintuition/schema-org` | `0.1.0-alpha.0` | schema.org property superset |
| `@0xintuition/protocol` | `2.0.3` latest / `3.0.0` alpha | MultiVault bindings |
| `@0xintuition/deployments` | `0.1.0-alpha.0` | Contract addresses per chain |
| `@0xintuition/react`, `periphery`, `curves` | `0.1.0-alpha.0` | Hooks, helpers, bonding curves |

Two things matter most:

**Deterministic IDs.** `atomId = keccak256(ATOM_SALT ‖ keccak256(utf8(atomData)))`, computed
locally, no wallet or network. Identity is now a pure function of canonical bytes — which
means offchain work and onchain settlement converge on the same row, and independent apps
dedupe automatically.

**A canonical vocabulary.** The 37 classifications and 133 predicates are the shared grammar,
with a `METADATA_PREDICATE_MATRIX` typing which predicates apply to which subject
classification and what object kinds they expect.

---

## 4. The central problem

> **The app writes non-canonical predicate atoms. Claims created in Ontology cannot join
> the shared graph.**

The app resolves a predicate to a **natural-language label string** and creates an atom from
it (`src/lib/intuition/predicate-resolution.ts:34`, `protocol-write.ts:123`):

```ts
return matchPredicateForSubject(trimmed, subjectType)?.id ?? trimmed;   // → "created by"
const atom = await createAtomFromString(config, trimmed);               // hashes "created by"
```

The registry derives predicate atoms from a **canonical JSON-LD `DefinedTerm` document**
(`@0xintuition/ids/predicate-id.js`):

```ts
calculateAtomId(JSON.stringify({
  '@context': 'https://schema.org/',
  '@type': 'DefinedTerm',
  name,          // "created by"
  description,   // "The subject was created by the object…"
}))
```

Hashing `"created by"` and hashing that JSON document produce **different atom IDs**. So:

- Every predicate atom Ontology has created is invisible to the canonical graph.
- Claims from other Intuition apps don't appear in Ontology's views, and vice versa.
- The acceptance criterion *"existing onchain data from Intuition ecosystem projects is
  reflected in the Ontology views"* is not truly met — it reads the indexer, but shares no
  vocabulary with it.

This is not a bug in the contributor's work. The canonical derivation **did not exist** when
Mission 01 was built. It is drift, and closing it is the core of this phase.

Subject/object atoms have the same issue at lower severity: `createAtomFromString` writes
bare strings where `@0xintuition/primitives` now produces validated JSON-LD.

---

## 4a. The canonical registry is not onchain yet

Measured against both indexers on 2026-08-05, by computing the canonical IDs locally and
querying for them:

| Atom set | Mainnet | Testnet |
|---|---|---|
| 25 enshrined predicate atoms (`LAUNCH_PREDICATE_ATOMS`) | **0 live** | **0 live** |
| 4 bootstrap atoms (`BOOTSTRAP_ATOMS`) | see below | 0 live |
| Combined 29 | **2 live** — `curatedBy`, `listedIn` | — |

The vocabulary exists as **deterministic IDs that nobody has minted.** The package ships
everything needed to mint them — each entry carries pre-computed `atomData` and `atomId`:

```ts
import { LAUNCH_PREDICATE_ATOMS, BOOTSTRAP_ATOMS } from '@0xintuition/predicates';
// LAUNCH_PREDICATE_ATOMS: 25 × { key, atomData, atomId }
// BOOTSTRAP_ATOMS:         4 × { key, atomData, atomId }
//   → predicateRegistry, depositional, attributive, comparative
```

**This reframes the opportunity.** The plan's original framing — adopt the canonical
vocabulary — assumed the vocabulary was live and Ontology was late to it. It isn't. Ontology
can be the app that *bootstraps the registry onchain* and hosts the argument about what
belongs in it. That is materially more valuable than consuming a vocabulary, and it is a
direct extension of the slot mechanism already built here.

Caveat: the two live atoms index with `label: 'Unknown'`, i.e. the indexer is not resolving
inline JSON-LD atom data into a display label. Worth confirming with the team before minting
25 more that would all display as `Unknown`.

---

## 5. Overlap analysis (measured, not estimated)

### Entity types — 32 of 39 map directly

| Bucket | Count | Members |
|---|---|---|
| **Direct match** | 32 | `aggregate-rating`, `article`, `book`, `brand`, `comment`, `dataset`, `defined-term`, `ethereum-account`, `ethereum-erc20`, `ethereum-smart-contract`, `event`, `job-posting`, `local-business`, `mobile-application`, `movie`, `music-album`, `music-group`, `music-recording`, `news-article`, `person`, `podcast-episode`, `podcast-series`, `product`, `review`, `service`, `social-media-posting`, `software-application`, `thing`, `tv-series`, `video-object`, `web-page`, `web-site` |
| **Renamed upstream** | 4 | `ImageObject`→`image`, `Organization`→`company`, `Place`→`location`, `SoftwareSourceCode`→`software` |
| **App-only** | 3 | `Account`, `AIAgent`, `Self` |
| **Upstream-only** | 1 | `social-media-account` |

`Self` is the interesting one — a deictic atom resolving at stake time, with no upstream
equivalent. It is a real contribution, not a gap to close.

### Predicates — only 16 of 56 map automatically

| Bucket | Count |
|---|---|
| Match upstream `name` or `thirdPerson` | 16 |
| **Require hand-authored mapping** | **40** |

Unmapped: `about`, `acquired by`, `advised by`, `advocates`, `attended event`, `brand of`,
`competitor of`, `contributor to`, `controlled by`, `created`, `deployed on`, `developed by`,
`develops`, `employs`, `fork of`, `founder of`, `headquartered in`, `hosted by`,
`interested in`, `is a`, `knows`, `maintained by`, `maintains`, `manufactures`, `offers`,
`opposite of`, `organized event`, `owned by`, `part of`, `partners with`, `published by`,
`related to`, `reply to`, `review of`, `sold by`, `sponsors`, `sub concept of`,
`tagged with`, `token of`, `works at`.

Many have obvious canonical targets (`is a`→`hasType`, `tagged with`→`hasTag`,
`works at`→`employedBy`, `part of`→ inverse of `contain`). **The mapping is curation work,
and it is exactly the contribution Ontology exists to make** — several of these have no
upstream equivalent and should be *proposed through the app's own slot mechanism* rather
than hardcoded.

---

## 6. Dependency strategy

The single most useful finding for de-risking:

```
@0xintuition/ids             deps: {}                          peer: viem ^2
@0xintuition/classifications deps: {}                          peer: {}
@0xintuition/predicates      deps: { ids }                     peer: viem ^2
@0xintuition/primitives      deps: { ids, classifications, predicates }
```

The vocabulary packages are **pure data and hashing with zero runtime dependencies**, peering
only on `viem ^2` — already satisfied (app has 2.50.4). They carry no protocol coupling.

**Therefore: adopt the vocabulary layer without touching the protocol layer.** The valuable
change and the risky change are separable, and should be separated.

Recommended target set:

```jsonc
// Stable — a coherent, released set. Currently one major behind.
"@0xintuition/sdk":      "^3.0.1",   // was ^2.0.2 → depends on graphql ^3.0.1 + protocol ^2.0.3
"@0xintuition/graphql":  "^3.0.1",   // was ^2.0.2
"@0xintuition/protocol": "^2.0.3",   // was ^2.0.2

// Alpha — vocabulary only, no protocol coupling
"@0xintuition/ids":             "0.1.0-alpha.0",
"@0xintuition/classifications": "0.1.0-alpha.0",
"@0xintuition/predicates":      "0.1.0-alpha.0",
"@0xintuition/primitives":      "0.1.0-alpha.0"
```

Deliberately **not** adopted yet: `protocol@3.0.0` (alpha-tagged, pulls `curves@alpha`),
`@0xintuition/react` (would collide with the existing wagmi/Privy wiring).

---

## 7. Implementation plan

### Phase 0 — Unblock the deploy ✅ *(done during this session)*

Root cause was Coolify config, not code: `VITE_PRIVY_APP_ID` was not exposed as a
**build-time** variable for preview deployments, so Vite inlined `undefined`. Now resolved.

⚠️ One open item: the deployed bundle contains app ID `cmsg2fodx018p0cjpn53t2z6l`, **not**
the `cmpegx0dd002w0cl5i2zqjqmj` configured on the preview — a shared/parent-scope variable is
winning. Reconcile, and add `*.ontology.intuition.box` to the Privy allowed domains so
per-PR previews work without manual re-listing.

### Phase 1 — Canonical identity layer *(highest value, lowest risk)*

Goal: **every atom and triple the app writes lands on the ID the rest of the ecosystem uses.**

1. Add `ids`, `classifications`, `predicates`, `primitives`.
2. New module `src/lib/intuition/canonical.ts` wrapping `calculateAtomId`,
   `calculateTripleId`, `calculateCounterTripleId`, `calculatePredicateId`.
3. Replace `createAtomFromString` for predicates with canonical `DefinedTerm` atom data.
4. Replace bare-string subject/object atoms with `primitives` builders where the atom type
   maps to a classification.
5. **Preflight dedupe:** compute the deterministic ID *before* submitting and check the
   indexer. If the atom exists, stake into it rather than minting a duplicate — this is
   free, synchronous, and needs no wallet.

*Exit criterion:* a claim created in Ontology resolves to the same triple ID another
Intuition app would derive for the same statement. Verify with `calculateTripleId` against
a known upstream triple.

### Phase 2 — Vocabulary reconciliation

Goal: **stop shipping a competing vocabulary; start contributing to the canonical one.**

1. Map the 32 direct + 4 renamed entity types onto `CLASSIFICATION_SLUGS`; keep
   `Account` / `AIAgent` / `Self` as explicitly app-local, clearly labelled as such.
2. Hand-author the 40-predicate mapping table. For each: canonical target, or *"proposal
   candidate"*.
3. Replace the static `subjectTypes`/`objectTypes` arrays in `src/data/predicates.ts` with
   `getMetadataPredicateMatrixFor()`, falling back to local rules where the matrix is sparse.
4. Surface `status` (enshrined vs proposed) in the predicate picker — a first-class signal
   in this app, since arguing about proposed predicates is the whole point.
5. Retain static data as the "examples" mode. Do not delete it.

*Note on matrix coverage:* `METADATA_PREDICATE_MATRIX` is currently sparse — the shipped
alpha densely types only a handful of subject classifications. Local rules must remain the
fallback, and the gaps are themselves proposal candidates.

### Phase 3 — Bootstrap the registry and open the argument *(the differentiator)*

Goal: **mint the canonical vocabulary onchain and make membership in it contestable.**

Confirmed with the team: the pathway is *mint the atom, then stake a triple asserting it
belongs to the standard.* Since the registry is unminted (§4a), Ontology can run that
pathway for the whole enshrined set.

1. **Registry bootstrap.** Two stages, in order:
   - **Atoms:** `BOOTSTRAP_ATOMS` (4: registry + 3 market patterns), then
     `LAUNCH_PREDICATE_ATOMS` (25), using each entry's shipped `atomData` verbatim.
   - **Triples:** `getLaunchPredicateBootstrapTriples()` → 50 triples
     (25 registry-membership + 25 market-pattern).

   Preflight every ID against the indexer and skip those already live (`curatedBy`,
   `listedIn`) — deterministic IDs make this idempotent and safe to resume. Gate on Q6 in §9.
2. **Proposal flow.** Mint `bestFor` first (it is the predicate everything else is proposed
   with). Then any candidate — the 40 unmapped, or a user's own — is proposed as
   `<candidate> — bestFor → <predicate registry>`, ranked by stake and contestable via
   counter-triples. Each candidate atom carries canonical `DefinedTerm` bytes so its ID
   already matches if upstream adopts it. Ratification later mints
   `<registry> — contain → <candidate>` plus the `hasType → <marketPattern>` typing triple.
3. **Counter-triples.** Add `calculateCounterTripleId` so rejection is expressible. This is
   the missing half of "agree on ontology" — the app can currently only assert, never
   disagree, which makes it a publishing tool rather than an agreement mechanism.
4. **Provenance in the UI.** Show enshrined / proposed / app-local, plus stake weight on the
   registry membership triple, in the matrix and graph views.
5. Export the reconciliation table (§5) as a PR-able artifact for the Intuition team.

6. **Canonicalization votes** — the highest-leverage application of the app's own thesis.
   Put the 17 underdetermined canonicalization decisions (§1) up for stake as **meta-claims**:

   ```
   <contain>  — is canonical direction for →  <contain/listedIn pair>
   ```

   Structurally identical to the existing slot mechanism, one level up.

   ⚠️ **Do not stake on the two directions themselves.** That reproduces the split stake
   audit A1 exists to prevent, and the vote would defeat its own purpose. The object graph
   stays single-direction; the argument lives at the meta level.

   Bootstrap each vote seeded with the upstream default (the lexicographic winner), so the
   status quo is represented and the community contests *against* a stated position rather
   than into a vacuum.

### Why the sequencing is urgent

Item A8 freezes these choices into `primitives`/`ids` builders. Before it ships, a community
answer can still inform the rule; after, overturning it means migrating minted triples. The
window is open now and closes on someone else's schedule.

### Three levels, deliberately distinct

| Level | Question | Mechanism |
|---|---|---|
| Slot | Which predicate is best for `Person — ? — Organisation`? | `is best usage for` (built) |
| Membership | Does this predicate belong in the registry at all? | `registry contain X` (Phase 3.2) |
| Canonicalization | Which direction/ordering is authoritative? | `is canonical direction for` (Phase 3.6) |

All three are "vocabulary decisions the team cannot make alone." Keep them separate — they
have different object types, different stakeholders, and different blast radii.

### Phase 4 — Polish

1. Code-split. The bundle is **3.1 MB** minified in a single chunk; Privy dominates. Lazy-load
   the wallet stack so read-only visitors don't pay for it.
2. `NIXPACKS_NODE_VERSION=22` vs `.nvmrc` pinning `20.20.2` — reconcile.
3. Re-evaluate `protocol@3.x` once it leaves alpha.

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Vocabulary packages are `0.1.0-alpha.0` | Medium | Isolate behind `canonical.ts`; pin exact versions (no `^`); no protocol-layer alpha |
| ~~Canonical IDs may shift before 1.0~~ | ~~High~~ **Resolved** | Team confirmed the derivations are stable (§9). Migration unblocked |
| Already-written non-canonical atoms | Medium | 37 legacy atoms / 250 mainnet triples (§9.3). Do **not** rewrite history; emit `sameAs` bridges pending the team's answer |
| Minting 25 registry atoms is irreversible and costs TRUST | **High** | Deterministic IDs make it idempotent, but wrong bytes are permanent. Dry-run on testnet; confirm the `label: 'Unknown'` indexing issue first (§4a) |
| `METADATA_PREDICATE_MATRIX` is sparse | Medium | Keep local rules as fallback; treat gaps as proposals |
| RainbowKit was considered as a Privy swap | Low | **Rejected** — RainbowKit 2.2.11 peers `wagmi ^2.9.0`; app is on wagmi 3.6.15. No v3-compatible release exists. Would also lose embedded wallets |
| Reviewer capacity — PR is already large | Medium | Land Phase 1 as its own PR |

---

## 9. Answers from the Intuition team (2026-08-05)

**1. ID stability — CONFIRMED STABLE.** The alpha `calculateAtomId` / `calculatePredicateId`
derivations are frozen. Migration is unblocked; the corresponding risk is removed from §8.

**2. Proposal pathway — mint the atom onchain, then stake a triple asserting it belongs to
the standard.** This resolves to a concrete shape, because `@0xintuition/predicates` already
ships the target atom:

```ts
import { BOOTSTRAP_ATOMS } from '@0xintuition/predicates';
// key: 'predicateRegistry'
// "Canonical registry of enshrined Intuition predicates"
// atomId: 0x19f0a7fef69c9099b91b1553776be2bf0f9d3a194273da8086c1a2148072e31d
```

The package does not leave the shape to interpretation — it ships the team's own bootstrap
definition, `getLaunchPredicateBootstrapTriples()`, which emits **50 triples (25 × 2)**:

```ts
// registry membership — note the direction: registry is the SUBJECT
{ kind: 'registry-membership',
  subject:   PREDICATE_REGISTRY_ATOM_ID,   // 0x19f0a7fe…
  predicate: CONTAIN_ID,                   // 'contain'
  object:    PREDICATE_IDS[key] }          // the predicate being registered

// market-pattern typing — one per predicate, easy to overlook
{ kind: 'market-pattern',
  subject:   PREDICATE_IDS[key],
  predicate: HAS_TYPE_ID,                  // 'has type'
  object:    MARKET_PATTERN_ATOM_IDS[…] }  // depositional | attributive | comparative
```

⚠️ **Direction matters — write `contain`, display `listedIn`.**

`contain` and `listedIn` are declared mutual inverses, so both read correctly in English.
But `calculateTripleId(subject, predicate, object)` is order-dependent, and the upstream
monorepo (`kames/predicate-enhancement`, `.planning/predicate-spec-audit.md` **A1**) flags
this as *blocking* and "economically unsound":

> `⟨Alice, employedBy, Acme⟩` vs `⟨Acme, employs, Alice⟩` — one fact, two mintable triples,
> two vaults. Stake splits across them; neither reflects true conviction.

Their fix is **mint-time canonicalization** in `primitives`/`ids` (implementation-plan item
A8), with the deterministic tiebreak given as *"lexicographically smaller key is canonical"*
— which selects **`contain`** over `listedIn` (c < l). It also matches what `bootstrap.ts`
already emits.

The good news for a `listedIn`-shaped UI, per decision §5.2:

> The non-canonical predicate remains fully usable in UI/queries — it's a *view*, not a
> second fact.

So render "X is listed in the registry" freely; just mint `registry — contain → X`.

**Status: not yet implemented.** `isCanonicalDirection` appears only in `.planning/`, never
in shipped source, and A8 is pending. Until it lands there is no normalization safety net —
asserting the non-canonical direction today mints a genuinely separate market that would
need the indexer backstop (`sibling_triple_id` linkage) to be reconciled later.

Do not hand-assemble the bootstrap. Call `getLaunchPredicateBootstrapTriples()`.

### Proposals are NOT the same shape — a two-tier model

`contain` and `listedIn` are both **`attributive`**: *"the triple asserts a fact about a
specific entity."* Minting `registry — contain → X` for an unratified candidate therefore
asserts something **false at proposal time**. The registry does not contain X — that is the
whole point of proposing it. Using the ratified-membership edge for candidacy also pollutes
it, making "what is actually in the registry?" unreadable without a stake threshold.

### Why not `hasTag` — the convention is the problem, not the answer

Intuition's production lists ("Top Intuition Community Members", "Top Web3 Gaming Projects",
"Top Companies") are built on a single shape, unanimously across every list sampled on
mainnet — `hasTag` **100/100**, **49/49**:

```
<member> — hasTag → <list>
```

**This is the anti-pattern this app exists to correct, not a convention to adopt.**

`hasTag` won by being the cheapest thing to query — `WHERE predicate_id = hasTag` returns
every list on the network in one index scan. It works *because* it means nothing. The
semantics get pushed entirely into the object atom's display name:

- `Nuel — hasTag → Top Intuition Community Members` says **why**? Contributor? Moderator?
  Evangelist? The relation carries none of it.
- One predicate conflates "member of a curated ranking" with "this article is tagged crypto".
  They are different relations with different contestability and different stakeholders.
- The package ships `marketPattern`, `objectKind`, `polarity`, `claimType`, `temporalNature`
  precisely to make predicates carry meaning. `hasTag` opts out of all of them.

Prevalence is evidence about implementation convenience, not about semantics. Ontology's
entire premise is that the vocabulary deserves better than the path of least resistance —
adopting `hasTag` here would be the app conceding the exact point it exists to argue.

### The `best for` predicate — ranking as first-class semantics

The claim being made is **normative and comparative**: *this predicate is a strong candidate
for the standard registry.* Neither `hasTag` (semantically null) nor `contain` (asserts a
fact that is false pre-ratification) expresses it.

All 10 existing `comparative` predicates are **pairwise** (`betterThan`, `rankedAbove`,
`outperform`, …). `rankedAbove` even reads *"within a shared ordering context"* but takes no
argument for that context. **Nothing expresses "X is best for context C"** — which is exactly
the shape needed to rank candidates against a registry or a slot.

This app already invented it — `ONTOLOGY_META_PREDICATE_LABEL = 'is best usage for'`
(`src/lib/intuition/ontology-vocabulary.ts`). It needs promoting from a bare label string to
canonical `DefinedTerm` bytes:

```ts
createPredicateAtomData(
  'best for',
  'The subject is asserted to be the most suitable option for the object context, slot, or registry'
)
// marketPattern: 'comparative' | objectKind: 'entity' | claimType: 'evaluative' | status: 'proposed'
```

**Stake still does the ordering** — nothing is lost versus the `hasTag` pattern. The
difference is that the relation itself now carries meaning, so "what is being argued about"
is answerable from the predicate rather than by parsing a list's title.

### The resulting two-tier model

```
1. ARGUE     <candidate>  — bestFor →  <registry | slot>    comparative, stake-ranked, contestable
2. RATIFY    <registry>   — contain →  <candidate>          attributive, minted only once it wins
```

Nothing false is ever minted: `contain` appears only when it becomes true. Counter-triples
contest tier 1; tier 2 records the settled result and stays clean as a "what is actually
enshrined?" query with no stake threshold needed.

**Ontology's first upstream contribution should be the predicate that makes contribution
possible.** Propose `bestFor`, then use it to propose everything else — including its own
enshrinement. That is the app's thesis executing on itself.

**3. Legacy atoms — clarification.** The app mints predicate atoms by hashing a bare label
(`"created by"`); the registry hashes a JSON-LD `DefinedTerm` document. Different bytes,
different atom IDs, so switching to canonical IDs strands the old atoms — each holding its
own vault and staked TRUST. Measured on mainnet:

- **37** legacy predicate-label atoms exist
- **250** triples are built on them (229 `trusts`, 12 `supports`, 5 `expert in`, …)
- Fragmentation is already live: **`is a` exists as 3 distinct atoms**, `expert in` as 2

Most of that traffic is ecosystem-wide, not Ontology's. The open question stands: emit
`sameAs` bridges from legacy → canonical, or abandon the legacy atoms?

### Still open

4. **`@0xintuition/sdk` v3 vs `protocol` v3** — sdk 3.0.1 is `latest` but depends on
   `protocol ^2.0.3`, while `protocol@3.0.0` sits on `alpha`. Which is the intended path?
5. **`Self`** — is a deictic atom of interest upstream, or should it stay app-local?
6. **Who mints the registry?** See §4a — is Ontology authorised to bootstrap the 25 enshrined
   predicate atoms, or is a team-controlled deployment planned?
7. **Is the canonical-direction rule final?** The spec says *"e.g. lexicographically smaller
   key"* — an illustration, not a commitment, and A8 hasn't shipped. If it is still open,
   these 17 decisions are the strongest candidates for Ontology's stake-driven resolution
   (§1, Phase 3.6). If it is already fixed, say so and we mint against it.

### Two upstream data issues found while auditing

- **`sameAs` declares itself as its own `inversePredicate`.** Self-inverse is degenerate for
  the A2b pair-derivation rule, which assumes two distinct members. It is also the only
  predicate on the `isEquivalence` allow-list, so the interaction is worth a look.
- **`equivalentTo` is present and marked `isSymmetric`**, but decision §5.2 states it "was
  cut from the spec". Either the record or the doc is stale.

---

## 10. Recommended sequencing

**Land PR #16 as-is** once the Privy app ID is reconciled. It fulfils Mission 01 and the
drift is not the contributor's doing.

**Open Phase 1 as a separate PR.** It is self-contained, mechanically verifiable, and the
prerequisite for everything else — without canonical IDs, Phases 2–3 build on sand.

**Raise §4a with the team before anything else.** The registry being unminted is the highest-
leverage fact in this document, and it has a shelf life — whoever mints those 25 atoms
defines the onchain root of the vocabulary. Two blockers to clear first: authorisation
(Q6) and the `label: 'Unknown'` indexing behaviour.

Phases 2–3 are where Ontology stops being a consumer of the ontology and becomes the place
the ontology gets decided.
