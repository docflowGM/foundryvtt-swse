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
