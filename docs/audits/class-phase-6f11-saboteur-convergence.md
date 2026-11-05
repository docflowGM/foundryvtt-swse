# Phase 6F-11 — Combined Saboteur Quick Sabotage + Master Saboteur

**Date:** November 4, 2026  
**Branch:** `feat/class-phase-6f11-saboteur-convergence`  
**Base:** independent merged `main` at `62169f621e15409268ca8f91efd846a3a2c118d9`, with Quick Sabotage (#1104) as initial branch tip.  
**Parents under review:** draft PRs #1101 (Master Saboteur), #1104 (Quick Sabotage). Neither is merged.  
**Status:** proposed convergence; CI and live Foundry v13 tests must pass before merging.

## Printed source

*The Force Unleashed Campaign Guide*, Saboteur prestige class, Quick Sabotage / Master Saboteur.

- Quick Sabotage: fast Disable Device uses at Saboteur 4/6/8, consuming one swift for simple/tricky or two swift for complex (when unlocked). Improvised tools may substitute for a Security Kit from Quick Sabotage unlock.
- Master Saboteur: at Saboteur class level 10, reroll Mechanics checks to disable devices or handle explosives and keep the higher result. No reroll grant to Repair, Jury-Rig or other Mechanics uses.

## Single consumer and ordering

`scripts/skills/skill-uses.js`, `MechanicsUses.disableDevice`:

1. Validate actor, device complexity and explicit Security Kit context (`options.hasSecurityKit`), with no assumed inventory proof.
2. Plan Quick Sabotage action and determine number of swift actions and action display label. An ordinary full-round check retains its previous no-extra-spend handling.
3. For expedited checks, the shared `ActionEconomyConsumption` helper reserves one or two swift actions **before any d20**, rejecting uncommitted costs. Out-of-combat uses the canonical no-op.
4. Inside the `performCheck` callback, run the **Master Saboteur** better-of-two d20 selector when eligible (class level >=10), otherwise roll once.
5. Apply the existing Mechanics bonus and DC/mishap rules to the **selected** die, post chat with original and reroll as audit evidence, and return a receipt containing `quickSabotage` and `masterSaboteur`.
6. If a second swift spend, dice or chat operation throws, the cost executor rolls committed swift actions back in reverse order. A failed refund yields an INDETERMINATE GM-review error.

`MechanicsUses.handleExplosives` contains the same Master Saboteur reroll but retains **Full-Round Action** and receives no Quick Sabotage speed or action changes.

## Combined proof

- Source from both earlier branches is retained **without** duplicating the class-level helpers' runtime effects.
- Both parent regression suites are included unchanged: `tests/class-phase-6f8-master-saboteur-reroll.test.mjs` and `tests/class-phase-6f10-quick-sabotage.test.mjs`.
- New `tests/class-phase-6f11-saboteur-convergence.test.mjs` exercises combined Saboteur 10 (complex: two swift, then two d20, select better, compare DC), Saboteur 10 simple (one swift then two d20), level 8 (two swift, one d20), level 3 (no swift, one d20), declined second swift with verified rollback and no d20, and ensures Handle Explosives has no Quick Sabotage consumer.
- The combined test also invokes the **real pure V2 `ActionEngine`** to verify two sequential swift payments: the first consumes Swift, the second downgrades Move, and a second payment is rejected when no suitable action remains.
- Full repository rolling CI is required at the **exact** integration commit SHA.

## Remaining risk / merge disposition

- The generic `MechanicsUses` service does not have universal skill-use action handling: the unchanged full-round path still does not charge the V2 action ledger. That is pre-existing, not silently fixed by this scope.
- When `hasSecurityKit` is omitted, prior Security Kit assumptions remain; an explicit `false` proves the alternate tools situation. A separate skill equipment authority audit is needed if this is to become inventory-backed.
- Source/Node tests do **not** demonstrate live v13 scene combat state, multiple swift spends, class Item normalization, tool possession or downstream effects. Execute a Foundry manual acceptance script before any merge.
- **Treat this integration PR as the successor to #1101 and #1104. Do not independently merge either original PR.** If a merge is later authorized, merge exactly one tested convergence, not both originals.
- No changes were made to compendium class/feat/talent/weapon records.
