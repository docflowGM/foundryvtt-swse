# Class mechanics — Step 3: Hit dice, starting HP metadata and class defenses

**Branch:** `fix/class-mechanics-core-skills`  
**Audit status:** Source-backed static data review complete; Foundry v13 runtime certification outstanding.  
**User direction:** HP progression already works; leave its calculation and rolled level-up behavior untouched.

## Rule boundaries

- A heroic character's **first heroic class level** uses the class starting HP entitlement of `3 × maximum hit die`, plus applicable Constitution modifier.
- This multiplier **does not reapply** when taking a later heroic or prestige class level.
- Every later level gains HP from the **new class's die roll** and applicable modifier, subject to explicit campaign HP-generation house rules. The existing progression/finalization engine is the owner of those rolls and persistent HP history. **No HP engine code was modified.**
- SWSE class defense bonuses do **not stack** when multiclassing; use the highest class bonus for each defense independently.

## Core heroic classes (published Core class tables)

| Class | HD | First heroic level base HP (before CON) | Reflex | Fortitude | Will |
|---|---|---:|---:|---:|---:|
| Jedi | d10 | 30 | +1 | +1 | +1 |
| Noble | d6 | 18 | +1 | +0 | +2 |
| Scoundrel | d6 | 18 | +2 | +0 | +1 |
| Scout | d8 | 24 | +2 | +1 | +0 |
| Soldier | d10 | 30 | +1 | +2 | +0 |

All five existing `packs/classes.db` records agree. No changes needed.

## Prestige source verification

The Oct. 8 printed-source ledger, now available at `data/audits/class-phase-6b-prestige-source-ledger.json`, records **32/32** exact prestige hit dice and defense bonus matches, sourced across eight published books. The current class pack still matches **all 32** of those certified hit-die and defense records. These values must not be auto-replaced using old broad class-template scripts.

The presence of `base_hp` fields on prestige class documents must **not** imply additional `3 × HD` grants during multiclassing. Only the character's first heroic level receives this starting entitlement.

## Runtime authority traced

- `scripts/actors/derived/defense-calculator.js` — `_getSaveBonus` uses `Math.max` independently for Fortitude, Reflex and Will (does not sum class bonuses).
- `scripts/apps/progression-framework/steps/summary-step.js`, `shell/progression-finalizer.js`, and `shell/mutation/progression-economy-plan-builder.js` — separate chargen starting-HP logic from level-up gain logic.
- `scripts/engine/HP/HPGeneratorEngine.js` and `scripts/apps/levelup/levelup-shared.js` — preserve existing configurable later-level HP gain/roll logic. **No changes made**.
- `scripts/actors/derived/derived-calculator.js` — HP is mirror-only; persisted HP is not overwritten by a naïve reconstructed estimate.

## Verification and CI repair

- `tests/class-hit-die-defense-source.test.mjs` locks the five heroic starting HP values and 32 prestige hit-die/defense certificates; also guards all class IDs/tree ownership and representative highest-class-defense multiclass combinations.
- An earlier Rolling System Validation run failed because the preexisting talent Phase 3E frozen `packs/classes.db` byte hash prohibited **any** later class fix. This is not evidence of wrong HP/defense values.
- `data/audits/class-mechanics-protected-baseline.json` anchors all 37 original class documents to the pre-fix main commit. `tools/lib/class-pack-protected-guard.mjs` permits differences in **only** `system.trainedSkills`, `system.class_skills`, and `system.babProgression`; all other class fields remain frozen including hit dice, base HP, defense bonuses, features, and talent-tree identities.
- Four talent Phase 3E/3F/3G verifiers now call this protected integrity guard **only for the class pack**. Every other previously frozen file keeps its original exact-blob check. The regression file `tests/class-pack-protected-guard.test.mjs` proves rejected drift cases.
- The updated PR's CI and Foundry end-to-end checks must pass before merge. Static certification is not a substitute for real chargen and multiclass testing.

**Step 3 finding:** The published class hit-die and defense data are already correct. Retain HP progression unchanged. No class-feature mechanics were edited.
