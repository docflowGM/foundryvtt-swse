# Combat Phase 0E — Affected Feat/Talent Crosswalk

Scope: audit/documentation only.

This file lists combat feats/talents/options whose correctness depends on the Autofire/Burst Fire/ammo/stun systems audited in Phase 0E.

## Burst Fire

Expected context:

```json
{
  "attackOptions": { "burstFire": true },
  "isBurstFire": true,
  "isAreaAttack": false,
  "singleTarget": true,
  "ammoCost": 5,
  "extraWeaponDice": 2,
  "nonStackingDamageOptions": ["deadeye", "rapidShot"]
}
```

Audit notes:

- Resolver metadata is mostly correct.
- Legacy/enhanced Autofire helper incorrectly halves damage on Burst Fire miss if live.
- Damage buttons likely lose Burst Fire context.
- Action metadata conflicts: one source says standard, another says full-round.

Severity: high.

## Autofire

Expected context:

```json
{
  "attackMode": "autofire",
  "isAutofire": true,
  "isAreaAttack": true,
  "gmManagedArea": true,
  "ammoCost": 10,
  "halfDamageOnMiss": true
}
```

Audit notes:

- Target squares/affected creatures should be GM-managed.
- Math/resource/chat should be automated when ammo tracking is enabled.
- Enhanced helper has unsafe capability detection and attacker-side Evasion lookup.

Severity: high.

## Evasion / Improved Evasion

Expected context:

- Applies to area attacks such as Autofire.
- Does not apply to Burst Fire.
- On Autofire hit: Evasion-style rules can reduce damage depending on exact talent wording.
- On Autofire miss: Evasion should prevent the normal half damage where appropriate.

Audit notes:

- Evasion cannot be trusted until the damage path preserves `isAreaAttack`, hit/miss outcome, and target talent data.
- Burst Fire must explicitly opt out of area attack/Evasion semantics.

Severity: high.

## Deadeye

Expected context:

- Requires Aim.
- Adds damage dice to ranged attack when legal.
- Does not stack with Burst Fire's extra damage.

Audit notes:

- Existing resolver has Deadeye metadata, but non-stacking with Burst Fire needs explicit handling.
- Aim context naming remains a previous Phase 0 seam.

Severity: medium/high.

## Rapid Shot

Expected context:

- Ranged toggle.
- Adds one damage die with attack penalty.
- Does not stack with Burst Fire extra damage.

Audit notes:

- Resolver metadata exists.
- Non-stacking with Burst Fire needs explicit future enforcement.
- Ammo cost for Rapid Shot is currently listed as 1 in AmmoSystem; verify RAW before enforcement.

Severity: medium.

## Precise Shot / firing into melee

Expected context:

- Firing into melee checkbox applies -5.
- Precise Shot suppresses that penalty.

Audit notes:

- This was added as a recommendation in Phase 0D.
- It should coexist with Autofire/Burst dialogs but not be confused with area-target GM adjudication.

Severity: medium.

## Autofire Assault / Autofire Sweep / Controlled-area style options

Expected context:

- Requires Autofire/area attack context.
- May require same-area/consecutive-round memory or reduced/excluded squares.
- Most map details remain GM-managed.

Audit notes:

- Metadata exists in data/authority and feat metadata sources.
- Runtime context for sustained area/same squares is probably absent.
- Recommended automation boundary: chat reminders and modifiers where simple; GM-managed affected squares.

Severity: medium/high.

## Brace-related talents

Expected context:

- Brace state.
- Autofire-only weapon check.
- Two-swift or modified one-swift action cost depending on talent/rule.
- Penalty reduction for Autofire/Burst Fire where legal.

Audit notes:

- Action data contains Brace Autofire-Only Weapon.
- Runtime state and action economy are not yet canonical.
- Talents can modify the brace cost/penalty, so this needs a stateful action pipeline.

Severity: high.

## Stun-focused feats/talents

Examples found in repo metadata include stun-attack/stun-damage bonuses and threshold-modifying stun talents.

Expected context:

```json
{
  "weaponMode": "stun",
  "isStunDamage": true,
  "stunSource": "weapon-mode-or-stun-only"
}
```

Audit notes:

- Stun damage type exists in data.
- Lethal/Stun mode selector is absent.
- Damage path does not yet have RAW stun semantics.
- Future implementation must preserve stun context into damage and threshold processing.

Severity: high.
