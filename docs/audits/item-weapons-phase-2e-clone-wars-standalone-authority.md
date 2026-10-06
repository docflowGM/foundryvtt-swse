**Repo files:** `data/audits/item-weapons-phase-2e-clone-wars-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1B and the schema v2.4 contract.

# Clone Wars Campaign Guide Weapons - Phase 2E Standalone Book Authority

**Status:** `CLONE_WARS_PHASE_2E_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 16 Clone Wars weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **16**
- Repo-present: **12**
- Repo-missing: **4**
- Wrist rocket payload profiles nested under the launcher: **7**

## Source authority

- Fast/searchable layer: `Clone Wars Campaign Guide_djvu.txt`
- Final table/layout authority: `SAGA EDITION - Clone Wars Campaign Guide.pdf`
- Table 5-1 (Melee Weapons), p.60: visually verified
- Table 5-2 (Ranged Weapons), p.61: visually verified
- Table 5-3 (Wrist Rocket Ammunition), p.63: visually verified
- Existing repository values are comparison evidence only.

## Important quality rule

**Clone Wars uses the Core/KOTOR/FUCG Inaccurate definition:** an Inaccurate weapon cannot fire at **Long range**. Accurate removes the Short-range attack penalty. Do not import Galaxy at War's Medium+Long exclusion into these entries.

## Hard production gate

**BlasTech 500 Riot Gun remains unresolved across publications.** This book-local package certifies the Clone Wars printing (1,000 credits, 3d8, stun setting, S/A, 4.5 kg, Inaccurate, Military, and -2 on single-shot attacks) but does **not** authorize production precedence over the conflicting Rebellion-era printing.

---

# Required schema additions / edits for Claude

Apply these changes to the **authority schema only**, then append the new fields/defaults to already-certified Core, KOTOR, Galaxy at War, and Force Unleashed entries so all books stay normalized. Do **not** modify production packs in this task.

## 1. modifier-or-inherited-damage

**Schema change:** Formalize damage.mode values modifier and inherited, with appliesTo/basis metadata, so worn weapons can modify an existing unarmed attack without inventing standalone dice.

**Why Clone Wars requires it:**
- Vibroknucklers add +3 to a successful unarmed attack.
- Stunning Gauntlet converts the wearer unarmed attack to stun and adds +1 stun damage.

**Normalize prior books:** Backfill only already-certified modifier/inherited cases such as KOTOR Stunning Gauntlet and Core Combat Gloves. Ordinary weapons remain mode=dice or mode=none.

## 2. proficiency-rules

**Schema change:** Add record-level proficiencyRules[] for conditional, alternate, or simultaneous proficiency/classification behavior.

**Why Clone Wars requires it:**
- While Vibroknucklers are worn, the same unarmed attack is both a normal unarmed attack treated as a simple weapon and an advanced melee weapon attack.

**Normalize prior books:** Append proficiencyRules:[] by default, then migrate already-certified exceptions such as KOTOR Massassi Lanvarok, Force Unleashed Ryyk Blade, and any Core source-certified alternate proficiency rules without changing their mechanics.

## 3. object-durability

**Schema change:** Add canonicalStats.objectDurability {strength, breakDC, damageReduction, damageReductionEquipmentBonus}. Keep this distinct from wielder defenses and outgoing DR bypass.

**Why Clone Wars requires it:**
- DH-23 has Strength 17 and Break DC 20.
- Merr-Sonn Model 434 gains a +2 equipment bonus to its own DR.

**Normalize prior books:** Append objectDurability:null by default. Backfill source-certified object DR such as Core Electrostaff where already established; do not infer missing object stats.

## 4. integrated-accessories

**Schema change:** Add canonicalStats.integratedAccessories[] for accessories explicitly included as part of the published weapon.

**Why Clone Wars requires it:**
- DLT-20A includes a rangefinder/electronic sight that acts as a standard targeting scope.

**Normalize prior books:** Append integratedAccessories:[] by default. Do not add optional or commonly mounted accessories unless the source says they are included.

## 5. hard-maximum-range

**Schema change:** Add range.hardMaxSquares for absolute range caps that cut inside a normal range band.

**Why Clone Wars requires it:**
- Gee-Tech 12 Defender has a maximum range of 3 squares despite being a pistol.

**Normalize prior books:** Append hardMaxSquares:null to prior range objects. Preserve existing allowedBands and source-specific quality rules.

## 6. resource-lifecycle

**Schema change:** Extend canonicalStats.resource with integrated, rechargeable, replaceable, and disposableWhenDepleted.

**Why Clone Wars requires it:**
- Gee-Tech 12 Defender has an integrated two-shot power pack that cannot be recharged; the weapon is disposable once spent.

**Normalize prior books:** Append null/false defaults without changing certified capacities or reload actions. Set values only when source-established.

## 7. payload-profiles

**Schema change:** Add canonicalStats.payloadProfiles[] for launchers whose ammunition selection supplies its own damage, stun, type, cost, weight, availability, area, and special effects.

**Why Clone Wars requires it:**
- Wrist Rocket Launcher has seven published payload profiles with materially different mechanics.

**Normalize prior books:** Append payloadProfiles:[] by default. Where already certified, Core Grenade Launcher and Galaxy at War Mortar Launcher may reference a grenade payload family rather than duplicating every grenade until that ammunition family is independently certified.

## 8. conditional-modifiers

**Schema change:** Add attackProfiles[].conditionalModifiers[] with target, value, and condition for source-defined attack/damage modifiers that depend on mode or circumstance.

**Why Clone Wars requires it:**
- BlasTech 500 Riot Gun takes -2 on attack rolls only when used in single-shot mode.

**Normalize prior books:** Append conditionalModifiers:[] by default. Backfill only already-certified conditional modifiers (for example Galaxy at War ICWS sniper point-blank penalty or Force Unleashed Power Hammer feat-linked attack penalty) where structurally appropriate.

## Required normalization guardrails

- Preserve every certified prior-book fact while adding structural defaults/nulls.
- Defaults/nulls are schema normalization, not new rules.
- Do not change source-specific Inaccurate semantics.
- Do not infer ammunition capacity, range profile, object DR, or integrated accessories from the repo.
- Keep launcher payloads subordinate to their parent weapon identity unless a source separately publishes them as weapons.
- Do not modify `packs/weapons.db`, `template.json`, runtime resolvers, actor data, feats, or talents in this authority-normalization task.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_4_NORMALIZED_THROUGH_CLONE_WARS`

---

# Clone Wars book entries

## 1. Garrote

- **Group:** Exotic Weapon
- **Size:** Small
- **Cost:** 50 credits
- **Base damage:** 1d6
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: slashing
- **Availability:** common
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 2. Snap Baton

- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 100 credits
- **Base damage:** 2d4
- **Stun:** same-as-base
- **Weight:** 1.0 kg
- **Damage type:** single: bludgeoning
- **Availability:** common
- **ROF:** None
- **Qualities:** none established
- **Repo:** weapon-snap-baton
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage and cost match, but weight is 2 kg instead of the printed 1 kg.
  - Repo does not structurally represent the printed Stun Setting or swift expand/collapse configuration.

## 3. Stunning Gauntlet

- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 200 credits
- **Base damage:** -
- **Stun:** explicit (+1)
- **Weight:** 0.4 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity. Same production identity as the KOTOR Stunning Gauntlet claim; do not create two records.

## 4. Vibroknucklers

- **Group:** Advanced Melee Weapon
- **Size:** Tiny
- **Cost:** 200 credits
- **Base damage:** +3
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: slashing
- **Availability:** restricted
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 5. Vibrorapier

- **Group:** Advanced Melee Weapon
- **Size:** Medium
- **Cost:** 500 credits
- **Base damage:** 2d6
- **Stun:** none
- **Weight:** 1.4 kg
- **Damage type:** single: slashing
- **Availability:** restricted
- **ROF:** None
- **Qualities:** none established
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.

## 6. BlasTech 500 Riot Gun

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1000 credits
- **Base damage:** 3d8
- **Stun:** same-as-base
- **Weight:** 4.5 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S', 'A']
- **Qualities:** inaccurate
- **Repo:** weapon-espo-500-riot-gun
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Clone Wars prints cost 1,000 credits and weight 4.5 kg; repo currently has 1,200 credits and 2.2 kg.
  - Clone Wars table marks this weapon Inaccurate; repo lacks the Inaccurate trait.
  - Repo does not structurally represent the -2 attack penalty when using single-shot mode.
  - This identity has a known later-source mechanical conflict. Do not choose production precedence in this book-local pass.
- **Conflict gate:** `REVIEW_PRECEDENCE_BEFORE_CONTENT_MUTATION`

## 7. BlasTech DH-23 Outback Blaster Pistol

- **Group:** Pistol
- **Size:** Small
- **Cost:** 500 credits
- **Base damage:** 3d6
- **Stun:** same-as-base
- **Weight:** 1.0 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-dh-23-blaster-pistol
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo printed damage/cost/weight match.
  - Repo does not represent Strength 17 / Break DC 20 weapon-object durability or the printed Stun Setting.

## 8. BlasTech DLT-20A "Longbarrel" Blaster Rifle

- **Group:** Rifle
- **Size:** Large
- **Cost:** 1300 credits
- **Base damage:** 3d10
- **Stun:** none
- **Weight:** 6.7 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S', 'A']
- **Qualities:** accurate
- **Repo:** weapon-dlt-20a-longblaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and Accurate/Autofire traits match.
  - Repo does not structurally represent the included standard targeting scope or +1 equipment bonus to Reflex Defense against disarm attacks.

## 9. BlasTech DT-12 Heavy Blaster Pistol

- **Group:** Pistol
- **Size:** Medium
- **Cost:** 900 credits
- **Base damage:** 4d6
- **Stun:** same-as-base
- **Weight:** 2.0 kg
- **Damage type:** single: energy
- **Availability:** military
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** weapon-dt-12-heavy-blaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage/cost/weight and Inaccurate quality match.
  - Repo does not structurally represent the printed Stun Setting.

## 10. Czerka Adjudicator

- **Group:** Pistol
- **Size:** Tiny
- **Cost:** 325 credits
- **Base damage:** 2d4
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: piercing
- **Availability:** licensed
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-adjudicator-slugthrower
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight match.
  - Repo ammunition is unstructured; source capacity is 4 shots and reload is a full-round action.

## 11. Czerka Adventurer

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 360 credits
- **Base damage:** 2d10
- **Stun:** none
- **Weight:** 4.0 kg
- **Damage type:** single: piercing
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** accurate
- **Repo:** weapon-adventurer-slugthrower
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and Accurate quality match.
  - Repo does not structurally represent move-action disassembly/reassembly for concealment.

## 12. EMP Grenade

- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 500 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: energy (ion)
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** areaEffect
- **Repo:** weapon-emp-grenade
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo damage/cost/weight and ion typing match.
  - Repo does not structurally mark the weapon as an area attack or encode the 2-square burst, target-type ion resolution, pre-halving disable condition, or Evasion handling.

## 13. Gee-Tech 12 Defender Microblaster

- **Group:** Pistol
- **Size:** Tiny
- **Cost:** 400 credits
- **Base damage:** 3d4
- **Stun:** none
- **Weight:** 0.25 kg
- **Damage type:** single: energy
- **Availability:** illegal
- **ROF:** ['S']
- **Qualities:** inaccurate
- **Repo:** weapon-defender-microblaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and Inaccurate quality match.
  - Repo range is 8 squares, but source imposes a hard maximum range of 3 squares.
  - Repo does not represent the integrated two-shot, nonrechargeable power supply or disposable-on-depletion rule.
  - Repo does not structurally represent the +5 Stealth bonus to conceal the weapon.

## 14. Merr-Sonn Model 434 DeathHammer

- **Group:** Pistol
- **Size:** Medium
- **Cost:** 650 credits
- **Base damage:** 3d8
- **Stun:** same-as-base
- **Weight:** 1.2 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-model-434-deathhammer
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight match.
  - Repo does not represent the +2 equipment bonus to the weapon object's DR or the printed Stun Setting.

## 15. SoroSuub Firelance Blaster Rifle

- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1200 credits
- **Base damage:** 3d8
- **Stun:** explicit (4d6)
- **Weight:** 2.5 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **ROF:** ['S', 'A']
- **Qualities:** none established
- **Repo:** weapon-firelance-blaster-rifle
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base damage/cost/weight and S/A capability match.
  - Repo does not represent the explicit 4d6 stun damage override; this must not be reduced to same-as-base stun.

## 16. Wrist Rocket Launcher

- **Group:** Exotic Weapon
- **Size:** Small
- **Cost:** 2500 credits
- **Base damage:** -
- **Stun:** none
- **Weight:** 1.0 kg
- **Damage type:** varies by payload
- **Availability:** restricted
- **ROF:** ['S']
- **Qualities:** none established
- **Repo:** weapon-wrist-rocket-launcher
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo cost is 2,000 credits; source is 2,500.
  - Repo weight is 1.5 kg; source is 1 kg.
  - Repo proficiency is heavy-weapons, but the published weapon group is Exotic Weapon.
  - Repo does not represent the seven published rocket payload profiles or mandatory reload after every shot.
  - The source does not assign a generic range profile to the exotic launcher in this entry; do not infer heavy-weapon range from the repo.
- **Nested payload profiles:**
  - Antipersonnel Rocket: cost 400, 3d8, stun none, single: slashing
  - Antivehicle Rocket: cost 500, 3d10, stun none, single: slashing
  - Flash Rocket: cost 400, -, stun none, single: energy
  - Hollow-Tip Rocket (Empty): cost 200, 2d6, stun none, single: piercing
  - Hollow-Tip Rocket (Nerve Toxin): cost 600, Special, stun none, single: piercing
  - Hollow-Tip Rocket (Stun Gas): cost 400, -, stun explicit 3d6, single: piercing
  - Ion Blast Rocket: cost 400, 3d6, stun none, single: energy (ion)

---

# Claude acceptance checklist

- [ ] Preserve exactly 16 Clone Wars weapon claims.
- [ ] Preserve exactly 12 present + 4 missing.
- [ ] Treat Table 5-3 rocket rows as nested payload profiles, not extra weapon identities.
- [ ] Preserve Accurate on Czerka Adventurer and DLT-20A.
- [ ] Preserve Inaccurate on Defender, DT-12, and BlasTech 500 Riot Gun using Long-range-only semantics.
- [ ] Preserve Firelance explicit 4d6 stun damage.
- [ ] Preserve EMP Grenade as a 2-square-burst area attack with target-specific ion resolution.
- [ ] Keep BlasTech 500 Riot Gun production-gated pending precedence review.
- [ ] Do not create missing records or mutate production packs.
- [ ] Normalize schema fields/defaults back through prior certified books only.

**Completion state:** `CLONE_WARS_PHASE_2E_STANDALONE_CERTIFIED`

---

## Repo verification notes (Claude)

- 16 records match the 16 Phase 1B Clone Wars records one-to-one (names, repo ids/current names, pending-rename flags, description and table pages); 12 present, 4 missing. Stunning Gauntlet is the Phase 1 cross-published identity (also KOTOR p. 202): one production identity.
- The eight schema edits above are implemented as the repo contract `weapon-authority-schema-v2.4` and applied to Core, KOTOR, Galaxy at War and Force Unleashed as structural defaults (see the rolling authority Phase 2 section).
- Defaulted in this file: `resource.consumption: null` (16 records), resource lifecycle keys `null` where unset, and `qualityParameters.inaccurate.allowedBands` added beside `longAllowed: false`. No published fact changed.
- The verifier enforces: the Riot Gun stays gated with the open Rebellion Era adjudication; the Defender hard max 3 squares and integrated, non-rechargeable, disposable two-shot pack; Firelance explicit 4d6 stun; Wrist Rocket Launcher = Exotic Weapon with exactly 7 payload profiles; Model 434 / DH-23 object durability; DLT-20A integrated scope; Vibroknucklers modifier damage with simultaneous proficiency; Stunning Gauntlet inherited damage; Long-only Inaccurate on Riot Gun, DT-12 and Defender.
- Schema v2.5 structural defaults added; Garrote now has `wieldingRules` (two hands) and a `triggeredEffects` entry for its start-of-turn repeat damage and condition-track step; Snap Baton and Czerka Adventurer have `configurationStates`.
- Schema v2.6 structural defaults added.
- Schema v2.7 structural defaults added (`damageMultiplier: 1`, `conditionalRangeRules: []`, `resourceProfiles: []`).
- Schema v2.8 (`damage.mode: "fixed"`) added to the contract; this book needed no change.
