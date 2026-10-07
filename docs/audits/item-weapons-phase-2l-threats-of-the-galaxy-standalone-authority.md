# Threats of the Galaxy Weapons - Phase 2L Standalone Book Authority

**Repo files:** `data/audits/item-weapons-phase-2l-threats-of-the-galaxy-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1 and the schema v2.9 contract.

**Status:** `THREATS_OF_THE_GALAXY_PHASE_2L_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 4 certified Threats of the Galaxy character-scale weapon claims only. It does not authorize production mutation or a rolling-authority merge.

## Acceptance totals

- Source claims: **4**
- Repo-present: **3**
- Repo-missing: **1**
- Melee claims: **2**
- Ranged claims: **2**
- Delivery-system claims: **1**
- Native-stun claims: **1**

## Source authority

- Fast/searchable layer: `Threats of the Galaxy_djvu.txt`
- Final visual authority: `SAGA EDITION - Threats of the Galaxy.pdf`
- Datadagger: printed p.13 visually verified
- Light Concussion Missile Launcher: printed p.134 visually verified
- Sonic Stunner: printed p.146 visually verified
- Sith Sword: printed p.159 visually verified
- Existing repo values are comparison evidence only.
- **Ammo rule:** ammunition type and shot capacity come from descriptive text / explicit ammo blocks when published; table silence does not mean no ammo.

## Phase 2L schema decision

**Bump the weapon authority contract to `weapon-authority-schema-v2.9-ammo-payload-separation`.**

The reason is not merely naming. The runtime needs to distinguish the weapon that performs the attack from the ammunition that may supply the damage and special effects. A launcher can therefore own proficiency/range/attack rules while the loaded grenade, rocket, missile, or dart owns the payload.

### New first-class ammo field

Every pure melee weapon uses `canonicalStats.ammo: null`. A ranged firing weapon uses a structured ammo object when ammunition/power is established or explicitly not stated. A hybrid melee weapon may carry ammo only for an explicitly published ranged firing profile.

Key fields:

- `mode`: single / multiple / unknown / self-contained
- `status`: established / not-stated / self-contained
- `type`: canonical ammo or power-source type such as power-pack, energy-cell, missile, grenade, dart, cartridge
- `capacityShots`: **published loaded/pack capacity**, not current actor-instance remaining shots
- `capacityUnit`: shots, missiles, grenades, darts, etc.
- `consumesPerAttack`: only source-certified special consumption; normal runtime shot consumption can remain resolver logic
- `acceptedPayloadFamily` / `acceptedAmmoIdentities`: what the delivery system can load
- `damageSource`: weapon / loaded-ammo / loaded-ammo-modified-by-weapon / mixed
- `payloadDerived`: whether damage/effects are supplied by the loaded munition
- `sourceStatus`: explicit note when the book does not state ammo type/capacity

### Runtime boundary

- Canonical authority defines **what the weapon accepts** and **how much it can hold**.
- An actor-owned weapon instance later tracks mutable `currentShots` and `loadedAmmoRef`/loaded payload.
- Do not store a character's current loaded frag grenade as canonical source data.

### Delivery-system rule

For launchers and similar weapons, do not flatten payload damage into launcher base damage. Example: a Grenade Launcher attack uses the launcher's proficiency/range/accuracy, while a loaded Frag Grenade supplies damage, damage type, area, and special effects. Existing launcher-specific transforms (for example Micro Grenade Launcher -2 damage dice) apply **after** payload selection.

### Backward normalization

Claude should add `canonicalStats.ammo` to all 209 Phase 2 source claims from Core through Threats, using already-certified resource/description facts. Keep existing `resource` / `resourceProfiles` during this authority transition; do not destroy powered-melee operating-resource data.

## Census boundary

- **Lightwhip** remains the already-certified Jedi Academy identity; Threats does not create another source claim in this weapon census.
- **Saberdart Launcher** remains excluded: Threats uses it as NPC possession but the supplied source does not provide an independent character-scale weapon entry.

# Threats of the Galaxy book entries

## 1. Datadagger

- Group: Simple Weapon
- Size: Tiny
- Cost: 500 credits
- Base damage: 1d4
- Stun: none
- Weight: 0.1 kg
- Damage type: Piercing
- Availability: Illegal
- Ammo: null (melee)
- Repo: MISSING
- Special: +5 equipment bonus to Stealth checks to conceal it; touching the wielder gives the examiner no normal circumstance bonus.

## 2. Light Concussion Missile Launcher

- Group: Heavy Weapon
- Size: Large
- Cost: 4,000 credits
- Launcher base damage: payload-derived (not intrinsic 4d10x2)
- Rate of fire: S
- Weight: 18 kg
- Availability: Military
- Ammo type: Light Concussion Missile
- Shot capacity: **not stated**
- Consumption: one missile per attack
- Payload: Light Concussion Missile costs 800, weighs 10 kg, deals 4d10x2 Slashing, 2-square splash
- Special: -10 attack vs targets smaller than Huge; Rapid Shot prohibited
- Repo: present, but currently flattens payload damage into launcher and uses wrong kinetic type / unsupported Inaccurate.

## 3. Sonic Stunner

- Group: Pistol
- Size: Tiny
- Cost: 450 credits
- Normal damage: none
- Native stun: 3d6
- Rate of fire: S
- Weight: 1 kg
- Damage type: Energy (sonic behavior)
- Availability: Illegal
- Ammo type / shot capacity: **not stated by this source**
- Special: only target hears the shot; deaf creatures can still be harmed
- Repo: present; must not flatten native stun into ordinary damage.

## 4. Sith Sword

- Group: Simple Weapon
- Size: Medium
- Cost: 3,000 credits
- Base damage: 1d8
- Weight: 3 kg
- Damage type: Slashing OR Piercing
- Availability: Illegal, Rare
- Ammo: null (melee)
- Special: lightsaber does not ignore the sword object DR; proficient wielder can treat it as lightsaber for Block/Deflect/Redirect Shot talent interactions
- Dark-side activation: proficient wielder spends 1 Force Point as swift action; next damage roll before encounter end gains bonus equal to Dark Side Score; activation increases Dark Side Score by 1
- Repo: present but materially wrong (2d8 / 6,000 / kinetic / unsupported Critical 19-20).

## Claude implementation boundary

- Create the Phase 2L standalone JSON/MD in the repo using this package.
- Extend the authority verifier for the four Threats records and v2.9 ammo rules.
- Normalize ammo structural overlays across prior certified books without changing published facts.
- Do **not** mutate production weapon records yet.
- Negative-test launcher payload separation, Sonic Stunner native stun, Sith Sword published stats, and Datadagger concealment.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_9_NORMALIZED_THROUGH_THREATS_OF_THE_GALAXY`

---

## Repo verification notes (Claude)

- 4 records match the 4 Phase 1 Threats of the Galaxy records one-to-one (names, repo ids/current names, pages); 3 present, 1 missing (Datadagger). Counts verified: 2 melee + 2 ranged, 1 delivery system, 1 native stun.
- Schema v2.9 (ammo / payload separation) is implemented in the repo contract and verifier, and the planner ammo overlay (`data/audits/item-weapons-schema-v2.9-ammo-normalization.json`, 209 entries) is applied to every earlier book. See the rolling authority Phase 2 section.
- Aliases (see `schemaNormalization` in the JSON): statTablePage null, Light Concussion Missile Launcher stun activation, Sonic Stunner resource lifecycle keys, Sith Sword dark-side empowerment as a triggeredEffect.
- The verifier pins: launcher base damage is payload-derived and the Light Concussion Missile owns 4d10 x2 Slashing with a 2-square splash; no invented launcher capacity; Sonic Stunner native 3d6 stun only with ammo not stated; Sith Sword 1d8 / 3,000 / Slashing OR Piercing with no 19-20 critical; Datadagger concealment; Lightwhip and Saberdart Launcher not duplicated.
- Negative tests run (22 corruptions, including overlay mismatches and runtime ammo state): all failed the verifier and were restored.
