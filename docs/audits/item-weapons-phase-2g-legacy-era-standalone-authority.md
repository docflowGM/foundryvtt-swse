**Repo files:** `data/audits/item-weapons-phase-2g-legacy-era-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1K and the schema v2.6 contract.

# Legacy Era Campaign Guide Weapons - Phase 2G Standalone Book Authority

**Status:** `LEGACY_ERA_PHASE_2G_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 14 Legacy Era weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **14**
- Repo-present: **12**
- Repo-missing: **2**
- Melee claims: **3**
- Ranged claims: **11**
- Explicit Accurate claims: **2**
- Explicit Inaccurate claims: **6**
- Explicit biotech claims: **2**

## Source authority

- Fast/searchable layer: `Legacy Era Campaign Guide_djvu.txt`
- Final table/layout authority: `Star Wars Saga Edition - Legacy Era Campaign Guide.pdf`
- Table 5-1 (Melee Weapons), p.62: visually verified
- Table 5-2 (Ranged Weapons), p.64: visually verified
- Table 10-1 (Imperial Ranged Weapons), p.183: visually verified
- Existing repository values are comparison evidence only.

## Cross-publication guardrail

Long-Handle Lightsaber is the same production identity already certified from Jedi Academy Training Manual. This package certifies the **Legacy Era claim only**. Do not create a duplicate identity and do not erase Jedi Academy-only mechanics during later reconciliation.

---

# Required schema additions / edits for Claude

Apply these changes to the **authority schema only**, then append the new fields/defaults to already-certified Core, KOTOR, Galaxy at War, Force Unleashed, Clone Wars, and Jedi Academy entries so all books stay normalized. Do **not** modify production packs in this task.

## 1. critical-damage-transforms

**Schema change:** Add attackProfiles[].criticalEffects[] for source-defined critical-hit transformations of base dice, including die-size replacement without altering the persistent base weapon damage.

**Why Legacy requires it:**
- Hunting Blaster Carbine changes d8 weapon dice to d10s on a critical hit.
- Heavy Assault Blaster Rifle changes d10 weapon dice to d12s on a critical hit.

**Normalize prior books:** Append criticalEffects:[] by default to all prior attack profiles. Do not infer critical rules from repo traits or generic weapon families.

## 2. conditional-quality-overrides

**Schema change:** Standardize existing conditionalQualities[] entries as {quality,state,when,scope,effect} so a published base quality can be disabled or enabled under a source condition.

**Why Legacy requires it:**
- Sporting Blaster Carbine is table-marked Inaccurate but is explicitly not treated as Inaccurate while wielded in two hands.

**Normalize prior books:** Keep [] by default. Backfill source-certified conditional Accurate/Inaccurate/Arc behavior only; never erase the underlying published table trait.

## 3. technology-classification

**Schema change:** Add canonicalStats.technologyClassification {tags[], rules[]} for source-defined technology categories that alter repair, knowledge, modification, or other system interactions.

**Why Legacy requires it:**
- Razor Bug and Thud Bug are explicitly biotech devices. Biotech uses Treat Injury instead of Mechanics for repair, Knowledge (life sciences) instead of Knowledge (technology), has special Force interaction, and uses Biotech Specialist rather than Tech Specialist.

**Normalize prior books:** Append {tags:[],rules:[]} by default. Populate only where a source explicitly classifies the item.

## 4. delivery-method-vs-range-classification

**Schema change:** Add canonicalStats.deliveryMethod to separate physical delivery from the rules range classification.

**Why Legacy requires it:**
- Razor Bugs and Thud Bugs are physically thrown by hand but explicitly use simple-weapon ranges rather than thrown-weapon ranges.

**Normalize prior books:** Append deliveryMethod:null by default. Do not set qualities.thrown merely because an object is physically hurled if the source assigns a different range classification.

## 5. prepared-attack-temporary-overrides

**Schema change:** Extend attackProfiles[].preparedAttack with temporaryOverrides and unpreparedRestriction so preparation can temporarily change effective weapon size or firing eligibility without mutating base size.

**Why Legacy requires it:**
- Heavy Blaster Cannon is Huge; two swift actions immediately before the attack brace it, temporarily treating it as Large so a Medium wielder can fire it. Unbraced, Medium or smaller creatures cannot fire it.

**Normalize prior books:** Keep preparedAttack:null by default. Existing prepared attacks such as Bryar priming remain compatible; add temporaryOverrides only when the source changes weapon properties/eligibility.

## Required normalization guardrails

- Preserve every certified prior-book fact while adding structural defaults/nulls.
- Defaults/nulls are schema normalization, not new rules.
- Never convert a conditional quality exception into a permanent rewrite of the base source quality.
- Do not infer biotech status, critical rules, or delivery classification from repo tags.
- Do not use physical throwing to choose a range profile when the source explicitly specifies another range classification.
- Do not modify `packs/weapons.db`, `template.json`, runtime resolvers, actors, feats, or talents in this authority-normalization task.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_6_NORMALIZED_THROUGH_LEGACY_ERA`

---

# Legacy Era book entries

## 1. Long-Handle Lightsaber

- **Published name:** Long-handle lightsaber
- **Group:** Lightsaber
- **Size:** Large
- **Cost:** 4500 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 2 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-longhandle
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed damage/cost/weight match the repo.
  - Repo TwoHanded trait is too broad: the source describes a special option when wielded two-handed, not an always-two-handed requirement.
  - This Legacy claim does not include the Long Haft Form alternate end published in Jedi Academy; do not erase that earlier claim during later cross-book reconciliation.
- **Cross-published:**
  - Jedi Academy Training Manual p.53: earlier publication; same production identity with additional Long Haft Form rule

## 2. Shock Whip

- **Published name:** Shock whip
- **Group:** Advanced Melee Weapon
- **Size:** Small
- **Cost:** 1200 credits
- **Base damage:** 1d6
- **Stun:** none
- **Weight:** 2.3 kg
- **Damage type:** single: bludgeoning
- **Availability:** restricted
- **Qualities:** reach
- **Repo:** MISSING
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Missing production record.
  - Source requires a second normal-bonus attack roll for the optional grab and explicitly removes the normal -5 grab penalty.
  - The once-per-turn 2d6 energy shock against a grabbed target is automatic and uses a swift action.

## 3. Tehkla Blade

- **Published name:** Tehk'la blade
- **Group:** Exotic Weapon
- **Size:** Tiny
- **Cost:** 8500 credits
- **Base damage:** 2d6
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** and: piercing / slashing
- **Availability:** common, Rare
- **Qualities:** none
- **Repo:** MISSING
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Missing production record.
  - Delayed 1d6 bleeding is gated by the same attack roll meeting both Reflex and Fortitude Defense.

## 4. Blaster Carbine, Double-Barreled

- **Published name:** Blaster carbine, double-barreled
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1200 credits
- **Base damage:** 3d8
- **Stun:** setting
- **Weight:** 1.9 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **Qualities:** inaccurate
- **Repo:** weapon-double-barreled-blaster-carbine
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed base damage/cost/weight and Inaccurate match the repo.
  - Repo does not encode the swift-action double-shot mode, 2x2 area resolution, two-shot consumption, or multi-shot-ability prohibition.
  - Ammo capacity 50 and standard stun setting are not structurally represented.

## 5. Blaster Carbine, Hunting

- **Published name:** Blaster carbine, hunting
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1000 credits
- **Base damage:** 3d8
- **Stun:** setting
- **Weight:** 2.1 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **Qualities:** inaccurate
- **Repo:** weapon-hunting-blaster-carbine
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Base table stats match the repo.
  - Repo does not encode the critical-hit d8-to-d10 die-size replacement, retractable stock, 50-shot power pack, or carbine attack-of-opportunity rule.

## 6. Blaster Carbine, Sporting

- **Published name:** Blaster carbine, sporting
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1000 credits
- **Base damage:** 3d8
- **Stun:** setting
- **Weight:** 2.6 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **Qualities:** inaccurate
- **Repo:** weapon-sporting-blaster-carbine
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Base stats match the repo.
  - Repo stores Inaccurate as unconditional; source explicitly suppresses Inaccurate while wielded two-handed.
  - Repo does not encode the 100-shot power pack or carbine attack-of-opportunity rule.

## 7. Blaster Pistol, Bluebolt

- **Published name:** Blaster pistol, bluebolt
- **Group:** Pistol
- **Size:** Medium
- **Cost:** 850 credits
- **Base damage:** 3d8
- **Stun:** setting
- **Weight:** 1.6 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** inaccurate
- **Repo:** weapon-bluebolt-blaster-pistol
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed base stats and Inaccurate match the repo.
  - Repo does not encode the source exception extending stun range to 8 squares or the additional shot consumed by every stun attack.
  - Power-pack capacity 50 is not structurally represented.

## 8. Blaster Pistol, Snap Shot

- **Published name:** Blaster pistol, snap shot
- **Group:** Pistol
- **Size:** Tiny
- **Cost:** 250 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 1 kg
- **Damage type:** single: energy
- **Availability:** illegal
- **Qualities:** none
- **Repo:** weapon-snap-shot-blaster-pistol
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Damage/cost/weight/availability match the repo.
  - Source uses normal pistol range; the repo legacy range string of 10 squares must not become a hard maximum.
  - Repo does not structurally represent the one-shot power pack or +5 concealment bonus.

## 9. Blaster Rifle, Heavy Assault

- **Published name:** Blaster rifle, heavy assault
- **Group:** Rifle
- **Size:** Large
- **Cost:** 3000 credits
- **Base damage:** 3d10
- **Stun:** none
- **Weight:** 7 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** inaccurate, autofireOnly
- **Repo:** weapon-heavy-assault-blaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Base table stats match the repo.
  - ROF A means the weapon is autofire-only; preserve that separately from simply having autofire capability.
  - Repo does not encode the critical-hit d10-to-d12 die-size replacement or 50-shot capacity.

## 10. Concealed Dart Launcher

- **Published name:** Concealed dart launcher
- **Group:** Exotic Weapon
- **Size:** Small
- **Cost:** 1900 credits
- **Base damage:** -
- **Stun:** native-stun
- **Weight:** 0.5 kg
- **Damage type:** single: piercing
- **Availability:** illegal
- **Qualities:** none
- **Repo:** weapon-concealed-dart-launcher
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo rangeProfile heavy-weapons is incorrect; the source explicitly says use pistol range.
  - Repo does not encode the native 3d8 stun payload, six-dart bundle, poison payload capability, or +5 concealment bonus.
  - Unlike normal stun settings, its stun damage is not capped at 6 squares.

## 11. Razor Bug

- **Published name:** Razor bug
- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 800 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: slashing
- **Availability:** illegal, Rare
- **Qualities:** accurate
- **Repo:** weapon-razor-bug
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo damage type kinetic is incorrect; published type is Slashing.
  - Accurate and simple-weapon range classification are correct source qualities.
  - Thrown by hand is a physical delivery method, but the source explicitly says not to use thrown-weapon ranges.
  - Repo does not classify the weapon as biotech.

## 12. Thud Bug

- **Published name:** Thud bug
- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 800 credits
- **Base damage:** 2d8
- **Stun:** conditional-stun-choice
- **Weight:** 0.5 kg
- **Damage type:** single: bludgeoning
- **Availability:** illegal, Rare
- **Qualities:** none
- **Repo:** weapon-thud-bug
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo Accurate trait is unsupported and must not be treated as source authority.
  - Repo damage type kinetic is incorrect; published type is Bludgeoning.
  - Optional stun is allowed only at point-blank or short range.
  - Repo does not classify the weapon as biotech.

## 13. ARC-9965 Blaster Rifle

- **Published name:** ARC-9965
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1400 credits
- **Base damage:** 3d8
- **Stun:** setting
- **Weight:** 5 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** accurate
- **Repo:** weapon-arc-9965-blaster
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed damage/cost/weight and Accurate/ROF match the repo.
  - Repo does not encode the 40-shot power pack, ten-shot autofire consumption, retractable stock, or standard stun mode.

## 14. Heavy Blaster Cannon

- **Published name:** Heavy blaster cannon
- **Group:** Heavy Weapon
- **Size:** Huge
- **Cost:** 4200 credits
- **Base damage:** 4d12
- **Stun:** none
- **Weight:** 22 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** inaccurate, areaEffect
- **Repo:** weapon-heavy-blaster-cannon
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Base table stats, Inaccurate, and Area Attack match the repo.
  - Repo does not encode the brace action, temporary Large effective size, unbraced wielder-size prohibition, exact primary/adjacent area resolution, or 10-shot power pack.

---

# Claude implementation boundary

This handoff authorizes **authority-file/schema normalization only**. It does not authorize production weapon edits or creation. Preserve the standalone Legacy JSON as the source package, normalize prior standalone authority entries to schema v2.6, add/update verifier coverage for the normalized fields, and stop before mutating runtime or pack data.

Acceptance checks:

- 14 Legacy claims
- 12 repo-present + 2 repo-missing = 14
- exactly 2 base Accurate claims
- exactly 6 base Inaccurate claims
- exactly 2 biotech claims
- every attack profile has `criticalEffects[]`, `activationRequirements[]`, and `triggeredEffects[]`
- every record has `technologyClassification`, `deliveryMethod`, `wieldingRules[]`, and `triggeredEffects[]`
- no rolling/master authority mutation
- no production pack mutation

---

## Repo verification notes (Claude)

- 14 records match the 14 Phase 1K Legacy Era records one-to-one (names, repo ids/current names, pending-rename flags, description and table pages); 12 present, 2 missing. Counts verified: 2 base Accurate, 6 base Inaccurate, 2 biotech.
- The five schema edits above are implemented as the repo contract `weapon-authority-schema-v2.6` and applied to Core, KOTOR, Galaxy at War, Force Unleashed, Clone Wars and Jedi Academy as structural defaults.
- Aliases normalized in this file (structure only, no published fact changed): see `schemaNormalization` in the JSON and the rolling authority Phase 2 section. Tehk'la Blade `schemaFamily.branch` was corrected from ranged to melee (Table 5-1 Melee Weapons).
- The verifier enforces: Hunting Carbine d8->d10 and Heavy Assault Rifle d10->d12 critical transformations with unchanged base dice; Sporting Carbine table Inaccurate with a two-handed override; Razor Bug / Thud Bug biotech with simple-weapon ranges and no thrown quality; Heavy Blaster Cannon canonical Huge with braced effective size Large; Bluebolt 8-square stun and 2-shot stun consumption; Concealed Dart Launcher pistol ranges and uncapped native stun; ARC-9965 10-shot autofire; Double-Barreled double-shot mode (swift, 2 shots, area, multi-shot prohibition); Shock Whip automatic 2d6 shock; Long-Handle Lightsaber not permanently two-handed and still cross-published.
- Schema v2.7 structural defaults added (`damageMultiplier: 1`, `conditionalRangeRules: []`, `resourceProfiles: []`).
