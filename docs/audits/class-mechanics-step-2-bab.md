# Class mechanics — Step 2: BAB authority and readiness

**Branch:** `fix/class-mechanics-core-skills`  
**Basis:** Core Rulebook printed p. 43 and certified Oct. 8 Phase 6B source ledger for all 32 prestige classes.  
**Scope:** Base Attack Bonus only. This does **not** certify hit points, defenses, prerequisites, or class features.

## Corrections

| Class | Before | After | Source |
| --- | --- | --- | --- |
| Noble | slow | medium | Core Rulebook p. 43 |
| Martial Arts Master | medium | fast | Galaxy at War pp. 32–33 |
| Gladiator | medium | fast | Knights of the Old Republic pp. 43–45 |
| Melee Duelist | medium | fast | Knights of the Old Republic pp. 46–47 |
| Imperial Knight | medium | fast | Legacy Era pp. 43–45 |
| Officer | medium | fast | Core Rulebook pp. 220–221 |
| Sith Apprentice | medium | fast | Core Rulebook pp. 222–223 |
| Assassin | medium | fast | Scum and Villainy pp. 28–29 |
| Droid Commander | medium | fast | Clone Wars pp. 42–43 |
| Vanguard | medium | fast | Clone Wars pp. 46–47 |
| Master Privateer | medium | fast | Force Unleashed pp. 50–52 |

The other 26 class labels already agreed with their source-certified printed tables.
**No numeric BAB table, class document ID, level count, hit die, defense, feat, talent, or class feature was modified in Step 2.**

## Runtime and safety

- `packs/classes.db` remains the authority for heroic and prestige BAB.
- `ClassNormalizer` and `ClassesRegistry` provide the normalized class model; existing derived `BABCalculator` already reads exact BAB rows first.
- Prestige-readiness calculation formerly hardcoded only Jedi/Soldier as full BAB in its fallback. It now resolves canonical classes and reads the exact numeric row via `getCanonicalClassBABAtLevel`; missing/invalid authority is an explicit error, caught by the existing readiness evaluator and reported as not ready rather than awarding unverified prerequisites.
- Nonheroic is not in the classes pack. Prestige-readiness uses the already-existing synthetic Nonheroic model and its explicit BAB table.
- The static legacy Noble `baseAttackBonus` projection is corrected to `medium`; `progression-data.js` is **not** a new BAB SSOT.
- `tools/fix-class-defense-bab.js` is disabled: it contains outdated defense bonuses and BAB labels and would corrupt the canonical records if run.

## Verification

The changed branch was read back and checked against the original pack and Phase 6B ledger:

- 37/37 class identities unchanged, including 5 heroic bases and 32 prestige classes.
- 37/37 numeric BAB progression arrays unchanged from the pre-Step-2 branch.
- 32/32 prestige BAB labels match the certified printed-source ledger.
- All numeric BAB rows agree with the class-specific full or 3/4 table.
- Exactly 11 BAB label changes.
- New tests: `node --test tests/class-bab-canonical-progression.test.mjs`.

The read-back/data checks are complete. Automated Node test execution and live Foundry VTT v13 testing remain necessary before merging.
