# Phase 3H — convergence contract (who owns what)

Phase 3H is the first formal convergence point between canonical Talent identity/content, the shared semantic vocabulary, Archetype Phase 11 and the Suggestion/Mentor consumers. The dependency direction is one-way and is never reversed:

`published SWSE rules → canonical Talent identity/content → derived certified semantic facts → exact Archetype references + Archetype semantic relationships → Suggestion / Mentor interpretation`

## Terminology

| Kind | What it is | Examples |
|---|---|---|
| **Source-canonical SWSE facts** | printed in the books | Talent identity, tree, benefit/rules text, printed prerequisites, source/page, publication relationships; structured prerequisite identity (3G UUIDs) is the machine form of a printed fact |
| **Certified shared semantic vocabulary** | project design authority (Archetype Phase 11), *not* published canon | the 57 tags; their spellings; aliases/deprecations |
| **Derived semantic metadata** | project metadata *supported by* canonical rule evidence | a Talent's flat tags (`stealth`, `defense`, …). The books never label a talent this way |
| **Project design authority** | not published rules | the 297 archetypes, their exact references, primary/supporting strength, class routes, narrative taxonomy |

An audit record therefore always reads *canonical rule evidence → derived semantic classification*.

## Ownership

| Owner | Owns | Does not own |
|---|---|---|
| **Talent authority** | canonical Talent UUID/source identity; tree identity; canonical text; prerequisites; source/page; flat semantic facts derived from the rule | archetype relationships, scoring, automation |
| **Shared semantic vocabulary** | allowed concepts; canonical spellings; aliases/deprecations; definitions sufficient to classify consistently (`tools/talent-semantic-rules.mjs` holds the Talent-side evidence definitions) | which talent has which tag; archetype strength |
| **Archetype authority** | archetype identity; exact recommended references (by tree-aware identity → 3G UUID); primary/supporting strength; class routes; narrative taxonomy | Talent meaning |
| **Suggestion / Mentor runtime** | scoring policy; centralized strength/weight interpretation; explanations; presentation | tag membership, exact identity |
| **Executable metadata** | automation behaviour, triggers, predicates, modifiers, attack options, actions/reactions, ActiveEffects, resource/frequency | semantic meaning |

## Rules

1. Exact references outrank tags; tags are semantic signals only.
2. Flat Talent semantics: no archetype-style primary/supporting tier is stored on a Talent; the same tag has different strengths for different archetypes, expressed only in archetype data.
3. Semantic tags describe meaning; they must not become a second automation language. Where runtime code reads tags as behaviour (`force` Force-talent counting; tree-identity extraction; Mystic Mastery estimate) that is a compatibility problem recorded in the dry-run, not a reason to keep an obsolete tag.
4. Legacy tags are evidence, never authority; none is preserved merely because code consumes it.
5. No numeric per-record tag weights anywhere; any future weighting is one centralized scoring policy.
6. Scope: 3H mutates canonical Talents only (`system.tags`). Feats, Force material, species, equipment, organizations get the same vocabulary in later convergence phases. The Archetype runtime SSOT (`data/class-archetypes.json` → `data/archetypes.json`, `ArchetypeRegistry`) is **not** migrated in this change set, so any failure is attributable to one change set.
