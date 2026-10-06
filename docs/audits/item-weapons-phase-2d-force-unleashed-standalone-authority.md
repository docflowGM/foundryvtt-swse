**Repo files:** `data/audits/item-weapons-phase-2d-force-unleashed-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1C and the schema v2.3 contract.

# Force Unleashed Campaign Guide Weapons — Phase 2D Standalone Book Authority

**Status:** `FORCE_UNLEASHED_PHASE_2D_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 18 Force Unleashed weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **18**
- Repo-present: **14**
- Repo-missing: **4**

## Source authority

- Fast/searchable layer: `Force Unleashed Campaign Guide_djvu.txt`
- Final table/layout authority: `SAGA EDITION - Force Unleashed Campaign Guide.pdf`
- Table 6-1 (Melee Weapons), p.96: visually verified
- Table 6-2 (Ranged Weapons), p.99: visually verified
- Tables 10-1/10-2, p.199: visually verified
- Existing repository values are comparison evidence only.

## Important quality rule

**Force Unleashed uses the Core/KOTOR Inaccurate definition:** an Inaccurate weapon cannot fire at **Long range**. Do not import Galaxy at War’s Medium+Long restriction into these entries.

---

# Required schema additions / edits for Claude

Apply these changes to the **authority schema only**. Then append the new fields/defaults to already-certified Core, KOTOR, and Galaxy at War entries so all four books remain structurally normalized. Do **not** modify production packs in this task.

## 1. prepared-attacks

**Schema change:** Add attackProfiles[].preparedAttack with activationAction, matures, expires, consumedBy, damageDiceDelta, resourceUnitsOnPreparedAttack, and prohibitsMultiShotAbilities.

**Why Force Unleashed requires it:**
- Bryar pistol and Bryar rifle use a swift action to prime a shot, require a no-attack waiting condition until the next turn, then add +1 weapon die and consume 5 shots.

**Normalize prior books:** Append preparedAttack:null to every prior attack profile. Do not create prepared states unless a published source establishes them.

## 2. range-penalty-application

**Schema change:** Add range.penaltyApplication with vocabulary attack, damage, none, special.

**Why Force Unleashed requires it:**
- CR-1 Blast Cannon uses pistol range bands but applies range penalties to damage rolls instead of attack rolls.

**Normalize prior books:** Prior ordinary ranged profiles default to attack; melee profiles use null. Preserve existing Accurate overrides and allowedBands.

## 3. independent-damage-components

**Schema change:** Add attackProfiles[].damageComponents[] for simultaneous components that have independent formulas/types/resolution. Keep damageType.mode=and for one damage amount that simultaneously has multiple types.

**Why Force Unleashed requires it:**
- Neuronic Whip deals 2d8 stun damage plus a separate 1d4 slashing damage component.

**Normalize prior books:** Append damageComponents:[] to prior profiles unless previously certified rules already contain independently rolled components. Do not convert ordinary AND-type damage into multiple rolls.

## 4. generalized-firing-constraints

**Schema change:** Add attackProfiles[].firingConstraints {cooldownRounds, firesOnAlternatingRounds, maxShotsPerRound, prohibitsMultiShotAbilities, reloadRequiredAfterEachShot}. This generalizes KOTOR specialRateOfFire.

**Why Force Unleashed requires it:**
- DX-2/DXR-6 fire only once every other round; Flechette Launcher forbids Rapid Shot/multi-shot abilities; E-Web Missile Launcher fires one shot then must reload.

**Normalize prior books:** Append firingConstraints:null by default. Convert KOTOR Sonic Disruptor specialRateOfFire into this structure without changing its rule; preserve Special ROF as published table data.

## 5. defensive-interactions

**Schema change:** Add canonicalStats.defensiveInteractions[] for mechanics governing the weapon object as a defender or defensive implement, distinct from outgoing damageReductionInteraction.

**Why Force Unleashed requires it:**
- Guard Shoto and Lightsaber Pike explicitly retain their own DR against lightsabers; Felucian Skullblade can block lightsaber strikes when Force-imbued.

**Normalize prior books:** Append defensiveInteractions:[] to prior records, then backfill only source-certified cases such as Core Electrostaff and KOTOR Shockstaff where the existing authority already establishes lightsaber-resistant object DR behavior.

## 6. conditional-damage-adjustments

**Schema change:** Permit conditionalDamageProfiles entries to use operation=add-dice / area-toggle rather than only replacement damage profiles.

**Why Force Unleashed requires it:**
- CR-1 adds +1d8 only against adjacent targets and gains splash only against nonadjacent targets.

**Normalize prior books:** No change to existing replacement-style conditional damage. Append no new conditional rules unless source-certified.

## Required normalization guardrails

- Preserve every certified Core/KOTOR/Galaxy at War numeric and mechanical fact while adding new fields.
- Defaults/nulls are structural normalization, not new rules.
- Do not change Galaxy at War source-specific Inaccurate semantics.
- Do not replace explicit table damage/stun values with inferred equivalents.
- Do not modify `packs/weapons.db`, `template.json`, runtime resolvers, actor data, feats, or talents in this authority-normalization task.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_3_NORMALIZED_THROUGH_FORCE_UNLEASHED`

---

# Force Unleashed book entries

## 1. Felucian Skullblade

- **Group:** Exotic Weapon
- **Size:** Small
- **Cost:** 1500 credits
- **Base damage:** 2d6
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: slashing
- **Availability:** common, Rare
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 2. Guard Shoto

- **Group:** Lightsaber
- **Size:** Small
- **Cost:** 7000 credits
- **Base damage:** 2d4
- **Stun:** none
- **Weight:** 1 kg
- **Damage type:** and: energy, slashing
- **Availability:** illegal, Rare
- **ROF:** None
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-guard-shoto
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo normal damage/cost/weight match, but damage type is flattened to energy instead of Energy AND Slashing.
  - Repo uses exotic proficiency instead of the Lightsabers group compatibility key.
  - Repo Throwable trait is not established by this Force Unleashed entry.
  - Repo does not structurally represent the +2 Block/Deflect Use the Force bonus or the lightsaber-vs-own-DR exception.

## 3. Power Hammer

- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 1500 credits
- **Base damage:** 2d12
- **Stun:** none
- **Weight:** 10 kg
- **Damage type:** single: bludgeoning
- **Availability:** restricted
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 4. Ryyk Blade

- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 500 credits
- **Base damage:** 2d10
- **Stun:** none
- **Weight:** 1.5 kg
- **Damage type:** single: slashing
- **Availability:** common, Rare
- **ROF:** None
- **Qualities:** none established
- **Repo:** weapon-wookiee-ryyk-blade
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage is 2d8; source is 2d10.
  - Repo cost is 1,000 credits; source is 500.
  - Repo weight is 5 kg; source is 1.5 kg.
  - Repo uses heavy-weapons range profile on a melee weapon.
  - Repo Critical 19-20 trait is not established by this source entry.

## 5. Vibroblade, Double

- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 550 credits
- **Base damage:** 2d6/2d6
- **Stun:** none
- **Weight:** 4 kg
- **Damage type:** single: slashing
- **Availability:** licensed
- **ROF:** None
- **Qualities:** doubleWeapon
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 6. Vibrosword

- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 450 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 3 kg
- **Damage type:** or: slashing, piercing
- **Availability:** licensed
- **ROF:** None
- **Qualities:** none established
- **Repo:** weapon-vibrosword
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage 2d8 and weight 3 kg match, but cost is 1,000 credits instead of 450.
  - Repo damage type is flattened to kinetic instead of Slashing OR Piercing.
  - Repo Critical 19-20 trait is not established by this source entry.

## 7. Bryar Pistol

- **Group:** Pistol
- **Size:** Medium
- **Cost:** 1350 credits
- **Base damage:** 3d4
- **Stun:** none
- **Weight:** 3 kg
- **Damage type:** single: energy
- **Availability:** licensed
- **ROF:** ['S']
- **Qualities:** accurate
- **Repo:** weapon-bryar-pistol
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and Accurate quality match.
  - Repo ammunition is unstructured/zeroed; source power pack provides 100 shots before recharge.
  - Repo does not represent the primed-shot delayed preparation, +1 weapon die, 5-shot consumption, or multi-shot incompatibility.

## 8. Bryar Rifle

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1350 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 3 kg
- **Damage type:** single: energy
- **Availability:** licensed
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** weapon-bryar-rifle
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and Inaccurate quality match.
  - Repo ammunition is unstructured/zeroed; source power pack provides 50 shots before recharge.
  - Repo does not represent the primed-shot delayed preparation, +1 weapon die, 5-shot consumption, or multi-shot incompatibility.

## 9. DX-2 Disruptor Pistol

- **Group:** Pistol
- **Size:** Medium
- **Cost:** 3000 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 3 kg
- **Damage type:** single: energy
- **Availability:** illegal
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-disruptor-pistol
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage 3d6 matches, but cost is 2,500 instead of 3,000 and weight is 1 kg instead of 3 kg.
  - Repo does not encode the 10-shot recharge capacity, damage-threshold -5 rule, disintegration, or once-every-other-round/multi-shot restrictions.

## 10. DXR-6 Disruptor Rifle

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 3500 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 6 kg
- **Damage type:** single: energy
- **Availability:** illegal
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-disruptor-rifle
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage is 4d6; source is 3d8.
  - Repo cost is 4,000; source is 3,500.
  - Repo weight is 4 kg; source is 6 kg.
  - Repo does not encode the 10-shot recharge capacity, damage-threshold -5 rule, disintegration, or once-every-other-round/multi-shot restrictions.

## 11. Incinerator Rifle

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 3500 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-incinerator-rifle
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo table-facing damage/cost/weight match.
  - Repo does not encode the 20-shot power-pack capacity or automatic disintegration when the attack kills/destroys the target.

## 12. Stokhli Spray Stick

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 14000 credits
- **Base damage:** -
- **Stun:** native-stun: 3d8
- **Weight:** 4 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** weapon-stokhli-spray-stick
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo broadly captures 3d8 stun and Inaccurate, but flattens the table’s normal-damage dash/native-stun structure.
  - Repo lacks the 80-shot spraymist canister, 100-credit replacement cost, and net-style ranged grab/grapple rule.

## 13. CR-1 Blast Cannon

- **Group:** Exotic Weapon
- **Size:** Large
- **Cost:** 2000 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 6 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** weapon-cr-1-blast-cannon
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and Inaccurate tag match.
  - Repo uses heavy-weapons range profile; source explicitly uses pistol ranges.
  - Repo does not represent that range penalties apply to damage rolls instead of attack rolls.
  - Repo does not encode +1d8 adjacent damage or the nonadjacent 1-square splash rule.

## 14. E-Web Missile Launcher

- **Group:** Heavy Weapon
- **Size:** Huge
- **Cost:** 9500 credits
- **Base damage:** 6d6
- **Stun:** none
- **Weight:** 42 kg
- **Damage type:** single: slashing
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** areaEffect
- **Repo:** weapon-e-web-missile-launcher
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage/cost/weight match, but damage type is kinetic instead of printed Slashing.
  - Repo incorrectly tags the weapon Inaccurate; Table 10-2 does not assign that footnote to the E-Web missile launcher.
  - Repo omits the 2x2 area, one-shot load/reload cycle, second-crew move-action reload, 75-credit missile cost, tripod size treatment, and two-swift range-step reduction rule.

## 15. Flechette Launcher

- **Group:** Rifle
- **Size:** Large
- **Cost:** 1100 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** single: piercing
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** inaccurate, areaEffect
- **Repo:** weapon-flechette-launcher
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage/cost/weight and Inaccurate tag match, but damage type is kinetic instead of printed Piercing.
  - Repo does not encode the 1-square splash radius, four-shot special ammunition cluster, 50-credit replacement cost, or prohibition on Rapid Shot/multi-shot abilities.

## 16. Lightsaber Pike

- **Group:** Lightsaber
- **Size:** Large
- **Cost:** 4000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 2 kg
- **Damage type:** and: energy, slashing
- **Availability:** common, Rare
- **ROF:** None
- **Qualities:** ignoresDR, reach
- **Repo:** lightsaber-chassis-pike
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage/cost/weight and Reach trait match, but damage type is flattened to energy instead of Energy AND Slashing.
  - Repo uses exotic proficiency instead of the Lightsabers group compatibility key.
  - Repo does not structurally represent the -2 Block/Deflect Use the Force penalty or the lightsaber-vs-own-DR exception.

## 17. Neuronic Whip

- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 500 credits
- **Base damage:** -
- **Stun:** native-stun: 2d8
- **Weight:** 0.5 kg
- **Damage type:** and: bludgeoning, energy
- **Availability:** restricted
- **ROF:** None
- **Qualities:** reach
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 18. Rail Detonator Gun

- **Group:** Rifle
- **Size:** Large
- **Cost:** 1900 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** single: piercing
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** areaEffect
- **Repo:** weapon-rail-detonator-gun
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage/cost/weight match, but damage type is kinetic instead of printed Piercing.
  - Repo does not encode the 1-square splash radius or the 10-shot, 50-credit explosive-canister magazine.

---

# Executor guardrails

- This package is **authority only**.
- Keep all 18 Force Unleashed entries book-local.
- Do not create missing records yet.
- Do not repair existing repo records yet.
- Do not merge this package into any rolling/master file unless explicitly instructed later.
- Schema normalization may append fields/defaults to prior book authority files, but must not mutate their certified facts.

## Acceptance state

`FORCE_UNLEASHED_PHASE_2D_STANDALONE_CERTIFIED`

---

## Repo verification notes (Claude)

- 18 records match the 18 Phase 1C Force Unleashed records one-to-one (names, repo ids/current names, pending-rename flags, description and table pages); 14 present, 4 missing. Guard Shoto and Lightsaber Pike are the Phase 1 cross-published identities (also Jedi Academy): one production identity each.
- The six schema edits above are implemented as the repo contract `weapon-authority-schema-v2.3` and applied to Core, KOTOR and Galaxy at War as structural defaults (see the rolling authority Phase 2 section). Force Unleashed Inaccurate (Long-only) is verified against Core/KOTOR; Galaxy at War's Medium+Long definition is not imported.
- Defaulted in this file: `resource.consumption: null` on the 18 records. No published fact changed.
- Counts note: `counts.areaEffectClaims` is 4 but only 3 records carry `qualities.areaEffect = true`; CR-1 Blast Cannon has conditional splash geometry with `areaEffect: false`. The verifier counts it as area via the enabled profile geometry. Certifier to confirm whether CR-1's `areaEffect` should be true.
- Schema v2.4 structural defaults added; Ryyk Blade Wookiee proficiency migrated into `proficiencyRules`; Power Hammer -2 with Double/Triple Attack and Rapid Strike added as a `conditionalModifier`. Operation keys preserved.
