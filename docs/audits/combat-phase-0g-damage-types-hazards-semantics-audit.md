# Combat Phase 0G - Damage Types, Hazards, and Special Damage Semantics Audit

Audit only. No runtime files were changed.

## Scope

This pass audits whether damage types behave as rule-bearing packets or merely display labels. It focuses on the damage types and special qualities supplied for this phase:

- Acid
- Bludgeoning
- Electrical
- Energy
- Fire
- Force
- Ion
- Piercing
- Slashing
- Sonic
- Stun

It also checks hazard-style recurring damage for Fire and Acid, Sonic/Deflect interactions, Force/Yuuzhan Vong immunity, Stun/Ion threshold semantics, damage-type UI options, and the current damage call paths.

## Executive finding

The repo has useful damage-type plumbing, but damage types are still mostly **labels plus mitigation context**, not full rules packets.

The current system can carry `damageType` through parts of the attack/damage stack, and some mitigation/threshold hooks exist. However, the system does not yet consistently preserve the extra information needed for special damage rules:

- original damage vs HP damage,
- special Damage Threshold damage,
- target eligibility by category,
- recurring hazard creation,
- mixed damage parts,
- Deflectable vs non-deflectable damage parts,
- Energy aliases such as Sonic,
- stun/ion/lethal mode context from weapon UI into damage resolution.

Current classification: **good label foundation, unsafe special-damage fidelity, needs damage packet model before implementation fixes.**

## Current code inventory

### Damage type storage and editing

Evidence found:

- `scripts/items/weapon-data-resolver.js` exposes damage type options for the entity item dialog.
- `templates/dialogs/entity/parts/body-weapon.hbs` renders the item editor damage type select.
- `scripts/items/item-defaults.js` normalizes blank weapon damage types.
- `scripts/ui/weapon-config-dialog.js` has a separate older weapon config dialog with a smaller/different damage type list.
- `templates/items/base/item-sheet-old.hbs` has an even older selector with only Energy/Kinetic/Ion.

Concern:

There is not a single canonical damage type registry. UI paths disagree about available damage types:

- item entity dialog includes `energy`, `kinetic`, `sonic`, `ion`, `fire`, `cold`, `acid`, `force`, `stun`;
- older weapon config includes `kinetic`, `energy`, `fire`, `cold`, `acid`, `sonic`, `force`;
- old item sheet includes only `energy`, `kinetic`, `ion`.

This is a rules-semantics risk because the supplied rules distinguish Bludgeoning, Piercing, Slashing, Electrical, Sonic, Stun, Ion, Fire, Acid, Energy, and Force. The repo currently uses `kinetic` heavily as a collapsed bucket, while some data also contains `bludgeoning`, `piercing`, and `slashing`.

### Attack and damage context transport

Evidence found:

- `scripts/combat/rolls/attacks.js` builds `damageType` and `damageTypes` context from weapon system data.
- Damage chat posting includes a `damageType` value.
- `scripts/combat/rolls/damage.js` posts damage with `damageType`, but most special context from the attack is not preserved in the final damage application path.
- `SWSEActorBase.applyDamage()` passes `options.damageType || options.type || 'normal'` into `ActorEngine.applyDamage()`.
- `ActorEngine.applyDamage()` calls `DamageResolutionEngine.resolveDamage()` with `damageType`.
- `DamageResolutionEngine.resolveDamage()` passes `damageType` into mitigation and passes `isStun` / `isIon` booleans to `ThresholdEngine.evaluateThreshold()`.

Good:

The basic type plumbing exists.

Gap:

A single `damageType` string is not enough for the special rules in this phase. Stun and Ion both need one rolled amount but two derived values:

- HP damage is halved.
- Threshold damage is original/pre-halved.

Sonic can be both Sonic and Energy. Mixed attacks can have one deflectable part and one non-deflectable Sonic part. Fire and Acid can create recurring hazards after the initial damage. Force immunity can depend on both damage/effect type and target defense.

### Damage mitigation

Evidence found:

- `DamageMitigationManager` applies SR -> DR -> Temp HP -> HP.
- `DamageReductionResolver` receives `damageType`, `damageTypes`, weapon data, traits, and properties as context.
- `DamageReductionResolver` can match item rules against damage types.
- `DamageReductionResolver` treats lightsabers as DR bypassing.
- `ImmunityResistanceAdapter` displays immunities/resistances, but is display-only.

Good:

Type-specific DR/resistance has an intended hook in `DamageReductionResolver`.

Gap:

The immunity/resistance adapter is display-only and does not enforce immunities. I did not find a general immunity gate in the core damage resolution path for Stun immunity, Force immunity, ordinary-organic Ion special-effect immunity, Sonic Deflect behavior, or Fire/Acid recurring hazard creation.

### Recurring damage / hazards

Evidence found:

- `scripts/engine/effects/adapters/recurring-damage-adapter.js` reads `actor.flags.swse.pendingRecurringDamage` and displays cards.
- The adapter is explicitly display-only and does not resolve, consume, or mutate recurring damage entries.

Good:

There is a display slot for pending recurring damage/hazard cards.

Gap:

I did not find a canonical Fire/Acid hazard engine that creates and resolves start-of-turn hazard attacks from Fire or Acid damage. Fire and Acid can probably be represented manually as pending recurring damage, but the initial damage path does not appear to automatically create the recurring hazard packet.

## Rule-by-rule audit

### Fire damage

Rule baseline supplied:

- A creature, Droid, or object that takes Fire damage catches fire.
- Fire hazard attack: `+5 vs Fortitude`.
- Fire damage: `1d6 Fire`, half damage on miss.
- Recurs each round at the start of the target's turn until extinguished.
- A creature can put out flames as a Full-Round Action.

Current system concern:

The repo has Fire as a damage type, and Fire weapons/templates exist, but Fire damage does not appear to create a Burning/Fire hazard state automatically. The recurring damage adapter can display pending recurring damage, but it is not the resolver.

Recommended automation boundary:

- Automate creation of a **Burning** pending recurring hazard when Fire damage is applied.
- Automate the default hazard attack card and action reminder.
- GM adjudicates edge cases such as vacuum, water, fireproof environments, and special extinguishing methods.

### Acid damage

Rule baseline supplied:

- Contact with Acid triggers a hazard.
- Acid hazard attack: `+4 vs Fortitude`.
- Acid damage: `2d10`, half damage on miss.
- Recurs each round at the start of the target's turn until washed off or treated.
- Treat Injury DC 14 with a medical kit can treat Acid.

Current system concern:

Acid exists as a weapon damage type option and appears in data, but I did not find a canonical Acid hazard state/resolver. The same display-only recurring damage adapter could display it after another system creates it.

Recommended automation boundary:

- Automate creation of an **Acid** pending recurring hazard when an Acid contact/hazard packet applies.
- Provide Treat Injury DC and removal note.
- GM adjudicates whether acid can be washed off or neutralized.

### Sonic damage

Rule baseline supplied:

- Sonic is considered Energy damage in all ways.
- Ranged Sonic weapons cannot be Deflected by a lightsaber.
- If a weapon adds bonus Sonic damage to non-purely-Energy damage, Deflect can stop the deflectable normal damage, but the Sonic bonus still applies if the attack would normally hit.

Current system concern:

The repo has `sonic` damage type data and several Sonic weapons/effects. However:

- I did not find a clear `sonic counts as energy` alias in the damage mitigation or reaction stack.
- `ReactionRegistry.deflect` currently has `validDamageTypes: null`, so availability is not restricted by Sonic.
- I did not find packet-level support for mixed damage where one part is deflected and one Sonic bonus part still applies.

Recommended automation boundary:

- Automate: Sonic counts as Energy for mitigation/effects that care about Energy.
- Automate: Pure ranged Sonic attacks are not Deflect-eligible.
- Assist/Automate later: mixed damage needs a multi-part damage packet. If Deflect succeeds, only deflectable parts are negated; Sonic bonus damage remains if the attack hit.

### Force damage

Rule baseline supplied:

- Force damage/effects can have target-specific immunities.
- Yuuzhan Vong are immune if the Force effect targets Will Defense.

Current system evidence:

- Yuuzhan Vong species data includes Force Immunity wording.
- `ReactionRegistry` has at least one reaction keyed to valid damage type `force`.
- Force powers appear to have their own roll/effect path separate from weapon damage.

Current system concern:

I did not find a reliable core damage-resolution gate that checks:

- target has Yuuzhan Vong Force Immunity,
- incoming effect is a Force effect,
- the effect targets Will Defense,
- therefore the target is immune.

This is not merely `damageType === 'force'`; it is a compound context rule.

Recommended automation boundary:

- Automate if force powers already provide target defense and effect source context.
- Otherwise classify as GM-assisted with a prominent immunity reminder until the force-power context is normalized.

### Stun damage

Rule baseline supplied in earlier phase and reaffirmed in this phase:

- Stun deals half damage to HP if the target is a creature.
- No damage to non-creature targets unless another rule says otherwise.
- Damage Threshold check uses original Stun damage before halving.
- If original Stun damage equals/exceeds DT, target moves `-2` CT.
- If Stun damage reduces HP to 0, target moves to the bottom of the CT and is unconscious.

Current system concern:

`DamageResolutionEngine` passes `isStun` to `ThresholdEngine`, and `ThresholdEngine` has a stun-specific branch gated by a setting. However, the damage pipeline still appears to use one damage number for HP, mitigation, and threshold. That is not enough for RAW Stun unless the caller pre-halves HP damage while also passing original damage for threshold.

Recommended automation boundary:

Automate Stun as a special damage packet:

```js
{
  damageType: "stun",
  originalDamage: rolledTotal,
  hpDamage: Math.floor(rolledTotal / 2),
  thresholdDamage: rolledTotal,
  eligibleTarget: targetIsCreature,
  nonCreatureEffect: "no-damage"
}
```

The Lethal/Stun selector requested in 0E is necessary so this context is not lost before damage resolution.

### Ion damage

Rule baseline supplied:

- Successful Ion hit applies half Ion damage to HP.
- Original Ion damage before halving is compared to DT.
- Ordinary living creatures without cybernetics take the singe/HP damage but no other special effects.
- Droids, vehicles, electronic devices, and cybernetic creatures can suffer special Ion effects.
- If Ion damage reduces HP to 0, eligible targets move `-5` CT and are disabled/unconscious.
- If original Ion damage equals/exceeds DT, eligible targets move `-2` CT.

Current system concern:

0F already identified the major Ion seam. This phase confirms the same broader packet problem: Ion cannot be modeled safely with a single damage number and a single `damageType` string.

Recommended automation boundary:

Automate when target category/cybernetic status is known; otherwise assist with a target eligibility prompt/reminder.

### Bludgeoning / Piercing / Slashing

Rule baseline supplied:

These are physical damage types with examples such as unarmed attacks, slugthrowers, blades, and explosives.

Current system concern:

The repo mostly uses `kinetic`, but some data already uses `bludgeoning`, `piercing`, and `slashing`, especially natural weapons and species-derived attacks. This means the system currently has a mixed vocabulary.

Risk:

If a feat, armor, DR, resistance, or special effect cares about Piercing/Slashing/Bludgeoning specifically, collapsing to `kinetic` loses fidelity. Conversely, if code only recognizes `kinetic`, specific physical types can fail to match mitigation rules.

Recommended automation boundary:

Create a canonical damage type registry with aliases:

- `kinetic` should probably be a broad category, not a RAW replacement.
- `bludgeoning`, `piercing`, and `slashing` should remain distinct where rules need distinction.

### Electrical damage

Rule baseline supplied:

Electrical is a distinct damage type with examples such as power diffusion tunnels and shock locks.

Current system concern:

I did not find `electrical` or `electricity` in the canonical weapon item damage type options. This is a data/UI gap. Some imported text may include electrical effects, but the item editor does not expose it as a first-class type.

Recommended automation boundary:

Add Electrical to the canonical damage type registry when implementation begins. Do not alias it silently to Energy unless a rule specifically says so.

### Energy damage

Rule baseline supplied:

Energy covers blasters, Bryar rifles, lightsabers, and similar attacks. Sonic is considered Energy in all ways.

Current system concern:

Energy is heavily represented in data. The risk is not absence of Energy, but lack of a formal alias system for Sonic-as-Energy and mixed damage.

## Key architectural issue: damage packet model

The biggest 0G finding is that special damage cannot be safely implemented with only:

```js
{ amount: number, type: string }
```

Future implementation needs something closer to:

```js
{
  originalDamage: 22,
  hpDamage: 11,
  thresholdDamage: 22,
  parts: [
    {
      formula: "3d8",
      amount: 17,
      type: "energy",
      tags: ["weapon"],
      canBeDeflected: true,
      countsAs: ["energy"]
    },
    {
      formula: "1d6",
      amount: 5,
      type: "sonic",
      tags: ["bonus"],
      canBeDeflected: false,
      countsAs: ["sonic", "energy"]
    }
  ],
  special: {
    halfHpDamage: true,
    thresholdUsesOriginal: true,
    targetEligibility: "droid-vehicle-device-cybernetic",
    recurringHazard: null
  }
}
```

Without this, Stun, Ion, Sonic, Fire, Acid, Evasion, Burst Fire, Deflect, DR/resistance, and Force immunity will keep fighting each other through lost context.

## Recommended classification

| Rule area | Classification | Reason |
|---|---|---|
| Damage type label display | Partially implemented | Weapon/item data exposes type labels |
| Type-specific DR | Partially implemented | Resolver has matching hooks |
| Immunities | Mostly display/unclear | Adapter displays, core damage gate not found |
| Stun | Not RAW-safe | Needs HP/threshold split and target gating |
| Ion | Not RAW-safe | Needs HP/threshold split and eligible target gating |
| Fire | Not RAW-complete | Needs recurring Burning hazard creation/resolution |
| Acid | Not RAW-complete | Needs recurring Acid hazard creation/resolution |
| Sonic | Not RAW-safe | Needs Energy alias and Deflect bypass/mixed packet support |
| Force/Yuuzhan Vong | Unclear/likely incomplete | Needs Force effect + Will target context |
| Physical subtypes | Inconsistent vocabulary | `kinetic` coexists with RAW subtypes |
| Electrical | Missing first-class UI/type | Not in main weapon damage type options |

## Recommended later phase placement

- Canonical damage type registry: Phase 9 before damage authority cleanup completes.
- Damage packet model: Phase 9, mandatory before Stun/Ion/Sonic fixes.
- Stun/Ion split-damage implementation: Phase 9.
- Sonic/Deflect mixed packet implementation: Phase 9 or dedicated reaction phase.
- Fire/Acid recurring hazard creation: Phase 8 or Phase 9, depending on whether hazards are Active Effects or combat states.
- Force/Yuuzhan Vong immunity: force-power audit phase or Phase 9 if force damage is integrated into damage packets.
