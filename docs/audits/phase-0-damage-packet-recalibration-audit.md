# Phase 0 Damage Packet Recalibration Audit

Date: 2026-07-13  
Scope: research only; no runtime changes.  
Status: implementation planning input for canonical damage packet builders and attack-shape recalibration.

## Goal

Recalibrate every damage-producing family so it speaks one canonical packet language instead of inventing separate damage pipelines.

Core rule:

```text
One packet shape.
Many source-specific builders.
One mitigation pipeline.
No parallel damage paths.
```

This audit covers:

- character weapons
- vehicle/starship weapons
- Force powers
- racial/natural attacks
- unarmed attacks
- area attacks, including autofire, grenades, splash/burst/cone style effects, and Force/vehicle area effects
- poison only as a boundary note, because poison already has its own schema/engine and should be handled as a later rider pass

## Files and data seams inspected

### Pack declarations

The system manifest declares the relevant item/actor compendiums in separate packs:

- `packs/forcepowers.db`
- `packs/weapons-pistols.db`, `packs/weapons-rifles.db`, `packs/weapons-heavy.db`, `packs/weapons-grenades.db`, `packs/weapons-exotic.db`, `packs/weapons-simple.db`, `packs/weapons-lightsabers.db`, and aggregate `packs/weapons.db`
- vehicle actor packs and `packs/vehicle-weapons.db`
- `packs/combat-actions.db`, `packs/special-abilities.db`, and `packs/ship-combat-actions.db`

### Current schema seams

`template.json` currently gives normal `weapon` items explicit damage fields:

```json
{
  "damage": "1d6",
  "damageType": "energy",
  "autofire": false,
  "meleeOrRanged": "melee",
  "range": "melee"
}
```

But `vehicleWeapon` is much thinner:

```json
{
  "slug": "",
  "damage": null,
  "placementPoints": null,
  "availability": null,
  "cost": null,
  "mountRestriction": null
}
```

And `force-power` currently has no canonical damage profile fields in the base schema. Force-power damage must therefore be derived from force-power metadata, per-power rules text, tags/descriptors, or a curated profile table rather than from a stable schema field.

`poison` already has a distinct schema with attack, damage, condition-track, recurrence, and treatment fields. That supports the decision to defer poison into a later rider/effect pass instead of treating poison as ordinary HP damage by default.

### Current packet infrastructure

The current combat packet builder already contains most of the right primitives:

- `resolveDamagePacketType()` resolves ion/stun first, then options/workflow/rule data, then `weapon.system.damageType`, then `normal`.
- `buildBaseDamagePacket()` records `schema`, `amount`, `rawAmount`, `type`, `damageTypes`, `originalDamageTypes`, `components`, flags, resources, and apply options.
- `buildDamageComponents()` can consume component declarations from options, workflow data, weapon system data, weapon flags, and damage metadata.
- `buildDamageApplyOptions()` forwards `damagePacket` and `damageComponents` into the apply flow.

Separately, the canonical normalizer introduced after PR #892 guarantees that damage application can normalize bare numbers, typed packets, weapon-backed packets, and component arrays into `{ components: [{ amount, type, tags, source }], amount, primaryType }`.

## Key finding

The repo already has the lower-level damage-packet and component plumbing, but the content families are not yet uniformly expressed as packets.

The remaining problem is not mitigation anymore. It is packet production.

```text
Current state:
source data / action workflow / helper call
        ↓
inconsistent damage amount + type + tags
        ↓
packet normalizer saves what it can
        ↓
canonical mitigation
```

Target state:

```text
source family builder
        ↓
complete canonical packet
        ↓
canonical mitigation
```

## Proposed canonical packet contract

Do not create separate packet classes for weapons, Force powers, autofire, poison, etc. Use one packet shape with source-specific profiles/builders.

Recommended v2 contract:

```js
{
  schema: "swse.damage.packet.v2",

  amount: 18,
  rawAmount: 18,
  primaryType: "energy",

  delivery: "weapon",          // weapon | force-power | grenade | unarmed | natural | vehicle-weapon | hazard | poison-rider
  attackShape: "single-target", // single-target | autofire | burst-fire | burst | splash | cone | line | area | aura | self-centered
  scale: "character",           // character | vehicle | starship | mixed

  source: "combat-damage",
  sourceId: null,
  sourceName: "Lightsaber",

  tags: ["weapon", "lightsaber"],

  attack: {
    isArea: false,
    isAutofire: false,
    isBurstFire: false,
    isSplash: false,
    halfDamageOnMiss: false,
    noCriticalDouble: false,
    coverCanNegateMissDamage: false,
    defense: "reflex"
  },

  area: {
    shape: null,
    radius: null,
    size: null,
    originMode: null,
    targetPolicy: null
  },

  components: [
    {
      key: "base-damage",
      label: "Base damage",
      formula: "2d8+5",
      rawAmount: 18,
      amount: 18,
      type: "energy",
      damageTypes: ["energy"],
      originalDamageTypes: ["energy"],
      tags: ["weapon", "lightsaber"],
      source: "Lightsaber",
      sourceId: "weapon-id"
    }
  ],

  riders: [
    // poison, burning, stun condition, ion condition, forced movement, ongoing damage, etc.
  ]
}
```

The existing v1 normalizer can coexist during migration. Source-specific builders should return v2-compatible packets while `buildDamageApplyOptions()` continues to down-convert safely for the current application boundary.

## Source family findings

## 1. Character weapons

### Current data

Weapon item compendiums already store the essential fields:

- `system.damage`
- `system.damageType`
- `system.weaponCategory`
- `system.proficiency`
- range/category/properties/ammunition metadata

Examples from the current pistol pack show slugthrowers using `kinetic` and blasters using `energy`.

### Current code

`resolveDamagePacketType()` already knows how to read weapon damage type after ion/stun and explicit workflow overrides. `buildDamageComponents()` also has source hooks for `system.damageComponents`, `system.typedDamageComponents`, `system.bonusDamageComponents`, and corresponding flags.

### Migration recommendation

Create a formal weapon packet builder that wraps the current lower-level builder:

```js
buildWeaponDamagePacket({ actor, target, weapon, roll, workflowContext, options })
```

It should set:

```js
delivery: "weapon"
attackShape: workflow derived, default "single-target"
tags: ["weapon", proficiency/category/property tags]
components[0].type: weapon.system.damageType
components[0].tags: same plus "lightsaber" or "bypass-dr" where relevant
```

Weapon subclasses should be profiles, not separate schemas:

- lightsaber: `delivery:"weapon"`, `type:"energy"`, tags include `lightsaber`; DR bypass is tag-based, not energy-based.
- slugthrower: `type:"kinetic"`, tags include `slugthrower` if detectable.
- stun weapon mode: explicit workflow override to `type:"stun"`, not a permanent item rewrite.
- ion weapon mode: explicit workflow override to `type:"ion"`.
- grenades remain weapon-backed but use `delivery:"grenade"` or `delivery:"weapon"` + `attackShape:"burst"`; see area section.

### Do not

- Do not infer lightsaber DR bypass from `energy`.
- Do not create `LightsaberDamagePacket` as a parallel schema.
- Do not rewrite all weapon compendium data before the builder/validator exists.

## 2. Vehicle and starship weapons

### Current data

`vehicleWeapon` data is not normalized enough for the canonical packet. The pack uses a single `system.damage` string and no explicit `damageType` field.

Examples:

- laser/blaster weapons: `5d10x2`, `3d10x2`, etc. with no explicit type
- ion weapons: strings like `5d10 (Ion)`, `3d10x5 (Ion)`, `9d10x10 (Ion, Special)`
- missiles/torpedoes/mines: strings like `9d10x2`, `10d10x2`, `Special`, or null
- some weapons are modifiers or launchers rather than damage sources (`+1d10`, `By Weapon`, `Special`, null)

### Migration recommendation

Vehicle weapons need a normalization pass before they can reliably build packets.

Add a parser/helper first:

```js
parseVehicleWeaponDamageSpec("5d10x2 (Ion)")
// → { formula:"5d10", multiplier:2, type:"ion", tags:["vehicle-weapon","ion"] }
```

Recommended normalized fields, either stored in compendium or derived by a builder:

```js
system.damageFormula
system.damageMultiplier
system.damageType
system.damageTags
system.damageSpecial
system.delivery = "vehicle-weapon"
system.scale = "vehicle" | "starship"
```

Classification heuristics should be conservative:

- Explicit `(Ion)` → `type:"ion"`
- names containing laser, blaster, turbolaser, beam, composite beam → likely `energy`
- names containing mass-driver, rail cannon, harpoon → likely `kinetic`
- missiles, torpedoes, mines, bomblets, shells, and ordnance require source-specific mapping, because their damage type and area behavior can vary.
- `Special`, `By Weapon`, null, and `+Xd10` entries should be marked as modifier/special/launcher profiles, not direct damage packets.

### Builder

```js
buildVehicleWeaponDamagePacket({ actor, target, vehicle, weapon, roll, workflowContext, options })
```

Required metadata:

```js
delivery: "vehicle-weapon"
scale: "vehicle" | "starship"
components[0].type: normalized vehicle weapon type
components[0].tags: ["vehicle-weapon", "starship-weapon"?]
```

Vehicle packets must also reserve room for scale, SR, shieldbuster, ion, emplacement, and crew/passenger special cases, but those should not be mixed into the character weapon builder.

## 3. Force powers

### Current data/code

Force powers are declared as item type `force-power`, but the base schema does not define canonical damage fields. The current Force Power Effects Engine is mostly an ActiveEffect/intents engine; it explicitly returns no effect for generic damage powers because damage powers resolve through combat/damage workflows instead of persistent actor effects.

The effect engine currently has special handlers for Force Shield, Energy Resistance, Negate Energy, Force Body, defensive buffs, and other non-instant effects. Damage powers need packet builders, not ActiveEffect writes.

### Migration recommendation

Create a curated Force power damage profile authority:

```text
data/combat/force-power-damage-profiles.json
```

or an equivalent registry module:

```js
ForcePowerDamageProfiles.get(powerSlug)
```

Each damage-capable Force power should declare:

```js
{
  slug: "force-lightning",
  delivery: "force-power",
  attackShape: "single-target" | "cone" | "line" | "burst" | "multi-target",
  defense: "reflex" | "fortitude" | "will",
  components: [
    { type: "electricity", tags: ["force-power", "dark-side"] }
  ],
  riders: []
}
```

Do not default every damaging Force power to `type:"force"`.

Use source text/profile mapping:

- lightning/electrical powers → electricity/energy with Force tags
- telekinetic impact powers → kinetic or force/kinetic depending source text
- mental/mind-affecting powers → usually effect/condition rider, not HP damage
- dark side is a tag/descriptor, not necessarily a damage type
- Force suppression/Yuuzhan Vong behavior may require `delivery:"force-power"`, tag `force`, and defense-target metadata, not just damage type

### Builder

```js
buildForcePowerDamagePacket({ actor, target, power, roll, dcTier, workflowContext, options })
```

Required fields:

```js
delivery: "force-power"
sourceId: power.id
sourceName: power.name
tags: ["force-power", ...power.descriptors/tags]
attack.defense: profile.defense
attackShape: profile.attackShape
components: profile-derived typed components
riders: profile-derived non-HP effects
```

### Do not

- Do not model Force powers as weapon packets.
- Do not model all Force power damage as `force`.
- Do not force ActiveEffect semantics onto instant damage powers.

## 4. Racial/natural attacks

### Current data/code

Species schema includes `naturalWeapons` and existing species audit found only a small number of species with meaningful natural weapon declarations. The prior species audit says the species application path materializes species data through canonical species application and species trait engines, but it still recommends runtime verification that natural weapons actually create usable attacks.

Rules examples confirm that natural weapons can override normal unarmed damage and carry their own type. Examples include claws dealing slashing damage and near-Human Conductive using an energy natural weapon.

### Migration recommendation

Create a natural weapon packet builder:

```js
buildNaturalWeaponDamagePacket({ actor, naturalWeapon, roll, workflowContext, options })
```

Natural weapon profile fields should include:

```js
{
  delivery: "natural",
  attackShape: "single-target",
  type: "slashing" | "piercing" | "bludgeoning" | "energy" | "kinetic",
  tags: ["natural-weapon", "unarmed-compatible"?],
  formula: "1d6+@str.mod"
}
```

If data only says “natural weapon” with no type, default carefully to `kinetic` or `bludgeoning` only for ordinary body/unarmed attacks; do not override explicit slashing/piercing/energy species traits.

## 5. Unarmed attacks

### Rules baseline

The combat summary gives the basic unarmed formula:

- Medium: `1d4 + Strength`
- Small: `1d3 + Strength`
- unarmed attacks provoke unless the attacker has Martial Arts

### Migration recommendation

Create a first-class unarmed packet builder:

```js
buildUnarmedDamagePacket({ actor, roll, workflowContext, options })
```

Defaults:

```js
delivery: "unarmed"
attackShape: "single-target"
components[0].type: "kinetic" or "bludgeoning" depending final type policy
components[0].tags: ["unarmed", "natural-body"]
```

Important: natural weapons are not merely unarmed; they can use the unarmed attack flow but have their own explicit damage formulas/types.

## 6. Area attacks, autofire, grenades, and splash/burst/cone/line effects

### Rules baseline

Area attacks are not a different damage type. They are an attack shape/resolution policy:

- attack roll below 10 automatically misses
- hit targets take full damage
- missed targets take half damage
- natural 20 hits all targets in the area, but area attacks do not deal double damage on a critical hit
- cover can negate damage on a miss
- autofire targets a 2x2 area, normally at a -5 attack penalty and consumes 10 shots
- grenades/explosives use burst radius from a grid intersection
- splash weapons use primary target full/half behavior and adjacent target comparison
- Burst Fire is different: it uses an autofire-capable weapon against one creature, gives +2 weapon dice, uses 5 shots, and is not an area attack

### Migration recommendation

Do not make separate packet schemas for area/autofire/grenades.

Use attack-shape metadata:

```js
attackShape: "autofire" | "burst-fire" | "burst" | "splash" | "cone" | "line" | "area"
attack: {
  isArea: true,
  isAutofire: true,
  halfDamageOnMiss: true,
  noCriticalDouble: true,
  coverCanNegateMissDamage: true,
  defense: "reflex"
}
area: {
  shape: "2x2" | "burst" | "splash" | "cone" | "line",
  radius: 1,
  originMode: "grid-intersection" | "self" | "target-square",
  targetPolicy: "all-in-area" | "primary-plus-adjacent"
}
```

Then produce target-specific packets after hit/miss resolution:

```text
area declaration packet
      ↓ compare attack roll to each target
per-target damage packet with amount already full/half/zero
      ↓ mitigation
```

This keeps SR/DR/immunity/resistance working normally for the amount that actually reaches each target.

### Specific shape profiles

- **Autofire**: weapon delivery, area shape `2x2`, half-on-miss, no crit double, ammo cost 10, tag `autofire`, tag `area`.
- **Burst Fire feat**: weapon delivery, attack shape `burst-fire`, single target, not area, +2 weapon dice, ammo cost 5, tag `burst-fire`, no Evasion.
- **Grenade/explosive burst**: delivery `grenade`, attack shape `burst`, origin grid intersection, full/half target policy.
- **Splash weapon**: delivery `weapon` or `grenade`, attack shape `splash`, primary target full/half, adjacent targets half/no damage depending hit comparison.
- **Cone/line Force power or weapon**: delivery stays `force-power` or `weapon`, attack shape `cone`/`line`, area metadata defines geometry; packet components still carry damage type.

## 7. Poison boundary

Poison should not be part of this pass.

The schema already supports poison as its own item type with attack, damage, condition-track, recurrence, treatment, and talent hooks. Most poison should become a packet rider/effect, not a normal HP damage type.

Example future model:

```js
{
  delivery: "weapon",
  components: [
    { amount: 8, type: "piercing", tags: ["weapon"] }
  ],
  riders: [
    {
      kind: "poison",
      defense: "fortitude",
      effect: "condition-track",
      steps: -1,
      recurrence: "per-poison-schema"
    }
  ]
}
```

Only use `type:"poison"` if a source explicitly deals poison HP damage.

## Implementation roadmap from this audit

### Phase 1 — Packet contract hardening

- Update docs for `swse.damage.packet.v2`.
- Add optional fields to packet builder output: `delivery`, `attackShape`, `scale`, `attack`, `area`, `riders`.
- Keep v1 compatibility in `ActorEngine.applyDamage` and `DamageSystem.applyPacketToActor`.

### Phase 2 — Weapon packet builder

- Add `buildWeaponDamagePacket()` over current packet builder.
- Route chat damage/apply and `rollAndApplyDamage()` through packet apply options.
- Preserve `weapon.system.damageType` and tags for all normal weapon paths.
- Add lightsaber/weapon property tagging.

### Phase 3 — Area attack shape builder

- Add `buildAreaDamagePacket()` or `applyAreaDamageProfile()` that produces target-specific packets.
- Model autofire, grenades, splash, cone, line, and Burst Fire as shape metadata.
- Confirm Evasion and cover hooks consume `attack.isArea`/`attackShape`, not raw weapon names.

### Phase 4 — Vehicle weapon normalization

- Add parser for `vehicleWeapon.system.damage` strings.
- Classify explicit `(Ion)` and obvious laser/blaster/turbolaser energy weapons.
- Flag special/null/launcher/modifier rows for manual handling.
- Add `buildVehicleWeaponDamagePacket()`.

### Phase 5 — Force power damage profiles

- Add curated profile registry for damaging Force powers.
- Map power slug/name to delivery, attack shape, defense, damage components, and riders.
- Do not default all Force powers to `force`.
- Keep persistent Force effects in `ForcePowerEffectsEngine`; route instant damage through packet builder.

### Phase 6 — Unarmed and natural attack profiles

- Add `buildUnarmedDamagePacket()` and `buildNaturalWeaponDamagePacket()`.
- Verify species natural weapons create usable attack/damage actions.
- Preserve explicit slashing/piercing/energy natural weapon types.

### Phase 7 — Riders/effects pass

- Integrate poison, burning, acid recurrence, stun/ion condition riders, forced movement, ongoing damage.
- Keep poison engine as authority for poison recurrence/treatment.

### Phase 8 — Validators

Add validators to catch data drift:

- weapon has no damage type
- lightsaber lacks lightsaber tag/profile
- vehicle weapon has parseable damage but no type/profile
- Force damage power lacks profile
- area attack lacks attack shape
- autofire-capable weapon lacks autofire capability/profile
- natural weapon lacks formula/type
- poison modeled as HP damage without explicit source support

## High-risk edges

1. **Vehicle weapons** are the biggest data-normalization gap. Their damage strings are not a safe long-term schema.
2. **Force powers** need source-curated profiles. Guessing would be worse than leaving them manual.
3. **Area attack resolution** must produce per-target packets after hit/miss/cover calculations, not one shared area packet applied to everyone.
4. **Poison/effect immunity** must stay out of damage-type immunity unless a source creates an actual damage component.
5. **Legacy bare-number helpers** still exist and should be routed through packet apply as soon as source-specific builders are available.

## Decision summary

Proceed with recalibration, but do it in this order:

```text
1. Formal packet contract
2. Character weapon packet builder
3. Area/autofire/grenade shape profiles
4. Vehicle weapon normalization + builder
5. Force power damage profile registry
6. Unarmed/natural builders
7. Riders/effects
8. Validators
```

This makes weapon damage reliable first, then solves shape/area behavior, then addresses the two content-heavy families: vehicle weapons and Force powers.
