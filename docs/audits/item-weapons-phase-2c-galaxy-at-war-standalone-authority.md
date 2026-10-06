**Repo files:** `data/audits/item-weapons-phase-2c-galaxy-at-war-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1D and the schema v2.2 contract.

# Galaxy at War Weapons — Phase 2C Standalone Book Authority

**Status:** `GALAXY_AT_WAR_PHASE_2C_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 21 Galaxy at War weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **21**
- Repo-present: **14**
- Repo-missing: **7**

## Source authority

- Fast/searchable layer: `Galaxy At War_djvu.txt`
- Final table/layout authority: `SW_Saga_Galaxy_at_War.pdf`
- Table 2-1 (Melee Weapons), p.36: visually verified
- Table 2-2 (Ranged Weapons), p.41: visually verified
- Existing repository values are comparison evidence only.

## Critical source finding: Inaccurate is book-specific here

Galaxy at War Table 2-2 footnote 1 defines **Inaccurate** as unable to fire at **Medium or Long range**. Core/KOTOR use the less restrictive long-range exclusion. Do **not** flatten these into one global meaning. The normalized schema must preserve the boolean quality plus source-specific allowed range bands.

---

# Required schema additions / edits for Claude

Apply these changes to the **authority schema only**. Then append the new fields/defaults to the already-certified Core and KOTOR authority entries so all three books remain structurally normalized. Do **not** modify production packs in this task.

## 1. profile-specific-authority

**Schema change:** Expand canonicalStats.attackProfiles so each profile can carry schemaFamily, damage, damageType, stun, rateOfFire, range, qualities, attackResolution, area, and resourceConsumption.

**Why Galaxy at War requires it:**
- ICWS changes from rifle to heavy-weapon proficiency in anti-armor mode.
- ICWS standard mode has stun while sniper/anti-armor profiles do not.
- Ascension and heavy-variable weapons have non-damaging utility profiles.

**Normalize prior books:** Append attackProfiles to every Core/KOTOR record. For ordinary single-profile weapons create one primary profile mirroring the existing canonicalStats fields. Do not invent alternate profiles.

## 2. operating-mode-profiles

**Schema change:** Add canonicalStats.modeProfiles[] with id, label, switchAction, attackProfileId, and resourceConsumption.

**Why Galaxy at War requires it:**
- Variable blaster rifles change damage and ammunition consumption as a swift action.
- ICWS changes configurations as a standard action.
- Ascension guns switch between blaster and tether modes.

**Normalize prior books:** Core/KOTOR records with no mode-specific mechanics receive modeProfiles: []. Existing explicit alternate modes may be linked to their primary profile without changing published facts.

## 3. resource-consumption-by-mode

**Schema change:** Allow canonicalStats.resource.consumption plus per-profile resourceConsumption, including multipliers.

**Why Galaxy at War requires it:**
- Variable rifle uses 1x/5x/10x shots; heavy variable uses 1x/10x/20x.
- ICWS anti-armor ammunition and ascension syntherope are separate resources.

**Normalize prior books:** Append resource.consumption: null when no special consumption rule exists. Preserve existing capacities/reload data.

## 4. stun-active-profile

**Schema change:** Add stun.damageMode = same-as-active-profile and permit attackProfiles[].stun to override record-level stun.

**Why Galaxy at War requires it:**
- Variable damage weapons with a stun setting must derive stun damage from the selected damage profile.
- ICWS has stun in blaster mode but not in sniper or anti-armor modes.

**Normalize prior books:** Do not replace explicit printed stun dice. Core/KOTOR ordinary stun settings remain same-as-base or explicit as already certified.

## 5. range-allowed-bands

**Schema change:** Add canonicalStats.range.allowedBands and attackProfiles[].range.allowedBands. Keep qualities booleans separate.

**Why Galaxy at War requires it:**
- Galaxy at War footnote 1 defines Inaccurate as unable to fire at Medium or Long range, unlike the Core/KOTOR long-range-only definition.
- Arc removes Point-Blank range.

**Normalize prior books:** Core ordinary ranged profiles get all four bands. KOTOR Inaccurate entries get [pointBlank, short, medium]. Galaxy at War Inaccurate entries get [pointBlank, short]. Do not silently overwrite one source definition with another.

## 6. quality-parameters

**Schema change:** Add qualityParameters for source-specific mechanical parameters while retaining qualities.accurate/inaccurate/arc booleans.

**Why Galaxy at War requires it:**
- The same named quality can have different printed range consequences across books.

**Normalize prior books:** Append qualityParameters with null entries unless the source establishes a parameter. KOTOR Inaccurate should explicitly preserve long-only exclusion.

## 7. structured-attack-resolution

**Schema change:** Add attackProfiles[].attackResolution {mode, defense, ignoredDefenseComponents, onMiss}.

**Why Galaxy at War requires it:**
- Radiation grenade attacks Fortitude instead of Reflex.
- Targeting laser ignores armor bonuses to Reflex.
- Area attacks may deal half damage on a miss.

**Normalize prior books:** Normal Core/KOTOR weapon profiles use standard Reflex resolution with no ignored components; only source exceptions use override.

## 8. structured-area-profile

**Schema change:** Add attackProfiles[].area {enabled, shape, radiusSquares, lengthSquares, widthAtEndSquares, widthSquares, heightSquares, notes}.

**Why Galaxy at War requires it:**
- Flame cannon is a 12-square cone, 8 squares wide at terminus.
- Radiation/smoke grenades use 2-square bursts.
- ICWS anti-armor uses 3-square burst.
- Rotary blaster cannon changes autofire area when braced.

**Normalize prior books:** Append area.enabled=false for non-area profiles. Backfill previously certified Core/KOTOR area weapons only from their already-certified source facts.

## 9. conditional-damage

**Schema change:** Add conditionalDamageProfiles[] and add baseDamage mode conditional.

**Why Galaxy at War requires it:**
- Scatter gun damage changes by range.
- Darkstick damage changes when two or more are held in one hand.

**Normalize prior books:** Append conditionalDamageProfiles: [] to Core/KOTOR unless a previously certified source rule already requires conditional damage.

## 10. utility-profiles

**Schema change:** Allow attackProfiles[].kind values attack, utility, and special, and permit damage.mode=none with a source table literal such as Special.

**Why Galaxy at War requires it:**
- Ascension mode and targeting laser are weapon-operated profiles that do not deal ordinary weapon damage.
- Tactical tractor beam has source-specific special handling.

**Normalize prior books:** Ordinary profiles remain kind=attack. Do not create utility profiles without source authority.

## Required normalization guardrails

- Preserve every certified Core/KOTOR numeric and mechanical fact while adding the new fields.
- Defaults/nulls are structural normalization, not new rules.
- Do not replace explicitly printed stun damage with `same-as-active-profile`.
- Do not invent area geometry, resource multipliers, attack-defense overrides, or alternate profiles where a source did not establish them.
- Do not change production `template.json`, packs, runtime resolvers, or actors in this schema-normalization commit.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_2_NORMALIZED_THROUGH_GALAXY_AT_WAR`

---

# Galaxy at War book entries

## 1. Darkstick

- **Group:** Exotic Weapon
- **Size:** Small
- **Cost:** 1000
- **Base damage:** 1d6
- **Weight:** 1.5 kg
- **Damage type:** single: slashing
- **Availability:** common, Rare
- **ROF:** None
- **Qualities:** thrown
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 2. Entrenching Tool

- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 50
- **Base damage:** 1d6
- **Weight:** 1 kg
- **Damage type:** or: slashing, piercing
- **Availability:** common
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 3. Fire Blade

- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 200
- **Base damage:** 2d4
- **Weight:** 1.0 kg
- **Damage type:** and: energy, slashing
- **Availability:** common
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 4. Shockboxing Gloves

- **Group:** Simple Weapon
- **Size:** two_sizes_smaller_than_wearer
- **Cost:** varies/not listed
- **Base damage:** +1
- **Weight:** varies kg
- **Damage type:** and: bludgeoning, energy
- **Availability:** restricted
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 5. Shock Stick

- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 450
- **Base damage:** -
- **Weight:** 1.4 kg
- **Damage type:** single: energy
- **Availability:** licensed
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 6. Static Pike

- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 300
- **Base damage:** 2d6
- **Weight:** 1.8 kg
- **Damage type:** and: energy, piercing
- **Availability:** restricted
- **ROF:** None
- **Qualities:** thrown, reach
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 7. Vibrolance

- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 500
- **Base damage:** 2d10
- **Weight:** 2 kg
- **Damage type:** or: piercing, slashing
- **Availability:** licensed
- **ROF:** None
- **Qualities:** reach
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 8. Ascension Gun

- **Group:** Pistol
- **Size:** Medium
- **Cost:** 1200
- **Base damage:** 3d8
- **Weight:** 2 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** present — weapon-ascension-gun
- **Repo comparison:** CONTENT_AND_SCHEMA_INCOMPLETE
  - Basic damage/cost/weight match, but repo lacks 50-shot power-pack capacity, two-use syntherope resource, ascension-mode profile, stun setting, and source-specific Inaccurate range behavior.

## 9. Blaster Pistol, Sidearm

- **Group:** Pistol
- **Size:** Small
- **Cost:** 400
- **Base damage:** 3d6
- **Weight:** 1 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** present — weapon-sidearm-blaster-pistol
- **Repo comparison:** CONTENT_INCOMPLETE
  - Repo basic numeric stats match, but ammo capacity, stun setting, and Rapid Shot trigger-reset rule are absent.

## 10. Blaster Rifle, Variable

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1300
- **Base damage:** 3d4
- **Weight:** 5 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S', 'A']
- **Qualities:** none established
- **Repo:** present — weapon-variable-blaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo stores damage as Special and lacks the canonical 3d4/3d6/3d8 structured power profiles, 1x/5x/10x ammunition multipliers, 500-shot capacity, and stun-setting authority.

## 11. Blaster Rifle, Heavy Variable

- **Group:** Rifle
- **Size:** Large
- **Cost:** 2250
- **Base damage:** 3d6
- **Weight:** 6.5 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** present — weapon-heavy-variable-blaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo has correct cost/weight but lacks canonical 3d6/3d8/3d10 power profiles, 1x/10x/20x shot multipliers, 500-shot capacity, ascension mode, stun setting, and the book-specific Inaccurate range restriction.

## 12. Crossbow, Repeating

- **Group:** Simple Weapon
- **Size:** Medium
- **Cost:** 400
- **Base damage:** 1d8
- **Weight:** 1.2 kg
- **Damage type:** single: piercing
- **Availability:** common
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** present — weapon-repeating-crossbow
- **Repo comparison:** CONTENT_INCOMPLETE
  - Repo basic damage/cost/weight match, but the 10-quarrel magazine, 30-credit/1.2-kg magazine stats, and move-action reload are absent.

## 13. Flame Cannon

- **Group:** Heavy Weapon
- **Size:** Large
- **Cost:** 3000
- **Base damage:** 5d6
- **Weight:** 5 kg
- **Damage type:** single: fire
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** areaEffect
- **Repo:** present — weapon-flame-cannon
- **Repo comparison:** STAT_AND_QUALITY_INCORRECT
  - Repo weight is 15 kg but source table is 5 kg. Repo incorrectly tags the weapon Inaccurate. Repo also lacks the 12x8 cone, half-damage-on-miss area resolution, 20-use tank, full-round reload, replacement tank stats, and tripod size rule.

## 14. Grenade, Radiation

- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 500
- **Base damage:** 3d8
- **Weight:** 0.5 kg
- **Damage type:** single: energy
- **Availability:** illegal
- **ROF:** ['S']
- **Qualities:** areaEffect
- **Repo:** present — weapon-radiation-grenade
- **Repo comparison:** CONTENT_INCOMPLETE
  - Repo basic damage/cost/weight/availability match, but it lacks the 2-square burst, Fortitude-defense attack resolution, half damage on miss, single-use resource, and Moderate-radiation rider.

## 15. Grenade, Smoke

- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 100
- **Base damage:** -
- **Weight:** 0.5 kg
- **Damage type:** none: none/special
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** areaEffect
- **Repo:** present — weapon-smoke-grenade
- **Repo comparison:** STAT_AND_CONTENT_INCORRECT
  - Repo availability is Military but source table says Restricted. Repo also lacks the 2-square burst, 10-round duration, concealment/smoke-hazard behavior, and single-use structure.

## 16. Interchangeable Weapon System

- **Group:** Rifle (Special)
- **Size:** Medium
- **Cost:** 4500
- **Base damage:** 3d8
- **Weight:** 5 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S', 'A']
- **Qualities:** none established
- **Repo:** present — weapon-interchangeable-weapon-system
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo collapses the weapon to a generic Varies profile. Source requires separate blaster, sniper, and anti-armor configurations with profile-specific damage, ROF, proficiency family, Accurate quality, area geometry, and special ammunition.

## 17. Mortar Launcher

- **Group:** Heavy Weapon
- **Size:** Large
- **Cost:** 2500
- **Base damage:** 4d6
- **Weight:** 20 kg
- **Damage type:** single: slashing
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** arc, areaEffect
- **Repo:** present — weapon-mortar-launcher
- **Repo comparison:** STAT_AND_QUALITY_INCORRECT
  - Repo stores damage as Varies instead of printed 4d6, incorrectly tags Inaccurate, omits Arc and Area qualities, and lacks the five-shell auto-feed magazine and 20-square elevated point-of-origin rule.

## 18. Rotary Blaster Cannon

- **Group:** Heavy Weapon
- **Size:** Large
- **Cost:** 5500
- **Base damage:** 3d10
- **Weight:** 16 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['A']
- **Qualities:** autofireOnly
- **Repo:** present — weapon-rotary-blaster-cannon
- **Repo comparison:** CONTENT_INCOMPLETE
  - Repo basic numeric stats match and records Autofire, but lacks the 20-shot capacity/power-generator option, 2x4 braced autofire area, and additional -5 unbraced attack penalty.

## 19. Scatter Gun

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 275
- **Base damage:** 3d8
- **Weight:** 4 kg
- **Damage type:** single: piercing
- **Availability:** licensed
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** present — weapon-scattergun
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo stores a combined damage string instead of structured range-conditioned damage, omits the source Inaccurate quality, and lacks the 10-shell capacity with per-shell cost/weight.

## 20. Tactical Tractor Beam

- **Group:** Heavy Weapon
- **Size:** Large
- **Cost:** 8000
- **Base damage:** 3d6
- **Weight:** 25 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** present — weapon-tactical-tractor-beam
- **Repo comparison:** STAT_AND_CONTENT_INCORRECT
  - Repo replaces printed 3d6* with Special, and lacks required power generator, Huge-or-smaller target cap, object movement/hurl rules, tripod size treatment, and second-crewman regulation penalty.

## 21. Targeting Laser

- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 50
- **Base damage:** -
- **Weight:** 0.1 kg
- **Damage type:** single: energy
- **Availability:** licensed
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** present — weapon-targeting-laser
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo basic cost/weight are correct, but the record lacks source-defined targeting resolution that ignores armor bonuses to Reflex, energy-cell requirement, persistent designation behavior, and +2 allied attack bonus.

---

# Claude execution boundary

Claude may update/append the standalone authority files and schema-verifier/documentation needed to keep Core, KOTOR, and Galaxy at War structurally normalized. Claude must **not** use this handoff to mutate production weapon records, compile packs, create missing weapons, or merge these book entries into a rolling authority unless separately instructed.

---

## Repo verification notes (Claude)

- 21 records match the 21 Phase 1D Galaxy at War records one-to-one (names, repo ids/current names, pending-rename flags, description and table pages); 14 present, 7 missing.
- The ten schema edits above are implemented as the repo contract `weapon-authority-schema-v2.2` (`schemaContract` in the rolling authority) and applied to Core and KOTOR as structural defaults. Core 2A is in the rolling authority; KOTOR 2B and this book are standalone files.
- Defaulted in this file: `resource.consumption: null` on the 19 records that publish no special consumption rule. No published fact changed.
- The verifier recomputes `range.allowedBands` / `qualityEffects` from `qualityParameters` and fails if Galaxy at War Inaccurate is read with the Core/KOTOR (long-only) meaning, and checks that every `modeProfiles[].attackProfileId` links to an existing profile.
- Schema v2.3 structural defaults added to every record (`range.penaltyApplication`, `preparedAttack`, `damageComponents`, `firingConstraints`, `defensiveInteractions`); no published fact changed and Galaxy at War’s Medium+Long Inaccurate definition is untouched.
- Schema v2.4 structural defaults added; ICWS sniper -2 at unmodified point-blank is now a `conditionalModifier` (operation key preserved). Galaxy at War Inaccurate semantics untouched.
- Schema v2.5 structural defaults added; conditional-modifier targets renamed to `attackRoll`/`damageRoll`; `stun.activation` backfilled from each record stun capability.
- Schema v2.6 structural defaults added; no conditional qualities existed to convert.
- Schema v2.7 structural defaults added (`damageMultiplier: 1`, `conditionalRangeRules: []`, `resourceProfiles: []`).
