# Feat Choice Runtime Consumers

Phase 11 of the feat-choice-persistence task. Classifies every code path found that reads a scoped feat's selected choice at runtime, so a future feat-mechanics implementation pass knows exactly which consumers are safe to build on and which still need conversion. This is a classification exercise, not a mechanics-implementation pass — per this task's brief, large missing feat mechanics are explicitly out of scope here.

Classification key:
- **canonical** — reads `system.selectedChoice` (or `FeatChoiceResolver`/`getChoiceMeta`/`getStoredChoice`) first.
- **legacy_field** — reads an older/alternate field directly instead of going through `FeatChoiceResolver`.
- **name_parsing_fallback** — structured-first, but falls back to parsing the choice out of `item.name` (`/\(([^)]+)\)/`) as a last resort when structured data is absent.
- **not_implemented** — the mechanic itself isn't built yet; not a choice-reading defect.

## Canonical (structured-first, correct)

| Consumer | Notes |
|---|---|
| `scripts/data/prerequisite-checker.js` | Live legality path (`AbilityEngine.evaluateAcquisition` → here). Uses `FeatChoiceResolver.getSelectedChoiceKey`/`getChoiceLabel`/`getChoiceProviderEntries`/`getWeaponProficiencyChoices`. Verified correct by this task's Phase 7 tests. |
| `scripts/engine/progression/prerequisites/prerequisite-evaluator.js` | Uses `getSelectedChoiceKey`/`getChoiceProviderEntries` for the (currently unwired, see `docs/audits/feat-integrity-current-state.md`) parallel prerequisite pipeline. |
| `scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js` | Uses `FeatChoiceResolver.requiresChoice` when snapshotting granted items. |
| `scripts/engine/progression/prerequisites/prerequisite-normalizer.js` | Uses `getChoiceLabel` for human-readable prerequisite text rendering. |
| `scripts/apps/progression-framework/steps/feat-step.js` / `talent-step.js` | Chargen/level-up choice acquisition; now routes through `FeatChoiceResolver.buildChoicePatch` for the persisted patch (fixed this task, see below). |
| `scripts/apps/choices/feat-choice-dialog.js` | Confirm-time writer; already canonical. |
| `scripts/engine/progression/feats/feat-engine.js` | Thin façade re-exposing `getChoiceMeta`/`requiresChoice`/`resolveOptions`/`getMissingChoices`/`buildChoicePatch`. |
| `scripts/sheets/v2/context/PanelContextBuilder.js` | Sheet row `choiceLabel`/`choiceMissing`/`choiceInvalid` via `getChoiceStatusSync` — reads structured data, never the item name. |
| `scripts/engine/import/npc-template-importer-engine.js` | **Fixed this task** — `_createFeatItem` now attaches canonical `choiceMeta` and, when the statblock text carries a parenthetical, populates `system.selectedChoice` instead of leaving the choice only in the display name. |

## Name-parsing fallback (structured-first, but the fallback is real and reachable)

All of the following implement the same correct priority order — `system.selectedChoice` / `selectedChoices` / `choiceMeta.selectedChoice` / `choiceMeta.choice` / `abilityMeta.selectedChoice`, then (only if all empty) `item.name.match(/\(([^)]+)\)/)` — which is architecturally the right shape for a last resort. They are listed here because the fallback is reachable in practice whenever an item reaches them without structured data (see "known gaps" below), not because the files themselves are wrong:

- `scripts/engine/feats/weapon-critical-feat-normalization-hooks.js`
- `scripts/engine/feats/unknown-regions-combat-feat-normalization-hooks.js`
- `scripts/engine/feats/weapon-leftover-feat-normalization-hooks.js`
- `scripts/engine/feats/remaining-weapon-armor-feat-normalization-hooks.js`
- `scripts/engine/feats/weapon-autofire-feat-normalization-hooks.js`
- `scripts/engine/feats/return-fire-feat-normalization-hooks.js`
- `scripts/engine/feats/weapon-foundation-feat-normalization-hooks.js`
- `scripts/engine/feats/return-fire-runtime-patches.js`
- `scripts/engine/feats/unknown-regions-weapon-feat-normalization-hooks.js`

No change was made to any of these this task — the fallback logic itself is correct and intentional; only the upstream gaps that make it fire more than necessary were addressed where safe (§ npc-template-importer-engine.js above). `scripts/engine/combat/features/*` (combat-feature-handlers.js, combat-feature-classifier.js, etc.) do not show this pattern — they rely on structured lookups only.

## Legacy/declared-but-dead field

- `scripts/houserules/tech-specialist-modification-service.js:170` and `scripts/engine/combat/combined-feat-action-resolver.js:47-48` read `flags.swse.choices.*` (the catalog-declared `storagePath`). Since nothing writes to that path (see `docs/audits/feat-choice-integrity-current-state.md` §2), these reads will not find data from any current acquisition path and effectively fall through to whatever other logic follows them in each file. Not changed this task (each file's surrounding fallback behavior needs individual review to confirm it degrades safely) — flagged for a future small-fix pass.

## Known upstream gaps feeding the fallback (documented, largely not fixed this task)

- `scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js` and `scripts/apps/progression-framework/steps/follower-steps/follower-feat-step.js` never invoke the choice dialog. A scoped feat granted through either path reaches downstream consumers with no `system.selectedChoice` at all. Not fixed this task — wiring dialog invocation into these two chargen/follower steps is a larger UX change (needs a decision on how a follower/NPC-template pick surfaces a choice prompt) than this task's "small, obvious" fix bar allows; documented for the runtime-mechanics phase to pick up.
- `data/generated/talents.fixed.json` / `data/fixes/talents.fixed.json` lack `choiceMeta` for Weapon Specialization / Greater Weapon Focus / Greater Weapon Specialization even though the compiled `packs/talents.db` has it (talent source-data layer drift, `docs/audits/feat-choice-integrity-current-state.md` §4). Talents are outside this task's feat-choice scope; not touched.

## Mechanics not implemented (out of scope, noted for the next phase)

Per this task's brief, this phase does not implement missing feat mechanics. The runtime-mechanics phase that follows should treat every "canonical" consumer above as a trustworthy foundation, and every "name-parsing fallback" consumer as functional but worth hardening once the two upstream gaps (nonheroic/follower steps, talent source-layer drift) are closed.
