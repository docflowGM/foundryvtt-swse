# Combat Phase 0F — Ion Damage Addendum

Audit only. No runtime files were changed.

## Why Ion belongs in the combat audit

Ion damage is not just another damage tag. It has special rules similar to Stun, but with a different target profile:

- On a successful hit, apply **half Ion damage** to HP.
- Use the **original Ion damage before halving** for Damage Threshold comparison.
- Non-cybernetic living creatures take the HP damage but do not suffer the special Ion disable/CT effects.
- Droids, vehicles, electronic devices, and cybernetically enhanced creatures can suffer the special Ion effects.
- If Ion damage reduces current HP to 0, eligible targets move to the bottom of the Condition Track and are disabled or knocked unconscious.
- If original Ion damage equals/exceeds DT, eligible targets move `-2` steps on the Condition Track.

## Current code inventory

### Damage type transport

`SWSEActorBase.applyDamage()` passes `options.damageType || options.type || 'normal'` into `ActorEngine.applyDamage()`.

`ActorEngine.applyDamage()` passes the type into `DamageResolutionEngine.resolveDamage()` as `damageType`.

`DamageResolutionEngine.resolveDamage()` passes `isIon: damageType === 'ion'` into `ThresholdEngine.evaluateThreshold()`.

This is promising: the basic damage-type plumbing exists.

### Threshold logic

`ThresholdEngine.evaluateThreshold()` accepts `isIon`, and contains this comment:

> Ion-specific: DT check uses original (not halved) damage. This is handled by the caller passing the correct damage value.

That comment is important. It means the engine currently expects the caller to pre-arrange the Ion damage split correctly.

Risk:

- If the caller passes halved Ion damage, DT comparison is too low.
- If the caller passes full Ion damage, HP damage is too high.
- The current unified `DamageResolutionEngine` appears to have only one `damage` number feeding both HP damage and threshold evaluation.

Therefore Ion needs a split packet:

```js
{
  damageType: "ion",
  hpDamage: Math.floor(originalIonDamage / 2),
  thresholdDamage: originalIonDamage,
  eligibleIonTarget: true
}
```

or equivalent.

### Condition track logic

`DamageResolutionEngine` uses threshold result to apply CT movement. It also has a damage-rule hook:

- `damageRules.capIonDamageCtToOneStep`

This appears to support **Ion Shielding** or similar feat logic.

Good:

- Ion Shielding appears to have a future hook.

Gap:

- Baseline Ion damage should move eligible targets `-2` CT on threshold, while normal damage threshold is generally `-1`. The current generic threshold path starts with `ctShift = 1`; I did not find a clear always-on Ion-specific baseline `ctShift = 2` in this snapshot.

### Target category gating

I did not find a reliable target eligibility check that distinguishes:

- organic without cybernetics
- cybernetically enhanced organic
- droid
- vehicle
- object/device/electronic

This matters because non-cybernetic living creatures should not receive the special Ion CT/disable effects.

### Weapon mode/state inventory

`WeaponStateAdapter` can display Stun and Ion mode cards if:

- `weapon.flags.swse.ionMode === true`, or
- `weapon.system.modes.ion === true`

This is a useful display skeleton, but it is not enough. A visible mode card does not prove that the attack/damage pipeline carries `damageType: 'ion'` or applies Ion half-damage/threshold rules.

### Feat/talent inventory

Relevant examples found:

| Name | Type | Expected system dependency |
|---|---|---|
| Ion Shielding | Feat | Cap Ion threshold CT movement to 1 step |
| Ion Resistance 10 | Talent | DR/resistance against Ion damage only |
| Ion Mastery | Talent | +1 attack and +1 die of Ion damage |
| Ion Turret | Talent | Turret deals Ion damage |
| Damage Conversion | Feat | Excludes Ion damage from conversion option |

## Rules-fidelity concerns

### 1. Ion needs two damage numbers

The current damage stack appears optimized around one `damage` number. Ion needs at least two semantic numbers:

- damage applied to HP after the Ion half rule
- damage measured against DT before the Ion half rule

This is the same architectural family as Stun and Autofire/Evasion.

Severity: **high**.

### 2. Ion target eligibility is not visibly enforced

The system must know whether the target is:

- droid
- vehicle
- device/electronic/object
- cybernetic creature
- non-cybernetic living creature

Without that, Ion CT/disable effects can be over-applied.

Severity: **high**.

### 3. Ion threshold CT shift may be under-modeled

Ion threshold effect is `-2` CT for eligible targets. Current generic threshold starts at 1 step and has an Ion Shielding cap hook, but I did not find a clear baseline Ion `2` step rule.

Severity: **high**.

### 4. Ion mode display does not prove Ion damage behavior

The weapon state adapter can show Ion mode, but the attack/damage context still needs to preserve Ion mode into roll damage and application.

Severity: **medium-high**.

### 5. Ion Shielding hook is promising but needs validation

The `capIonDamageCtToOneStep` hook looks correct in spirit, but it only matters if baseline Ion CT shift is 2 and if damage type reaches the damage resolver as `'ion'`.

Severity: **medium**.

## Future implementation boundary

Automate:

- damage type transport
- Ion half HP damage
- original damage DT comparison
- target eligibility checks where data is available
- Ion Shielding cap
- Ion Resistance / Ion DR
- Ion Mastery attack/damage bonuses
- chat card summary of Ion outcome

Assist/GM-managed:

- whether a living target has relevant cybernetic prosthetics if not encoded on the actor
- whether an object is sufficiently electronic
- edge cases involving mixed damage types

## Required future context packet

Ion damage application should preserve at least:

```js
{
  damageType: "ion",
  originalDamage: roll.total,
  hpDamagePolicy: "half",
  thresholdDamagePolicy: "original",
  ionEligibleTarget: "auto|gm|false|true",
  targetCategory: "organic|cyborg|droid|vehicle|device|object",
  sourceWeaponId: weapon.id,
  sourceMode: "ion"
}
```

## Top Ion seams

1. **Ion requires original-vs-halved damage split; current damage flow appears single-number centric.**
2. **Eligible target type is not reliably modeled.**
3. **Baseline Ion CT shift of 2 is not clearly implemented.**
4. **Ion mode cards exist, but damage pipeline preservation is unproven.**
5. **Ion Shielding hook exists but depends on the above fixes to matter.**
