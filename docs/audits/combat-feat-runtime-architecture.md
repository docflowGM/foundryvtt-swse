# Combat Feat Runtime Architecture

Phase 2 of the Combat Feat Runtime Mechanics Audit. Documents the real, current combat execution graph and the actual authorities for each mechanic area, traced from `index.js` outward — not from what a file's name or comments imply.

## The single biggest structural finding

`scripts/engine/feats/register-feat-runtime.js` (`registerFeatRuntime()`, called once from `scripts/infrastructure/hooks/init-hooks.js`) is the **load-bearing import gate** for the entire `scripts/engine/feats/` directory. Only files it explicitly imports ever run. Of the ~40 files in that directory, roughly half are **orphaned**: never imported by `register-feat-runtime.js` or by anything else reachable from `index.js`. Confirmed by checking, for every file, whether any importer exists outside the file itself and outside `docs/audits/*` (prose references to a file in an old audit document are not code wiring).

Consequences:
- A file can contain fully-realized, correct-looking dice math and still have zero effect on gameplay if its `register*()` function is never called.
- Two files with nearly identical names can have completely different fates — e.g. `defense-feat-runtime-patches.js` (registered, real) vs `defense-avoidance-runtime-patches.js` (never registered, dead) both consume rules produced by the same `defense-avoidance-feat-normalization-hooks.js`, but only the former's rule types actually reach a player.
- `meta-resource-feat-resolver.js` sometimes bypasses its own family's (orphaned) normalization sibling entirely via a direct `this.hasFeat(actor, '<Feat Name>')` string check (confirmed for Fast Surge, Vitality Surge, Forceful Recovery) — so an orphaned normalization file does not automatically mean every feat it labels is broken; each must be checked.

Do not trust a grep hit in a file named `*-runtime-patches.js` as proof of execution. Always verify the file is imported (directly or transitively) from `index.js`.

## Taxonomy reliability caveat

`data/feat-catalog.json`'s `system.taxonomy.bucket`/`subbucket` fields are **not reliable** for identifying combat feats. Confirmed core, universal personal-combat feats — **Point-Blank Shot, Precise Shot, Far Shot, Double Attack, Triple Attack, Weapon Proficiency** — are all mis-bucketed under `"Starship & Vehicle"` (subbuckets `"Gunnery & Weapons"` / `"Pilot & Maneuvers"`) despite having nothing to do with vehicles. Only `"Combat"` bucket has 57 feats; `"Weapon & Armor"` (41) and a real-but-mixed-in subset of `"Starship & Vehicle"` (35, containing both genuine vehicle feats and mis-tagged personal-combat feats) must also be scanned. A bucket-only inventory would silently miss some of the most commonly-taken feats in the game.

## Traced pipeline authorities

### Attack roll
`scripts/engine/combat/combat-roll-math.js:382` `resolveAttackBonus(actor, weapon, actionId, context)` — the single source of truth, enforced by `tools/check-combat-math-ssot.mjs`. Entry point `rollAttack()` in `scripts/combat/rolls/attacks.js:199`. Three generic feat-contribution seams already feed it: `CombatOptionResolver.collectAttackModifiers` (line 414), `RageEngine.collectAttackModifiers` (421), `ScopedCombatFeatResolver.getBonus(actor, weapon, 'attack', context)` (467).

### Damage
`combat-roll-math.js:567` `resolveDamageBonus(actor, weapon, context)` — same SSOT guard, same three seams (line 573/587/591), plus die-step/extra-dice fields already read by `CombatOptionResolver.collectAttackModifiers`.

### Hit/miss/critical
`scripts/engine/combat/attack-outcome-resolver.js:29` `resolveAttackOutcome(...)` — pure, single authority (`tools/check-attack-outcome-ssot.mjs`). Natural 1 = auto-miss, natural 20 = auto-hit. **No separate confirmation roll** — SWSE doesn't use one; a threat that's also a hit is an immediate confirmed critical (lines 59-61), enforced by `tools/check-critical-confirmation-guard.mjs`.

### Full-attack / multiattack
`scripts/engine/combat/full-attack-executor.js` (`FullAttackExecutor.execute`, line 199) orchestrates; never decides penalty math itself. Attack-count/penalty math lives in `scripts/combat/multi-attack.js` (`buildFullAttackSequence`:414, `getDoubleAttackGroups`/`getTripleAttackGroups`:180/203 — these read actor-owned feat items directly, so Double/Triple Attack eligibility needs no separate schema) and `scripts/engine/combat/combined-full-attack-planner.js` (`multiattackPenalty()`:80, base -5/-10). State vs. rendering separation is CI-enforced (`tools/check-full-attack-reroll-guard.mjs`): `full-attack-message-state.js` is the sole writer of `flags.swse.attacks`; `full-attack-card-renderer.js` must never compute attack math.

### Reroll / supersession
Per `tools/check-reroll-supersession-guard.mjs`: rerolling marks the superseded chat message `flags.swse.superseded = true`, and every damage-button handler in `scripts/ui/chat/chat-interaction-bridge.js` must check `isAttackMessageSuperseded()` before acting. The sole authority permitted to write those flags is `scripts/engine/feats/meta-resource-feat-resolver.js`, which must never call `new Roll(` directly or re-spend the shared Full Attack action-economy cost per individual reroll.

### Condition track
`scripts/engine/combat/ConditionEngine.js` — `applyConditionStep`/`improveCondition`/`worsenCondition` (lines 150/235/283), all delegating the actual write to `ActorEngine.setConditionStep(actor, step, source)` (never touching `actor.system` directly). This is the correct call for any feat moving the condition track; pass `options.source` for provenance. Minor duplication noted, not fixed (out of surgical scope): the condition-cap table (STANDARD=5/VARIANT_6=6/VARIANT_UNLIMITED=999) exists independently in both `ConditionEngine`'s private `#getConditionCap` and the adjacent `ConditionTrackRules.getConditionStepCap()`.

### Action economy
`scripts/engine/combat/action/action-economy-consumption.js` `ActionEconomyConsumption.spend(actor, actionType, metadata, options)` (line 117) is the shared entry point. Recognizes `full-round`/`standard`/`move`/`swift`/`reaction`/`free`/`passive` — **reaction is a first-class, separately-pooled action type**, not folded into swift (`ActionEconomyPersistence.spendReaction()`). Fires `Hooks.callAll('swse.actionEconomySpent', ...)` on success. **No generic per-round/per-encounter ability-usage tracker exists in the core action-economy module** — `scripts/engine/feats/encounter-use-tracker.js` (real, registered via `combat-hooks.js`) is the closest thing and is already consumed by the grapple and skill-feat families.

### Aim / Charge
Core pipeline exposes only generic boolean context flags: `scripts/engine/combat/workflow/combat-context-builder.js:74-75` normalizes `options.aim`/`options.charge` into `context.isAiming`/`context.isCharging`, and `CombatOptionResolver.optionAllowedForWeapon` gates any `requiresAim`/`requiresCharge` option on them (`combat-option-resolver.js:122`). Two built-in charge options already exist and are live: `powerfulCharge` (+2 attack, +half-level damage, melee) and `chargingFire` (suppresses charge attack bonus, -2 untyped Reflex until next turn, ranged) — see `combat-option-resolver.js:16-17`. The actual state-setting logic for "is this actor currently aiming/charging" (flags, duration, consumption-on-damage) lives outside the core pipeline, in the feats/action-economy layer — this audit did not fully trace it (budget-limited; flagged for a future pass, not RAW-ambiguous, so not a source-review-queue item).

### Reactions / triggers
A real but narrow set of native Foundry hooks exists — not a generalized event bus. In `scripts/engine/combat/CombatEngine.js`: `swse.preHitResolution`, `swse.attack-resolved`, `swse.damage-before`, `swse.damage-applied`, `swse.coupDeGrace`. Also `swse.actionEconomySpent`, `swse-initiative-rolled`, native `deleteCombat`/`combatTurn`. A feat wanting to react to "after damage applied" should listen to `swse.damage-applied` directly — this is sufficient infrastructure for the reaction feats this audit found; no new event bus is needed or was built.

### Weapon-group / weapon identity matching
**Fragmented** — at least four independent weapon-group/text-matching implementations exist: `getWeaponGroup()` in `scripts/combat/multi-attack.js:48` (Double/Triple Attack eligibility), `weaponMatchesGroup()` in `scripts/engine/combat/combat-option-resolver.js:42` (generic rule gating), `weaponMatchesSelectedChoice()`/`weaponCandidates()` in `scripts/engine/feat/scoped-combat-feat-resolver.js:33-65` (Weapon Focus/Point-Blank Shot — this one correctly reads the canonical `system.selectedChoice`), and `weaponProficiencyCandidates()` in `combat-roll-math.js:75-108` (proficiency-penalty purposes). These are not proven to always agree — each does its own heuristic token normalization. Not unified this task (would be a larger refactor touching multiple live SSOT files); flagged as a real risk for any future feat whose correctness depends on weapon-group identity matching consistently across more than one of these four functions.

## Mechanic families → existing infrastructure (Phase 3/4)

| Family | Existing authority | Adapter needed? | New infrastructure needed? |
|---|---|---|---|
| A. Static/conditional attack modifiers | `CombatOptionResolver` (catalog `ATTACK_OPTION` rules) + `ScopedCombatFeatResolver` | No — both seams already read arbitrary feat items | No |
| B. Damage modifiers | Same two seams, feeding `resolveDamageBonus` | No | No |
| C. Full-attack/multiattack | `multi-attack.js` + `FullAttackExecutor` | No — eligibility already reads owned feat items | No |
| D. Aim | `combat-context-builder.js` (`context.aim`) + `optionAllowedForWeapon`'s `requiresAim` gate | No | Partial — actor-side aim state/consumption tracking not fully traced this pass |
| E. Charge | Same pattern, `context.charge`/`requiresCharge`; two built-in options (`powerfulCharge`, `chargingFire`) already live | No | Same caveat as Aim for state-setting |
| F. Condition-track riders | `ConditionEngine.applyConditionStep`/`worsenCondition`/`improveCondition` → `ActorEngine.setConditionStep` | No | No — authority is clean; gaps found are registration gaps, not missing infrastructure |
| G. Rerolls | CI-enforced supersession-flag contract (`tools/check-reroll-supersession-guard.mjs`), reroll construction owned by `meta-resource-feat-resolver.js` | No | No |
| H. Reactions/interrupts | Native Foundry hooks (`swse.attack-resolved`, `swse.damage-applied`, etc.) | No | No — sufficient for what this audit found; not built new |
| I. Defensive modifiers | `ModifierEngine` (via `defense-feat-runtime-patches.js`) for static bonuses; advisory/conditional riders need `defense-avoidance-runtime-patches.js` (orphaned) **and** a "selected combat/advisory options" UI context that does not exist anywhere in the live pipeline | Registering the orphaned file alone is insufficient | **Yes** — the missing piece is a UI/context mechanism to let a player pick which `ATTACK_ADVISORY_OPTION` rules apply per-attack and populate `context.selectedAdvisoryOptions`; not built this task (see Phase 5/11 rationale) |
| J. Movement/positioning | Not fully traced this pass | — | Unknown — deferred |
| K. Weapon-scoped mechanics | `FeatChoiceResolver`/`system.selectedChoice` (choice-persistence phase) feeding `ScopedCombatFeatResolver`; also a separate, real grapple-specific action layer (`grapple-feat-actions.js`) | No | No, but see weapon-group-matching fragmentation above |
| L. Encounter/round/turn-limited options | `encounter-use-tracker.js` (real, registered) for the families that use it (grapple, skill-feat); no generic tracker exists in core `ActionEconomyConsumption` | Feats outside those two families would need their own adapter to `encounter-use-tracker.js`, not a new tracker | No — reuse `encounter-use-tracker.js` |

## Summary: authority cleanliness by mechanic area

| Mechanic | Single clean authority? |
|---|---|
| Attack modifiers | Yes — `resolveAttackBonus()`, two ready feat-contribution seams |
| Damage modifiers | Yes — `resolveDamageBonus()`, same two seams |
| Full-attack sequencing | Yes — `FullAttackExecutor` + CI-enforced state/render separation |
| Reroll/supersession | Yes — CI-enforced flag contract |
| Condition track | Mostly — one mutation API, minor cap-table duplication |
| Action economy | Yes for spend/validate; no generic per-round/encounter usage tracker |
| Aim / Charge | Partial — context flags and option-gating exist centrally; state-setting is elsewhere, not fully traced |
| Reactions/triggers | Narrow, real, sufficient — not a generalized bus, and none was built |
| Weapon-group matching | Fragmented — four independent implementations |
