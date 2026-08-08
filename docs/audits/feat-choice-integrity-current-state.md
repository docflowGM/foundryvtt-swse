# Feat Choice Persistence & Scoped-Feat Integrity — Current-State Forensic Audit

Phase 1 of the feat-choice-persistence task. Facts verified against current repository state (post PR #941), not against older audit documents' assumptions. Where a historical doc (`docs/feat-choice-required-audit-phase5.json`, `docs/feat-talent-persistent-choice-pickers-phase-t14.json`) is cited, its claim has been independently re-checked against the live catalog/code.

## Naming correction before anything else

This task's brief names **Weapon Specialization, Greater Weapon Focus, Greater Weapon Specialization** as feat families to audit. **They are not feats in the current, corrected catalog.** PR #941 removed them from `data/feat-catalog.json`/`packs/feats.db` as talent-domain contaminants (`scripts/data/feat-domain-guard.js`) — they exist only as real talents in `packs/talents.db`. This audit covers them as talents where relevant (§4) but does not treat their absence from the feat catalog as a defect; that removal was correct and already shipped.

## 1. Choice-bearing feat families found in the current catalog

`data/feat-catalog.json` (390 docs): **35 entries carry `system.choiceMeta`**, of which **25 have `choiceMeta.required: true`** (a choice must be made for the feat to function) across 24 distinct `choiceKind` values. `data/feat-choice-options.json` (the `optionRegistry` target every `choiceMeta` points into) separately enumerates 34 `choiceKinds` — a superset, since some kinds are used only by talents outside the feat catalog.

| Feat Family | Choice Type | Acquisition UI | Persisted Field (declared) | Persisted Field (actually written) | Status |
|---|---|---|---|---|---|
| Skill Training | trained skill | `FeatChoiceDialog` | `flags.swse.choices.skill_training` | `system.selectedChoice` | **mixed_storage** (see §2) |
| Skill Focus | trained skill | `FeatChoiceDialog` | `flags.swse.choices.skill_focus` | `system.selectedChoice` | **mixed_storage** |
| Weapon Proficiency | weapon group / exotic weapon | `FeatChoiceDialog` (generic) **and** 4 pre-baked static-variant items | `flags.swse.choices.weaponProficiency` | `system.selectedChoice` (generic item only) | **mixed_storage** — two competing representations (see §3) |
| Exotic Weapon Proficiency | weapon group / exotic weapon | legacy alias, `routeThrough: "Weapon Proficiency"` | `flags.swse.choices.weaponProficiency` | `system.selectedChoice` | **mixed_storage** (legacy alias, by design) |
| Weapon Focus | weapon group / exotic weapon, derived from Weapon Proficiency | `FeatChoiceDialog` | `flags.swse.choices.weapon_focus` | `system.selectedChoice` | **mixed_storage** |
| Double Attack | weapon group / exotic weapon | `FeatChoiceDialog` | `flags.swse.choices.double_attack_weapon` | `system.selectedChoice` | **mixed_storage** |
| Triple Attack | weapon group / exotic weapon, derived from Double Attack | `FeatChoiceDialog` | `flags.swse.choices.triple_attack_weapon` | `system.selectedChoice` | **mixed_storage** |
| Weapon Specialization *(talent, not feat)* | weapon group, derived from Weapon Focus | talent-step.js | `flags.swse.choices.weapon_specialization` | `system.selectedChoice` (when sourced from `packs/talents.db`) | **mixed_storage**, plus source-layer drift (§4) |
| Greater Weapon Focus *(talent)* | weapon group | talent-step.js | `flags.swse.choices.greater_weapon_focus` | `system.selectedChoice` | same as above |
| Greater Weapon Specialization *(talent)* | weapon group | talent-step.js | `flags.swse.choices.greater_weapon_specialization` | `system.selectedChoice` | same as above |
| ~20 others (Adaptable Talent, Force Training, Return Fire, Triple Crit(+Specialist), Linguist, Starship Tactics, Superior Tech, droid-specific choices, etc.) | various (talent choice, weapon, skill, language, tech category, ...) | `FeatChoiceDialog` | `flags.swse.choices.<kind>` | `system.selectedChoice` | **mixed_storage** (same pattern, universal) |

Every single choice-bearing catalog entry shares the same "mixed_storage" status for the same reason (§2), not 25 independent problems — this is one systemic gap, not many.

## 2. The actual write/read shape — `storagePath` is declared but dead

Traced every writer and reader in the repository (`FeatChoiceResolver`, `FeatChoiceDialog`, chargen/level-up steps, the prerequisite checker, sheet context builders):

- **Every catalog `choiceMeta.storagePath` value is `flags.swse.choices.<kind>`.** This is declared in `data/feat-catalog.json` for all 25 required-choice feats.
- **Nothing in the codebase ever writes to `flags.swse.choices.*`.** A repo-wide search found exactly three read sites that reference it (`scripts/engine/progression/feats/feat-choice-resolver.js:489` as a fallback tier, `scripts/houserules/tech-specialist-modification-service.js:170`, `scripts/engine/combat/combined-feat-action-resolver.js:47-48`) and zero write sites.
- **The real, load-bearing write target is `system.selectedChoice`** (plus `system.choiceResolved: true` and `system.choiceResolvedAt: <ISO>`), written by two different call sites that **do not produce identical output**:
  1. `scripts/apps/progression-framework/steps/feat-step.js` (chargen/level-up) writes `system.selectedChoice`/`choiceResolved`/`choiceResolvedAt` directly onto the pending selection object (`feat-step.js` ~lines 2128-2136) — it does not call `FeatChoiceResolver.buildChoicePatch`.
  2. `scripts/apps/choices/feat-choice-dialog.js`'s `promptAndApply` calls `FeatChoiceResolver.buildChoicePatch` (`feat-choice-resolver.js:1532`), which returns the same three `system.*` keys — **but** a monkeypatch, `scripts/apps/progression-framework/shell/choice-resolution-finalization-patch.js` (self-registering at module load, line 152), wraps `buildChoicePatch` to *additionally* write `flags.swse.selectedChoice` and `flags.swse.progression.selectedChoice` (lines 131-142). Chargen's direct-write path (1) never gets these mirror fields.
- **`getStoredChoice`** (`feat-choice-resolver.js:507`) is the read side: it checks `system.selectedChoice`/`selectedChoices` first, then (only because of the same monkeypatch, which also wraps the reader) probes ~15 other candidate fields defensively (`choiceCandidates()` in the patch file, lines 37-61) before falling back to the declared-but-dead `storagePath`, then to an actor-level choice-state blob. This defensive probing is *why* the system mostly works despite two writers producing different field sets — but it is fragile compatibility-shim behavior, not a canonical contract.

**Conclusion: there is currently no single canonical persisted-choice shape.** The de facto standard is `system.selectedChoice` + `system.choiceResolved` + `system.choiceResolvedAt`, but it is reached by two different writers with different side effects, reconciled only by a defensive multi-field reader.

## 3. Weapon Proficiency: a genuine dual-representation case

`data/feat-catalog.json` contains **both**:
- 4 pre-baked, already-resolved static-variant items: `Weapon Proficiency (Simple Weapons)`, `Weapon Proficiency (Rifles)`, `Weapon Proficiency (Heavy Weapons)`, `Weapon Proficiency (Pistols)` — each `choiceMeta.resolution: "already_resolved_static_variant"`, no runtime choice needed.
- 1 generic `Weapon Proficiency` item with `choiceMeta.status: "tagged_for_later_dialog_backfill"` and the SAME `storagePath` (`flags.swse.choices.weaponProficiency`) as the static variants would notionally use.

No other family in the catalog has this dual pattern (Skill Focus, Skill Training, Weapon Focus, Double Attack, Exotic Weapon Proficiency all have exactly one generic choice-driven item, zero static variants). Whether both representations are intentionally meant to coexist (e.g. static variants for common/NPC-facing grants, the generic item for PC chargen picks) or the generic item is stale scaffolding was not determined here — repository evidence does not resolve it, and it is a design question, not a defect this task's brief authorizes fixing. Flagged for the source/design review queue rather than changed.

## 4. Source-data layer drift for talent-side scoped choices

`packs/talents.db` (the compiled, world-loaded compendium) has full `system.choiceMeta` for Weapon Specialization / Greater Weapon Focus / Greater Weapon Specialization. The pre-build staging files `data/generated/talents.fixed.json` and `data/fixes/talents.fixed.json` (862 entries each) have **no `choiceMeta` field at all** for these same three talents. Whether a given tool/rebuild path reads the compiled pack or the staging files determines whether these talents even prompt for a choice. Not touched in this task (talents are explicitly out of this task's "feat choice" scope and touching talent source-data pipelines is a larger, separate change) — documented here as a real, concrete finding for a future talent-focused pass.

## 5. Acquisition paths that never invoke the choice dialog

- `scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js` and `scripts/apps/progression-framework/steps/follower-steps/follower-feat-step.js` contain **zero references** to `FeatChoiceResolver`, `choiceMeta`, or `selectedChoice`. If either path grants a scoped feat (e.g. an NPC template's starting "Weapon Focus"), the resulting embedded item gets no `system.selectedChoice` at all.
- `scripts/engine/import/npc-template-importer-engine.js:_createFeatItem` builds a feat item from a bare name string only (`{name, type:'feat', system:{description, rarity, sourceAuthority, playModeReference}}`) — no `choiceMeta`, no `selectedChoice`, no copy from the canonical catalog template at all. If a statblock says "Weapon Focus (Rifles)", the created item's `name` carries the parenthetical but has zero structured backing. `stock-droid-importer-engine.js` was checked for the same pattern and shows the same gap.

Neither of these silently invents an arbitrary choice (good — matches the architecture's intent) — they simply produce an item with no resolvable choice at all, which then depends entirely on the name-parenthetical fallback (§6) at combat time.

## 6. Runtime consumers — structured-first, name-parsing-last is the existing (correct) pattern, but is exercised more than it should be

A consistent pattern already exists across ~9 files under `scripts/engine/feats/*-normalization-hooks.js` and `*-runtime-patches.js` (e.g. `weapon-critical-feat-normalization-hooks.js:28-41`'s `selectedChoiceFromItem`): check `system.selectedChoice` / `selectedChoices` / `choiceMeta.selectedChoice` / `choiceMeta.choice` / `abilityMeta.selectedChoice`, in that order, and **only if every one of those is empty**, fall back to `String(item.name).match(/\(([^)]+)\)/)`. This is the right shape for a fallback — the problem is that §5's gaps (importer, nonheroic/follower steps) mean this "last resort" fallback is reached more often than the architecture intends. `scripts/engine/combat/features/*` files do not show this pattern and rely on structured lookups only.

## 7. Clone / import safety

`scripts/engine/interactions/dropped-item-clone.js` (`cloneDroppedItemData`) — the one repo-specific item-duplication helper — passes `system.choiceMeta`/`selectedChoice`/all `flags.swse.*` through untouched (only strips `_id`, adds a `sourceUuid` flag). No custom `Actor.clone()` override exists; actor duplication/compendium import relies on Foundry's default serialization, which was not found to be interfered with anywhere in `scripts/`.

## 8. Existing test coverage

Only 3 test files touch this surface: `tests/ability-engine-acquisition.test.mjs` (scoped-choice **legality**, via `pending.selectedChoice`, not persistence), `tests/krath-talent-tree-hydration.test.mjs` (a *different* field, `activationChoiceMeta`, for on-use choices), and `tests/superior-skills-talent-hydration.test.mjs` (a partial hydration round-trip: constructs an item with `system.selectedChoice` already set and asserts it survives — not a full chargen-to-embedded-item round-trip). Nothing tests `buildChoicePatch`, the chargen-vs-dialog write divergence, or `flags.swse.choices.*`.

## Summary for Phase 2

The canonical shape to formalize is the one already dominant in practice: **`system.selectedChoice` + `system.choiceResolved` + `system.choiceResolvedAt`**, written through one shared helper (`FeatChoiceResolver.buildChoicePatch`) instead of two divergent writers. The declared `storagePath: flags.swse.choices.<kind>` convention in catalog data is aspirational and not live; rather than making every writer also populate it (expanding an already-fragile multi-field reader), the simpler, lower-risk fix is to stop treating it as authoritative and keep it as a low-priority read-compatibility fallback exactly as `getStoredChoice` already does.
