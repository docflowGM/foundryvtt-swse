# The Unknown Regions Weapons - Phase 2H Standalone Book Authority

**Repo files:** `data/audits/item-weapons-phase-2h-unknown-regions-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1L and the schema v2.6 contract.

**Status:** `UNKNOWN_REGIONS_PHASE_2H_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 14 The Unknown Regions weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **14**
- Repo-present: **10**
- Repo-missing: **4**
- Melee claims: **5**
- Ranged claims: **9**
- Explicit Accurate claims: **3**
- Explicit Inaccurate claims: **3**
- Explicit thrown claims: **2**
- Native-stun-only claims: **1**

## Source authority

- Fast/searchable layer: `Unknown Regions_djvu.txt`
- Final table/layout authority: `SW_Saga_The_Unknown_Regions.pdf`
- Chapter 2 melee descriptions, p.36: visually verified
- Table 2-1 (Melee Weapons), p.37: visually verified
- Table 2-2 (Ranged Weapons), p.38: visually verified
- Ranged weapon descriptions, pp.37-39: visually verified
- Existing repository values are comparison evidence only.

## Repo reconciliation

Repo-missing canonical identities:

- Blastsword
- Contact Stunner
- Survival Knife
- Vibro-Saw

Phase 1 alias/edit mappings that must preserve the existing production ID later:

- `Electropole` → repo `weapon-gungan-electropole` / current name `Gungan Electropole`
- `Verpine Shatter Gun` → repo `weapon-verpine-shattergun` / current name `Verpine Shattergun`

---

# Required schema additions / edits for Claude

**None.** The Unknown Regions fits the normalized `weapon-authority-schema-v2.6` established through Legacy Era.

Do not bump to v2.7 for cosmetic reshaping or for mechanics already representable by existing structures. This book deliberately exercises existing support for:

- alternate melee/thrown attackProfiles
- explicit stun profiles and native-stun-only weapons
- proficiencyRules[]
- conditionalModifiers[]
- conditionalDamageProfiles[]
- firingConstraints
- configurationStates[]
- triggeredEffects[]
- criticalEffects[]
- resource lifecycle and ammunition economics
- structured attackResolution target defense
- range profile overrides and hard maximum range

## Required normalization guardrails

- Do not update a rolling/master weapon authority from this package.
- Do not mutate production packs, template/schema runtime, actors, feats, or talents during certification.
- Do not create Blastsword, Contact Stunner, Survival Knife, or Vibro-Saw during this phase.
- Repo fields are comparison evidence only.
- Use normalized v2.6 field shapes even though the original Phase 2G handoff predates some structural normalization.
- Do not change Blastsword base size: it counts as light only for Weapon Finesse.
- Do not flatten Contact Stunner normal 1d4 and explicit 2d8 stun damage.
- Do not lose Electropole thrown use, Gungan proficiency substitution, or two-energy-cell requirement.
- Do not invent a storage capacity for Survival Knife; only the compass has an explicit mechanical benefit.
- Do not convert legacy repo range strings such as 10/12/18/25/30 squares into hard maximums unless the source explicitly establishes a maximum.
- Do not flatten Concussion Rifle or Squib Tensor Rifle into Reflex attacks; both explicitly target Fortitude.
- Do not turn Stun Pistol 3d6 into lethal base damage; it is native stun only with a 20-square maximum.
- Do not make Targeting Blaster Rifle base damage 3d8; 3d8 applies only after aiming.
- Do not apply Verpine Shatter Gun +1d10 before critical multiplication; the extra die is added after multiplication.
- Do not replace Table 2-2 Verpine Shatter Gun damage type Energy with prose-derived kinetic.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_6_NORMALIZED_THROUGH_UNKNOWN_REGIONS`

---

# The Unknown Regions book entries

## 1. Blastsword

- **Published name:** Blastsword
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 600 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 2.1 kg
- **Damage type:** single: energy
- **Availability:** common, Rare
- **Qualities:** none
- **Repo:** MISSING
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Missing production record.
  - Source classifies the weapon as Medium; it counts as a light weapon only for Weapon Finesse and must not have its base size rewritten.
  - Requires a power pack.

## 2. Contact Stunner

- **Published name:** Contact stunner
- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 700 credits
- **Base damage:** 1d4
- **Stun:** setting 2d8
- **Weight:** 1.1 kg
- **Damage type:** or: bludgeoning / energy
- **Availability:** licensed
- **Qualities:** none
- **Repo:** MISSING
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Missing production record.
  - Printed normal damage is 1d4 and printed stun damage is 2d8; do not flatten them into one damage value.
  - Source grants a +5 equipment bonus to Stealth checks made specifically to conceal the weapon.
  - Requires an energy cell.

## 3. Electropole

- **Published name:** Electropole
- **Group:** Advanced Melee Weapon
- **Size:** Medium
- **Cost:** 1500 credits
- **Base damage:** 2d8
- **Stun:** setting 2d8
- **Weight:** 1.3 kg
- **Damage type:** and: bludgeoning / energy
- **Availability:** licensed
- **Qualities:** thrown
- **Repo:** weapon-gungan-electropole
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo alias is Gungan Electropole; preserve the record identity but normalize the canonical display name later.
  - Repo 2d6 / 500 credits / 3 kg / kinetic conflicts with the published 2d8 / 1,500 credits / 1.3 kg / Bludgeoning and Energy.
  - Source explicitly allows the weapon to be thrown like a javelin.
  - Gungans with Weapon Proficiency (simple weapons) are considered proficient with the electropole.
  - Requires two energy cells.
- **Source footnotes/notes:**
  - Can be thrown.

## 4. Survival Knife

- **Published name:** Survival knife
- **Group:** Simple Weapon
- **Size:** Small
- **Cost:** 100 credits
- **Base damage:** 1d6
- **Stun:** none
- **Weight:** 1.4 kg
- **Damage type:** single: slashing
- **Availability:** common
- **Qualities:** inaccurate, thrown
- **Repo:** MISSING
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Missing production record.
  - Table footnote explicitly makes the weapon throwable and Inaccurate.
  - Built-in digital compass lets a character carrying the knife always determine north.
  - The hollow handle is described as storage for very small items but no capacity rule is published; do not invent one.
- **Source footnotes/notes:**
  - Can be thrown; inaccurate weapon.

## 5. Vibro-Saw

- **Published name:** Vibro-saw
- **Group:** Exotic Weapon
- **Size:** Large
- **Cost:** 400 credits
- **Base damage:** 2d10
- **Stun:** none
- **Weight:** 10 kg
- **Damage type:** single: slashing
- **Availability:** licensed
- **Qualities:** ignoresDR
- **Repo:** MISSING
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Missing production record.
  - Published weapon ignores a target's Damage Reduction.
  - Requires two energy cells.

## 6. Black-Powder Pistol

- **Published name:** Black-powder pistol
- **Group:** Pistol
- **Size:** Small
- **Cost:** 200 credits
- **Base damage:** 2d4
- **Stun:** none
- **Weight:** 1.4 kg
- **Damage type:** single: piercing
- **Availability:** common, Rare
- **Qualities:** inaccurate
- **Repo:** weapon-black-powder-pistol
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo base damage/cost/weight and Inaccurate match, but repo damage type kinetic conflicts with published Piercing.
  - Repo legacy range string 10 squares must not be treated as a hard maximum; source uses pistol range with the Inaccurate long-range prohibition.
  - Weapon must be reloaded after every shot; reload is a full-round action and multi-shot feats/talents are prohibited.
  - Published ammunition package is 50 shots for 5 credits.
  - Source provides explicit field-foraging ammunition checks and yield; preserve them structurally.
- **Source footnotes/notes:**
  - Inaccurate weapon: cannot attack targets at long range.

## 7. Concussion Rifle

- **Published name:** Concussion rifle
- **Group:** Rifle
- **Size:** Large
- **Cost:** 1800 credits
- **Base damage:** 2d10
- **Stun:** none
- **Weight:** 2.1 kg
- **Damage type:** single: energy (sonic)
- **Availability:** restricted, Rare
- **Qualities:** none
- **Repo:** weapon-concussion-rifle
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo base damage/cost/weight/availability largely match, but the source type is Energy (sonic), not a flat sonic-only type.
  - Source attacks Fortitude Defense rather than Reflex Defense.
  - A successful hit also knocks the target prone.
  - Power-pack capacity is 25 shots.
  - Repo legacy range string 25 squares must not become a hard maximum.

## 8. Crossbow

- **Published name:** Crossbow
- **Group:** Simple Weapon
- **Size:** Medium
- **Cost:** 300 credits
- **Base damage:** 1d8
- **Stun:** none
- **Weight:** 1.8 kg
- **Damage type:** single: piercing
- **Availability:** common
- **Qualities:** inaccurate
- **Repo:** weapon-crossbow
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo base damage/cost/weight and Inaccurate match, but repo damage type kinetic conflicts with published Piercing.
  - Repo legacy range string 18 squares must not become a hard maximum; use simple-weapon range with Inaccurate.
  - Capacity is one bolt and reloading requires a move action.
  - Case of 10 bolts costs 20 credits and weighs 0.6 kg.
  - Source says bolts can be handmade but supplies no DC/time/yield mechanic; do not invent one.
- **Source footnotes/notes:**
  - Inaccurate weapon: cannot attack targets at long range.

## 9. Heavy Slugthrower Pistol

- **Published name:** Heavy slugthrower pistol
- **Group:** Pistol
- **Size:** Medium
- **Cost:** 400 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 2.1 kg
- **Damage type:** single: piercing
- **Availability:** restricted
- **Qualities:** none
- **Repo:** weapon-heavy-slugthrower-pistol
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo base damage/cost/weight/availability match, but repo damage type kinetic conflicts with published Piercing.
  - Double Attack, Triple Attack, or Rapid Shot imposes an additional -1 attack penalty.
  - Ammo clip holds 8 shots; replacement clip costs 15 credits and weighs 0.1 kg.
  - Repo legacy range string 12 squares must not become a hard maximum.

## 10. Magna Caster

- **Published name:** Magna caster
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 2000 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 4 kg
- **Damage type:** single: piercing
- **Availability:** restricted
- **Qualities:** accurate
- **Repo:** weapon-magna-caster
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo damage/cost/weight/Accurate and exotic proficiency match, but repo damage type kinetic conflicts with published Piercing.
  - Source grants +5 equipment bonus to Stealth checks made specifically to snipe.
  - Uses a 10-bolt case; a replacement case costs 50 credits and weighs 1 kg.
  - No source-specific range override is published; retain the normalized Exotic Weapon range classification rather than inventing a special range.
- **Source footnotes/notes:**
  - Accurate weapon: no attack penalty at short range.

## 11. Squib Tensor Rifle

- **Published name:** Squib tensor rifle
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 10000 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 7.2 kg
- **Damage type:** single: energy
- **Availability:** restricted, Rare
- **Qualities:** none
- **Repo:** weapon-squib-tensor-rifle
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo base damage/type/cost/weight/availability match, but repo rangeProfile heavy-weapons conflicts with the source: use rifle range.
  - Source attacks Fortitude Defense rather than Reflex Defense.
  - Every successful hit moves the target -1 step on the condition track regardless of the damage roll.
  - Squibs treat the weapon as a rifle rather than an exotic weapon for proficiency.
  - Power-pack capacity is 15 shots.

## 12. Stun Pistol

- **Published name:** Stun pistol
- **Group:** Pistol
- **Size:** Small
- **Cost:** 550 credits
- **Base damage:** -
- **Stun:** native-stun 3d6
- **Weight:** 1 kg
- **Damage type:** single: energy
- **Availability:** licensed
- **Qualities:** none
- **Repo:** weapon-stun-pistol
- **Repo comparison:** MECHANICS_INCORRECT
  - Published base damage is none; 3d6 is native stun damage, not ordinary lethal base damage.
  - Source exception allows attacks out to 20 squares instead of the usual 6-square stun limit.
  - Repo legacy range string 10 squares is incorrect as an effective cap.
  - Power-pack capacity is 50 shots.

## 13. Targeting Blaster Rifle

- **Published name:** Targeting blaster rifle
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1000 credits
- **Base damage:** 3d6
- **Stun:** setting 3d6
- **Weight:** 4 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **Qualities:** accurate
- **Repo:** weapon-targeting-blaster-rifle
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo flattens damage as 3d6 or 3d8; canonical persistent base damage is 3d6.
  - If the wielder aims before the attack, the weapon dice change from d6s to d8s for that attack.
  - Weapon is Accurate and has a standard stun setting.
  - It explicitly has no folding stock.
  - Assembling or disassembling requires a full-round action.
  - Power-pack capacity is 50 shots.
- **Source footnotes/notes:**
  - Accurate weapon: no attack penalty at short range.

## 14. Verpine Shatter Gun

- **Published name:** Verpine shatter gun
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 15000 credits
- **Base damage:** 3d10
- **Stun:** none
- **Weight:** 1 kg
- **Damage type:** single: energy
- **Availability:** illegal, Rare
- **Qualities:** accurate
- **Repo:** weapon-verpine-shattergun
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo alias Verpine Shattergun maps to this identity; preserve ID and normalize display name later.
  - Published table stats damage/cost/weight/type/availability/Accurate match the repo.
  - Repo rangeProfile heavy-weapons conflicts with the source: Verpine shatter gun uses pistol range.
  - On a critical hit it deals +1d10 damage after normal critical multiplication.
  - If the weapon takes any damage it becomes disabled until repaired with Mechanics.
  - Verpines treat it as a pistol rather than an exotic weapon for proficiency.
  - Special 50-shot ammunition clip costs 1,000 credits.
- **Source footnotes/notes:**
  - Accurate weapon: no attack penalty at short range.
  - Table 2-2 lists damage type Energy; descriptive prose uses kinetic language but does not override the table stat.

---

# Claude implementation boundary

This handoff authorizes **book-local authority-file implementation and verifier coverage only**. It does not authorize production weapon edits or creation. Add the standalone Unknown Regions JSON/MD to the repository, make the verifier validate this book against the established Phase 1 identity records and v2.6 contract, and stop before mutating runtime or pack data.

Acceptance checks:

- 14 Unknown Regions claims
- 10 repo-present + 4 repo-missing = 14
- exactly 5 melee + 9 ranged claims
- exactly 3 base Accurate claims: Magna Caster, Targeting Blaster Rifle, Verpine Shatter Gun
- exactly 3 base Inaccurate claims: Survival Knife, Black-Powder Pistol, Crossbow
- exactly 2 explicitly throwable melee weapons: Electropole and Survival Knife
- Blastsword remains Medium and counts as light only for Weapon Finesse
- Contact Stunner preserves 1d4 normal / 2d8 stun and +5 concealment Stealth
- Electropole preserves 2d8, thrown use, Gungan simple-proficiency substitution, and two energy cells
- Vibro-Saw ignores DR and requires two energy cells
- Black-Powder Pistol enforces one-shot/full-round reload/multi-shot prohibition and preserves the ammunition-foraging procedure
- Concussion Rifle targets Fortitude and knocks prone on a hit
- Heavy Slugthrower Pistol applies the extra -1 with Double Attack, Triple Attack, or Rapid Shot
- Magna Caster grants +5 Stealth only for sniping and uses a 10-bolt case
- Squib Tensor Rifle targets Fortitude, applies -1 CT on every hit regardless of damage, uses rifle range, and grants Squib rifle proficiency substitution
- Stun Pistol has no lethal base damage and uses native 3d6 stun out to 20 squares
- Targeting Blaster Rifle remains base 3d6; aim changes d6s to d8s for that attack only; no folding stock
- Verpine Shatter Gun critical adds +1d10 after critical multiplication, disables on any weapon damage until repaired, uses pistol range, and grants Verpine pistol proficiency substitution
- every attack profile has `criticalEffects[]`, `activationRequirements[]`, `triggeredEffects[]`, and `conditionalModifiers[]`
- every record has `technologyClassification`, `deliveryMethod`, `wieldingRules[]`, and `triggeredEffects[]`
- no schema version bump unless a genuinely unrepresentable source mechanic is demonstrated
- no rolling/master authority mutation
- no production pack mutation
- no runtime mutation
- no missing weapon creation

Claude should run the existing weapon-authority verifier and census check after adding this package, intentionally corrupt representative 2H fields to confirm the negative tests fail, restore them, then commit and push the book as one checkpoint.

---

## Repo verification notes (Claude)

- 14 records match the 14 Phase 1L Unknown Regions records one-to-one (names, repo ids/current names, pending-rename flags, description and table pages); 10 present, 4 missing (Blastsword, Contact Stunner, Survival Knife, Vibro-Saw). Counts verified: 5 melee + 9 ranged, 3 base Accurate, 3 base Inaccurate, 2 explicitly throwable melee weapons, 1 native-stun-only weapon.
- No schema change: the book is represented entirely by existing v2.6 structures; the contract version stays `weapon-authority-schema-v2.6`. No normalization of the file was needed.
- The verifier enforces the book-specific guardrails: Blastsword stays Medium with a Weapon Finesse-only light rule; Contact Stunner keeps 1d4 normal / 2d8 explicit stun and the +5 Stealth concealment bonus; Electropole keeps 2d8, a thrown profile, Gungan simple-proficiency substitution and two energy cells; Survival Knife thrown+Inaccurate with no invented storage capacity; Vibro-Saw ignores DR and takes two energy cells; Black-Powder Pistol one-shot full-round reload with multi-shot prohibition and the foraging construction rule; Concussion Rifle and Squib Tensor Rifle target Fortitude; Stun Pistol native 3d6 stun only with a 20-square maximum and no lethal base damage; Targeting Blaster Rifle base 3d6 with aim d6->d8 for that attack only; Verpine Shatter Gun Energy damage type, +1d10 after critical multiplication, pistol range and Verpine proficiency substitution; legacy repo range strings are never treated as hard maximums.
- File aliases normalized (structure only, see `schemaNormalization` in the JSON): proficiency classifications, Heavy Slugthrower modifier target, Stun Pistol allowedBands, Targeting Blaster Rifle conditional-damage operation and stun mode, Verpine fragile effect mirrored to its profile. Vibro-Saw's source-established DR bypass is the first outside the Lightsaber group (`ignoresDRNonLightsaberAllowed`).
- Negative tests run (16 corruptions: Blastsword size, Contact Stunner stun, missing Electropole thrown profile, invented Survival Knife storage, Vibro-Saw DR, Concussion Reflex, Squib range, Stun Pistol lethal base / 10-square cap, Targeting 3d8 base, Verpine kinetic / pre-multiplication crit, Black-Powder reload action, Crossbow Accurate / hard max, count mismatch): all failed the verifier and were restored.
- Schema v2.7 structural defaults added (`damageMultiplier: 1`, `conditionalRangeRules: []`, `resourceProfiles: []`).
- Schema v2.8 (`damage.mode: "fixed"`) added to the contract; this book needed no change.
- Schema v2.9: `canonicalStats.ammo` overlay applied from the planner ammo normalization and `payloadProfiles[].damageMultiplier` defaulted to 1; no published fact changed.
