# Phase 5B — Implementation Roadmap (dependency-ordered)

Derived from `data/audits/weapon-phase-5b-consumption-map.json` (phase counts per path) and the 5A consumer matrix. The 5A order is kept except that **profile selection and the workflow context move before damage**, because Apply Damage currently loses the profile (5A defect) and every later stage needs the context.

Each subphase has a rollback boundary: it is a feature-flagged consumer switch (`canonical` vs `legacy` path per weapon), so rollback = flag off; production data is untouched until 5G.

| Sub | Scope | Inputs | Modules modified | Fields activated (≈paths) | Tests | Depends on | Rollback |
|---|---|---|---|---|---|---|---|
| **5B (done)** | registry + resolver foundation, consumption map | frozen 3B/4H | new `scripts/items/weapon-runtime/*`, builders, tests | 0 live (2,159 mapped) | 4 test files, 319 rolling | — | delete unwired module |
| **5C** | identity stamping read path, profile selection, proficiency, attack-options | registry, `resolveProficiency`, `rateOfFire`, `operatingModes`, `modeProfiles` | `roll-config.js`, `combat-roll-math.js` (`actorIsProficientForAttack`), `CombatOptionResolver`, `weapon-branch-resolver` (compat shim) | ≈140 (5C) + ≈100 shared | proficiency probes against live attack bonus; −5 only when not proficient; Exotic exact; profile chooser; no-profile → default | 5B | flag per weapon → legacy |
| **5D** | `AttackWorkflowContext`; damage, damage types, range, ammo/resource | `resolveDamageProfile/Range/Resource` | `attacks.js`, `damage.js`, `damage-packet-builder`, `weapon-damage-packet-builder`, `AmmoSystem`, chat card flags | ≈430 | AND/OR/single, stun/lethal, payload damage, Burst/Autofire cost, Apply Damage keeps profile | 5C | flag → legacy damage |
| **5E** | structured mechanics: attackResolution/defense, area, firing constraints, prepared attacks, conditional modifiers/qualities, criticalEffects, triggeredEffects, DR bypass, wielding, configuration, defensive interactions, double weapon, grab, reach/AoO | `weapon-phase-5b-special-mechanic-consumption.json` (38 families) | `attack-outcome-resolver`, `FullAttackExecutor`, `damage-reduction-resolver`, `grapple-state-engine`, `reaction-registry`, new effect/rider executor + condition evaluator | ≈520 | one test per family against the named identities (e.g. Squib Tensor Rifle Fortitude, Garrote grab, Vibro-Saw DR, Tehk'la bleed) | 5D | per-family flag |
| **5F** | remaining `operation.*` families (concealment, crew, crafting/construction, durability, utility) | same | crafting engine, customization workbench, skill integrations | ≈105 | per-family | 5E | per-family flag |
| **5G** | production: stamp canonical identity, create 52 missing weapons, store/sheet/encumbrance read canonical, read-only rules fields on sheet | registry, 3C ledger | `store-checkout`, `categorizer`, item sheet, `EncumbranceEngine`, pack builders | ≈52 + display/store/inventory paths | store price = `costCredits`; weight totals; sheet read-only; 203 present | 5C–5E | revert pack build |
| **5H** | selectors/abilities/recommendations | `selectors`, `semantic`, `abilityInteractions`, `plannerMetadata` | `weapon-specialization-rule`, talent/feat applicability, `weapon-investment-profile`, mentor | ≈366 | exact selector outranks tag similarity; no tag-as-mechanic | 5C | flag |
| **5I** | retire legacy heuristics (~55), `system.proficient` authority, dead code | zero-heuristic CI | `weapon-branch-resolver` heuristics, legacy adapter scope, `combat-action-bar.js` | — | no canonical weapon reaches the legacy adapter | 5G | restore adapter |
| **5J** | end-to-end certification | consumption map | tools | all | map re-verified with `ALREADY_CONSUMED_CORRECTLY` for every runtime path; 0 `EXISTING_CONSUMER_WRONG_INPUT`/`NEW_CONSUMER_REQUIRED` | all | — |

## Planner decisions needed before 5C/5E
1. The seven identities with unmatched 4H modes (Amphistaff, Atlatl, Cesta, Shock Stick, Vibrobayonet, Electropole, PLX-2M): supply 3B attack profiles for the selector-only modes or confirm they remain non-executable.
2. Canonical item sheet: confirm read-only rules fields for canonical weapons (player-visible choices only).
3. Condition evaluator scope (which `conditionalModifiers` conditions are machine-evaluable vs. GM-confirmed prompts).

## Exit metric for the whole program
`ALREADY_CONSUMED_CORRECTLY` goes from **0 / 2,159** today to every runtime-classified path; `NEW_CONSUMER_REQUIRED` and `EXISTING_CONSUMER_WRONG_INPUT` reach 0; verifier stays at 0 orphans.
