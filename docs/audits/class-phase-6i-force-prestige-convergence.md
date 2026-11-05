# Phase 6I — Force Adept, Force Disciple, Jedi Knight, Imperial Knight

**Scope:** four prestige classes, independently based on `main` at `62169f621e15409268ca8f91efd846a3a2c118d9`.  
**Branch:** `feat/class-phase-6i-force-prestige-convergence`.  
**Status:** active implementation checkpoint; **not** live Foundry v13 certified.  
**Sources:** *Saga Edition Core Rulebook*, printed pp. 212–215 (Force Adept, Force Disciple), pp. 217–219 (Jedi Knight); *Legacy Era Campaign Guide*, printed pp. 43–45 (Imperial Knight). These sections were checked against the searchable TXT corpus and rendered book pages, with printed pages as authority. The prior Phase 6B table audit independently verified BAB, defenses and hit dice.

## Source / production matrix

| Class | Levels | BAB | First-level defenses (Fort/Ref/Will) | Talents | Force choice | Unique non-choice feature |
| --- | ---: | --- | --- | --- | --- | --- |
| Force Adept | 10 | medium: +0/+1/+2/+3/+3/+4/+5/+6/+6/+7 | +2/+2/+4 | 1,3,5,7,9 | Technique 2,4,6,8,10 | none |
| Force Disciple | 5 | medium: +0/+1/+2/+3/+3 | +3/+3/+6 | 1,3,5 | Secret 2,3,4,5 | Indomitable, Prophet at L1 |
| Jedi Knight | 10 | full: +1..+10 | +2/+2/+2 | 1,3,5,7,9 | Technique 2,4,6,8,10 | none |
| Imperial Knight | 10 | full: +1..+10 | +2/+2/+2 | 1,3,5,7,9 | Technique 2,4,6,8,10 | none |

The current production `packs/classes.db` matches these tables. No class pack progression records were edited. Force Technique / Force Secret selections already use `force_technique_choice` and `force_secret_choice` through the canonical level-up manifest. Do not materialize second grants from `data/class-features.json`.

## Phase 6I-1 — Force Disciple

### Indomitable

Printed rule: immune to mind-affecting effects.

- Added `forceDiscipleClassLevel`, `isExplicitMindAffecting`, and `resolveForceDiscipleIndomitable` in `scripts/engine/progression/utils/force-disciple-features.js`.
- These use actual owned class Items and explicit Mind-Affecting descriptors; generic themes or item names do not imply an effect descriptor.
- `targetSuppressesForceEffect` now checks Indomitable before the existing Yuuzhan Vong Force-immunity path. `ForcePowerEffectsEngine.applyPowerEffect` already consumes that suppression result. No direct mutation is introduced.
- Also wired `LightSideTalentMechanics.completeAdeptNegotiatorSelection`: Core p. 40 explicitly defines Adept Negotiator and Master Negotiator as Mind-Affecting. On an Indomitable target, skip the condition-track mutation and ActiveEffect creation even when the Persuasion check succeeded. A regression test asserts the gate is ahead of both mutation paths.
- **Coverage boundary:** these are two verified Force-power/talent effects seams, not all effect applications. Other mind-affecting feat/talent/skill/condition consumers require their own event routing or a truly common effect gate. The feature remains **partially implemented** until then.

### Prophet

Printed rule: each Force Disciple class level grants **two Destiny Points instead of the usual one**; the extra Destiny Point may be sacrificed *immediately after level-up* for an instantaneous GM-defined prophetic vision, after which the character may select a new vision-related destiny, subject to the GM.

- Added pure `planForceDiscipleProphetAward`. Requires a canonical, internally consistent level-up entitlement manifest, a pending Force Disciple class level, a real Destiny, valid existing Destiny Point pool, and no recorded award for this Force Disciple level.
- The current general level-up economy builder does **not** grant baseline Destiny Points for ordinary classes. Consequently the Prophet plan grants **2 total**, not +2 on top of a phantom +1. When a validated `visionRequested` selection is explicitly supplied, it grants **1 total** and records the pending GM vision adjudication. Absent explicit selection it grants 2.
- `ProgressionEconomyPlanBuilder.buildLevelUpSet` applies the plan's resource and ledger fields as part of the existing finalizer's `ActorEngine` mutation plan. The new planner itself does not call `ActorEngine`, create duplicate class features, or write directly.
- The idempotence ledger lives at `flags.swse.forceDiscipleProphetAwards`, keyed by new Force Disciple class level (1–5), and travels in the same plan as the resource grant.
- **Coverage boundary:** there is not yet a player-facing Prophet vision selection UI or GM vision/destiny adjudication screen. `selections.prophet.visionRequested` or `selections.survey.prophetVisionRequested` is an explicit programmatic selection; it must not silently auto-trigger. General Destiny Point rules for other classes are a separate cross-class gap. Prophet is **resource-grant integrated, vision interaction outstanding**.

## Phase 6I-2 — Jedi Knight prerequisite correction

Core p. 218 requires **both** a self-built lightsaber and membership in the Jedi tradition. The repository previously recorded only membership and lightsaber proficiency; carrying or purchasing a lightsaber is not proof of having constructed one.

- Added `Built Own Lightsaber` to the legacy prerequisite reference and a separate `must-have-built-own-lightsaber` `table_state` record in the structured prerequisite authority.
- Preserved the independent `must-be-member-jedi` check. Both are **GM-advisory** until a construction-history authority can prove the event; no automatic inventory-based assumption or hard ban was added.
- This closes the source-data omission in Phase 6B finding **6B-002**. It does not claim live GM approval mechanics are certified.

## Phase 6I-3 — Imperial Knight prerequisite correction

Legacy p. 43 requires both Armor Proficiency (Light) and Armor Proficiency (Medium), Force Sensitivity, lightsaber proficiency, BAB +7, trained Use the Force, and the oath as a **sworn defender of Emperor Roan Fel**. The repo formerly listed only Medium and described an oath to the Fel Empire generically.

- Added the missing Light feat to `data/prestige-class-prerequisites.json` and `scripts/data/prestige-prerequisites.js`.
- Corrected the printed oath wording. The existing stable `table_state` key `sworn-defender-fel-empire` was retained for compatibility. It remains **advisory/GM-adjudicated**, not guessed from faction tags.
- Force Adept and Force Disciple prerequisite records were not mutated in this pass; they are included in the source/acceptance census.

## Tests / acceptance gates

- `tests/class-phase-6i-force-prestige-convergence.test.mjs`: 4 pack cadences, BAB/defenses/hit dice, Indomitable ownership and strict descriptors, Prophet twice-per-level total, optional vision exchange, missing Destiny, bogus manifest, invalid pool, duplicate/post-level repeat, and real economy/Force-effect dispatch seams.
- Existing class pack protected baseline remains unchanged: **37 classes**, no new schema carve-outs.
- **Still required for certification:** exact-head CI; live Foundry v13 multi-level progression with Force Technique and Force Secret picker choices and no duplication; GM-facing Prophet vision/destiny choice; general Destiny-point baseline review; explicit Mind-Affecting policy at other effect consumers. Neither this branch nor Phase 6H should be merged before independent acceptance.
