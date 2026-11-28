# Phase 3N-PRQ supplement — Canonical feat and talent prerequisite registry

Status: **binding** supplement to Phase 3N-PRQ (Prerequisite Consolidation). Recorded from the project owner's directive. The separate "Phase 3N-PRQ Prerequisite Consolidation Addendum" it extends is not in this repository; when it is supplied, this supplement is inserted after its Part I §3 (Preserve Public Interfaces) and before its prerequisite-correctness requirements.

## Architecture
```
Canonical feat/talent authorities -> source-verified structured prerequisite definitions
  -> canonical prerequisite compiler -> GENERATED UUID-keyed prerequisite index
  -> PrerequisiteEvaluator  <- ActorPrerequisiteSnapshot  -> eligibility result
```
One authored prerequisite authority, one generated index, one mechanical evaluator. The index says what an item requires; the snapshot says what the character has; the evaluator decides. The index is derivative and has no editing workflow.

## Sequencing (do not violate)
ActorEngine -> DerivedCalculator -> Prerequisite consolidation -> Unified progression mannequin. Read-only audit work (PRQ.0A/0B) may proceed now; **production integration (PRQ.1D/1E) waits** for the ActorEngine and DerivedCalculator refactors. Do not start the mannequin or Skills V2.

## Identity (preserve, never regenerate)
- Talents: `scripts/data/talent-source-identity.js` (`Compendium.foundryvtt-swse.talents.Item.<_id>`), nine legacy 32-char ids supported, Phase 3G rulings and the 311 certified talent-to-talent references preserved. Mandatory regression: Outlaw *Find an Opening* requires the Outlaw *Seize the Moment*, never the Provocateur one (approved ruling; do not reopen).
- Feats: certified 353-identity corpus (`data/audits/feat-phase-1a-canonical-identity-manifest.json`, `-1b-repository-reconciliation.json`, `feat-provenance-canonical-authority.json`). Verify current production reconciliation first. If no reusable feat source-identity helper exists, add one narrow helper over existing ids; it must not assign ids or duplicate the manifest.
- Display names are never identity keys. Embedded Actor item ids and `flags.swse.id` are never canonical identity. Feat and talent with the same name are different identities. Unresolvable embedded sources return *unresolved*, never a guess.
- Scoped feats: identity = canonical feat UUID + canonical selected choice (Weapon Focus (Pistols) does not satisfy Weapon Focus (Rifles)). Use `FeatChoiceResolver`; no new choice authority. Implementation derivatives keep their documented classification; do not promote them to canonical feats.

## Source authority
Sources: `scripts/data/authority/{feat,talent}-prerequisite-authority.js`, `prerequisite-text-helpers.js`, certified feat/talent content and provenance, production structured fields, `scripts/data/prestige-prerequisites.js`. Name-keyed tables are not proof of identity. On disagreement between text, structure and source: record, preserve evidence, decide from certified primary source, correct the authoritative structured source via a reviewable change, regenerate. No runtime overrides. Unsettled -> blocked for owner adjudication.

## PRQ.0 audit (read-only first)
Regenerate against current data (the old 390-record / 120-warning feat audit is stale). Per record: identity, record id, UUID, name, book/page, canonical and production prerequisite text, structured data, referenced feats/talents/classes/skills/species/other, Boolean structure, identity/normalization/runtime/source status, discrepancies. Classifications: SOURCE_VERIFIED, SCHEMA_COMPATIBLE, IDENTITY_RESOLVED, NORMALIZATION_INCOMPLETE, AMBIGUOUS_IDENTITY, TEXT_STRUCTURE_CONFLICT, UNSUPPORTED_REQUIREMENT, SOURCE_REVIEW_REQUIRED, RUNTIME_VERIFIED. Must explicitly detect the 20 listed defect classes (feat-as-talent, talent-as-feat, species-as-feat, same-name collisions, missing/removed targets, derivatives, scope errors, unresolved text, AND/OR errors, missing minimums, class-level/BAB semantics, droid systems, Force types, text/structure contradictions in both directions, missing structured data, conditions without handlers, unresolvable actor item identities). No closest-name repairs.

## PRQ.1 generated index
`data/generated/canonical-prerequisite-index.json`, built by `tools/build-canonical-prerequisite-index.mjs`, checked by `tools/verify-canonical-prerequisite-index.mjs` (exact-match mode; never rewrites). Reuse existing tooling if it already owns this. Keyed by canonical UUID; supports AND/OR/nested groups, ability/level/class-level/BAB minimums, trained skills, feat and talent references, talent-tree counts, scoped feats, species/droid restrictions, droid systems, Force powers/techniques/secrets, Dark Side Score, explicit GM-adjudicated conditions; provenance on every group and leaf; one grammar shared by feats, talents, prestige classes. States: certified prerequisite-free, compiled, partially compiled, unresolved, source missing — an empty array never means eligible. The generator rejects duplicate owners, unknown types, bad UUIDs, broken/ambiguous targets, unsupported types, missing operators, contradictions, vanished certified requirements, unapproved identity substitutions; it is deterministic. `A AND (B OR C)` is never flattened. Species alternatives are OR.

## Runtime
Certified content is evaluated from the compiled structure, never by re-parsing prose; prose stays for display/audit. Homebrew/noncanonical content may use a compatibility normalization into the same grammar, reported as uncertified; no second evaluator. Flow: AbilityEngine -> PrerequisiteChecker facade -> index lookup -> PrerequisiteEvaluator -> ActorPrerequisiteSnapshot -> assessment; the finalizer re-checks through the same authority. The same index serves real actors and simulated (mannequin) states: pending selections, projected levels/BAB/abilities/skills, grants at the acquisition point; an item never satisfies its own prerequisite; later selections never qualify earlier acquisitions.

## Required tests (real acquisition API, real canonical records, no actor mutation, no false eligible)
The 20 scenarios in the directive §17 (all/one/multiple missing, OR branches, scoped choice right/wrong, same-name wrong talent vs exact UUID, class grant, duplicate grant, broken source link, acquisition order early/late, text-without-structure, structure-without-source, removed target, unsupported condition, GM-adjudicated, ambiguous legacy actor).

## Prohibitions
No second hand-maintained prerequisite registry, no replacement ids, no name keys, no per-evaluation prose parsing, no parallel text/structured engines, no silently accepted unresolved UUIDs, no missing-as-none, no name-inferred prerequisites, no rewriting Phase 3G rulings, no pack edits just to satisfy the compiler, no assuming existing tests prove correctness.

## Sequence and report
PRQ.0A census -> 0B compatibility report -> 0C reconciliation -> 1A schema -> 1B generator -> 1C verification -> 1D runtime integration (after ActorEngine/DerivedCalculator) -> 1E retire duplicate paths -> 1F certification. Each verified tranche is committed and pushed. Final "Canonical Prerequisite Registry Certification Report" has the 22 items listed in the directive §20 and never marks the index authoritative apart from its sources or unresolved items eligible.
