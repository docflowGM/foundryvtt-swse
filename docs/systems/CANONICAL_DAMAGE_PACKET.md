# Canonical Damage Packet — v2 Contract

Status: **Phase 1 (Hard) — contract locked, runtime still emits v1**
Owner: damage/mitigation pipeline
Related:
- `docs/audits/phase-0-damage-packet-recalibration-audit.md` (Phase 0 research this contract implements)
- `scripts/engine/combat/canonical-damage-packet.js` (v1 normalizer — current runtime)
- `scripts/engine/combat/damage-packet-builder.js` (v1 builder — current runtime)
- `scripts/engine/combat/damage-profile-registry.js` (profile registry — this phase)
- `docs/audits/phase-3-canonical-damage-packet-design.md` (v1 design)
- `docs/audits/generated/damage-profile-audit.md` (generated compendium audit)

## Principle

There is **one packet shape, many source-specific profiles/builders, one
mitigation pipeline**. Weapons, Force powers, autofire, grenades, vehicle
weapons, natural attacks, hazards — all of them describe *how they build a
packet* via a **damage profile**; none of them get their own packet schema or
a parallel damage path.

The locked mitigation order (D4/D4A sign-off) is unchanged by this contract:

```
Shield Rating → Immunity → Damage Reduction → Typed Resistance → Temp HP → HP
→ special ion/stun/scale handling
```

## Packet v2 shape

```js
{
  schema: "swse.damage.packet.v2",

  // Totals
  amount,          // number — post-disposition total (sum of component amounts)
  rawAmount,       // number — pre-multiplier rolled total
  primaryType,     // string — canonical damage type of the dominant component

  // Source-family axes (orthogonal — see below)
  delivery,        // "weapon" | "unarmed" | "natural" | "grenade" | "force-power"
                   // | "vehicle-weapon" | "hazard" | "poison-rider"
  attackShape,     // "single-target" | "autofire" | "burst-fire" | "burst"
                   // | "splash" | "cone" | "line" | "area" | null
  scale,           // "character" | "vehicle" | "starship" | "mixed"

  // Provenance
  source,          // string — action/effect key or free-form source label
  sourceId,        // string|null — originating document id (item, power, hazard)
  sourceName,      // string — human label for chat/log output

  tags: [],        // rule hooks: "lightsaber", "weapon", "autofire", "area",
                   // "grenade", "explosive", "force-power", "natural-weapon",
                   // "unarmed", "natural-body", "bypass-dr", "legacy", …

  attack: {
    isArea,                    // boolean — area attack rules apply (Evasion, cover)
    isAutofire,                // boolean
    isBurstFire,               // boolean — single-target autofire variant, NOT area
    isSplash,                  // boolean — primary target + adjacent
    halfDamageOnMiss,          // boolean — area-attack miss rule
    noCriticalDouble,          // boolean — area attacks do not double on nat 20
    coverCanNegateMissDamage,  // boolean — improved/total cover can zero miss damage
    defense                    // "reflex" | "fortitude" | "will" | null
  },

  area: {
    shape,        // "burst" | "cone" | "line" | "splash" | "2x2" | null
    radius,       // number|null — squares
    size,         // number|null — cone/line length in squares
    originMode,   // "grid-intersection" | "self" | "target-square" | null
    targetPolicy  // "all-in-area" | "primary-plus-adjacent" | "single" | null
  },

  components: [
    {
      key,                  // stable component key ("base", "bonus-dice", rider key…)
      label,                // human label for the damage log
      formula,              // string|null — dice expression that produced it
      rawAmount,            // number — rolled amount before disposition multiplier
      amount,               // number — amount entering mitigation
      type,                 // canonical damage type (see vocabulary below)
      damageTypes,          // string[] — expanded canonical types (alias expansion)
      originalDamageTypes,  // string[] — as authored, pre-normalization
      tags,                 // component-level rule hooks
      source,               // string — component provenance
      sourceId              // string|null
    }
  ],

  riders: []      // secondary effects resolved AFTER HP application:
                  // poison, disease, burning/ongoing damage, ion CT, stun CT,
                  // forced movement, grab/grapple, condition riders.
                  // Riders are NOT damage components and never enter the
                  // SR/immunity/DR/resistance math themselves.
}
```

### Orthogonal axes — do not conflate

| Axis | Question it answers | Examples |
|---|---|---|
| **damage type** (`components[].type`) | *what the damage is* | energy, kinetic, ion, stun, fire, cold, acid, sonic, electricity |
| **delivery** | *how it is delivered* | weapon, unarmed, natural, grenade, forcePower, vehicleWeapon |
| **attackShape** | *target geometry / resolution* | single, autofire, burst-fire, burst, splash, cone, line |
| **tags** | *rule hooks* | lightsaber (bypasses DR), autofire, area, force-power, dark-side |
| **riders** | *secondary effects* | poison, ion CT step, stun CT step, burning, forced movement |

Concretely:

- **Lightsaber** is a *tag*, not a damage type. A lightsaber deals `energy`
  damage; the `lightsaber` tag is what bypasses DR. It does **not** bypass
  energy resistance or immunity.
- **Dark side** is a *tag* on Force-power packets, never a damage type.
- **Force** is a descriptor, not a default: Force Lightning deals
  `electricity`/`energy` damage with a `force-power` tag; telekinetic impacts
  deal `kinetic` (or are `manualRequired` if the source is unclear). Nothing
  defaults to type `"force"`.
- **Ion / stun** are damage types whose *condition-track* consequences are
  riders (`ion-ct`, `stun-ct`), so the CT step never double-counts inside
  mitigation.
- **Poison** is always a rider. The existing poison engine/schema is the
  authority; poison never becomes an HP damage component unless the printed
  source explicitly deals HP damage. (Poison rider wiring is a later phase.)

### Canonical damage-type vocabulary

The type vocabulary and alias semantics are owned by
`scripts/engine/combat/damage-type-rules.js` (`normalizeDamageTypeKey`,
`DamageTypeRules.matches`). Canonical keys:

```
kinetic  energy  fire  cold  electricity  acid  sonic  ion  stun  normal
```

Authored aliases (`piercing`, `slashing`, `bludgeoning` → kinetic; `laser`,
`blaster`, `lightsaber` → energy; `heat`/`flame` → fire; …) are preserved in
`originalDamageTypes` and expanded into `damageTypes`. Immunity, DR
exceptions, and typed resistance all match through `DamageTypeRules.matches`
with identical alias semantics.

## v1 → v2 delta

The current runtime emits `swse.damage.packet.v1`
(`damage-packet-builder.js`) plus a minimal normalized shape
(`canonical-damage-packet.js`). v2 is a strict superset:

| v2 field | v1 status |
|---|---|
| `delivery`, `attackShape`, `scale` | new — currently implicit in flags/context |
| `attack.*` | exists scattered in `flags`/`disposition` (`areaAttack`, `autofire`, `burstFire`, `halfDamageOnMiss`) — v2 groups them |
| `area.*` | new — currently only `areaAttack` boolean exists |
| `riders` | new — recurring damage/ion/stun handled ad hoc today (`recurringDamage`, `flags.ion`, `flags.stun`) |
| `components[].key/label/formula/rawAmount` | partially present (component rules emit label/amount/type) |
| everything else | already in v1 |

Migration rule: **v2 fields are additive.** Consumers must tolerate their
absence (v1 packets) and producers move family-by-family as their profile
data is verified by the audit (see below). No consumer may branch on
`schema` for behavior other than defaulting missing fields.

## Damage profiles

A **profile** is data that tells the packet builder how a source family fills
in the v2 axes. Profiles live in `data/combat/damage-profiles.*.json`
(validated by `data/combat/damage-profiles.schema.json`) and are served by
`scripts/engine/combat/damage-profile-registry.js`.

Normalized profile shape:

```js
{
  sourceType,    // "weapon" | "vehicleWeapon" | "forcePower" | "naturalWeapon"
                 // | "unarmed" | "areaProfile"
  slug,          // stable key
  name,
  delivery,
  attackShape,
  scale,
  primaryType,
  tags,
  attack,        // partial attack block (merged over defaults)
  area,          // partial area block
  components,    // component templates (formula-level, not rolled)
  riders,
  confidence,    // "verified" | "inferred" | "manualRequired"
  notes: []
}
```

`confidence` is the wiring gate:

- **verified** — safe to wire into runtime behavior.
- **inferred** — generated from pack metadata/name heuristics; needs a human
  pass before behavior depends on it.
- **manualRequired** — the printed source must be consulted; the registry
  will serve it for auditing but runtime wiring must refuse it.

## Compendium audit

`tools/audit-damage-profiles.mjs` scans the DB packs and regenerates:

- `docs/audits/generated/damage-profile-audit.json`
- `docs/audits/generated/damage-profile-audit.md`

Run with:

```
node tools/audit-damage-profiles.mjs
```

The report classifies every damage-producing source family
(character weapons, vehicle/starship weapons, Force powers, unarmed,
natural/racial attacks, area/autofire/grenade shapes) into
`safeToWire` / `inferredButNeedsReview` / `manualRequired`, and runs the
Part-9 validators (weapon with damage but no type, lightsaber without
lightsaber tag, area attack without shape, …) as warnings that can later be
promoted to CI failures via `tools/ci-smoke-check.mjs`.

## Non-goals of this phase

- No combat-outcome changes. The registry and profiles are not consulted by
  the runtime damage path yet.
- No poison implementation (rider pass later; existing poison engine stays
  the authority).
- No token geometry — `area.*` is profile/context metadata only.
- No compendium pack rewrites.
- Force Shield / (Force) Energy Resistance / Negate Energy remain
  effect/mitigation flows, never instant damage packets. Force Weapon stays
  deferred.
