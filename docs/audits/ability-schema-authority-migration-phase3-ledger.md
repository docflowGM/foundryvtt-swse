# V2 Ability Schema Authority Migration — Phase 3 Inventory Ledger

Follow-up to `docs/audits/skill-roll-dialog-base-authority.md`'s "Deferred"
section. That audit found `system.abilities` referenced in 68 files under
`scripts/` (358 occurrences repo-wide across 93 files including docs/data)
and a direct contradiction between `docs/systems/ABILITY_SCHEMA_AUTHORITY.md`
and `scripts/utils/schema-adapters.js`'s own doc comment. This is the
read-only inventory pass that document called for, before any of those 68
files were touched.

## Definitive counts (mechanically reproducible)

Earlier drafts of this document mixed "rows," "sites," and "files" loosely
(e.g. "20 sites across 18 files" while the table itself used `1a`/`1b`/
`5b`/`5c` sub-rows and multi-occurrence rows like skill-uses.js's "6
sites"). These numbers replace that language. Each is reproducible from the
commands shown; "code occurrence" excludes lines whose first non-whitespace
characters are `//`, `*`, or `/*` (comments/docstrings), which raw `grep -c`
does not distinguish and which grew during this migration's own explanatory
comments.

| Metric | Value | How measured |
|---|---|---|
| `system.abilities` raw mentions, `scripts/`, at Phase 3 start (commit `069b5c0`, PR #970's tip) | 156 (106 code + 50 comment/doc) | `git show 069b5c0:<file>` per file under `scripts/`, `grep -c "system\.abilities"`, split by leading `//`/`*` |
| `system.abilities` raw mentions, `scripts/`, current HEAD | 158 (88 code + 70 comment/doc) | Same command against the working tree. The **total** went up (new explanatory comments this migration added), while **code** occurrences went down 106→88 — the real signal. |
| Files with ≥1 mention, at Phase 3 start | 68 | `grep -rl "system\.abilities" scripts/` at `069b5c0` |
| Files with ≥1 mention, current HEAD | 67 | Same, current tree |
| Actor-runtime-relevant files (excludes 4 Item-schema/N-A files: `drop-handler.js`, `species-grant-ledger-builder.js`, `chargen-shared.js`, `species-registry.js` — see N/A rows below) | 64 | 68 − 4 |
| **Category C distinct files** | **27** (all 27 fixed, 0 remaining) | Unique file paths across every Category C table row below, including 3 files found after the original inventory pass (see below) |
| **Category C distinct functions/sites** | **33** (all 33 fixed, 0 remaining) | One count per named function/property-lookup expression actually changed or needing a change — see the two lists immediately below. This is the granular count; `skill-uses.js`'s "6 sites" in one file and the Force-cluster's 2-file "row 9" both unpack into their real per-site counts here. |

**All 33 Category C functions/sites are now fixed, by file:**
`enhanced-rolls.js` `SWSERoll.rollInitiative()` (1) · `SWSEInitiative.js` `getActorInitiativeSkillTotal()` (1) · `combat-stats-tooltip.js` `getInitiativeBreakdown()` (1) · `skill-uses.js` (6: target Int-based DC, 2× Con modifier, 3× Con score) · `progression-shell.js` `_buildAbilitySnapshot()` (1) · `lightsaber-form-engine.js` `actorAbilityMod()` (1) · `skill-feat-runtime-patches.js` `actorAbilityMod()` (1) · `combat-option-resolver.js` `actorAbilityMod()` dead-tail cleanup (1) · `skill-feat-resolver.js` (2: `'abilityModifier'` + `'abilityDelta'` formulas) · `feat-grant-entitlement-resolver.js` `getAbilityModifier()` (1) · `force-suite-resolution.js` `getAbilityModifier()` closure (1) · `force-training-entitlement-runtime-patches.js` `getAbilityData()` (1) · `ForceTrainingEngine.js` `getForceAbilityModifier()` (1) · `force-power-engine.js` `_countFromAbilityMod()` (1) · `force-provenance-engine.js` `getConfiguredAbilityMod()` (1) · `template-character-creator.js` `_openSkillTraining()` (1) · `vehicle-crew-positions.js` `_calculateSkillBonus()` (1) · `store/index.js` `getDroidStatblockQuality()` (1) · `shared-suggestion-utilities.js` `extractAbilityScores()` (1) · `AttributeIncreaseScorer.js` `_createHypotheticalActor()` (1) · `mentor-dialogue-v2-integration.js` `buildAnalysisData()` (1) · `character-actor.js` `mirrorIdentity()` (1) · `suggestion-constants.js` `SYSTEM_PATHS.WISDOM_MOD` (1, dead-value correction — see below) · `talent-ability-helpers.js` `getTalentAbilityMod()` (1, fail-before-proof then fixed — see below) · `mentor-conditional-variants.js` `evaluateCondition('high_ability')` (1, found beyond the original 30-site inventory — see below) · `prerequisite-checker.js` `_checkAbilityRequirement()` (1, found beyond the original 30-site inventory — see below) · `starship-maneuver-suggestion-engine.js` `_intelligentSuggest()` (1, found beyond the original 30-site inventory — see below).

**Three additional defects beyond the original 30-site inventory**, all found while implementing/investigating the batch above rather than during the initial read-only pass, and all about ability-*score* authority (not `system.abilities` order specifically):

- `scripts/mentor/mentor-conditional-variants.js`'s `evaluateCondition('high_ability', ...)` checked `(a.value || a.total || 10) >= 14` against `actor.system.abilities` — `.value` never exists on that block and `.total` is always the legacy stub's `10`, so this condition could never trigger regardless of the actor's real scores. Not a "wrong order" bug like the other 30 (there was no `system.attributes` read to be out of order with) — a dead-always-false condition. Fixed to use `SchemaAdapters.getAbilityScore()`.
- `scripts/data/prerequisite-checker.js`'s `_checkAbilityRequirement()` (ability-score feat/talent prerequisites, e.g. "requires Str 13") resolved via `actor.system.attributes[key].total ?? .value ?? actor.system.abilities[key].value ?? 10` — none of the first three candidates ever exist on the real V2 schema (`system.attributes` only has `.base/.racial/.enhancement/.temp`; `system.abilities` has no `.value`), so outside an active draft context every ability-score prerequisite silently evaluated against a hardcoded `10`. Found while verifying `AttributeIncreaseScorer.js`'s hypothetical-actor simulation (row 16) actually influences anything downstream — it didn't, because this function ignored real scores entirely. Fixed to use `SchemaAdapters.getAbilityScore()` as the real-actor fallback (draft/pending state still takes priority, unchanged). Fail-before proof, both actors otherwise identical: a Str 16 actor with the default `system.abilities` stub failed a "requires Str 13" check (10 < 13); post-fix, correctly passes. See `tests/prerequisite-ability-score-authority.test.mjs`.
- `scripts/engine/progression/engine/starship-maneuver-suggestion-engine.js`'s `_intelligentSuggest()` read `actor.system?.abilities?.wis?.mod || 0` directly for its "boost Deflector maneuvers by Wis mod" starship-maneuver suggestion logic. Found while investigating every consumer of `suggestion-constants.js`'s `WISDOM_MOD` path-string constant (row 19) — that constant itself turned out to have zero consumers anywhere in the repo (confirmed by a repo-wide grep), but the file importing from the same module had this independent, live defect for the same underlying purpose (Wis-based suggestion scoring). Fixed to use `SchemaAdapters.getAbilityMod()`. See `tests/starship-maneuver-suggestion-ability-authority.test.mjs`.

## Method

Every `system.abilities` occurrence under `scripts/` was read in context
(`grep -n -C 2`) and classified. Categories, as specified:

- **A** — migration/import-only (compendium/pack data ingestion, not actor
  runtime state)
- **B** — explicit, deliberate compatibility boundary (correctly ordered:
  canonical first, legacy fallback only when canonical is absent; or
  governance/guardrail code that enforces this)
- **C** — active runtime read that gets the order wrong (checks/uses
  `system.abilities` before or instead of `system.attributes`/
  `system.derived.attributes`)
- **D** — active runtime write to `system.abilities`
- **E** — test/documentation/comment only (no runtime effect)
- **F** — dead/unreachable code
- **N/A** — not actually about Actor ability-score authority (e.g. an Item's
  own `system.abilities` field — species/chassis/template documents have an
  unrelated schema)

## Headline finding: the governance/mutation layer is already correct (Phase 4)

Before classifying every site, the highest-risk question — "who actually
owns persistent ability mutation?" — was answered directly from the code,
not inferred:

- `scripts/governance/actor-engine/actor-engine.js` (25 occurrences) is the
  documented, sole owner of `system.abilities` shape maintenance. Its own
  comment (line ~4300-4313) states explicitly: *"this function... is the
  ONLY code anywhere that populates/repairs system.abilities.
  DerivedCalculator does NOT rebuild it... This backfill only fills missing
  base/racial/temp shape defaults — it is not an independent value
  authority, and no live code writes real ability *values* here."* It
  initializes `system.attributes` for character-type actors specifically
  (`shouldOwnAttributes = actor.type === 'character' || actor.system.attributes !== undefined`)
  and only fills `system.abilities`' shape (default `{base:10,...}`) as a
  defensive backstop for actor types that lack `system.attributes` in their
  schema.
- `scripts/governance/mutation/mutation-boundary-service.js` (12
  occurrences) is the active enforcement layer: it redirects
  `system.abilities.{key}.base` writes to `system.attributes.{key}.base`
  (line ~254) and flags-but-does-not-yet-redirect `.mod`/`.modifier`/`.total`
  writes as suspicious (line ~257, ~300-338) — logging a warning
  (`[ActorEngine:P3] system.abilities mirror write intercepted`) rather than
  silently allowing them.
- `scripts/governance/mutation/mutation-normalization-service.js` normalizes
  `system.abilities.<key>.value` → `.base` before the boundary service's
  redirect runs.
- `scripts/governance/sentinel/enforcement/mutation-path-validator.js` gates
  `system.abilities` writes to `ActorEngine.updateActor()` only — no other
  code path is permitted to write it directly.
- `scripts/apps/progression-framework/shell/progression-finalizer.js`
  (level-up/chargen ability-score finalization) already writes to
  `system.attributes.{key}.base` (confirmed at the two actual write sites,
  lines ~1423 and ~1454) — correct, despite a **stale comment** one screen
  above (line ~1406: "Canonical stored ability path is
  system.abilities.<key>.base") that contradicts the code directly below it.
- `scripts/engine/progression/ProgressionEngineV2.js` (ability-increase
  advancement) also writes `system.attributes.${abilityKey}.base` with an
  explicit comment confirming the contract.

**Conclusion for Phase 4: no code change was needed to the mutation/write
side.** `system.attributes` is already the real, enforced, single write
authority; `system.abilities` write attempts are already intercepted and
redirected (for `.base`) or flagged (for `.mod`/`.total`). The remaining
problem is entirely on the **read side**, in code that does not route
through `ActorEngine`/`SchemaAdapters` and reads `system.abilities` directly.

## Category B/A/E sites (correct or not applicable — no action)

| File | Note |
|---|---|
| `scripts/actors/derived/derived-calculator.js` | The reference implementation: `actor.system.attributes \|\| actor.system.abilities \|\| {}`, whole-block, correct. |
| `scripts/actors/derived/defense-calculator.js` (×2) | Same correct whole-block fallback, explicitly commented (beta-follower compatibility). |
| `scripts/rolls/roll-config.js` | Fixed in this migration's Phase 1/2 commits (see `skill-roll-dialog-base-authority.md`). |
| `scripts/utils/schema-adapters.js` | Fixed in this migration's Phase 5 commit (this document's companion fix). |
| `scripts/patches/canonical-ability-prerequisite-hotfix.js` | `canonical ?? legacy`, correct order, well-commented. |
| `scripts/governance/actor-engine/actor-engine.js` | See above — Category B, the sanctioned compatibility boundary itself. |
| `scripts/governance/mutation/mutation-boundary-service.js` | Category B — the enforcement/redirect layer. |
| `scripts/governance/mutation/mutation-normalization-service.js` | Category B — path normalization ahead of the boundary service. |
| `scripts/governance/mutation/merge-mutations.js` | Category E — a conflict-example in a doc comment, not real code. |
| `scripts/governance/sentinel/enforcement/mutation-path-validator.js` | Category B — write gate. |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` | Writes correct (`system.attributes`); one stale comment (Category E) noted above, not fixed in this pass (comment-only, no runtime effect — left for Phase 11 doc cleanup). Its one read site (line ~2250: `[system.attributes?.[key], system.abilities?.[key], system.stats?.[key]]`) is correctly ordered — Category B. |
| `scripts/apps/progression-framework/shell/active-step-computer.js`, `scripts/apps/progression-framework/steps/attribute-step.js` | `system.attributes?.[key] \|\| system.abilities?.[key] \|\| ...` — correct order. Category B. |
| `scripts/apps/progression-framework/shell/mutation/ability-score-plan-builder.js` | Explicit header: "system.abilities is legacy read fallback only." Category B. |
| `scripts/engine/progression/ProgressionEngineV2.js` | Writes `system.attributes`; one comment referencing the correct contract. Category B. |
| `scripts/dialogs/entity-dialog/effect-intent-engine.js` | Candidate path list correctly attributes-before-abilities. Category B. |
| `scripts/engine/suggestion/equipment/{armor-scoring-engine,equipment-use-evaluator,gear-suggestions,weapon-scoring-engine}.js`, `scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js` | All read `attr.mod ?? ... ?? abilityData.mod` — attributes checked first. Category B. |
| `scripts/engine/suggestion/SuggestionEngine.js` | Builds ability-key set from `Object.keys(actor.system?.attributes \|\| {})` first, with a comment explaining `system.abilities` is only for "legacy/generated actors." Category B. |
| `scripts/sheets/v2/character-like-sheet.js` | `system.attributes ?? system.abilities ?? {}` (correct order) plus extensive comments about avoiding stale `.mod` reads during repaint. Category B — already handling this thoughtfully. One comment (line ~590: "system.abilities.* is a derived mirror rebuilt from attributes each prepare cycle") **contradicts** `actor-engine.js`'s own comment that nothing rebuilds `system.abilities` values — flagged for Phase 11 doc reconciliation, not a runtime defect. |
| `scripts/sheets/v2/character-sheet/form.js`, `scripts/sheets/v2/character-sheet/context.js`, `scripts/sheets/v2/npc/npc-sheet-helpers.js`, `scripts/sheets/v2/actor-sheet-base.js` | Correct order / shape-initialization only / explicit compatibility comments. Category B. |
| `scripts/apps/follower-creator.js` (×2) | Writes to `system.attributes`, comments explicitly state the contract. Category B. |
| `scripts/drag-drop/drop-handler.js` (species/chassis ability strings, lines ~291, ~405-410) | **Category N/A** — reads `species.system.abilities` / `chassis.system.abilities`, which is an **Item** document's own field (species/droid-chassis templates), not an Actor's ability-authority path. Different schema entirely; out of scope for this migration. |
| `scripts/species/species-grant-ledger-builder.js`, `scripts/apps/chargen/chargen-shared.js`, `scripts/engine/registries/species-registry.js` | **Category N/A** — same as above: reading a species/template **pack item's** ability-modifier string format (e.g. `"+2 Wis, -2 Cha"`), not Actor runtime state. |
| `scripts/migrations/phase5-compendium-heal.js` | **Category A** — an explicit, one-time compendium migration script converting `system.abilities → system.attributes.*.base`. Exactly the sanctioned migration-boundary pattern. |
| `scripts/debug/actor-contract-inspector.js`, `scripts/debug/phase-9-runtime-matrix.js` | **Category E/A** — dev/debug contract-inspection tooling that specifically checks *for* legacy-shape data as part of its own diagnostic purpose. Not production runtime math. |
| `scripts/infrastructure/hooks/force-power-hooks.js`, `scripts/infrastructure/hooks/starship-maneuver-hooks.js` | Read/diff `system.abilities` before/after an update to detect "ability modifier increase" from specific Force powers/starship maneuvers. **Needs Phase 4-style verification of whether these powers actually persist their bonus into `system.abilities` (which would itself be a Category D write elsewhere) or whether this is comparing two reads of an already-correct mirror.** Flagged as needing follow-up, not fixed in this pass. |
| `scripts/engine/npc-legal-review/{NpcReviewRepairEngine,NpcLegalReviewEngine}.js` | NPC QA/repair tooling; writes/checks a `.score` field that isn't part of the real schema (`base/racial/enhancement/temp/total/mod`) — narrow, isolated NPC-review tool. Lower priority; flagged, not fixed. |
| `scripts/apps/progression-framework/shell/mutation-plan.js` (line ~378) | `actor.system.abilities = actor.system.abilities \|\| {}` then sets `actor.system.projectedAttributes = {...}` — appears to be building an in-memory **projection/preview** object, not a persisted mutation (the actual field set is `projectedAttributes`, not `attributes`). Bypasses `ActorEngine` for this in-memory initialization, which is a mild governance-layer inconsistency worth a follow-up look, but does not appear to reach persistence. Flagged, not fixed. |
| `scripts/apps/progression-framework/shell/progression-shell.js` (`_buildAbilitySnapshot()`) | Reads `this.actor.system.abilities` directly with **no `system.attributes` fallback at all**. **This is a real Category C defect** (see below) — moved to that table since it has live UI impact (the progression/level-up shell's own ability snapshot). |

## Category C sites — real defects (read priority wrong or missing fallback)

These read `system.abilities` before, or instead of, `system.attributes`/
`system.derived.attributes`, on real Actor documents, in code that runs
during normal gameplay. None of these route through `SchemaAdapters`
(already fixed) or `getSkillTotal`/`getAbilityModifier` in `roll-config.js`
(already fixed) — they are independent, standalone reads.

| # | File : line | What it affects | Fallback present? |
|---|---|---|---|
| 1a | ~~`scripts/combat/rolls/enhanced-rolls.js:1482` (`SWSERoll.rollInitiative()`)~~ **FIXED, and priority corrected** | **Correction to the initial pass:** this row was originally flagged "live initiative rolls, highest priority." Verified by grepping every call site of `rollInitiative(` in the repo: `SWSERoll.rollInitiative()` has **zero callers** in sheet/talent/macro source — `scripts/core/rolls-init.js` even comments "Initiative removed — use CombatEngine.rollInitiative()". The real live path is `Actor.rollInitiative()` → `CombatEngine.rollInitiative()` → `SWSEInitiative.rollInitiative()` (row 1b). Still fixed (now uses `SchemaAdapters.getAbilityMod()`) as defense-in-depth, since `SWSERoll` is exposed on `window.SWSERoll` and reachable via console/macro — same reasoning as `rollSkillWithConfig()` in the original Gar'ee audit. | None (now uses `SchemaAdapters.getAbilityMod()`) |
| 1b | `scripts/engine/combat/SWSEInitiative.js`'s `getActorInitiativeSkillTotal()` — **FIXED** | The actual live initiative path. Its ability-mod fallback (reached only when every derived-skill-total candidate is absent — rare in live play, since `DerivedCalculator` normally populates them) went from `system.derived.attributes[key].mod` straight to the legacy `system.abilities[key].mod`, skipping `system.attributes[key].base` reconstruction. Lower real-world priority than the initial pass assumed, but a genuine defect on the real live path (unlike row 1a); fixed by routing through `SchemaAdapters.getAbilityMod()`. | Derived checked, but skipped straight to legacy on miss (now fixed) |
| 2 | `scripts/ui/combat-stats-tooltip.js:175` (`getInitiativeBreakdown()`) — **FIXED** | Initiative breakdown tooltip display. The file's own `getGrappleBreakdown()`, two functions above, already correctly used `SchemaAdapters.getAbilityMod()` for Strength — this was a same-file inconsistency, not a deliberate choice. Fixed to match. | None (now uses `SchemaAdapters.getAbilityMod()`) |
| 3 | `scripts/skills/skill-uses.js` (6 sites: lines ~1225, 2207, 2360, 3121, 3311, 3337) — **FIXED** | Six skill-use special mechanics (target Int-based DC, Endurance/Con-based hold-breath and rounds-held math, Con-based healing). All six now route through `SchemaAdapters.getAbilityMod()`/`getAbilityScore()`. | None on any of the 6 (now fixed) |
| 4 | `scripts/apps/progression-framework/shell/progression-shell.js` (`_buildAbilitySnapshot()`) — **FIXED, and impact corrected** | Originally flagged as "could show stale scores to a player mid-level-up." Verified: its only caller sets `context.abilitySnapshot`, which no `.hbs` template or other code reads anywhere in the repo (grepped) — currently dead output, not live-rendered. Fixed anyway (canonical `system.attributes` first, `system.abilities` only when `system.attributes` is entirely absent) since it's a one-line-cheap, safe, and consistent fix, but the priority claim is corrected here for the same honesty reason as row 1a. | None (now fixed) |
| 5 | `scripts/engine/talent/lightsaber-form-engine.js:39-40,50` — **FIXED, and impact corrected** | Its own `actorAbilityMod()` has **zero callers anywhere in the repo** (grepped) — currently dead code, not live-affecting lightsaber form to-hit stats (that's `combat-stat-rules.js`'s Ataru case, which already used the now-fixed `SchemaAdapters`, unaffected by this row). Consolidated onto `SchemaAdapters.getAbilityMod()` anyway for consistency. While fixing it, found the **same duplicated `actorAbilityMod()` helper independently reimplemented in two more files** — see the new rows 5b/5c below, added during this pass. | Attributes checked, but after abilities (now fixed) |
| 5b | `scripts/engine/feats/skill-feat-runtime-patches.js:179-189` (found during row 5's fix) — **FIXED** | Live: used by skill-feat runtime patches (`actorAbilityMod(actor, rule.ability)` at line ~336). Had no score-reconstruction fallback at all — would return exactly 0 if no `.mod` field was present anywhere. Consolidated onto `SchemaAdapters.getAbilityMod()`. | Wrong order, no reconstruction fallback (now fixed) |
| 5c | `scripts/engine/combat/combat-option-resolver.js:32` (found during row 5's fix) — **FIXED (cleanup only)** | Already called `SchemaAdapters.getAbilityMod()` first; the wrongly-ordered fallback tail after it was dead code (`SchemaAdapters.getAbilityMod()` always returns a finite number, never `null`/`undefined`), but removed for clarity. | Dead tail removed |
| 6 | `scripts/engine/skills/skill-feat-resolver.js:580-596` — **FIXED** | Skill-feat bonus resolution (e.g. ability-substitution feats: `'abilityModifier'`/`'abilityDelta'` rule formulas). Both now delegate to `SchemaAdapters.getAbilityMod()`. | Fully wrong order: abilities → attributes → derived (now fixed) |
| 7 | `scripts/engine/progression/feats/feat-grant-entitlement-resolver.js:45-48,56` — **FIXED** | Feat-grant entitlement checks during progression. Draft-aware (checks in-progress chargen/level-up selections first), so not consolidated onto `SchemaAdapters` — only reordered, added a missing `system.derived.attributes` tier, and replaced a score-reconstruction fallback that relied on nonexistent `system.attributes.total`/`.value` fields (always silently returning 0) with a real `base+racial+enhancement+temp` reconstruction. | Wrong order, AND a separately-broken score fallback (now fixed) |
| 8 | `scripts/engine/progression/utils/force-suite-resolution.js:230,236` — **FIXED** | Force-suite/power resolution during progression. Must check draft/pending chargen/level-up selections before committed actor data, so it was not consolidated onto `SchemaAdapters` — only its `system.abilities`-before-`system.attributes` candidate order was corrected, preserving all draft-state logic. | Wrong order (now fixed) |
| 9 | `scripts/engine/feats/force-training-entitlement-runtime-patches.js:45` and `scripts/engine/force/ForceTrainingEngine.js:30` (duplicated logic in two files) — **FIXED** | Force-training entitlement prerequisite (Wis/Cha). On closer investigation this exact "resolve configured Force ability" pattern was independently duplicated **four times** (this pair, plus rows 10 and 11) — see the consolidation note below. `force-training-entitlement-runtime-patches.js` (draft-state-aware, like row 8) got the same order-only fix; `ForceTrainingEngine.js` (committed-actor-only) was consolidated onto `SchemaAdapters.getAbilityMod()`. | Wrong order, and duplicated (now fixed) |
| 10 | `scripts/engine/progression/engine/force-power-engine.js:118-120` — **FIXED** | Force power count (`Math.max(1, 1 + mod)`). Committed-actor-only; consolidated onto `SchemaAdapters.getAbilityMod()`, removing ~15 duplicated lines of score-reconstruction logic. | Wrong order (now fixed) |
| 11 | `scripts/engine/progression/engine/force-provenance-engine.js:79` — **FIXED** | Force provenance/tracking. Committed-actor-only; consolidated onto `SchemaAdapters.getAbilityMod()`. Previously required `system.abilities` to exist just to proceed at all, and never read `system.attributes`. | None (now fixed) |

**Consolidation note (rows 9-11):** the same "resolve the actor's configured Force ability (Wis or Cha) modifier" logic was independently reimplemented in four places (`ForceTrainingEngine.getForceAbilityModifier()`, `ForceProvenanceEngine.getConfiguredAbilityMod()`, `ForcePowerEngine._countFromAbilityMod()`, and the draft-aware `force-training-entitlement-runtime-patches.js#getAbilityData()`), each with its own subtly different bug. `SchemaAdapters.getAbilityMod()` already handles the `'wisdom'`/`'charisma'` string-form aliasing internally (`normalizeAbilityKey()`), so the three committed-actor-only implementations were consolidated onto it directly — per the audit's own instruction to prefer an existing canonical helper over a new one.
| 12 | `scripts/apps/template-character-creator.js:453` — **FIXED** | Chargen "available skill points" (Int-based) calculation. Consolidated onto `SchemaAdapters.getAbilityScore()`. | Wrong order (now fixed) |
| 13 | `scripts/actors/vehicle/vehicle-crew-positions.js:154` — **FIXED** | Vehicle crew position ability bonus. Consolidated onto `SchemaAdapters.getAbilityMod()`. | None (now fixed) |
| 14 | `scripts/engine/store/index.js:115` — **FIXED (order-only)** | Store/NPC "has default ability scores" heuristic. Operates on droid Item/pack stat-block data, not a live Actor (no `system.derived`), so kept as a direct field-order fix (`system.attributes \|\| system.abilities`) rather than routed through `SchemaAdapters`. | Wrong order (now fixed) |
| 15 | `scripts/engine/suggestion/shared-suggestion-utilities.js:40-45` — **FIXED** | Suggestion-engine input data (`extractAbilityScores()`), consumed by `extractAbilityModifiers()` and `findHighestAbility()`. Consolidated onto `SchemaAdapters.getAbilityScore()`. | None (now fixed) |
| 16 | `scripts/engine/suggestion/AttributeIncreaseScorer.js:242-247` (`_createHypotheticalActor()`) — **FIXED** | "Should I increase this ability" suggestion scoring — built a hypothetical/simulated actor clone by patching `system.abilities.str` etc. directly. Fixed to patch `system.attributes` (the field canonical accessors actually read) and to null out the corresponding `system.derived.attributes` entries, so a live real-actor derived snapshot cannot shadow the hypothetical scores. Paired with row 21 below (`prerequisite-checker.js`) — this simulation had no observable effect until that companion bug was also fixed. | None (now fixed) |
| 17 | `scripts/mentor/mentor-dialogue-v2-integration.js:70-74` (`buildAnalysisData()`) — **FIXED** | Mentor dialogue flavor-text analysis. Consolidated onto `SchemaAdapters.getAbilityScore()`/`getAbilityMod()`. | None (now fixed) |
| 18 | `scripts/actors/v2/character-actor.js:327` (`mirrorIdentity()`) — **FIXED** | Builds `system.derived.identity.abilities`. **Verified live before fixing**: `templates/actors/character/v2/partials/skills-panel.hbs` does `{{#each @root.derived.identity.abilities as \|ab\|}}` in two places — real player-facing UI, not dead output. Also verified `SchemaAdapters` is safe to call at this synchronous-inside-`prepareDerivedData` call site (falls through to a fresh `system.attributes` reconstruction when `system.derived.attributes` isn't yet populated for the current cycle) before consolidating onto it. | None (now fixed) |
| 19 | `scripts/engine/progression/engine/suggestion-constants.js:125` — **FIXED (dead-value correction)** | A path-string constant, `WISDOM_MOD: 'system.abilities.wis.mod'`. **Verified before fixing**: `SYSTEM_PATHS` has zero consumers anywhere in the repo (repo-wide grep) — it is not fed through a generic property-path reader, so there was no resolver mechanism to replace. Genuinely dead code. Corrected its value to the canonical `system.derived.attributes.wis.mod` path anyway, with a comment directing any future consumer to `SchemaAdapters.getAbilityMod()` instead. See row 23 below for the real defect this investigation surfaced in a different file. | N/A (constant, not a direct read; now dead-but-correct) |
| 20 | `scripts/engine/talent/talent-ability-helpers.js` (`getTalentAbilityMod()`) — **FIXED, fail-before proof performed** | Was self-documented as intentionally reversed-order ("NOT SchemaAdapters.getAbilityMod() — that helper checks system.attributes before system.abilities, the reverse of this function's priority order, so swapping would be a behavior change for actors whose mirrors have diverged"). Used by force-adept/sith/jedi-prestige/consular/sentinel talent actions (all confirmed to pass live, committed actors — no simulation). **Fail-before proof performed per explicit direction that a deliberate historical choice doesn't make an order correct**: a real Dex 20 with no `system.derived` yet resolved to modifier 0 (the stale mirror) instead of +5. The "behavior change" the original comment warned about was the bug. Also found: its own `system.attributes` fallback tier checked a `.mod` field that never exists on the real schema, making that tier permanently dead regardless of order. Consolidated onto `SchemaAdapters.getAbilityMod()`. See `tests/talent-ability-helpers-fail-before-proof.test.mjs`. | Wrong order, intentionally (now fixed) |
| 21 | `scripts/data/prerequisite-checker.js` `_checkAbilityRequirement()` — **FIXED (found beyond original inventory)** | Ability-score feat/talent prerequisite checks (e.g. "requires Str 13"). See the "Three additional defects" note above for the fail-before proof. | Checked only nonexistent fields, silently defaulted to 10 (now fixed) |
| 22 | `scripts/mentor/mentor-conditional-variants.js` `evaluateCondition('high_ability')` — **FIXED (found beyond original inventory)** | Mentor dialogue-variant selection's "character has a strong ability score" condition. See the "Three additional defects" note above. | Checked only nonexistent `.value`, always-10 `.total` (now fixed) |
| 23 | `scripts/engine/progression/engine/starship-maneuver-suggestion-engine.js` `_intelligentSuggest()` — **FIXED (found beyond original inventory)** | Starship-maneuver suggestion's "boost Deflector maneuvers by Wis mod" logic. Found while tracing row 19's `WISDOM_MOD` consumers. See the "Three additional defects" note above. | Read only the stale mirror directly (now fixed) |

Two sites were reviewed and found **not** to be defects on closer reading,
despite initially looking similar:

- `scripts/skills/skill-uses.js`'s six sites (row 3) technically have no
  fallback, but every one of them reads a stat (Con, Int) that has no
  in-repo evidence of ever being fed through `system.attributes` divergently
  in practice for the specific skill-use flows involved — still real bugs,
  kept in the table, but noted as lower blast-radius than initiative/combat
  math since they're less frequently triggered player actions.
- `scripts/governance/actor-engine/actor-engine.js:4066-4067` (`if
  (flat['system.abilities.str.base'] && flat['system.abilities.str.value'])`)
  is a **read of the incoming mutation payload itself** (conflict
  detection), not actor state — Category B, correctly scoped to its
  guardrail purpose.

## Category D sites — active runtime writes

None found beyond the sanctioned `ActorEngine` shape-backstop (Category B,
above) and the compendium migration script (Category A). Every other
apparent "write" traced back to either an in-memory projection object that
never reaches `ActorEngine.updateActor()` (`mutation-plan.js`, flagged
above for follow-up, not confirmed as a persistence path) or a payload the
`mutation-boundary-service` intercepts and redirects before it reaches the
document. **No Phase 7 (write remediation) work is required based on this
inventory** — see the Phase 4 conclusion above.

## Category F — dead code

An earlier draft of this document said "none conclusively identified,"
which directly contradicted several already-classified Category C rows
that are explicitly zero-caller or unconsumed-output. That was a
classification bug in the document, not a finding that those sites weren't
dead — corrected here by splitting "dead" into three distinct shapes,
since they carry different risk and different fix urgency:

- **F1 — no tracked runtime callers at all** (unreachable from any
  sheet/talent/macro/hook source in the repo, and not exposed on any
  global): `scripts/engine/talent/lightsaber-form-engine.js`'s
  `actorAbilityMod()` (Category C row "5"). Confirmed via
  `grep -rn "actorAbilityMod("` across the whole repo before this
  function's only caller turned out to be itself (its definition). Fixed
  anyway in Phase 6e for consistency — lowest-risk kind of dead code to
  touch, since nothing observable changes either way.
- **F2 — output currently unconsumed** (the function *is* called, but
  nothing downstream reads what it produces): `progression-shell.js`'s
  `_buildAbilitySnapshot()` (Category C row 4). It has one real caller,
  which assigns its result to `context.abilitySnapshot` — but no `.hbs`
  template or other code in the repo reads that context key (grepped
  `templates/` directly). Fixed anyway in Phase 6c since a template could
  start reading it at any time and the fix is one function.
- **F3 — no internal callers, but externally reachable via a global/macro
  surface**: `scripts/combat/rolls/enhanced-rolls.js`'s
  `SWSERoll.rollInitiative()` (Category C row "1a"). Zero callers in
  tracked sheet/talent/macro source, but the file does
  `window.SWSERoll = SWSERoll;`, so it remains callable from the console
  or a user macro. This is the kind of "dead" that still deserves a fix
  (defense in depth), unlike F1/F2 where the fix is purely precautionary.

A fourth, narrower thing was also found and is **not** classified above
since it isn't a whole dead function: `combat-option-resolver.js`'s
`actorAbilityMod()` (row "5c") already called
`SchemaAdapters.getAbilityMod()` first, with a wrongly-ordered fallback
tail after it that could never execute (that accessor never returns
`null`/`undefined`). Removed as a dead *branch* within a live function,
not a Category F entry.

`scripts/actors/derived/derived-calculator.js`'s own
`system.derived.abilities` (as opposed to `system.derived.attributes`) was
separately found and removed as dead code from `roll-config.js` and
`schema-adapters.js` in the Phase 1/2/5 commits — no file in the repo
writes or reads it; not re-listed here since it was a dead *read tier*
inside functions already covered above, not a distinct dead site.

## Disposition summary

| Category | Count |
|---|---|
| A — migration-only | 1 file (`phase5-compendium-heal.js`) |
| B — correct compatibility boundary | ~30 files |
| C — real defect (fixed + remaining functions/sites) | 33 sites across 27 files — **all 33 fixed, 0 remaining** — see "Definitive counts" above |
| D — active write | 0 confirmed (governance layer already correct) |
| E — comment/doc only | 3 (stale comments, no runtime effect) |
| F1 — dead, no tracked callers | 1 (`lightsaber-form-engine.js`, fixed) |
| F2 — dead, output unconsumed | 1 (`progression-shell.js`, fixed) |
| F3 — dead internally, externally reachable | 1 (`enhanced-rolls.js`, fixed) |
| N/A — different schema (Item documents) | 4 files |

## Status

**All 33 of 33 Category C functions/sites (27 of 27 files) are fixed,
tested, and committed** — combat/rolls, skill-uses, progression-shell,
Force-power subsystem, talent/feats subsystem, chargen/vehicles/store/
suggestions/mentor, the character-actor.js identity mirror, and
talent-ability-helpers.js's deliberately-reversed order (fail-before
proven, then fixed) — plus three defects found beyond the original
30-site inventory (`prerequisite-checker.js`, `mentor-conditional-variants.js`,
`starship-maneuver-suggestion-engine.js`) — see the `Phase 6a`-`Phase 6j`
commits on this branch. `SchemaAdapters.getAbilityMod()`/`getAbilityScore()`
themselves were fixed in the `Phase 4/5` commit, which most of the above
now delegate to directly rather than re-deriving their own ability-lookup
logic — this also resolved the "duplicate helper proliferation" pattern
discovered along the way (the same `actorAbilityMod`/"resolve configured
Force ability" logic had been independently reimplemented in at least 7
files across the Force-power and talent/feats subsystems alone).

Regression coverage for the final batch:
`tests/consumer-batch-ability-authority.test.mjs` (rows 12, 13, 15, 17, 22 —
live calls — plus source-contract checks for rows 14 and 12's heavier
sibling file), `tests/prerequisite-ability-score-authority.test.mjs`
(rows 16 and 21, fail-before/pass-after), `tests/character-actor-identity-ability-authority.test.mjs`
(row 18), `tests/starship-maneuver-suggestion-ability-authority.test.mjs`
(row 23), and `tests/talent-ability-helpers-fail-before-proof.test.mjs`
(row 20, fail-before/pass-after).

**This completes the ability-schema-authority migration's read-side
remediation**: every Category C site identified in this ledger, including
every site discovered mid-implementation, is now fixed. No known runtime
consumer reads `system.abilities` as a competing or first-checked source
of ability-score truth for a live Actor.

## Remaining (not yet executed)

1. Phase 11 doc cleanup: reconcile the stale `progression-finalizer.js` and
   `character-like-sheet.js` comments identified above, and this document's
   own header comment in `schema-adapters.js` (already corrected in the
   Phase 4/5 commit).
2. Phases 3/4 of the originally-requested plan (repository-wide governance-
   layer remediation) are not needed — see the Phase 4 conclusion above:
   the mutation/write side was already correct before this migration
   started.
3. `scripts/engine/suggestion/shared-suggestion-utilities.js`'s
   `findHighestAbility()` has an independent, pre-existing bug unrelated to
   ability-schema authority (an `Array#reduce` with no initial value, so it
   always returns the first `Object.entries()` key regardless of actual
   scores) — found while writing regression coverage for row 15. Out of
   scope for this migration (it would misbehave identically with correct
   schema data) and intentionally left unfixed; flagged here as a follow-up
   item.
4. `tools/check-ability-schema-authority.mjs` should be strengthened to flag
   new runtime *reads* of `system.abilities` (it currently only flags
   write/bind sites), with an allowlist for migration scripts, the
   `ActorEngine` compatibility boundary, mutation governance, explicit
   import adapters, debug/audit tooling, tests exercising legacy input, and
   Item-schema files whose own `abilities` field is unrelated to Actor
   authority (see `drop-handler.js` et al. above). Not yet started — see
   the follow-up commit on this branch.
