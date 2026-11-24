# Non-Force talent macro sweep (2026-11-24)

Owner direction (chat): apply the clean-cutover policy to the Noble, Scoundrel, Scout, Soldier and Prestige macro wrappers; delete dead execution code, not legitimate mechanics; verify dependencies first.

## Manifest (static, function-level where it matters)
| Module | In import graph from `index.js` | Importers outside its pair |
| --- | --- | --- |
| `scripts/talents/{noble,scoundrel,scout,soldier,prestige}-talent-macros.js` | no | none (no import, no template/data/pack/tool reference, no dynamic path) |
| `scripts/engine/talent/{noble,scoundrel,scout,soldier,prestige}-talent-mechanics.js` | no | only their own macro wrapper (`UNREACHABLE_WRAPPER` chain) |
| `scripts/engine/talent/talent-effect-engine.js` (25 `build*Plan` planners) | **yes** (via `combat/rolls/damage.js` and `patches/runtime-bugfix-hotfixes.js`) | the 25 planners are called ONLY by the five mechanics modules above; `damage.js` calls `applyPostDamageEffects`, which the class does not define (a hotfix patch installs a no-op), and `calculateDamageBonus` (also patch-installed) has no caller anywhere |
| `ActorEngine.applyTalentEffect` | yes (core) | its only callers were the retired Dark/Light Side engines and the five mechanics modules |

## Done in this batch
Deleted the five macro wrappers. They were the sole importers of their mechanics modules; none had any other consumer.

## Held — decision requested (cascade beyond "wrappers")
Deleting the five **mechanics** modules is the next link in the same dead chain, and would orphan: the 25 remaining `TalentEffectEngine` planners (the class would be an empty shell kept alive only by two monkey-patched no-op methods), the `damage.js` post-damage no-op call, the `installTalentEffectDamageCompatibility()` shim in `runtime-bugfix-hotfixes.js`, and `ActorEngine.applyTalentEffect()` (~190 lines of core mutation code with no caller). The automated safety classifier blocked a bulk removal of those shared modules; I stopped there. The owner's wording ("don't mass-delete a shared mechanics module", "verify those dependencies") argues for confirming that cascade explicitly. Proposed order if confirmed: (1) the five mechanics modules, (2) the 25 planners and the empty engine, (3) the `damage.js` call and the hotfix shim, (4) `ActorEngine.applyTalentEffect`, each its own commit with a negative-reachability guard.

## EXECUTED (owner's direct chat authorization, 2026-11-24)
| Batch | Commit | Removed |
| --- | --- | --- |
| wrappers | `08daa9759` | the five `*-talent-macros.js` wrappers |
| 1 | `42965cb19` | the five `*-talent-mechanics.js` modules (sole importers were the deleted wrappers; no other reference in scripts, templates, tests, tools, data) |
| 2+3 | `86faf48c6` | `talent-effect-engine.js` (25 planners, all callers deleted), the no-op `TalentEffectEngine.applyPostDamageEffects` call and import in `combat/rolls/damage.js`, the `installTalentEffectDamageCompatibility()` shim, `buildTalentDamageBonusFallback` and two imports in `patches/runtime-bugfix-hotfixes.js` (`calculateDamageBonus` had no caller anywhere; the chat-layout and armor-filter patches are untouched; `damage-talent-contributions.js` stays as the single implementation) |
| 4 | this commit | `ActorEngine.applyTalentEffect` (~190 lines, no caller in scripts/tests/tools/templates; `applyMutationPlan`, `updateActor`, the spend/finalize/rollback methods and the other plan primitives untouched) |

Guard: `tests/class-force-v2-legacy-talent-retirement.test.mjs` (21 retired files stay deleted, no import of them, no reference to the engine / shim / `applyPostDamageEffects` / `applyTalentEffect`, ActorEngine primitives still present, published talents still in `packs/talents.db`). Regression after each batch: 272 -> 289 focused files (adds `*actor*`, `*governance*`, `*mutation*`, `*sovereign*`, `*damage*`, `*combat*`) all passing, `validate-data` and `validate-partials` clean.
