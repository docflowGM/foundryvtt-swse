# SWSE Combat Phase 1A - SSOT Decision Matrix

Audit/architecture phase only. No runtime files were changed.

## Decision summary

The combat project should not promote one existing file into an all-powerful combat engine. Instead, it should promote a thin workflow registry as the **combat workflow SSOT**, while preserving existing subsystem SSOTs.

## Matrix

| Domain | Current candidates | Best current authority | Phase 1A decision |
|---|---|---|---|
| Combat workflow/routing | character sheet `_runCanonicalCombatAction`, `CombatEngine.executeAction`, `SWSECombat`, actor.useAction | none complete | Add thin `CombatWorkflowRegistry` in Phase 1B |
| Action inventory | combat actions compendium, `data/combat-actions.json`, `CombatActionsMapper` | `CombatActionsMapper` + source data | Keep, but preserve routing fields |
| Action economy math | `ActionEngine` v2, legacy wrapper, sheet helpers | `ActionEngine` v2 | Keep and harden RAW seams |
| Action economy persistence | actor flags, `ActionEconomyPersistence`, sheet state | `ActionEconomyPersistence` | Keep; all spend commits route here |
| Player roll input | old Tactical Targeting Console, Roll Configurator V2, sheet checkboxes | Roll Configurator V2 | Keep; return normalized context |
| Attack roll math | `rollAttack`, `SWSERoll.rollAttack`, `CombatEngine.resolveAttack`, `SWSECombat.rollAttack` | `rollAttack` practical; `CombatEngine.resolveAttack` documented | Keep both short-term; registry decides call path |
| Hit/damage orchestration | `CombatEngine.resolveAttack`, attack chat/damage buttons | `CombatEngine.resolveAttack` designed | Keep, but align live callers before trusting as universal |
| Attack option metadata | `CombatOptionResolver`, feat/talent effects, macros | `CombatOptionResolver` | Keep as option resolver SSOT |
| Full attack | sheet logic, `SWSECombat.rollFullAttack`, `FullAttackExecutor` | `FullAttackExecutor` | Keep as fullAttack handler |
| Damage formula rolling | `rolls/damage.js`, `rolls/attacks.js` damage helper, `SWSECombat.rollDamage` | `rolls/damage.js` likely strongest | Keep; later packet builder |
| Damage calculation/resolution | `DamageResolutionEngine`, `DamageEngine`, actor methods | `DamageResolutionEngine` design + `DamageEngine` mutation bridge | Preserve now; merge in packet phase |
| Damage mutation | direct actor.update, actor.applyDamage, `ActorEngine.applyDamage`, `DamageEngine` | `ActorEngine` via DamageEngine | Keep mutation through ActorEngine |
| Ammo/reload | `AmmoSystem`, item data, attack dialog checkboxes | `AmmoSystem` | Keep as ammo SSOT |
| Combat status/defense states | `CombatStatusResolver`, Active Effects, flags, ModifierEngine | split | Keep resolvers, add state contract later |
| Conditions/effects display | `CurrentConditionResolver`, actor effects aggregators | `CurrentConditionResolver`/aggregators | Keep as display aggregators |
| Condition track rules | `ConditionTrackRules`, ActorEngine condition helpers, sheet buttons | `ConditionTrackRules` for settings + ActorEngine for mutation | Keep; align state workflow later |
| Second Wind | sheet logic, `SecondWindRules`, `SecondWindEngine` | `SecondWindRules` | Keep as Second Wind SSOT |
| Grapple | `SWSEGrappling`, `GrappleMechanics`, action cards | `SWSEGrappling` as workflow skeleton | Keep and later fix RAW seams |
| Organic healing | `HealingRules`, `HealingMechanics`, skill integration, actor.applyHealing | HealingRules/HealingMechanics candidate | Keep; route as heal workflow later |
| Droid/object/vehicle repair | `ActorRepairEngine`, Mechanics/Treat Injury helpers | `ActorRepairEngine` candidate | Keep; route as repair workflow later |
| Reactions | `ReactionEngine`, `ReactionRegistry`, Block/Deflect hooks | ReactionEngine/Registry | Keep; feed preserved context later |
| Houserules/settings | direct game.settings calls, `HouseRuleService`, adapters | `HouseRuleService` + adapters | Keep; migrate direct calls |
| Actor/item mutation | direct update calls, ActorEngine | ActorEngine | Keep as mutation SSOT |

## Important distinction

`CombatEngine.resolveAttack()` should not be discarded. It is already the declared combat engine and contains real orchestration. But Phase 1A found that it does not currently serve as the universal live workflow entrypoint. The new workflow registry should sit **above** existing authorities and decide when to call `CombatEngine.resolveAttack()` versus when to call other specialized workflows.

That means:

```text
Bad next step:
  Rewrite all combat into a brand-new CombatEngine2.

Also bad:
  Pretend CombatEngine.resolveAttack already receives every combat action.

Correct next step:
  Add a thin CombatWorkflowRegistry that normalizes context and routes to existing authorities.
```

## Promotion/deprecation decisions

### Promote to canonical

- `CombatActionsMapper` as action inventory normalizer after field preservation.
- `ActionEngine` v2 as action-economy math authority after RAW hardening.
- `ActionEconomyPersistence` as action state persistence authority.
- `CombatOptionResolver` as feat/talent attack option authority.
- `FullAttackExecutor` as full attack authority.
- `AmmoSystem` as ammo authority.
- `SecondWindRules` as Second Wind authority.
- `HouseRuleService` as houserule authority.
- `ActorEngine` as mutation authority.

### Keep but wrap/adapt

- `CombatEngine.resolveAttack()`.
- `rollAttack()`.
- `rolls/damage.js`.
- `DamageEngine`.
- `DamageResolutionEngine`.
- `SWSEGrappling`.
- Healing/repair systems.
- Reaction systems.

### Keep as legacy/manual tooling

- `SWSECombat` / enhanced combat system wrapper.
- `SWSERoll` static legacy API.
- `DamageSystem` selected-token utility.
- old Tactical Targeting Console as deprecated reference only.

### Avoid as future authority

- sheet-specific direct routing as a long-term source of truth.
- direct `actor.update()`/`item.update()` from combat flows.
- direct `game.settings.get()` calls outside `HouseRuleService`/adapters.
- action-specific one-off damage or ammo code in templates/sheets.

## Recommended next patch target

Phase 1B should be implementation, but surgical:

1. Add workflow registry/context files.
2. Register existing authorities.
3. Preserve action metadata through `CombatActionsMapper`.
4. Route the character sheet combat action path through the registry while preserving existing behavior.
5. Add diagnostics/warnings when an action has no registered route.

The purpose is alignment, not full mechanics correction.
