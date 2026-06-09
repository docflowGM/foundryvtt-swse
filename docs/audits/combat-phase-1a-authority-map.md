# SWSE Combat Phase 1A - Combat Authority Map

Audit/architecture phase only. No runtime files were changed.

## Purpose

Phase 1A answers the 10,000-foot question raised after Phase 0:

> Do we already have a combat single source of truth, and if several partial sources of truth exist, how should they be wired together without throwing away working systems?

The answer from the current repo snapshot is:

- A documented combat SSOT exists on paper: `scripts/engine/combat/CombatEngine.js`, especially `CombatEngine.resolveAttack()`.
- Multiple practical SSOTs also exist in the live runtime: the character sheet combat action handler, Roll Configurator V2, `rollAttack()`, `CombatOptionResolver`, `ActionEngine`, `DamageEngine`/`DamageResolutionEngine`, `FullAttackExecutor`, `AmmoSystem`, `SecondWindRules`, `SWSEGrappling`, and healing/repair helpers.
- The current problem is not that the repo lacks combat infrastructure. The problem is that the infrastructure is not wired through a shared workflow contract.

Phase 1A therefore recommends **SSOT by orchestration**: keep the existing authorities, register them behind a thin workflow aggregator, and make that aggregator own context shape and routing.

## Current documented SSOT

The strongest architectural claim is in `scripts/engine/combat/ARCHITECTURE.md`:

```text
CombatEngine.resolveAttack() <- All attacks flow through here
```

That document describes `CombatEngine.resolveAttack()` as the deterministic orchestration authority for attack resolution, damage application, threshold handling, and UI result display.

The code partially reflects that:

- `CombatEngine.resolveAttack()` exists.
- `SWSECombat.rollAttack()` in `scripts/combat/systems/enhanced-combat-system.js` delegates to `CombatEngine.resolveAttack()`.
- `CombatEngine.executeCoupDeGrace()` delegates to `resolveAttack()`.
- `CombatUIAdapter` is framed as handling results after `resolveAttack()`.

But the live sheet paths do not consistently follow that architecture.

## Current practical/live authorities

### 1. Character sheet combat action handler

Path: `scripts/sheets/v2/character-sheet.js`

The current strongest live entrypoint appears to be the sheet method path around `_runCanonicalCombatAction()`. It already recognizes multiple resolution paths:

- full attack actions route directly to `FullAttackExecutor.execute()`.
- manual/reference actions create a chat card and optionally spend action economy.
- attack actions route through Roll Configurator V2 and then `SWSERoll.rollAttack()`.
- skill-backed actions route to skill use/skill roll systems.
- fallback standard actions try `CombatEngine.executeAction()`, `actor.useAction()`, then warn.

This path is valuable because it already knows about actor context, selected action row data, sheet UI elements, and player cancellation. It should not become the permanent SSOT, but it is the best evidence for what the workflow aggregator must support.

### 2. Combat action data/normalizer

Path: `data/combat-actions.json` and `scripts/combat/utils/combat-actions-mapper.js`

This is the current action inventory authority. It knows action names, action type, cost, notes, related skills, fallback compendium loading, extra skill uses, ship actions, and talent enhancements.

Seam: `_normalizeAction()` drops many fields Phase 1+ needs, including `resolutionMode`, `executable`, `manualResolution`, `gmManaged`, `spendAction`, `ruleData`, `requiredContext`, `automationBoundary`, and richer source/rule metadata.

Decision: keep this as the **action inventory authority**, but do not let it be the workflow authority. Its job is to preserve source intent and return normalized action records.

### 3. Action economy

Paths:

- `scripts/engine/combat/action/action-engine-v2.js`
- `scripts/engine/combat/action/action-economy-persistence.js`
- `scripts/engine/combat/action/action-policy-controller.js`
- `scripts/engine/combat/action/action-policy.js`

This is the current action economy authority. `ActionEngine` is a pure calculator. `ActionEconomyPersistence` owns actor flag storage and lifecycle.

Seam: Phase 0H found likely RAW mismatches in substitution direction and full-round cost. Those are not reasons to replace the system; they are reasons to harden it as the canonical action-economy authority.

Decision: keep as **action economy SSOT**. The aggregator should call this; no action should hand-roll action spending.

### 4. Roll Configurator V2

Path: `scripts/rolls/roll-config.js`

This is the live preroller/config dialog authority. It already collects target, range, cover, concealment, combat options, Force Point usage, situational checkboxes, and weapon option UI.

Seams:

- Context names drift (`aiming`/`charging` vs resolver expectations like `aim`/`charge`).
- It exposes Autofire/Burst Fire/Rapid Shot UI but lacks ammo gating, stun mode, firing into melee, and durable context packet output.

Decision: keep as **player input collection authority**, but require it to return a normalized `CombatContext` fragment instead of ad hoc options.

### 5. Attack roll authority

Paths:

- `scripts/combat/rolls/attacks.js`
- `scripts/combat/rolls/enhanced-rolls.js`
- `scripts/engine/combat/CombatEngine.js`

`rollAttack()` in `scripts/combat/rolls/attacks.js` appears to be the most capable current attack roll implementation for sheet usage. It handles roll math, condition penalties, target defense, range, options, and `CombatOptionResolver` integration.

`SWSERoll.rollAttack()` in `enhanced-rolls.js` is a wrapper/legacy class path that many sheet and UI handlers still call.

`CombatEngine.resolveAttack()` also performs hit resolution and damage orchestration after receiving an already-made `attackRoll`.

Decision: do not duplicate attack math. The aggregator should choose one canonical attack workflow and adapt callers into it. The likely near-term authority is:

```text
CombatWorkflowRegistry -> Roll Configurator V2 -> rollAttack() -> attack result context
```

`CombatEngine.resolveAttack()` should be retained as a registered attack-resolution/damage-application authority, but Phase 1B must decide whether it is the canonical attack workflow or a later target-applied resolution path. It cannot remain only a documented SSOT while most live buttons bypass it.

### 6. Combat option / feat/talent modifier authority

Path: `scripts/engine/combat/combat-option-resolver.js`

This is a valuable authority. It already knows a large amount about:

- Power Attack
- Rapid Shot
- Rapid Strike
- Careful Shot
- Deadeye
- Autofire
- Burst Fire
- Far Shot
- Precise Shot
- Running Attack
- Charging Fire
- Powerful Charge
- Improved Disarm
- Mighty Swing
- weapon matching
- selected feat/talent choices
- range adjustments
- attack/damage flags

Decision: keep as **attack-option metadata/resolver SSOT**. Do not reimplement those rules in the sheet or in the aggregator. The aggregator/context builder should feed it the context names and weapon/action data it expects.

### 7. Full attack authority

Path: `scripts/engine/combat/full-attack-executor.js`

The current sheet already routes `resolutionMode === 'fullAttack'` to `FullAttackExecutor.execute()`. This is a strong candidate authority for:

- Full Attack
- Double Attack
- Triple Attack
- Two-Weapon Fighting
- Double Weapon Attack
- Dual Weapon Mastery
- Multiattack Proficiency

Decision: keep as **full-attack SSOT**. The aggregator should route full-attack action contexts to it instead of building a second multiattack engine.

### 8. Damage authorities

Paths:

- `scripts/engine/combat/damage-engine.js`
- `scripts/engine/combat/damage-resolution-engine.js`
- `scripts/combat/rolls/damage.js`
- `scripts/combat/damage-system.js`
- actor methods such as `actor.applyDamage()` / `actor.applyHealing()`

There are multiple damage authorities.

`DamageResolutionEngine` is the most complete calculation-oriented design: pure resolution, Bonus HP, mitigation, HP, DT, condition track impact, death/destroy/Force rescue determination.

`DamageEngine` mutates through `ActorEngine.applyDamage()`, but it is simpler and currently treats damage as flat amount/type.

`rolls/damage.js` owns damage roll formulas from weapons and combat state.

`DamageSystem` is a UI/manual selected-token utility.

Decision: do not pick a final damage SSOT in Phase 1A, but mark this as the largest merge/registration area. The aggregator should preserve context now and register damage as a later Phase 2/3 decision. Near-term: keep `rolls/damage.js` as formula roller, keep `DamageResolutionEngine` as desired calculation target, and keep `DamageEngine`/`ActorEngine` as mutation path until damage packets are introduced.

### 9. Ammo authority

Path: `scripts/engine/inventory/ammo-system.js`

`AmmoSystem` is the reusable skeleton for current/max ammo, reload, spend, and display logic.

Decision: keep as **ammo/resource SSOT**. Future Autofire/Burst Fire/reload UI should call this and obey the `trackBlasterCharges` houserule. Do not implement separate ammo math in the combat tab, gear tab, or preroller.

### 10. Combat state / condition / effects authorities

Paths:

- `scripts/combat/combat-status.js`
- `scripts/engine/effects/current-condition-resolver.js`
- `scripts/engine/effects/modifiers/ModifierEngine.js`
- `scripts/engine/effects/actor-effects-aggregator.js`
- `scripts/components/condition-track.js`
- `scripts/engine/combat/ConditionTrackRules.js`

Several systems touch current status, condition track, modifiers, and active effects.

Decision: keep `CombatStatusResolver`/condition/effect resolvers as display and derived-state authorities, but Phase 1B should not make them mutate action/state directly. The aggregator should route temporary state requests through a small state contract and let these existing systems read/display the result.

### 11. Second Wind authority

Paths:

- `scripts/engine/combat/SecondWindRules.js`
- `scripts/engine/combat/SecondWindEngine.js`

Phase 0J found this is one of the stronger healing subsystems.

Decision: keep `SecondWindRules` as the **Second Wind rules authority**. The aggregator should route Catch a Second Wind action requests through it and through canonical action economy.

### 12. Grapple authorities

Paths:

- `scripts/combat/systems/grappling-system.js`
- `scripts/houserules/houserule-grapple.js`

`SWSEGrappling` is the stronger skeleton for live grapple workflows. `GrappleMechanics` is more of a houserule DC helper.

Decision: keep `SWSEGrappling` as the future **grapple workflow authority**, and keep `GrappleMechanics` only as a house-rule support helper if its variant logic is needed. Do not create a new grapple system in Phase 1B.

### 13. Healing/repair authorities

Paths:

- `scripts/houserules/houserule-healing.js`
- `scripts/houserules/houserule-healing-skill-integration.js`
- `scripts/houserules/adapters/HealingRules.js`
- `scripts/engine/repair/actor-repair-engine.js`
- `scripts/combat/damage-system.js`
- actor `applyHealing()` paths

Decision: keep these as specialized authorities, but do not route them through generic damage as negative damage. The aggregator should register healing/repair workflows separately after the combat action routing contract exists.

### 14. Reactions authority

Paths:

- `scripts/engine/combat/reactions/reaction-engine.js`
- `scripts/engine/combat/reactions/reaction-registry.js`

Decision: keep as reaction authority. It should eventually receive the preserved attack/damage context packet so Block/Deflect/Negate Energy/Sonic interactions can be decided without ad hoc checks.

### 15. Rule setting authority

Paths:

- `scripts/engine/system/HouseRuleService.js`
- `scripts/houserules/adapters/*.js`

`HouseRuleService` is explicitly documented as the setting SSOT.

Decision: keep. The aggregator and all authorities should read houserules through HouseRuleService/adapters, not direct `game.settings.get()`. Existing direct calls in sheet code should be treated as alignment seams.

## 1A conclusion

The repo already contains a declared SSOT and many subsystem SSOTs. The right first implementation is **not** to correct every rule. It is to align the authorities behind a single workflow contract.

The next implementation phase should create a thin registry/orchestrator that:

1. accepts every combat action request,
2. normalizes the action record,
3. builds a shared context object,
4. asks `ActionEngine` whether the action can be paid,
5. routes to the registered authority,
6. preserves the result context,
7. hands the result to chat, damage, state, resource, and UI layers.

That aggregator should not be a giant new combat engine. It should be a routing and context-preservation shim.
