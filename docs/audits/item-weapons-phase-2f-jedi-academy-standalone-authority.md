**Repo files:** `data/audits/item-weapons-phase-2f-jedi-academy-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1F and the schema v2.5 contract.

# Jedi Academy Training Manual Weapons - Phase 2F Standalone Book Authority

**Status:** `JEDI_ACADEMY_PHASE_2F_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 16 Jedi Academy weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **16**
- Repo-present: **14**
- Repo-missing: **2**
- Lightsaber claims: **12**
- Other melee claims: **2**
- Ranged claims: **2**

## Source authority

- Fast/searchable layer: `Jedi Academy Training Manual_djvu.txt`
- Final table/layout authority: `SW Saga - Jedi Academy Training Manual (optimized).pdf`
- Table 3-1 (Melee Weapons), p.52: visually verified
- Table 3-4 (Ranged Weapons), p.61: visually verified
- Retrosaber Holocron lesson, p.50: visually verified; it is not separately tabled
- Existing repository values are comparison evidence only.

## Cross-publication guardrail

Guard Shoto and Lightsaber Pike are the same production identities already published in Force Unleashed. Long-Handle Lightsaber is also published later in Legacy Era. This handoff certifies the **Jedi Academy claims only** and does not choose cross-book precedence or create duplicate production identities.

---

# Required schema additions / edits for Claude

Apply these changes to the **authority schema only**, then append the new fields/defaults to already-certified Core, KOTOR, Galaxy at War, Force Unleashed, and Clone Wars entries so all books stay normalized. Do **not** modify production packs in this task.

## 1. wielding-rules

**Schema change:** Add canonicalStats.wieldingRules[] for source-defined handedness, effective-size choices, ability-bonus substitutions, and wielder-size-dependent eligibility.

**Why Jedi Academy requires it:**
- Archaic/modern lightfoils may count as Small when beneficial and cannot be wielded two-handed.
- Great lightsaber gates certain feat/talent interactions by wielder size rather than prohibiting smaller wielders outright.
- Long-handle lightsaber offers a two-handed choice between doubled Strength and 2d10 base damage.

**Normalize prior books:** Append wieldingRules:[] by default. Backfill already-certified Core/KOTOR/Force Unleashed handedness or effective-size exceptions without inferring from weapon names or repo tags.

## 2. state-machine

**Schema change:** Add canonicalStats.stateMachine for forced timed transitions between weapon states, including duration, forced next state, and lockouts.

**Why Jedi Academy requires it:**
- Retrosaber transitions normal -> 2d10 overcharge -> forced 2d4 burnout for one round -> normal, and cannot be dialed up during burnout.

**Normalize prior books:** Append stateMachine:null by default. Existing selectable modes remain modeProfiles unless they have forced temporal transitions.

## 3. activation-requirements

**Schema change:** Add attackProfiles[].activationRequirements[] and equivalent mode/quality gates for feat, size, wielding, or choice prerequisites.

**Why Jedi Academy requires it:**
- Long Haft Form alone unlocks the extra haft-end/double-weapon profiles on the long-handle lightsaber and lightsaber pike.
- The great lightsaber has wielder-size-gated feat/talent interaction.

**Normalize prior books:** Append [] by default. Backfill already-certified conditional profiles and modes rather than making them always available.

## 4. conditional-modifier-targets

**Schema change:** Expand conditionalModifiers[].target beyond attack/damage to structured defenses, skill checks, and cumulative check penalties.

**Why Jedi Academy requires it:**
- Crossguard lightsaber changes Block cumulative Use the Force penalties from -5 to -2 and separately imposes -2 on Deflect.
- Dual-phase extended mode imposes -2 Reflex Defense only against adjacent attackers.
- Guard shoto grants +2 equipment to Use the Force checks for Block/Deflect.

**Normalize prior books:** Keep the existing conditionalModifiers[] container but normalize target vocabulary across all prior books. Do not create ad hoc prose-only numeric modifiers.

## 5. triggered-effects-and-modifier-policy

**Schema change:** Add attackProfiles[].triggeredEffects[] plus modifierPolicy for delayed/repeated damage or control effects and for explicitly included/excluded damage modifiers.

**Why Jedi Academy requires it:**
- Lightwhip can initiate grab/grapple on hit and deals base weapon damage at end of a held target turn while excluding Strength, half heroic level, and all other modifiers.

**Normalize prior books:** Append triggeredEffects:[] by default. Backfill already-certified recurring effects such as Clone Wars Garrote and condition-triggered bonus damage only where the source clearly specifies timing.

## 6. stun-activation-semantics

**Schema change:** Extend stun authority with activation {timing, action} so a per-attack stun choice is distinct from a persistent alternate setting.

**Why Jedi Academy requires it:**
- San-ni staff lets the wielder designate the energy couplings at the time the attack is made, with no swift-action mode switch.

**Normalize prior books:** Backfill prior stun weapons with source-correct timing: persistent setting, per-attack declaration, native stun-only, or ammunition-dependent. Do not assume every Yes table entry uses the same action economy.

## 7. construction-rules

**Schema change:** Add canonicalStats.constructionRules for weapon-specific construction DCs, crystal/effect inheritance, and mutually exclusive construction configurations.

**Why Jedi Academy requires it:**
- Retrosaber has base construction DC 25.
- Dual-phase lightsaber can use one crystal across both phases or replace the extended phase with a second crystal whose effect is mutually exclusive with the default crystal.

**Normalize prior books:** Append constructionRules:null by default. Populate only where a weapon source explicitly publishes construction mechanics.

## 8. physical-configuration-states

**Schema change:** Add canonicalStats.configurationStates[] for noncombat physical states with transition action and usability/storage effects.

**Why Jedi Academy requires it:**
- Wan-shen breaks into four Small objects and requires a full-round action to assemble/disassemble.
- Archaic lightsaber power cord can become disconnected from its external power pack.

**Normalize prior books:** Append configurationStates:[] by default. Backfill source-certified cases such as Clone Wars Snap Baton and Czerka Adventurer where useful.

## Required normalization guardrails

- Preserve every certified prior-book fact while adding structural defaults/nulls.
- Defaults/nulls are schema normalization, not new rules.
- Do not turn a conditional profile into an always-active profile.
- Do not infer Retrosaber table stats that Jedi Academy does not print.
- Do not convert Great Lightsaber's feat/talent size gate into a blanket wielding prohibition.
- Do not infer damage type for the 1d6 haft ends of Long-Handle Lightsaber or Lightsaber Pike.
- Do not make Discblade returning an innate property.
- Do not modify `packs/weapons.db`, `template.json`, runtime resolvers, actors, feats, or talents in this authority-normalization task.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_5_NORMALIZED_THROUGH_JEDI_ACADEMY`

---

# Jedi Academy book entries

## 1. Guard Shoto

- **Published name:** Shoto, guard
- **Group:** Lightsaber
- **Size:** Small
- **Cost:** 7000 credits
- **Base damage:** 2d4
- **Stun:** none
- **Weight:** 1 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-guard-shoto
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Table stats match current repo.
  - Repo does not structurally represent the +2 Block/Deflect equipment bonus.
  - Phrik DR protection is conditional on a phrik-laced handle; do not make it unconditional.
  - Repo Throwable trait is not established by this weapon entry.
- **Cross-published:**
  - Force Unleashed Campaign Guide: earlier publication; same production identity

## 2. Lightfoil, Archaic

- **Published name:** Lightfoil, archaic
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 4500 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-archaic-lightfoil
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed table damage/cost/weight match current repo.
  - Repo does not structurally represent the source-defined effective-size choice and two-handed prohibition.
  - Repo Finesse/Throwable traits are not themselves printed weapon qualities in this entry.

## 3. Lightfoil, Modern

- **Published name:** Lightfoil, modern
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 2500 credits
- **Base damage:** 2d6
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-modern-lightfoil
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed table damage/cost/weight match current repo.
  - Repo does not structurally represent the source-defined effective-size choice and two-handed prohibition.
  - Repo Finesse/Throwable traits are not themselves printed weapon qualities in this entry.

## 4. Retrosaber

- **Published name:** Retrosaber
- **Group:** Lightsaber
- **Size:** not separately published
- **Cost:** not separately published
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** not separately published
- **Damage type:** and: energy / slashing
- **Availability:** None
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-retrosaber
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Repo base 2d8 damage matches the published retrosaber base damage.
  - Retrosaber is not separately tabled; the source does not publish a standalone cost, weight, size, or availability here. Do not adopt repo 4,000-credit/0.8-kg values as source authority.
  - Repo Variable-Damage label does not encode the forced 2d10 -> 2d4 -> normal timing sequence.

## 5. Lightsaber, Archaic

- **Published name:** Lightsaber, archaic
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 2000 credits
- **Base damage:** 2d6
- **Stun:** none
- **Weight:** 1.0 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-archaic-lightsaber
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed damage/cost/weight match current repo.
  - Repo does not represent the required external 600-credit power pack or the cord-disconnection behavior described in the adjacent Holocron lesson.
  - Repo Throwable trait is not established by this weapon entry.

## 6. Lightsaber, Dual-Phase

- **Published name:** Lightsaber, dual-phase
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 6000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-dual-phase
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed damage/cost/weight match current repo.
  - Repo Dual-Form label does not encode the swift mode change, +1-square reach, or adjacent-target Reflex penalty.
  - The source also allows an alternate construction using two mutually exclusive crystal effects; this is construction configuration, not a permanent combination of both effects.

## 7. Dueling Lightsaber

- **Published name:** Lightsaber, dueling
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 3000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 0.3 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-dueling
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed damage/cost/weight match current repo.
  - Repo does not structurally represent the one-handed attack-of-opportunity bonus.
  - Repo Finesse trait is not the published mechanic and must not substitute for the actual rule.

## 8. Crossguard Lightsaber

- **Published name:** Lightsaber, crossguard
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 4000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 0.7 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-crossguard
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed table stats match current repo.
  - Repo Duelist label does not encode the source rule.
  - The exact Block cumulative penalty replacement and Deflect -2 penalty must be represented independently.

## 9. Lightsaber, Great

- **Published name:** Lightsaber, great
- **Group:** Lightsaber
- **Size:** Large
- **Cost:** 5000 credits
- **Base damage:** 2d10
- **Stun:** none
- **Weight:** 5 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR
- **Repo:** lightsaber-chassis-great
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed damage/cost/weight match current repo.
  - Repo Large-Only trait overstates the published rule: the source gates use with certain feats/talents, not blanket weapon use.

## 10. Long-Handle Lightsaber

- **Published name:** Lightsaber, long-handle
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
  - Printed base stats match current repo.
  - Repo TwoHanded trait is too strong: two-handed use enables a special choice but the source does not say the weapon is universally two-handed-only.
  - 2d10 base-damage option must not stack with doubled Strength bonus.
  - Haft-end 1d6 attack exists only with Long Haft Form; its damage type is not specified by this entry.
- **Cross-published:**
  - Legacy Era Campaign Guide: later publication; same production identity

## 11. Lightsaber Pike

- **Published name:** Lightsaber pike
- **Group:** Lightsaber
- **Size:** Large
- **Cost:** 4000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 2 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR, reach
- **Repo:** lightsaber-chassis-pike
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed base stats and Reach trait match current repo.
  - Repo does not encode the -2 Block/Deflect checks, phrik-haft DR interaction, or Long Haft Form double-weapon option.
  - The 1d6 non-lightsaber-end damage type is not specified; do not infer bludgeoning.
- **Cross-published:**
  - Force Unleashed Campaign Guide: earlier publication; same production identity

## 12. Lightwhip

- **Published name:** Lightwhip
- **Group:** Lightsaber
- **Size:** Medium
- **Cost:** 5000 credits
- **Base damage:** 2d4
- **Stun:** none
- **Weight:** 1 kg
- **Damage type:** and: energy / slashing
- **Availability:** common, Rare
- **Qualities:** ignoresDR, reach
- **Repo:** lightsaber-chassis-lightwhip
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Printed base stats and Reach presentation are compatible with the repo.
  - Repo does not encode on-hit grab/grapple, DC 15 Acrobatics escape, Pin/Trip allowance, Crush/Throw prohibition, or end-turn base-damage-only tick.

## 13. San-Ni Staff

- **Published name:** San-ni staff
- **Group:** Advanced Melee Weapon
- **Size:** Large
- **Cost:** 4500 credits
- **Base damage:** 2d6
- **Stun:** same-as-base
- **Weight:** 2.2 kg
- **Damage type:** and: energy / bludgeoning
- **Availability:** common, Rare
- **Qualities:** doubleWeapon
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.
  - Stun is chosen at attack time; do not model it as a persistent switched mode requiring a swift action.
  - The power couplings are described as impervious to lightsaber damage.

## 14. Wan-Shen

- **Published name:** Wan-shen
- **Group:** Simple Weapon
- **Size:** Large
- **Cost:** 1000 credits
- **Base damage:** 2d6
- **Stun:** none
- **Weight:** 2 kg
- **Damage type:** and: slashing / bludgeoning
- **Availability:** common, Rare
- **Qualities:** doubleWeapon, reach
- **Repo:** missing
- **Repo comparison:** MISSING_RECORD
  - No production record exists for this canonical identity.
  - Source explicitly provides physical disassembly into four Small objects and full-round assembly/disassembly.

## 15. Discblade

- **Published name:** Discblade
- **Group:** Exotic Weapon
- **Size:** Small
- **Cost:** 2000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 1.25 kg
- **Damage type:** single: slashing
- **Availability:** common, Rare
- **Qualities:** thrown
- **Repo:** weapon-discblade
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed damage/cost/weight match current repo.
  - Repo heavy-weapons range profile is not source-correct for this thrown weapon. Use the thrown-weapon range profile.
  - Return-to-hand behavior is not an automatic property of every throw; the source attributes it to trained Zeison Sha Force use.

## 16. R-9 Flash Canister

- **Published name:** R-9 flash canister
- **Group:** Simple Weapon
- **Size:** Tiny
- **Cost:** 100 credits
- **Base damage:** Special
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **Qualities:** areaEffect, thrown
- **Repo:** weapon-flash-canister
- **Repo comparison:** MECHANICS_INCORRECT
  - Printed cost/weight match current repo.
  - Repo does not structurally identify the R-9 as an area attack weapon or represent its 3-square burst and concealment effect.
  - This weapon deals no hit point damage despite the table Damage entry reading Special.

---

# Claude execution boundary

This package authorizes **authority normalization only**. Claude may append the v2.5 fields/defaults to prior standalone authority records so the schema remains uniform. Do not use this handoff to mutate production weapon records, compile packs, create missing weapons, or resolve cross-publication precedence.

Acceptance:

```text
JEDI_ACADEMY_PHASE_2F_STANDALONE_CERTIFIED
16 source claims
14 repo-present + 2 repo-missing = 16
0 production mutations authorized
```

---

## Repo verification notes (Claude)

- 16 records match the 16 Phase 1F Jedi Academy records one-to-one (names, repo ids/current names, pending-rename flags, description and table pages, Retrosaber with no table page); 14 present, 2 missing.
- The eight schema edits above are implemented as the repo contract `weapon-authority-schema-v2.5` and applied to Core, KOTOR, Galaxy at War, Force Unleashed and Clone Wars as structural defaults (see the rolling authority Phase 2 section).
- Aliases normalized in this file (structure only, no published fact changed): `attackResolution.mode "normal"` -> `"standard"`, `modeProfiles[].attackProfile` -> `attackProfileId`, placeholder range strings expanded, `resource.consumption: null` added, and the `rateOfFire` object on Discblade / R-9 Flash Canister converted to the `["S"]` array form.
- The verifier enforces: Retrosaber cost/size/weight/availability stay null with the forced overcharge -> burnout -> normal state machine and construction DC 25; Lightwhip delayed damage records its excluded modifiers; San-Ni Staff stun is `optional-per-attack` declared at attack time; Wan-Shen disassembles into four components; Great Lightsaber has no wielding prohibition and no unconditional double-weapon quality; Long Haft Form gates the haft-end profile and its damage type stays `unspecified`; Discblade uses thrown-weapon ranges with no innate returning quality; Guard Shoto phrik DR protection stays conditional; cross-publication records are kept.
