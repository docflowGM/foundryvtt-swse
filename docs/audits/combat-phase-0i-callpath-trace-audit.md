# SWSE Combat Phase 0I - Call-Path Trace Audit

Audit scope: call-path tracing only. No runtime code was changed.

This pass traces how current combat UI actions move from sheet templates and chat cards into handlers, dialogs, roll engines, action economy, chat rendering, damage buttons, reactions, and state mutation. It intentionally does not decide final fixes yet; it identifies the live paths and where context is lost.

## Executive summary

The current combat system has several useful engines, but the active call paths are still fragmented:

1. **The combat tab has two live attack entry paths.** The concept/v2 attack cards use `[data-action="roll-attack"]`, while older/other panels use `.attack-btn`. Both open `showRollModifiersDialog()` and then route to `_runCanonicalAttack()`, which spends a Standard Action and calls `SWSERoll.rollAttack()`.
2. **Combat action rows use a separate path.** `[data-action="swse-v2-use-action"]` calls `_runCanonicalCombatAction()`, which may route to Full Attack, Aid Another, Aim, manual chat, skill roll, generic attack, `CombatEngine.executeAction()`, or `actor.useAction()` depending on inferred action data.
3. **Damage is not context-preserving enough.** Chat damage buttons only carry `actorId`, `weaponId`, `isCritical`, `critMultiplier`, and `twoHanded`. They do not preserve attack-mode context such as Burst Fire, Autofire, Stun/Ion, area attack, hit/miss result, target defense result, Rapid Shot/Deadeye exclusion, or Evasion-relevant information.
4. **`SWSERoll.rollAttack()` wraps `canonicalRollAttack()`, but appears to expect a Roll-shaped return.** The canonical attack function returns an attack result object containing `roll`, `total`, `isHit`, etc. The wrapper then reads `roll.swseAttackContext`, `roll.dice`, and `roll.total`. `roll.total` works because the attack result has `total`, but `roll.dice` and `swseAttackContext` appear unavailable. This can silently erase downstream context.
5. **Action economy is spent at different points depending on path.** Direct attacks spend a Standard Action before rolling. Combat-action attacks open the preroller first, then spend action economy, then roll. Aid Another and Aim have their own spending logic. Manual/reference actions can spend before posting an informational card.
6. **The old Tactical Targeting Console remains present but explicitly deprecated and disconnected.** This is good, but also confirms the current active attack path is the Roll Configurator V2 preroller plus `SWSERoll`/canonical roll path, not `CombatRollConfigDialog`.
7. **Full Attack has a good explicit branch.** `_runCanonicalCombatAction()` routes `resolutionMode: "fullAttack"` to `FullAttackExecutor.execute()`. The unresolved risk is whether enough data/actions actually carry `resolutionMode: "fullAttack"` from the action database/mappers.
8. **Reactions are wired from attack chat context, not from the original attack execution object.** `rollAttack()` creates a `reactionContext`, and the chat template renders reaction buttons. The chat interaction bridge resolves those buttons through `ReactionEngine.resolveReaction()`. This is a promising path, but it depends on the original attack context being complete.

## Active call paths

### Path 1 - concept/v2 attack card

Template source:

- `templates/actors/character/v2/partials/attacks-panel.hbs`
- Button: `[data-action="roll-attack"]`
- Data: `data-weapon-id="{{attack.weaponId}}"`

Runtime path:

```text
Combat attack card
-> character-sheet.js activateListeners/render listeners
-> [data-action="roll-attack"] click handler
-> resolve weapon from actor.items
-> showRollModifiersDialog({ rollType: "attack", actor, weapon })
-> optional fighting defensively effect handling
-> _runCanonicalAttack(weapon, modResult)
-> _applyActionEconomy("standard")
-> SWSERoll.rollAttack(actor, weapon, options)
-> canonicalRollAttack(actor, weapon, options)
-> CombatOptionResolver.collectAttackModifiers()
-> RollEngine.safeRoll("1d20 + bonus")
-> target defense comparison
-> ReactionEngine.getAvailableReactions()
-> SWSEChat.postRoll()
-> templates/chat/holo-roll.hbs
-> chat interaction bridge binds reaction/damage buttons
```

Strengths:

- Uses the current canonical preroller.
- Uses action economy before rolling.
- Uses `CombatOptionResolver` and `ReactionEngine` through the canonical attack function.
- Uses `SWSEChat.postRoll()` and the holo roll template.

Seams:

- Direct card attack always spends Standard Action, regardless of whether the selected attack option should be a Full-Round or no-spend reference path.
- The direct weapon attack path does not inherently know that the user is choosing Autofire, Burst Fire, Disarm, Charge, or another named combat action unless the dialog supplies it.
- The dialog currently lacks some key context controls identified in earlier audits, such as Firing into Melee, Lethal/Stun mode, ammo gating, and action-aware reload.
- Damage button context does not preserve enough from the attack.

### Path 2 - legacy/other attack button

Template/control source:

- Any element with `.attack-btn`
- Data: `data-item-id`

Runtime path:

```text
.attack-btn
-> delegated click listener in character-sheet.js
-> resolve weapon from actor.items
-> showRollModifiersDialog({ rollType: "attack" })
-> optional fighting defensively effect handling
-> _runCanonicalAttack(weapon, modResult)
-> _applyActionEconomy("standard")
-> SWSERoll.rollAttack()
-> canonicalRollAttack()
-> SWSEChat.postRoll()
```

Strengths:

- Routes to the same canonical attack wrapper as concept card attacks.

Seams:

- It duplicates the attack entry path, increasing the chance of drift.
- The older selector may still appear in other panels, so attack behavior depends on panel template shape.
- It has the same damage-context loss as the concept attack path.

### Path 3 - combat action row/button

Template source:

- `templates/actors/character/v2/partials/combat-actions-panel.hbs`
- Button: `[data-action="swse-v2-use-action"]`
- Row: `.combat-action-row`

Runtime path:

```text
Combat action row/button
-> _resolveSheetCombatActionData(actionId, element)
-> _runCanonicalCombatAction(actionId, actionData)
   -> if resolutionMode === "fullAttack": FullAttackExecutor.execute()
   -> else if actionId === "aid-another": _runAidAnotherCombatAction()
   -> else if actionId === "aim": _runAimCombatAction()
   -> else if manual/reference: _applyActionEconomy() then manual chat card
   -> else if inferred attack: preroller -> apply action economy -> SWSERoll.rollAttack()
   -> else if skill-backed: preroller -> apply action economy -> rollSkillCheck()
   -> else: apply action economy -> CombatEngine.executeAction() -> actor.useAction() fallback
```

Strengths:

- This is the most flexible path.
- It avoids spending action economy when the attack preroller is cancelled.
- It already has explicit branches for Full Attack, Aid Another, and Aim.
- It can announce manual/reference actions without pretending they are fully automated.

Seams:

- Action data hydration does not consistently preserve all useful source fields. `CombatActionsMapper._normalizeAction()` only returns a limited subset: key, name, actionType, cost, notes, relatedSkills, dc, outcome, when.
- If source data has `resolutionMode`, `manualResolution`, `executable`, `ruleData`, `requiredContext`, `targetHint`, or `spendAction`, those fields can be lost before the sheet receives them.
- Fallback JSON actions are registered as `executable: true`, so reference actions can become fake buttons unless specifically handled later.
- Attack detection still includes name/text guessing: `_combatActionLooksLikeAttack()` checks for words such as `attack`, `autofire`, and `burst fire`.
- If an action is `compound`, unusual, or multi-cost, the sheet normalizer may not place it in the expected action lane or spend the correct cost.

### Path 4 - Full Attack

Runtime path:

```text
Combat action row with resolutionMode: "fullAttack"
-> _runCanonicalCombatAction()
-> FullAttackExecutor.execute(actor, { requestedPackage, actionCostOverride, actionId, actionData })
```

Strengths:

- A dedicated Full Attack executor exists and is the correct future authority for Double Attack, Triple Attack, and dual-weapon execution.
- The path already supports `requestedPackage` selection from `ruleData` or action IDs.

Seams:

- This path only wakes up if action data reaches the sheet with `resolutionMode: "fullAttack"` or the correct action ID mapping.
- The mapper and sheet registration pipeline may not preserve enough source metadata from compendium or JSON actions.
- It needs later verification against actual action documents for Full Attack, Double Attack, Triple Attack, Two-Weapon Fighting, and Double Weapon Attack.

### Path 5 - Aid Another

Runtime path:

```text
Aid Another combat action
-> _runAidAnotherCombatAction()
-> Dialog: attack aid or skill aid
-> _applyActionEconomy("standard")
-> skill mode: rollSkillCheck(actor, skillKey, { dc: 10 })
-> attack mode: SWSERoll.rollAttack(actor, weapon, { targetContext: manual Reflex/DC 10 })
-> chat roll
```

Strengths:

- It has a dedicated dialog.
- It uses DC 10/Reflex 10 style targets.
- It spends Standard Action after confirmation.

Seams:

- It rolls the aid attempt, but does not create/apply the resulting +2 bonus to an ally.
- There is no ally target/pending bonus context beyond a freeform note.
- The attack mode still routes through the same attack/damage context limitations.

### Path 6 - Aim

Runtime path:

```text
Aim combat action
-> _runAimCombatAction()
-> _applyActionEconomy("swift")
-> actor flag foundryvtt-swse.combatAim { steps, active, round, turn, combatId }
-> manual chat card
-> next rollAttack() sees actorHasLockedAim()
-> effectiveOptions adds aim/aiming/ignoreCover/suppressesCover
-> after roll: consumeActorAim()
```

Strengths:

- Aim has durable actor flag storage.
- The next attack can consume locked Aim.
- The canonical attack function recognizes multiple aim/aiming shapes.

Seams:

- The roll dialog also has an Aiming checkbox, which can bypass the two-swift action state unless treated as GM/manual context.
- Aim is not target-bound.
- Aim invalidation from intervening actions is not enforced.
- Aim context is now partially normalized, but it still needs a single attack-context builder later.

### Path 7 - damage button from chat

Template source:

- `templates/chat/holo-roll.hbs`
- Button: `.swse-roll-damage`
- Data: `data-actor-id`, `data-weapon-id`, `data-is-crit`, `data-crit-mult`, `data-two-handed`

Runtime path:

```text
Attack chat damage button
-> ChatInteractionBridge.bind()
-> handleLegacyDamageRollButton()
-> actorFromId()
-> itemFromActor()
-> SWSERoll.rollDamage(actor, weapon, { isCritical, critMultiplier, twoHanded, target })
-> rollDamage() from combat/rolls/damage.js
-> CombatOptionResolver.collectAttackModifiers(actor, weapon, context)
-> SWSEChat.postRoll({ type: "damage" })
```

Strengths:

- Chat buttons resolve virtual unarmed and droid-part weapons.
- Damage can still be rolled after attack chat posts.

Seams:

- Most attack context is not stored in the button dataset.
- `isCritical` and `critMultiplier` survive, but Burst Fire, Rapid Shot, Deadeye, Stun/Ion mode, Autofire, areaAttack, hit/miss, target defense result, Evasion-relevant result, ammo cost, and damage packet information are not preserved.
- The damage roller recomputes attack options from a thin context, so option legality/effects can differ from the original attack roll.
- Damage buttons are therefore not yet reliable for special damage semantics.

### Path 8 - apply damage button

Template/control source:

- `.swse-apply-damage-btn`

Runtime path:

```text
Apply Damage button
-> ChatInteractionBridge.handleApplyDamageButton()
-> DamageSystem.applyToSelected(amount, { checkThreshold: true })
```

Strengths:

- Damage application is intentionally GM/player controlled through selected targets.
- Threshold checking is at least requested.

Seams:

- Damage application is amount-only plus threshold flag. It does not know the original attack mode, damage type packet, Stun/Ion halving, original pre-half damage, Evasion, or area hit/miss state.

### Path 9 - reactions

Template/runtime path:

```text
rollAttack()
-> buildReactionContextForAttack()
-> ReactionEngine.getAvailableReactions(defender, context)
-> SWSEChat.postRoll(context.reactionContext)
-> holo-roll.hbs renders reaction buttons
-> ChatInteractionBridge.handleReactionButton()
-> ReactionEngine.resolveReaction({ reactionKey, attacker, defender, eventId, dc, attackTotal })
```

Strengths:

- Reactions are surfaced in the chat card at the right moment.
- Resolution is delegated to `ReactionEngine`.
- The button has event/attacker/defender/DC/attack-total data.

Seams:

- Reaction availability depends on attack context being correct at the time of chat creation.
- Sonic/ranged Deflect exception and mixed Sonic bonus damage need packet-level support later.
- The system likely needs event-state integration so reaction resolution can update or annotate the original attack event instead of just posting a disconnected result.

### Path 10 - action economy persistence

Runtime path:

```text
_runCanonicalAttack() or _runCanonicalCombatAction()
-> _applyActionEconomy(actionType, metadata)
-> import ActionEconomyPersistence + ActionEngine + ActionPolicyController
-> ActionPolicyController.wouldPermit/handle
-> ActionEngine.consume() or consumeAction()
-> ActionEconomyPersistence.commitConsumption()
-> actor flag foundryvtt-swse.actionEconomy
-> requestSurfaceRender()
```

Strengths:

- Action economy persistence exists and stores per-combat actor state.
- Reaction spending has a separate `spendReaction()` path.
- History/undo support exists in persistence.

Seams:

- Previous 0H concerns remain: the v2 ActionEngine substitution direction and full-round behavior need a rules correction pass later.
- Action cost derivation relies heavily on normalized text fields from action data.
- If mapper drops source cost semantics, the action economy can only guess.

## Legacy/disconnected paths

### Tactical Targeting Console

`scripts/apps/combat/combat-roll-config-dialog.js` has a file-level deprecation notice stating it is orphaned and replaced by `showRollModifiersDialog()` from `scripts/rolls/roll-config.js`.

Audit conclusion: do not build future combat behavior on `CombatRollConfigDialog`. It should eventually be removed after all references are confirmed dead.

### CombatEngine / CombatExecutor attack orchestration

`CombatEngine` and `CombatExecutor` still contain older/full orchestration attack resolution paths. The active sheet attack path does not appear to route normal weapon attacks through `CombatEngine.resolveAttack()` or `CombatExecutor.executeAttack()`; it routes through `SWSERoll.rollAttack()` and canonical attack rolls.

Audit conclusion: these may still be useful for vehicle/subsystem or future orchestration, but they are not the sheet's main weapon attack path right now. Any future consolidation must decide whether `CombatEngine` becomes the orchestration layer or remains a legacy/secondary engine.

## Highest-risk call-path seams

1. **Attack result wrapper shape mismatch**
   - `SWSERoll.rollAttack()` stores the return of `canonicalRollAttack()` in a variable named `roll` and then treats it partly like a Roll object.
   - `canonicalRollAttack()` returns an attack result object containing a nested Roll.
   - This can erase or confuse `d20`, target defense, critical, and context information in the wrapper/history layer.

2. **Damage button context loss**
   - Damage buttons do not carry enough structured context to reproduce the attack's selected options.
   - This affects Burst Fire, Autofire, area damage, Evasion, Stun, Ion, Deadeye, Rapid Shot, crit behavior, and target outcomes.

3. **Action data field loss**
   - Combat action source data is normalized through mappers that drop fields needed for routing.
   - The sheet compensates with name guessing and generic fallbacks.

4. **Multiple attack entry points**
   - `[data-action="roll-attack"]`, `.attack-btn`, and combat action attack rows all reach similar but not identical paths.
   - This increases drift risk and makes later fixes harder.

5. **Action economy timing differs by path**
   - Direct attack cards spend before roll.
   - Combat action attack cards spend after preroller confirmation.
   - Manual/reference actions spend before chat.
   - This may be correct in some cases, but it needs a single routing contract.

6. **State and context are not unified**
   - Aim has durable flag state.
   - Charge may be only dialog context.
   - Fight Defensively may be status flag, Active Effect, or dialog choice.
   - Damage does not receive a canonical snapshot.

## Recommended future direction, still audit-only

Later implementation phases should not start by rewriting every engine. The call-path audit suggests a smaller foundation first:

1. Create a **Combat Action Routing Contract** and preserve it through mappers.
2. Create a single **Attack Context Builder** used by direct weapon attacks and combat-action attacks.
3. Store an **attack context snapshot** in chat flags and damage buttons.
4. Make damage roll/apply read the snapshot instead of recomputing from a thin weapon-only context.
5. Decide whether `CombatEngine` is the orchestration authority or a secondary/legacy system.
6. Normalize action economy spending so all executable paths spend at a consistent point: after confirmation, before execution, with clear rollback/error behavior.

