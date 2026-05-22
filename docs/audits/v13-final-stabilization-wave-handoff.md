# SWSE Foundry v13 — Final Stabilization Wave Handoff

**Branch:** `claude/swse-foundry-v13-stabilization-3jLdc`
**PR:** #850
**Date:** 2026-05-21

---

## 1. Overall Status

The stabilization wave is complete. All six phases passed.

- ActorEngine mutation boundaries are validated and hardened.
- Canonical ability storage (`system.attributes`) is the enforced write path.
- Defense root cause (ability roller writing `.value` instead of `.base`) is fixed.
- Skill roll crash (missing `_getItemGrantedRerolls`) is fixed.
- Starship maneuver Wisdom reads are corrected to canonical paths.
- Condition-track UI labels are graceful for step 6 and unlimited variants.
- Force Point rescue race condition has a post-dialog re-check and visible failure notification.
- `MutationGateway` and `MutationRouter` remain unwired scaffolding.
- No stale deleted modules remain referenced anywhere.

---

## 2. Phase Results

### C3 ActorEngine Boundary Refactor (pre-wave, merged in PR #849)

| Hash | Description |
|---|---|
| `51201ad` | C3.11: fix form.js ability field schema to use `system.attributes` (canonical) |
| `a75346c` | C3.12: delete stale `actor-engine-derived.js` (zero live imports) |
| `a9d062a` | C3.13: delete stale `derived-integrity-layer.js` (zero live imports, dangerous side effect) |
| `10df896` | C3.14: fix droid chassis drop to write `system.attributes.*.base` (canonical) |

### Final Stabilization Wave (PR #850)

| Hash | Phase | Files Changed | Behavior Fixed |
|---|---|---|---|
| `9406103` | P1 — ActorEngine boundary validation | `scripts/swse-actor.js` | Added missing `@mutation-exception legacy-disabled-character-sheet` annotation to `_onRemoveForcePower`. Cosmetic only; sheet is not registered. |
| `2d631f3` | P2 — Defense correctness | `scripts/apps/chargen/ability-rolling.js`, `scripts/governance/mutation/mutation-normalization-service.js` | Root fix: ability roller was writing `system.attributes.*.value` (schema-unknown field stripped by DataModel, leaving `base=10`). Changed to `.base`. Added normalization safety net to also catch `system.attributes.*.value` writes and redirect to `.base`. Level 1 Dex 20 → Reflex 17 (was 12). |
| `f726dc9` | P3 — Skill correctness | `scripts/species/species-reroll-handler.js`, `scripts/utils/starship-maneuver-manager.js` | Added missing `_getItemGrantedRerolls()` stub (was called in two methods but never defined → TypeError on every skill roll). Corrected 4 stale `system.abilities.wis.value` reads in starship maneuver manager to use `system.derived.attributes.wis.mod` with `system.attributes.wis.base` fallback. |
| `89630e4` | P4 — Condition-track UI labels | `scripts/sheets/v2/context/PanelContextBuilder.js`, `scripts/sheets/v2/vehicle-sheet/context.js` | Added step 6 ("Critical") to condition definitions. Added `_conditionDefFor()` helper returning `"Step N"` for any step beyond defined entries. `conditionSlots` now extends to include the active step. `currentConditionPenalty` no longer falls back to "Normal" (step 0) for step 6+. Vehicle sheet removed hard clamp to step 5 — step 6 now shows "Critical", step 7+ shows "Step N". |
| `0382ae2` | P5 — Force Point rescue hardening | `scripts/governance/actor-engine/actor-engine.js` | Added post-dialog eligibility re-check (`canRescue` called again after user confirms, before `spendForcePoints`). Added `ui.notifications.warn` for two previously silent failure paths (FP=0 after dialog, spend returns 0). Documented mutation contract in JSDoc: enumerated all 10 fields written to `resolution` on success. |
| Phase 6 | ActorEngine facade review | No files changed | Clean-pass audit. `MutationGateway` and `MutationRouter` confirmed unwired. No stale imports. No extraction justified. |

---

## 3. Stable Architecture Rules

These rules are considered settled. Do not change them without a dedicated review phase.

| Rule | Detail |
|---|---|
| **`ActorEngine` is the public facade** | All actor mutations route through it. Do not bypass. |
| **`system.attributes` is canonical** | Persisted ability storage. Schema fields: `base`, `racial`, `enhancement`, `temp`. No `value` or `mod` field exists in schema. |
| **`system.abilities` is mirror-only** | Rebuilt each prepare cycle. Never write to it. `MutationBoundaryService` auto-redirects `.base` writes to `system.attributes`. |
| **`MutationNormalizationService`** | Owns payload normalization (`.value`→`.base`, class path warnings, skill coercion, defense aliases, XP alias). |
| **`MutationBoundaryService`** | Owns operation classification, semantic boundary audit, Phase 3 guardrails. |
| **`MutationGateway` / `MutationRouter`** | Future scaffolding only. Not imported by any live code. All methods throw. Do not wire without completing all prerequisites in section 5. |
| **Shape initialization stays in ActorEngine** | `applyProgression`, `apply`, `applyDelta` multi-step atomicity is not extractable without parity tests. |
| **Recalc/render sequencing** | `recalcAll` + `_refreshOpenActorApps` must fire after every mutation. Stabilization ordering is in ActorEngine. Do not split. |
| **Embedded document guardrails** | P0.1 type-stripping and boundary audit live inline in `updateEmbeddedDocuments`. Do not extract without a tested executor seam. |
| **Do not resurrect deleted stale files** | `actor-engine-validation.js`, `actor-engine-derived.js`, `derived-integrity-layer.js` are intentionally deleted. |

---

## 4. Runtime Validation Checklist

Run these manually on a fresh actor in Foundry before releasing:

- [ ] Ability rolling (chargen): rolled scores persist as `system.attributes.*.base` and not as `.value`
- [ ] Level 1 Jedi, Dex 20: Reflex Defense = 17 (10 + 1 heroic + 5 dex mod + 1 class = 17)
- [ ] Ability score edits on character sheet persist and update defenses and skill totals
- [ ] Skill roll no longer throws "get item granted rolls" TypeError
- [ ] Skill roll executes and posts to chat
- [ ] Species drag/drop applies racial modifiers to `system.attributes.*.racial`
- [ ] Droid chassis drop applies base attributes to `system.attributes.*.base`
- [ ] Item deletion (feat, talent, power) recalculates derived stats
- [ ] Force power deletion through v2 sheet updates sheet correctly
- [ ] Poison ActiveEffect creation triggers recalc
- [ ] Species activated ability (e.g. rage) end applies condition track shift through ActorEngine
- [ ] Condition step 6 displays "Critical" (not "Disabled" or "undefined")
- [ ] Condition step 7+ in VARIANT_UNLIMITED displays "Step 7" (not undefined)
- [ ] Vehicle sheet condition step 6 displays "Critical" (not clamped to "Disabled")
- [ ] Force Point rescue: success path spends 1 FP, actor survives at 0 HP / condition 5
- [ ] Force Point rescue: declining rescue proceeds with normal damage
- [ ] Force Point rescue with 0 FP: warning notification appears, damage proceeds normally

---

## 5. Pinned Phase 8 / Backlog

### A — Species ability registry wiring audit

Most species ability registry entries are suspected to be display-only or partially unwired. Known confirmed cases:

- Attribute bonuses: wired and correct
- Reroll grants: stubbed (see B below)
- Skill bonuses, movement modifiers, senses, natural weapons, activated abilities: **audit needed**

Do not add new parallel species/reroll systems before this audit completes.

### B — Reroll grants wiring

`SpeciesRerollHandler._getItemGrantedRerolls()` was added as an empty stub (`return []`) to stop a TypeError crash on every skill roll. Real species, feat, and talent reroll grants are not yet wired. Wiring requires:

1. Define a reroll grant schema on feat/talent/species items (`system.abilityMeta.rerollGrants` or equivalent)
2. Populate existing species/feat/talent data that should grant rerolls
3. Implement `_getItemGrantedRerolls` to read that schema
4. Validate with `SpeciesRerollHandler.getApplicableRerolls` tests

### C — Force Point rescue lifecycle / unconscious damage rule

The `alreadyRescuedThisResolution` flag is set on successful rescue but is never cleared. This means once rescued, the actor cannot be rescued again until the flag is manually unset (e.g., rest, encounter reset, or GM action). Rules questions that must be answered before patching:

- Is FP rescue allowed once per hit, once per encounter, or unlimited?
- Should an already-unconscious actor at 0 HP receive FP rescue on a subsequent hit?
- Should damage below DT on an unconscious actor auto-apply condition shift but not kill?
- Should damage equal/exceeding DT on an unconscious actor (or coup de grace) kill without rescue?

Do not patch until the rules decision is explicit.

### D — Persuasion +21 / character-specific skill artifact

Phase 3 found no systemic double-count in the skill pipeline. The +21 total is likely a character-specific data artifact (Noble Presence talent, Skill Focus Persuasion, etc.). Validate on the specific actor that exhibited the symptom. If confirmed as a data artifact on an old dev actor, recreate the actor rather than migrating stale data.

### E — Runtime validation on real worlds

Old dev actors may retain values written by the pre-fix ability roller (`.value` instead of `.base`). These will not self-correct on load because the DataModel simply uses the schema default (`base=10`) for the missing field. Affected actors will have incorrect ability scores and derived defenses. **Future-created actors are the priority.** Old actors should be re-created, not migrated, unless a dedicated migration pass is explicitly requested.

---

## 6. Things Not To Do

- **Do not wire `MutationGateway` or `MutationRouter`** until all prerequisites in the Phase 6 audit are met (runtime validation complete, parity tests exist, shape ownership stable, embedded executor seam tested, `operationCategory` classification proven complete)
- **Do not resurrect deleted modules** (`actor-engine-validation.js`, `actor-engine-derived.js`, `derived-integrity-layer.js`)
- **Do not add new parallel species/reroll systems** before auditing the current registry (Phase 8A)
- **Do not migrate old dev actors** unless explicitly requested — recreate instead
- **Do not broaden Phase 8** into unrelated math refactors; keep it scoped to species registry and reroll wiring
- **Do not touch `system.abilities`** from write paths — it is a read-only derived mirror

---

## 7. Final Recommendation

1. **Run the runtime validation checklist** (section 4) on a fresh actor in Foundry v13.
2. If all cases pass: the system is releasable for new characters.
3. Then begin **Phase 8A** (species ability registry audit) scoped to: reroll grants wiring, skill bonus wiring, and activated ability wiring — in that priority order.
