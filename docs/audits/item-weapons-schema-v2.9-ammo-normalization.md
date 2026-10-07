# Weapon Authority Schema v2.9 - Ammo, Shot Capacity, and Payload Separation

**Status:** `WEAPON_AUTHORITY_SCHEMA_V2_9_AMMO_PAYLOAD_SEPARATION`  
**Scope:** all **209** certified Phase 2 weapon source claims  
**Purpose:** make ammunition type, shot capacity, and launcher/payload ownership explicit before the 203-identity Phase 3 merge  
**Production mutation:** **NOT AUTHORIZED**

## Why this exists

SWSE usually does **not** put ammunition capacity in the weapon stat table. The weapon's descriptive text commonly establishes facts such as:

- requires a **Power Pack**;
- requires an **Energy Cell**;
- after **50 shots** the pack must be replaced;
- a cartridge holds **2 shots**;
- a magazine holds **4 missiles**;
- a launcher accepts grenades, rockets, darts, missiles, or another separately defined weapon/payload.

Therefore table silence must never be treated as ammo silence.

The description and explicit ammunition/payload blocks are the authority for ammo type and capacity.

---

# Core architectural rule

> **The weapon owns the attack. The loaded ammunition may own the payload.**

Example runtime concept:

```text
Kira fires Grenade Launcher
  -> Grenade Launcher supplies proficiency, range, attack configuration, capacity/reload
  -> loaded ammo = Frag Grenade
  -> Frag Grenade supplies damage, damage type, burst area and payload effects
```

A launcher must not be assigned the frag grenade's damage as permanent launcher base damage.

This same pattern applies to grenade launchers, micro grenade launchers, missile launchers, wrist rocket launchers, dart launchers and other delivery systems.

---

# `canonicalStats.ammo`

Pure melee / non-ammunition identities:

```json
"ammo": null
```

Do **not** create fake `capacityShots: 0` fields for melee weapons.

Ordinary ranged example:

```json
"ammo": {
  "mode": "single",
  "status": "established",
  "required": true,
  "type": "power-pack",
  "capacityShots": 100,
  "capacityUnit": "shots",
  "consumesPerAttack": 1,
  "reloadAction": "replace-pack",
  "replaceable": true,
  "integrated": false,
  "rechargeable": null,
  "acceptedPayloadFamily": null,
  "acceptedAmmoIdentities": [],
  "damageSource": "weapon",
  "payloadDerived": false,
  "sourceStatus": "published-description"
}
```

## Field meanings

### `mode`

Allowed authority patterns include:

```text
single
multiple
unknown
self-contained
self-contained-payload
```

### `status`

```text
established
partially-established
not-stated
self-contained
```

### `type`

The published ammunition/container identity when established, for example:

```text
power-pack
energy-cell
ammo-clip
cartridge
flechette-canister
harpoon
missile
grenade
rocket
dart
bolt-case
gas-canister
```

Do not substitute a generic type when the source gives a specific one.

### `capacityShots`

The **maximum published loaded/pack capacity**.

It is not mutable runtime state.

Never store current remaining ammunition here.

Runtime-only concepts include:

```text
currentShots
loadedAmmoRef
loadedAmmoQuantity
chamberedPayloadRef
```

### `capacityUnit`

Usually `shots`, but the field exists so a source-defined capacity can remain semantically correct when the container holds missiles, grenades, cartridges, or other units.

### `consumesPerAttack`

Normal attack expenditure when the source establishes it.

Special attack/mode expenditure still belongs in the relevant attack-profile resource-consumption structure where needed.

### `reloadAction`

Source-defined reload/replace behavior such as:

```text
replace-pack
replace-cell
replace-canister
move
swift
full-round
reload-between-each-shot
```

Use the normalized vocabulary adopted by the authority, while preserving the source rule in notes where necessary.

---

# Multiple independent ammunition systems

Some weapons use more than one independent ammo/power system.

Use `mode: "multiple"` and preserve `resourceProfiles[]` / ammo profiles.

Example: **SG-4 Blaster Rifle**

```text
blaster mode  -> standard 50-shot Power Pack
harpoon mode  -> one harpoon loaded at a time; swift-action reload between shots
```

Example: **Energy Lance**

```text
weapon operation/melee system -> two Energy Cells
plasma-bolt ranged mode        -> separate Power Pack, blaster-carbine capacity
```

An operating power source is not automatically the same thing as expendable ranged ammunition. This is why v2.9 does **not** delete `canonicalStats.resource` or `resourceProfiles`.

---

# Delivery-system / payload-derived weapons

Use:

```json
{
  "damageSource": "loaded-ammo",
  "payloadDerived": true
}
```

when the loaded payload supplies the attack's damage/effect.

If the launcher modifies the payload, use:

```text
loaded-ammo-modified-by-weapon
```

rather than copying the modified payload into launcher base damage.

## Grenade Launcher

The launcher provides the delivery attack. The loaded grenade provides the payload rule.

## Micro Grenade Launcher

The loaded grenade supplies its normal effect, while the launcher applies its certified **-2 damage-dice** transformation. This is:

```text
damageSource = loaded-ammo-modified-by-weapon
```

## Light Concussion Missile Launcher

The launcher has no intrinsic `4d10x2` base damage.

The **Light Concussion Missile** payload supplies:

```text
4d10 x2 Slashing
2-square splash
```

The launcher supplies firing restrictions, attack modifiers, range/use rules and ammo consumption.

## Wrist Rocket Launcher

The launcher owns the attack/delivery system; the seven published rocket payload profiles own their individual damage, type, area and special effects.

---

# Damage ownership vocabulary

`damageSource` supports:

```text
weapon
loaded-ammo
loaded-ammo-modified-by-weapon
mixed
```

### `weapon`

The weapon chassis itself supplies the canonical damage expression.

### `loaded-ammo`

The selected ammunition/payload supplies damage and effects.

### `loaded-ammo-modified-by-weapon`

Payload supplies the underlying damage/effect; the weapon applies a certified transformation.

### `mixed`

Use only where the published rule genuinely creates simultaneous weapon-owned and payload-owned components.

---

# `payloadProfiles[]`

Payload profiles remain subordinate to the delivery weapon unless the ammunition is independently published as its own canonical weapon/item identity.

v2.9 also permits:

```text
canonicalStats.payloadProfiles[].damageMultiplier
```

with default `1`, needed for payload-owned multiplier damage such as the Threats of the Galaxy Light Concussion Missile.

Do not flatten `4d10x2` into the launcher's persistent base damage.

---

# Unknown / not stated ammo

When the source truly does not establish ammo type or capacity, say so explicitly.

Example pattern:

```json
"ammo": {
  "mode": "unknown",
  "status": "not-stated",
  "required": null,
  "type": null,
  "capacityShots": null,
  "capacityUnit": null,
  "consumesPerAttack": null,
  "reloadAction": null,
  "replaceable": null,
  "integrated": null,
  "rechargeable": null,
  "acceptedPayloadFamily": null,
  "acceptedAmmoIdentities": [],
  "damageSource": "weapon",
  "payloadDerived": false,
  "sourceStatus": "not-stated-by-source"
}
```

Do not infer a generic Power Pack merely because another blaster uses one.

---

# Normalization totals

The v2.9 overlay covers exactly:

```text
209 source claims
12 sourcebooks
```

Current overlay summary:

```text
89 claims with explicit capacityShots
20 claims with unknown/not-stated capacity
76 claims with ammo:null
4 claims with multiple ammo profiles
21 self-contained ranged entries
```

These are source-claim counts, not unique-identity counts. Phase 3B collapses the six cross-published duplicate claims to the final **203 identities**.

---

# Required verifier rules

Claude's verifier should prove:

1. all **209** Phase 2 source claims have exactly one v2.9 ammo overlay entry;
2. melee/non-ammo claims do not receive fake zero capacities;
3. every explicit source capacity is preserved exactly;
4. not-stated remains not-stated rather than being filled from repo defaults;
5. multiple-resource weapons retain independent systems;
6. delivery launchers do not own payload damage unless the source explicitly says so;
7. payload-derived attacks select payload authority before launcher-specific transforms;
8. runtime mutable ammunition state is absent from canonical authority;
9. Phase 3B identity merge preserves ammo semantics when 209 claims collapse to 203 identities;
10. no production pack or runtime mutation occurs during authority normalization.

---

# Guardrails

- Source descriptions and explicit ammo blocks outrank the current repository.
- Table silence does not imply no ammo.
- Do not infer ammo from another weapon family member.
- Do not delete operating-power resource fields just because `ammo` now exists.
- Do not convert a payload into intrinsic launcher damage.
- Do not store current remaining shots in canonical authority.
- Do not mutate `packs/weapons.db`, `template.json`, runtime code, tags, actors, feats or talents in the v2.9 authority pass.
