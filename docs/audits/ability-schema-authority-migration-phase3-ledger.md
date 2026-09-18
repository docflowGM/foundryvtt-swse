# V2 Ability Schema Authority Migration — Phase 3 Inventory Ledger

Follow-up to `docs/audits/skill-roll-dialog-base-authority.md`'s "Deferred"
section. That audit found `system.abilities` referenced in 68 files under
`scripts/` (358 occurrences repo-wide across 93 files including docs/data)
and a direct contradiction between `docs/systems/ABILITY_SCHEMA_AUTHORITY.md`
and `scripts/utils/schema-adapters.js`'s own doc comment. This is the
read-only inventory pass that document called for, before any of those 68
files were touched.

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
| 3 | `scripts/skills/skill-uses.js` (6 sites: lines ~1225, 2207, 2360, 3121, 3311, 3337) | Six skill-use special mechanics (target Int-based DC, Endurance/Con-based hold-breath and rounds-held math, Con-based healing). | None on any of the 6 |
| 4 | `scripts/apps/progression-framework/shell/progression-shell.js` (`_buildAbilitySnapshot()`) | The level-up/progression UI's own ability-score snapshot — could show stale scores to a player mid-level-up. | None |
| 5 | `scripts/engine/talent/lightsaber-form-engine.js:39-40,50` | Lightsaber form to-hit stat resolution (independent of `combat-stat-rules.js`'s Ataru case, which already goes through the now-fixed `SchemaAdapters`). | Attributes checked, but after abilities (wrong order) |
| 6 | `scripts/engine/skills/skill-feat-resolver.js:580-596` | Skill-feat bonus resolution (e.g. ability-substitution feats). | Fully wrong order: abilities → attributes → derived (should be reversed) |
| 7 | `scripts/engine/progression/feats/feat-grant-entitlement-resolver.js:45-48,56` | Feat-grant entitlement checks during progression. | Wrong order (abilities before attributes) |
| 8 | `scripts/engine/progression/utils/force-suite-resolution.js:230,236` | Force-suite/power resolution during progression. | Wrong order |
| 9 | `scripts/engine/feats/force-training-entitlement-runtime-patches.js:45` and `scripts/engine/force/ForceTrainingEngine.js:30` (duplicated logic in two files) | Force-training entitlement prerequisite (Wis/Cha). | Wrong order, and duplicated |
| 10 | `scripts/engine/progression/engine/force-power-engine.js:118-120` | Force power resolution. | Wrong order |
| 11 | `scripts/engine/progression/engine/force-provenance-engine.js:79` | Force provenance/tracking. | None |
| 12 | `scripts/apps/template-character-creator.js:449` | Chargen "available skill points" (Int-based) calculation. | Wrong order |
| 13 | `scripts/actors/vehicle/vehicle-crew-positions.js:153` | Vehicle crew position ability bonus. | None |
| 14 | `scripts/engine/store/index.js:110` | Store/NPC "has default ability scores" heuristic. | Wrong order |
| 15 | `scripts/engine/suggestion/shared-suggestion-utilities.js:31` | Suggestion-engine input data. | None |
| 16 | `scripts/engine/suggestion/AttributeIncreaseScorer.js:242-247` | "Should I increase this ability" suggestion scoring — reads `actor.system.abilities.str` etc. directly (no optional chaining) to seed a hypothetical/simulated actor clone; does not persist. | None |
| 17 | `scripts/mentor/mentor-dialogue-v2-integration.js:65` | Mentor dialogue flavor-text analysis. | None |
| 18 | `scripts/actors/v2/character-actor.js:327` | Builds an `i.abilities` array on the core V2 character-actor class — **needs Phase-6-time verification of exactly where this output is consumed** before assuming its blast radius. | None |
| 19 | `scripts/engine/progression/engine/suggestion-constants.js:125` | A path-string constant, `WISDOM_MOD: 'system.abilities.wis.mod'`, consumed elsewhere via a generic property-path reader — **needs Phase-6-time verification of every consumer of this constant.** | N/A (constant, not a direct read) |
| 20 | `scripts/engine/talent/talent-ability-helpers.js` | Self-documented as intentionally reversed-order ("NOT SchemaAdapters.getAbilityMod() — that helper checks system.attributes before system.abilities, the reverse of this function's priority order, so swapping would be a behavior change for actors whose mirrors have diverged"). Used by lightsaber/consular/sentinel talent actions. **This is known, acknowledged debt, not blind residue — flagged for a deliberate decision rather than a silent fix**, since the original author explicitly reasoned about it. | Wrong order, intentionally |

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

None conclusively identified in this pass; `scripts/actors/derived/derived-calculator.js`'s
own `system.derived.abilities` (as opposed to `system.derived.attributes`)
was already found and removed as dead code from `roll-config.js` and
`schema-adapters.js` in the Phase 1/2/5 commits — no other file writes or
reads it.

## Disposition summary

| Category | Count (scripts/ sites) |
|---|---|
| A — migration-only | 1 file (`phase5-compendium-heal.js`) |
| B — correct compatibility boundary | ~30 files |
| C — real defect, needs fixing | 20 sites across 18 files |
| D — active write | 0 confirmed (governance layer already correct) |
| E — comment/doc only | 3 (stale comments, no runtime effect) |
| F — dead code | 0 remaining (already removed in Phase 1/2/5) |
| N/A — different schema (Item documents) | 4 files |

## Recommended next steps (not yet executed)

Per the requested subsystem sequence, with priority re-ordered by confirmed
gameplay impact:

1. **Combat/rolls (highest impact)** — `enhanced-rolls.js` `rollInitiative()`
   (live initiative math), `combat-stats-tooltip.js` (display).
2. **Skill uses** — the six `skill-uses.js` sites.
3. **Progression UI** — `progression-shell.js`'s ability snapshot.
4. **Force system** — the five Force-related sites (rows 8-11), including
   the duplicated Force-training-entitlement helper.
5. **Talents** — `lightsaber-form-engine.js`, and a deliberate decision (not
   a silent fix) on `talent-ability-helpers.js`'s documented divergence.
6. **Feats/skills engine** — `skill-feat-resolver.js`,
   `feat-grant-entitlement-resolver.js`.
7. **Chargen/vehicles/store/suggestions** — the remaining lower-impact
   sites.
8. Two items need direct source investigation before a fix can be written:
   `character-actor.js`'s `i.abilities` consumer(s), and every consumer of
   the `WISDOM_MOD` path-string constant.
9. Phase 11 doc cleanup: reconcile the stale `progression-finalizer.js` and
   `character-like-sheet.js` comments identified above.
