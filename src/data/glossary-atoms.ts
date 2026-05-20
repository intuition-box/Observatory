import type { PredicateForm } from './predicates';

/**
 * Glossary atom reference data — the currently-relevant on-chain atoms on
 * Intuition.
 *
 * Intentionally **siloed** from the main app: these addresses belong to the
 * current protocol version and will change when the schema upgrades. The
 * claim-builder, history, matrix, and graph deliberately do not consume this
 * list — they use the canonical PREDICATES table instead, which represents
 * Ontology's preview of the next schema. The glossary page exists so
 * researchers can browse the live protocol's atoms without that surface
 * bleeding into the builder.
 *
 * Source of addresses: user-curated from portal.intuition.systems. Not
 * guaranteed exhaustive.
 */
export interface GlossaryAtom {
  /** On-chain atom address (canonical identity). */
  address: `0x${string}`;
  /** Human-readable label as it appears on-chain. */
  label: string;
  /**
   * What role the atom typically plays in a claim.
   * - `predicate`: middle position (verb-like or relation)
   * - `entity`: subject/object position (thing-like, often proper nouns)
   *
   * TODO(primitive-kind): when more value atoms land in the glossary
   * (numerics, enums, timestamps, URIs as data, etc.) extend this union
   * with a third option — `primitive` — and split booleans (`true`,
   * `false`) out of `entity`. Current classification of booleans as
   * entities is a pragmatic shoehorn because the binary doesn't fit
   * cleanly; see the `true`/`false` entries. Surfacing primitives as
   * their own kind lets the glossary page badge them distinctly and
   * filter them separately in its kind-chip row.
   */
  kind: 'predicate' | 'entity';
  /**
   * Grammatical form, for predicates only. `undefined` on entities.
   * Lets us group variants like `trust` (bare) and `trusts` (3ps).
   */
  form?: PredicateForm;
  /**
   * Concept group — a short identifier shared by atoms that express the same
   * underlying concept in different forms. `trust` and `trusts` both live in
   * the `trust` concept group, so the glossary can collapse them together.
   */
  conceptGroup?: string;
  /** Short explanatory blurb — editorial, not canonical. */
  description?: string;
}

/**
 * Returns the portal.intuition.systems URL for an atom address. Centralized
 * so a protocol-side URL change only needs updating here.
 */
export function portalUrlFor(address: string): string {
  return `https://portal.intuition.systems/explore/atom/${address}?tab=overview`;
}

/* eslint-disable @stylistic/max-len */
export const GLOSSARY_ATOMS: GlossaryAtom[] = [
  // ─── Trust & social signal ─────────────────────────────────
  {
    address: '0xd5686d496eb75724dec4c4dc69b204ea3609a76d0d44907022570f3c8b4b6d4f',
    label: 'trust',
    kind: 'predicate',
    form: 'bare',
    conceptGroup: 'trust',
    description: 'Subject places trust in object. Bare form — pairs naturally with first-person subjects ("I trust …").',
  },
  {
    address: '0x3a73f3b1613d166eea141a25a2adc70db9304ab3c4e90daecad05f86487c3ee9',
    label: 'trusts',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'trust',
    description: 'Subject places trust in object. Third-person-singular form — pairs with specific named subjects ("Alice trusts …").',
  },
  {
    address: '0xffd07650dc7ab341184362461ebf52144bf8bcac5a19ef714571de15f1319260',
    label: 'follow',
    kind: 'predicate',
    form: 'bare',
    conceptGroup: 'follow',
    description: 'Subject follows/subscribes to object. Bare form.',
  },
  {
    address: '0x87daf17b45361ec14fbbe35699133704897e39b358c51305eb9cf8b61e601b80',
    label: 'follows',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'follow',
    description: 'Subject follows/subscribes to object. Third-person-singular form.',
  },
  {
    address: '0xe1ed9733c01b2e4f20049bbb159779986a5c3aabd8a2d4f1f2d95740077f4780',
    label: 'likes',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'like',
    description: 'Subject likes / favors object.',
  },
  {
    address: '0xb1b5c15cf800b901881df3594f1d82567b949bbe78e02bd9a35034d9144fe4aa',
    label: 'prefers',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'prefer',
    description: 'Subject prefers object (often over an alternative).',
  },
  {
    address: '0x3e2718cc4288b5b32fb65fed9e439c35419026f5b24f02e87264dbd48f0f52bf',
    label: 'recommends',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'recommend',
    description: 'Subject recommends object to others.',
  },
  {
    address: '0x9d431d249c3d157d56b013cda719a09722c172cb6a43b881cf5b328fff911090',
    label: 'supports',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'support',
    description: 'Subject supports object (cause, initiative, project, person).',
  },

  // ─── Identity / attribution ────────────────────────────────
  {
    address: '0xc77944ea781f25b38f8ad839f5b0fdd43f515d7d668a05bcb6fb380762426b7d',
    label: 'I',
    kind: 'entity',
    conceptGroup: 'self',
    description: 'First-person deictic. Resolves at stake time to the staker — the claim aggregates across everyone who stakes it.',
  },
  {
    address: '0x8c486fd3377cef67861f7137bcc89b188c7f1781314e393e22c1fa6fa24e520e',
    label: 'Intuition',
    kind: 'entity',
    conceptGroup: 'intuition',
    description: 'The Intuition protocol itself, as a named entity.',
  },

  // ─── Creation / authorship ─────────────────────────────────
  {
    address: '0xc0778a52f7cc989edded561d5bac9e70694e8ad2ad70baf11f0aa227f7f663aa',
    label: 'created',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'create',
    description: 'Subject created object. Past tense.',
  },
  {
    address: '0x313db11e1e724d7b2cb018d067f60a957dd4dd81268aea7ba83d814c85bbb551',
    label: 'authored',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'author',
    description: 'Subject authored the object (creative work, document).',
  },
  {
    address: '0x7500da9ea30d26be3eec79d07325e3ff43bc063566e2cabc327bcfbb29d42e93',
    label: 'developed',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'develop',
    description: 'Subject developed the object (software, product).',
  },
  {
    address: '0x9f45932c403f00896d34f3cb73c2a6d5d82fb9601ec0ea5483ed352b09af06f1',
    label: 'contributed to',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'contribute',
    description: 'Subject contributed to the object (project, work, org).',
  },
  {
    address: '0xf5e011155e2129c4cdef03cb2b759ae374a11a378b569e8621e0fc4d1f40aba7',
    label: 'issued',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'issue',
    description: 'Subject issued object (certificate, token, statement).',
  },

  // ─── Collaboration & engagement ────────────────────────────
  {
    address: '0x314e6d36910ee516b9fc5f20470b0bca0e36137f5dbcb38e30356fc5396cccdc',
    label: 'collaborates with',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'collaborate',
    description: 'Subject collaborates with object (person, team).',
  },
  {
    address: '0xdae52d9c803ea494d221c164d97b156f0e81200602a0041f6259f1c9e9230d98',
    label: 'collaborates on',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'collaborate',
    description: 'Subject collaborates on object (project, work item).',
  },
  {
    address: '0xe18e7f006d4531696f0dddbe1e7e5754bb9cc6358d01ce2127fec2fa52e9c9b3',
    label: 'partnered with',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'partner',
    description: 'Subject formed a partnership with object.',
  },
  {
    address: '0xdd106b7a52215b0d24d32d883758ec07e8c687686ae0e7c84688625b5d90fe1e',
    label: 'engaged with',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'engage',
    description: 'Subject engaged with object (content, initiative).',
  },
  {
    address: '0x6e4659631eae2d115a8d2a557a1705dead1b0d8e8987b5f7a0f567d8cc676b8a',
    label: 'interacted with',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'interact',
    description: 'Subject had one or more interactions with object.',
  },
  {
    address: '0xca790763e7c258b3b949e3d0efd2daa51bb03eed3095c9e52d48ab64ba1adb58',
    label: 'participated in',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'participate',
    description: 'Subject participated in object (event, initiative).',
  },
  {
    address: '0xce21e1a3f3c86c827ecc82e283dc363219eac11a10a2aacc79eeda936d96c60e',
    label: 'discussed',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'discuss',
    description: 'Subject discussed object (topic, work, event).',
  },

  // ─── Relation / structure ──────────────────────────────────
  {
    address: '0xfd3c413995e60603a56f0f547911c0064e116527e78226f6957b655291b88047',
    label: 'is part of',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'part-of',
    description: 'Subject is a component/member of object.',
  },
  {
    address: '0xd3415956b8e8d248ca02b9994f92f222c1aacd4fc4f9220ec0592a1b69ce6f3d',
    label: 'is associated with',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'associate',
    description: 'Subject has a looser, non-membership association with object.',
  },
  {
    address: '0x0fdc2f1da5a7be5283b26c549c28b20315d1a583f1e1607d610d6728ed91b97e',
    label: 'is connected to',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'connect',
    description: 'Subject has a connection to object; weaker than "is associated with".',
  },
  {
    address: '0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5',
    label: 'has tag',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'tag',
    description: 'Subject is tagged with object (label, category).',
  },
  {
    address: '0xdd4320a03fcd85ed6ac29f3171208f05418324d6943f1fac5d3c23cc1ce10eb3',
    label: 'is',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'is',
    description: 'Subject is an instance of / equal to object. Broad copula.',
  },

  // ─── Expertise & roles ─────────────────────────────────────
  {
    address: '0x57d37eb30295717431465b80b16f97e52ccd2974429758172d13dd95af2f3c97',
    label: 'has expertise in',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'expertise',
    description: 'Subject has domain expertise in object.',
  },
  {
    address: '0x346608ee3147289958077b61a644c746c31efae56ec68ee756011f8b14d466c8',
    label: 'researched',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'research',
    description: 'Subject conducted research on object.',
  },
  {
    address: '0xa89593390e2ca29e2ea46f74c33aa6116d804b76eb0321501f950f79bd4c1e52',
    label: 'is responsible for',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'responsible',
    description: 'Subject bears responsibility for object.',
  },
  {
    address: '0xf5d770615b91c868c082aecab20d2adfa84b0dd3f6f007577681de88f7960de7',
    label: 'manages',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'manage',
    description: 'Subject manages object (team, project, asset).',
  },
  {
    address: '0xdd3eb9326e013e0ffecb067709bbf6cb6352122e025faede9c887b7c9ac4b773',
    label: 'owns',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'own',
    description: 'Subject owns object (asset, token, account).',
  },
  {
    address: '0x5c0bde1cc696456c0268248c4656acdf9621fdb39e605bc99b0a83dc8ff6e800',
    label: 'uses',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'use',
    description: 'Subject uses object (tool, software, service).',
  },

  // ─── Verification / evaluation ─────────────────────────────
  {
    address: '0xcdffac0eb431ba084e18d5af7c55b4414c153f5c0df693c2d1454079186f975c',
    label: 'verified',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'verify',
    description: 'Subject has verified the object (identity, claim, artifact).',
  },
  {
    address: '0xe9c13add1723f918e4305ef73d9dbe483fc680e13fe6f448b353517fba7507b3',
    label: 'rated',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'rate',
    description: 'Subject issued a rating for object.',
  },
  {
    address: '0x2d864f0214db084b5420de2a72acaddae82d56d9e6e9fed7ecbab3d9f6afc1fe',
    label: 'completed',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'complete',
    description: 'Subject completed object (task, course, milestone).',
  },
  {
    address: '0xf59149edc47daeea2c90db9abde9d3bd51cea058507d939309a6e5d686dd05a0',
    label: 'received',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'receive',
    description: 'Subject received object (award, credential, item).',
  },

  // ─── Funding & backing ─────────────────────────────────────
  {
    address: '0xad0ffa56808262bf2c7bae4d8f20e5c543eab3071154852d52878ad0ee1b0303',
    label: 'invested in',
    kind: 'predicate',
    form: 'past',
    conceptGroup: 'invest',
    description: 'Subject invested capital in object (company, project).',
  },
  {
    address: '0x5aa63834ee950b73fd97605df2040517970b59a8c1b21569ac212bb651491d49',
    label: 'backed by',
    kind: 'predicate',
    form: 'passive',
    conceptGroup: 'back',
    description: 'Subject is backed/supported by object (inverse of a funding/endorsement relation).',
  },

  // ─── Influence ─────────────────────────────────────────────
  {
    address: '0x93829fe4b387444799e2960e3626a82cc66e8b81a02d5af6d86e6de6d0c0fd96',
    label: 'is influenced by',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'influence',
    description: 'Subject is influenced by object (thinker, work, movement).',
  },

  // ─── Comparison ────────────────────────────────────────────
  {
    address: '0xf44a7305513ada5e0cf0c6010ef12fff8def5cf28335ce6b8191e2eccccf393b',
    label: 'is better than',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'better-than',
    description: 'Subject is preferred over object on some axis.',
  },

  // ─── Temporal / future ─────────────────────────────────────
  {
    address: '0xf3c964e5056f1a0b38edaafca72a57a173d00b8364d4b55196644eab401845fe',
    label: 'will have',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'future-have',
    description: 'Subject will come to have object (promissory / future-tense relation).',
  },

// ─── Prediction & resolution ───────────────────────────────

  {
    address: '0x2c76a5344a15f60565878c8657463f0e2fb201eb05158cf41ad77f8b9d084be1',
    label: 'resolved to',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'resolve',
    description: 'Records the definitive outcome of a resolved claim, question, or prediction. Usage: [Subject] — resolved to — [Object], where Object is typically `true`, `false`, or another canonical outcome atom. Consumers should filter triples by trusted publisher address to avoid noise or exploitation — anyone can write a resolved to triple, only authoritative publishers should be trusted.',
  },
  {
    address: '0xa1fadfcf5e29bd37e048625f1deee9a6374b249fcda4905649a85022c74070ec',
    label: 'related to',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'relate',
    description: 'Expresses that subject has a thematic or contextual relationship with object. A weak, neutral association — weaker than `supports`, `contradicts`, or `conditions`. Use for loose correlations where outcomes or concepts are connected but neither strictly depends on the other.',
  },
  {
    address: '0x3317b232b1d59ae421283a4ce4d8bef0f739574c3a53386d5d8597d4b272d4e8',
    label: 'belongs to',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'belong',
    description: 'Expresses that subject belongs to object — a category, collection, topic, group, or class. Standard classification predicate. Examples: [Document] — belongs to — [Folder], [Prediction] — belongs to — [Topic], [User] — belongs to — [Organization].',
  },

  // ─── Boolean primitives ────────────────────────────────────
  // Shoehorned as `kind: 'entity'` for now — they're really value primitives,
  // not things. When more value atoms land (numerics, enums, timestamps, …),
  // introduce a `kind: 'primitive'` option and reclassify these. See the
  // `kind` field doc on GlossaryAtom above for the full follow-up note.

  {
    address: '0x4f2874d4ad8b146c86ac84188e86635a794ddbfa4cfc40670a70467e08db36a2',
    label: 'true',
    kind: 'entity',
    conceptGroup: 'boolean',
    description: 'Canonical boolean true value. Used as the object in assertion, resolution, or outcome triples to mark a claim as confirmed, valid, or positively resolved. Pairs with `false` for binary outcomes. Neutral primitive — any protocol can reference it.',
  },
  {
    address: '0xa8cc267d1c74e7cd83cc8706fc1eb8d732bc5fa3bc4c8f37b2b992a819b9b550',
    label: 'false',
    kind: 'entity',
    conceptGroup: 'boolean',
    description: 'Canonical boolean false value. Used as the object in assertion, resolution, or outcome triples to mark a claim as rejected, invalid, or negatively resolved. Pairs with `true` for binary outcomes. Neutral primitive — any protocol can reference it.',
  },

  // ─── AgentScore / AI agent reputation ─────────────────────

  {
    address: '0x638fd866e4564e213a11ebeb98bbaea58e81f677860d90fa4ad01e50bb007108',
    label: 'has agent skill',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'agent-skill',
    description: 'Declares that an Agent possesses a specific Skill or capability. Usage: [Agent] — has agent skill — [Skill]. Stake-weighted attestation: supporters increase the agent\'s credibility in that skill domain; opponents decrease it.',
  },
  {
    address: '0x3ce0f03b579b0b3d2dcbfbbfb7adb0dd00ab2cf3393ab7201518fabae6dc05f7',
    label: 'opposes',
    kind: 'predicate',
    form: 'third-person-singular',
    conceptGroup: 'oppose',
    description: 'Indicates that one entity actively opposes or counters another. Counter-signal to `trusts` — stake on this triple reduces the subject\'s aggregate trust in stake-weighted scoring systems. Consumers should filter by trusted publisher address.',
  },
  {
    address: '0xb769bc51460e2dc29927c825f743238174c02901603a0c9604dd2e8ea40f8226',
    label: 'evaluated by',
    kind: 'predicate',
    form: 'passive',
    conceptGroup: 'evaluate',
    description: 'Records that an entity was reviewed or assessed by an evaluator. Links a subject to the party responsible for its quality or reliability assessment. Consumers may weight evaluations by evaluator reputation.',
  },
  {
    address: '0x51f1febac0b9d05953442f082597c5d1ce827bd2f888446ad811692e0a0f428d',
    label: 'reported for',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'report',
    description: 'Indicates that an entity has been flagged for a specific concern. Object atom carries the category (e.g. Scam, Spam, Injection). Consumers should filter by trusted publisher address.',
  },
  {
    address: '0xbeebfb7d177cbd96ffc239d2196c72ec346efe81f39dc595773f13d83506f5f0',
    label: 'same as',
    kind: 'predicate',
    form: 'phrase',
    conceptGroup: 'identity',
    description: 'Expresses that subject and object are different identifiers for the same underlying entity. Classic schema.org sameAs pattern. Use when one identifier may be mutable and another is immutable. The triple survives changes to the mutable side.',
  },
];
/* eslint-enable @stylistic/max-len */
