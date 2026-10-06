# Rebellion Era Campaign Guide Weapons - Phase 2I Standalone Book Authority

**Repo files:** `data/audits/item-weapons-phase-2i-rebellion-era-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1 and the schema v2.7 contract.

**Status:** `REBELLION_ERA_PHASE_2I_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 12 Rebellion Era weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **12**
- Repo-present: **9**
- Repo-missing: **3**
- Melee claims: **4**
- Ranged claims: **8**
- Cross-publication claims: **2**
- Explicit Accurate claims: **1**
- Explicit Inaccurate claims: **1**
- Area-effect claims: **5**
- Double-weapon claims: **1**

## Source authority

- Fast/searchable layer: `Rebellion Era Campaign Guide_djvu.txt`
- Final table/layout authority: `Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf`
- Table 3-1 (Melee Weapons), p.48: visually verified
- Weapon descriptions, pp.48-50: visually verified
- Table 3-2 (Ranged Weapons), p.50: visually verified
- Existing repository values are comparison evidence only.

## Repo reconciliation

Repo-missing canonical identities:

- Energy Lance
- Power Lance
- Axe

Phase 1 alias/edit mappings that must preserve the existing production ID later:

- `Gaderffii` -> repo `weapon-tusken-gaderffii-stick` / current name `Tusken Gaderffii Stick`
- `Merr-Sonn PLX-2M Portable Missile Launcher` -> repo `weapon-plx-2m-portable-missile-launcher` / current name `PLX-2M Portable Missile Launcher`
- `BlasTech 500 Riot Gun` -> repo `weapon-espo-500-riot-gun` / current name `ESPO 500 Riot Gun`

## Cross-publication guardrails

- **BlasTech 500 Riot Gun:** same production identity as the Clone Wars p.61 claim, but the publications conflict mechanically. Rebellion prints 1,200 credits, 2.2 kg, no Inaccurate footnote, -1 single-shot attack, and +2 equipment to autofire; Clone Wars previously certified 1,000 credits, 4.5 kg, Inaccurate, and -2 single-shot attack. Keep `REVIEW_PRECEDENCE_BEFORE_CONTENT_MUTATION`.
- **Flechette Launcher:** same production identity already certified from Force Unleashed p.199. The Rebellion claim is compatible and must not create a duplicate weapon.

---

# Required schema additions / edits for Claude

Rebellion Era requires a narrow increment from normalized `weapon-authority-schema-v2.6` to **proposed v2.7**. Apply these changes to the **authority schema only**, normalize structural defaults backward into already-certified books, and do **not** modify production packs in this task.

## 1. attack-profile-damage-multiplier

**Schema change:** add `attackProfiles[].damageMultiplier` as a numeric multiplier applied after the structured dice expression. Default is `1`.

**Why Rebellion requires it:** Miniature Proton Torpedo Launcher single-target mode deals `6d10x2` while the persistent/default area profile remains `6d10`.

**Normalize prior books:** append `damageMultiplier: 1` to prior attack profiles unless a source-certified profile explicitly uses a multiplier. Never rewrite the base dice to simulate the multiplier.

## 2. conditional-range-scaling

**Schema change:** add `attackProfiles[].conditionalRangeRules[]` with structured `{when, operation, multiplier, appliesTo}` rules.

**Why Rebellion requires it:** the SG-4 blaster mode has half range underwater, while its harpoon mode has half range when fired out of water.

**Normalize prior books:** append `conditionalRangeRules: []` to prior attack profiles. Do not convert repo range strings into source range rules.

## 3. multiple-independent-resource-profiles

**Schema change:** add `canonicalStats.resourceProfiles[]` for weapons that use multiple independent power/ammunition systems. Ordinary one-resource records keep `[]` and continue using `canonicalStats.resource`.

**Why Rebellion requires it:**
- Energy Lance requires two energy cells to operate and a separate power pack for its plasma-bolt mode.
- SG-4 uses a 50-shot blaster power pack and independently loaded harpoon rounds.

**Normalize prior books:** append `resourceProfiles: []` by default and populate it only from explicit published rules.

## Required normalization guardrails

- Do not update a rolling/master weapon authority from this package.
- Do not mutate production packs, template/schema runtime, actors, feats, or talents during certification.
- Do not create Energy Lance, Power Lance, or Axe during this phase.
- Repo fields are comparison evidence only.
- Do not resolve the BlasTech 500 Riot Gun Clone Wars vs Rebellion Era precedence conflict in this book-local pass.
- Do not create a second Flechette Launcher identity; Rebellion Era and Force Unleashed are the same production identity.
- Do not inherit repo Inaccurate onto PLX-2M or Miniature Proton Torpedo Launcher; Rebellion Table 3-2 does not mark them Inaccurate.
- Do not flatten SG-4 3d8 blaster and 2d6 harpoon modes into one base damage string.
- Do not lose SG-4 explicit 2d8 stun in blaster mode.
- Do not collapse Miniature Proton Torpedo Launcher 6d10x2 single-target damage into permanent 6d10x2 base damage.
- Do not turn Gas Grenade into ordinary lethal damage; the table prints no normal damage and 4d6 stun plus its Fortitude/condition-track/gas-cloud rules.
- Do not replace source damage types with repo kinetic/energy placeholders when the Rebellion tables print Piercing, Bludgeoning, or no type.
- Do not infer a new numeric bayonet stat line for Siang Lance; its bayonet use should reference the already-certified Core Bayonet identity.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_7_NORMALIZED_THROUGH_REBELLION_ERA`

---

# Rebellion Era book entries

## 1. Energy Lance

- **Published name:** Energy lance
- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 3500 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** and: piercing / energy
- **Availability:** restricted
- **Qualities:** none
- **Repo:** MISSING
- **Repo comparison:** MISSING_RECORD
  - Missing production record.
  - Large advanced melee weapon; a Medium Ride-trained mounted wielder may use it one-handed.
  - A Medium unmounted wielder takes -1 on attacks with the weapon.
  - Ranged plasma mode functions as a blaster carbine with no stun setting and uses a 50-shot power pack.
  - Weapon itself requires two energy cells; melee and ranged attacks both function underwater.

## 2. Power Lance

- **Published name:** Power lance
- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 2500 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** and: bludgeoning / energy
- **Availability:** licensed
- **Qualities:** none
- **Repo:** MISSING
- **Repo comparison:** MISSING_RECORD
  - Missing production record.
  - Power lance is an energy lance without the plasma-bolt firing capability.
  - Retains the mounted one-hand balance rule and Medium unmounted -1 attack rule.
  - Requires two energy cells.

## 3. Axe

- **Published name:** Axe
- **Group:** Simple Melee Weapon
- **Size:** Medium
- **Cost:** 35 credits
- **Base damage:** 1d8
- **Stun:** none
- **Weight:** 2 kg
- **Damage type:** single: slashing
- **Availability:** common
- **Qualities:** thrown
- **Repo:** MISSING
- **Repo comparison:** MISSING_RECORD
  - Missing production record.
  - Table footnote explicitly permits the axe to be thrown.
  - Published melee damage is 1d8 Slashing; no additional special combat rule is printed.
- **Source footnotes/notes:**
  - Can be thrown.

## 4. Gaderffii

- **Published name:** Gaderffii
- **Group:** Simple Melee Weapon
- **Size:** Large
- **Cost:** 60 credits
- **Base damage:** 2d4/2d4
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** and: bludgeoning / slashing
- **Availability:** common
- **Qualities:** doubleWeapon
- **Repo:** weapon-tusken-gaderffii-stick
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo alias maps to the canonical Gaderffii identity but its printed stats are wrong for this source claim.
  - Source prints 2d4/2d4, cost 60, weight 5 kg, and Bludgeoning and Slashing.
  - Source explicitly makes it a double weapon; a full-round attack with both ends imposes -10 to each attack before feat/talent reductions.

## 5. Siang Lance

- **Published name:** Siang lance
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 2000 credits
- **Base damage:** 3d8
- **Stun:** setting (same as base unless source overrides)
- **Weight:** 4 kg
- **Damage type:** single: energy
- **Availability:** illegal, Rare
- **Qualities:** accurate
- **Repo:** weapon-siang-lance
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed damage/cost/weight/availability and Accurate match the repo.
  - Source identifies the weapon as an ancient sporting blaster rifle; repo heavy-weapons range classification is not supported by the source.
  - Source allows attacks of opportunity using either the ranged lance shot or the affixed bayonet as a melee weapon.
  - Power-pack capacity is 100 shots and a standard stun setting is printed in the table.
- **Source footnotes/notes:**
  - Accurate weapon: no penalty at short range.

## 6. Merr-Sonn PLX-2M Portable Missile Launcher

- **Published name:** Merr-Sonn PLX-2M
- **Group:** Heavy Weapon
- **Size:** Large
- **Cost:** 2250 credits
- **Base damage:** 8d6
- **Stun:** none
- **Weight:** 48 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** areaEffect
- **Repo:** weapon-plx-2m-portable-missile-launcher
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed damage/cost/weight match, but Rebellion Era does not mark the PLX-2M Inaccurate; repo Inaccurate is unsupported by this claim.
  - Source gives a 3-square burst area and direct/heat-seeking/gravity-activated modes.
  - Seeking/gravity modes impose -2 to Reflex Defense for the selected target type.
  - Launcher holds six missiles, reloads as a full-round action, and a six-missile pack costs 350 credits and weighs 8 kg.
  - Built-in microrepulsorlift means its 48 kg does not count against encumbrance while it is the character's active, drawn weapon.
- **Source footnotes/notes:**
  - Area attack weapon.

## 7. Miniature Proton Torpedo Launcher

- **Published name:** Mini-proton torpedo launcher
- **Group:** Heavy Weapon
- **Size:** Large
- **Cost:** 1500 credits
- **Base damage:** 6d10
- **Stun:** none
- **Weight:** 8 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** areaEffect
- **Repo:** weapon-miniature-proton-torpedo-launcher
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed damage/cost/weight match, but Rebellion Era does not mark the weapon Inaccurate; repo Inaccurate is unsupported by this claim.
  - Default mode is a 2-square blast area attack.
  - After every shot the wielder must spend a standard action to reset the launcher; capacity is four torpedoes.
  - A swift action switches to single-target mode: no area attack, 6d10x2 damage, and -10 to attack targets smaller than Huge.
- **Source footnotes/notes:**
  - Area attack weapon.

## 8. BlasTech 500 Riot Gun

- **Published name:** Blastech 500 riot gun
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1200 credits
- **Base damage:** 3d8
- **Stun:** setting (same as base unless source overrides)
- **Weight:** 2.2 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** none
- **Repo:** weapon-espo-500-riot-gun
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo numeric values match the Rebellion Era table but do not encode the published special modifiers or stun setting.
  - Rebellion Era single-shot mode imposes -1 to ranged attack rolls and autofire attacks gain a +2 equipment bonus.
  - Rebellion Era does not mark this weapon Inaccurate.
  - This claim conflicts with the earlier Clone Wars claim on cost, weight, Inaccurate status, and single-shot penalty; do not select precedence here.
- **Cross-published:**
  - Clone Wars Campaign Guide p.61: same production identity; mechanically conflicting earlier claim; precedence unresolved

## 9. SG-4 Blaster Rifle

- **Published name:** SG-4 blaster rifle
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 400 credits
- **Base damage:** 3d8
- **Stun:** setting 2d8
- **Weight:** 5 kg
- **Damage type:** single: energy
- **Availability:** military
- **Qualities:** none
- **Repo:** weapon-sg-4-blaster-rifle
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo flattens the two source attack profiles into a single damage string.
  - Blaster mode is 3d8 Energy, S/A, with explicit 2d8 stun and a 50-shot power pack.
  - Harpoon mode is 2d6 Piercing, S only, and requires a swift-action reload between every shot.
  - Blaster mode fired underwater and harpoon mode fired out of water each have their range halved; this must be represented conditionally rather than by mutating the base rifle range.

## 10. Flechette Launcher

- **Published name:** Flechette launcher
- **Group:** Rifle
- **Size:** Large
- **Cost:** 1100 credits
- **Base damage:** 3d8
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** single: piercing
- **Availability:** military
- **Qualities:** inaccurate, areaEffect
- **Repo:** weapon-flechette-launcher
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo damage/cost/weight and Inaccurate match, but repo damage type kinetic conflicts with printed Piercing.
  - Repo does not encode the 1-square splash area, four-shot canister, 50-credit replacement cost, Area Attack quality, or multi-shot prohibition.
  - Rebellion Era claim agrees mechanically with the already-certified Force Unleashed claim; preserve one production identity.
- **Cross-published:**
  - Force Unleashed Campaign Guide p.199: same production identity; compatible earlier publication
- **Source footnotes/notes:**
  - Inaccurate weapon: cannot fire at long range.
  - Area attack weapon.

## 11. Concussion Grenade

- **Published name:** Concussion grenade
- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 400 credits
- **Base damage:** 8d6
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: bludgeoning
- **Availability:** military
- **Qualities:** areaEffect, thrown
- **Repo:** weapon-concussion-grenade
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo damage/cost/weight match but repo kinetic conflicts with printed Bludgeoning.
  - Source resolves the grenade as a 2-square burst area attack against Reflex, full damage on hit and half on miss with Evasion interaction.
  - Repo does not represent the published area geometry/effect.

## 12. Gas Grenade

- **Published name:** Gas grenade
- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 250 credits
- **Base damage:** -
- **Stun:** native-stun 4d6
- **Weight:** 0.5 kg
- **Damage type:** none
- **Availability:** military
- **Qualities:** areaEffect, thrown
- **Repo:** weapon-gas-grenade
- **Repo comparison:** MECHANICS_INCORRECT
  - Repo does not represent the printed 4d6 stun damage and uses an unsupported Energy damage type where the table prints no type.
  - Source attacks Fortitude Defense in a 4-square blast; hit moves target -2 CT (-1 with Evasion), miss has no effect.
  - Creatures protected from atmospheric hazards are unaffected.
  - Blast area creates concealment until the end of the attacker's next turn.

---

# Claude implementation boundary

This handoff authorizes **book-local authority-file/schema normalization only**. It does not authorize production weapon edits or creation. Preserve this standalone Rebellion JSON as the source package, normalize prior standalone authority entries to proposed schema v2.7 defaults, add/update verifier coverage for the normalized fields and the Rebellion claims, and stop before mutating runtime or pack data.

Acceptance checks:

- 12 Rebellion Era claims
- 9 repo-present + 3 repo-missing = 12
- 4 melee + 8 ranged = 12
- exactly 1 base Accurate claim (Siang Lance)
- exactly 1 base Inaccurate claim (Flechette Launcher)
- exactly 2 cross-publication claims
- BlasTech 500 Riot Gun remains conflict-gated
- PLX-2M and Miniature Proton Torpedo Launcher are not marked Inaccurate by Rebellion
- Miniature Proton Torpedo Launcher single-target profile has damageMultiplier = 2
- SG-4 has two attack profiles with opposite environment-dependent half-range rules
- Energy Lance and SG-4 use resourceProfiles[] for independent resources
- every attack profile has damageMultiplier and conditionalRangeRules[]
- every record has resourceProfiles[]
- no rolling/master authority mutation
- no production pack mutation

---

## Repo verification notes (Claude)

- 12 records match the 12 Phase 1 Rebellion Era records one-to-one (names, repo ids/current names, pending-rename flags, pages); 9 present, 3 missing. Counts verified: 4 melee + 8 ranged, 1 base Accurate, 1 base Inaccurate, 5 area-effect, 1 double weapon, 2 cross-published identities.
- The three schema edits above are implemented as the repo contract `weapon-authority-schema-v2.7` and applied to every earlier standalone book and Core as structural defaults (`damageMultiplier: 1`, `conditionalRangeRules: []`, `resourceProfiles: []`). The verifier now requires them on every profile and record.
- Aliases normalized (structure only, see `schemaNormalization` in the JSON): Axe/Gaderffii weapon group vocabulary, Gaderffii double-weapon modeProfile, Siang Lance bayonet activation type. **Concussion Grenade descriptionPage:** the package says 48, Phase 1 says 49; the Phase 1 value was kept pending planner confirmation.
- Negative tests run (22 corruptions covering the multiplier, baked base damage, inherited Inaccurate, SG-4 range/stun/resource structure, Energy Lance cells, Riot Gun gate and Inaccurate, Flechette cross-publication, Gas Grenade damage/defense, Concussion Grenade type, Siang bayonet stats, Gaderffii penalty, Axe thrown, counts, and v2.7 defaults on a prior book): all failed the verifier and were restored.
