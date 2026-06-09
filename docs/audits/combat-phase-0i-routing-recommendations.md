# SWSE Combat Phase 0I - Routing Recommendations

Audit-only recommendations. These are not implementation changes.

## Recommended implementation posture

The call-path audit reinforces the earlier plan: the first implementation phases should not try to automate the whole tactical game. They should make the existing live paths honest, context-rich, and GM-friendly.

## Recommendation 1 - Preserve action routing metadata end to end

Before fixing individual actions, preserve the data needed to route them.

Required fields to preserve from compendium/JSON/action resolvers:

- `resolutionMode`
- `manualResolution`
- `executable`
- `spendAction`
- `ruleData`
- `requiredContext`
- `targetHint`
- `resources`
- `actionCost` / `cost`
- `costParts` for compound actions
- `contextTags`
- `gmManaged`

Without this, later fixes will continue relying on action-name guessing.

## Recommendation 2 - Create an Attack Context Builder

Both direct weapon attacks and combat-action attacks should pass through a single context builder before rolling.

It should produce a stable object like:

```js
{
  actionId,
  actionName,
  weaponId,
  attackMode,
  actionCost,
  attackOptions,
  combatOptions,
  damageMode,
  isAutofire,
  isBurstFire,
  isAreaAttack,
  isStun,
  isIon,
  isCharge,
  isDisarm,
  isAimLocked,
  firingIntoMelee,
  gmManaged,
  ammoCost,
  targetContext,
  sourcePath
}
```

This is a context builder, not full map automation.

## Recommendation 3 - Store an attack snapshot in chat flags

Attack chat should include a durable snapshot of the attack context under message flags. Damage buttons should refer to the snapshot rather than trying to rebuild from `weaponId` alone.

Minimum snapshot fields:

- actor ID
- weapon ID
- attack total
- d20 result
- target ID or manual target context
- hit/miss/unknown result
- crit/crit multiplier
- selected attack options
- damage mode: lethal/stun/ion/etc.
- area attack flag
- Burst Fire flag
- Autofire flag
- ammo cost
- damage packet preview, if available

## Recommendation 4 - Make damage consume the snapshot

Damage rolling should read the attack snapshot and carry it into the damage packet. This is what allows Burst Fire, Rapid Shot, Deadeye, Stun, Ion, Evasion, Sonic, Fire, Acid, and threshold rules to be coherent.

## Recommendation 5 - Keep GM adjudication explicit

For map-dependent items, the context snapshot should say what the rules require, but not attempt map automation.

Examples:

- Autofire: `gmManagedArea: true`
- Elusive Target: optional/GM checkbox, not automatic map detection
- Cover: player/GM selected, not LoS-driven
- Fire/Acid: recurring effect/reminder, GM can clear/adjust

## Recommendation 6 - Consolidate attack entry points gradually

Do not remove old selectors immediately. First make both `[data-action="roll-attack"]` and `.attack-btn` call the same Attack Context Builder. Then later deprecate old selectors once all panels are migrated.

## Recommendation 7 - Decide the role of CombatEngine

There are two possible future architectures:

1. **SWSERoll/canonical roll path remains the live attack authority.** CombatEngine stays for vehicle/subsystem/special orchestration.
2. **CombatEngine becomes the orchestration authority.** Sheet/UI call CombatEngine, and CombatEngine delegates to SWSERoll/canonical math.

Do not leave both pretending to be the main path.

## Recommendation 8 - Fix action economy only through one gate

Every executable path should follow the same broad sequence:

```text
Resolve action data
-> open required dialog/setup
-> user confirms
-> validate action economy/resources
-> spend action economy/resources
-> execute roll/state/chat
-> on failure, either abort before mutation or perform explicit rollback
```

This is especially important for Full Attack, Burst Fire, Autofire, Reload, Aim, Brace, Recover, Fight Defensively, and Aid Another.

