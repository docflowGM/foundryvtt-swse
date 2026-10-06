# Scum and Villainy Weapons - Phase 2J Standalone Book Authority

**Repo files:** `data/audits/item-weapons-phase-2j-scum-and-villainy-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1 and the schema v2.7 contract.

**Status:** `SCUM_AND_VILLAINY_PHASE_2J_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 9 Scum and Villainy weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **9**
- Repo-present: **9**
- Repo-missing: **0**
- Melee claims: **0**
- Ranged claims: **9**
- Cross-publication claims: **0**
- Explicit Accurate claims: **1**
- Explicit Inaccurate claims: **2**
- Area-effect claims: **3**
- Native-stun claims: **3**
- Autofire-only claims: **1**

## Source authority

- Fast/searchable layer: `Scum and Villainy_djvu.txt`
- Final table/layout authority: `SAGA EDITION - Scum and Villainy.pdf`
- Table 2-7 (Ranged Weapons), p.51: visually verified
- Weapon descriptions, pp.49-52: visually verified
- January 2009 official errata/clarifications were checked; no weapon changes apply to these pages.
- Existing repository values are comparison evidence only.

## Repo reconciliation

All **9/9** Scum and Villainy claims are repo-present. There are no missing production identities in this book pass.

Phase 1 alias/edit mappings that must preserve the existing production ID later:

- `Squib Battering Ram` -> repo `weapon-battering-ram` / current name `Battering Ram`
- `Blaster Rifle, Sniper` -> repo `weapon-sniper-blaster-rifle` / current name `Sniper Blaster Rifle`

---

# Schema decision for Claude

**No schema bump is required.** Carry forward `weapon-authority-schema-v2.7` from Rebellion Era. Every Scum and Villainy mechanic can be represented with existing structures. Do not introduce v2.8 merely because these records exercise the structures more deeply.

## Existing v2.7 structures exercised

- `triggeredEffects[]`: Neural Inhibitor persistent poison; Electronet grab/recurring stun; Snare Rifle follow-up effects.
- `conditionalDamageProfiles[]`: Micro Grenade Launcher subtracts **2 damage dice** from the selected grenade on a successful hit.
- `payloadProfiles[]`: Micro Grenade Launcher inherits the selected grenade type's normal rules.
- `preparedAttack`: Deck Sweeper requires a same-turn swift-action prime or it will not fire.
- `conditionalModifiers[]`: Sniper Blaster Rifle takes **-5 attack** unless the wielder Aimed at the target immediately before attacking.
- `activationRequirements[]` and `wieldingRules[]`: Squib Battering Ram requires two operators and has source target restrictions.
- `integratedAccessories[]`: Subrepeating Blaster retractable stock; Sniper commonly mounted bipod/scope with listed-cost caveat.
- `configurationStates[]`: Micro Grenade Launcher standalone vs rifle-mounted state.
- Native stun and structured area geometry: Deck Sweeper, Electronet, Snare Rifle, Pulse Rifle.
- v2.7 defaults remain mandatory: every attack profile has `damageMultiplier: 1` and `conditionalRangeRules: []`; every record has `resourceProfiles: []` unless multiple independent resources are source-certified.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_7_NORMALIZED_THROUGH_SCUM_AND_VILLAINY`

---

# Required guardrails

- Do not update a rolling/master weapon authority from this package.
- Do not mutate production packs, template/schema runtime, actors, feats, or talents during certification.
- Do not create any new production weapon records; all nine Scum and Villainy claims are repo-present.
- Repo fields are comparison evidence only.
- Do not bump the authority schema beyond v2.7 for this book unless the verifier proves an actual unrepresentable source mechanic.
- Do not treat Neural Inhibitor as kinetic; the table prints Piercing. Do not accept repo heavy-weapons range as source authority.
- Do not treat Pulse Rifle or Deck Sweeper as ordinary heavy-weapons-range attacks; each source attack is a fixed 6-square cone.
- Do not treat Electronet as a standalone heavy weapon; it is ammunition that can only be fired from a grenade launcher.
- Do not flatten Deck Sweeper, Electronet, or Snare Rifle native stun into ordinary lethal damage fields.
- Do not convert Subrepeating Blaster ROF A into merely autofire-capable; the prose explicitly makes it autofire-only.
- Do not allow the Subrepeating Blaster to brace for autofire unless its retractable stock is extended.
- Do not treat Micro Grenade Launcher as Military; the table prints Illegal. Preserve payload inheritance and the -2 damage-dice transform.
- Do not treat Snare Rifle as kinetic; the table prints Bludgeoning. Preserve ranged grab/grapple and feat restrictions.
- Do not remove the two-operator requirement or target limitations from Squib Battering Ram, and preserve the four-power-pack operating requirement.
- Do not make bipod or targeting scope mandatory/included-cost parts of the Sniper Blaster Rifle; the source says they are often mounted and not included in the listed cost.
- Do not omit the Sniper Blaster Rifle -5 attack penalty when the wielder has not Aimed at the target immediately before the attack.

---

# Scum and Villainy book entries

## 1. Neural Inhibitor

- **Published name:** Neural inhibitor
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 4200 credits
- **Base damage:** 1d6
- **Stun:** none
- **Weight:** 1 kg
- **Damage type:** single: piercing
- **Availability:** illegal
- **Rate of fire:** S
- **Qualities:** inaccurate
- **Repo:** weapon-neural-inhibitor (`Neural Inhibitor`)
- **Repo comparison:** MECHANICS_INCORRECT
  - On a successful hit against a living target, the dart immediately makes a `1d20+5` attack against Fortitude; success moves the target **-1 CT**.
  - The poison repeats at the beginning of the target's turn. Every failed poison attack adds a cumulative **+1** to the next poison attack.
  - The condition is persistent until a **DC 20 Treat Injury** check cures it; if the target falls unconscious, the neurotoxin dissipates.
  - Repo kinetic type is wrong; source type is **Piercing**. Repo heavy-weapons range is not source-certified.
- **Source footnotes/notes:**
  - Inaccurate weapon: This weapon cannot fire at targets at long range.

## 2. Pulse Rifle

- **Published name:** Pulse rifle
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 5000 credits
- **Base damage:** 2d8
- **Stun:** none
- **Weight:** 2.5 kg
- **Damage type:** single: energy
- **Availability:** illegal
- **Rate of fire:** S
- **Qualities:** areaEffect
- **Repo:** weapon-pulse-rifle (`Pulse Rifle`)
- **Repo comparison:** MECHANICS_INCORRECT
  - Area attack: a **6-square cone** affecting creatures and droids. One attack roll is compared to each target's Reflex Defense.
  - Hit = full 2d8; miss = half damage.
  - Power pack capacity: **5 shots**.
  - Repo heavy-weapons range does not represent the published fixed cone.
- **Source footnotes/notes:**
  - Area attack weapon.

## 3. Deck Sweeper

- **Published name:** Deck Sweeper
- **Group:** Exotic Weapon
- **Size:** Large
- **Cost:** 5000 credits
- **Base damage:** -
- **Stun:** native 3d6
- **Weight:** 4.5 kg
- **Damage type:** single: energy
- **Availability:** restricted
- **Rate of fire:** S
- **Qualities:** areaEffect
- **Repo:** weapon-deck-sweeper (`Deck Sweeper`)
- **Repo comparison:** MECHANICS_INCORRECT
  - Native stun-only weapon: normal damage is none; stun is **3d6**.
  - Area attack: **6-square cone**, Reflex Defense, hit full stun / miss half stun.
  - Requires a **swift action in the same turn** to prime before attacking; otherwise it will not fire.
  - Power pack capacity: **5 shots**.
- **Source footnotes/notes:**
  - Area attack weapon.

## 4. Electronet

- **Published name:** Electronet
- **Group:** Heavy Weapon (ammunition)
- **Size:** Medium
- **Cost:** 2000 credits
- **Base damage:** -
- **Stun:** native 3d8
- **Weight:** 5 kg
- **Damage type:** none / not printed
- **Availability:** restricted
- **Rate of fire:** S
- **Qualities:** areaEffect
- **Repo:** weapon-electronet (`Electronet`)
- **Repo comparison:** MECHANICS_INCORRECT
  - This is **Heavy Weapon ammunition**, not an independently fired heavy weapon; it can only be fired from a grenade launcher.
  - Targets a **2x2-square area**. Hit targets take **3d8 stun** and are grabbed under normal net rules.
  - At the beginning of each wielder turn, targets still trapped take **3d8 stun again**.
- **Source footnotes/notes:**
  - Area attack weapon.

## 5. Subrepeating Blaster

- **Published name:** Blaster, subrepeating
- **Group:** Pistol
- **Size:** Medium
- **Cost:** 750 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 2 kg
- **Damage type:** single: energy
- **Availability:** military
- **Rate of fire:** A
- **Qualities:** autofireOnly
- **Repo:** weapon-subrepeating-blaster (`Subrepeating Blaster`)
- **Repo comparison:** MECHANICS_INCOMPLETE
  - ROF **A** and the prose explicitly makes it **autofire-only**.
  - Includes a retractable stock; unless the stock is extended, the weapon **cannot be braced** before autofire.
  - Power pack capacity: **50 shots**.

## 6. Squib Battering Ram

- **Published name:** Squib battering ram
- **Group:** Simple Weapon
- **Size:** Large
- **Cost:** 3500 credits
- **Base damage:** 5d10
- **Stun:** none
- **Weight:** 10 kg
- **Damage type:** single: energy
- **Availability:** military
- **Rate of fire:** S
- **Qualities:** none
- **Repo:** weapon-battering-ram (`Battering Ram`)
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Requires **two characters**: one stabilizes the ram and one triggers it.
  - Source says it is too unwieldy against a **living, moving target**; it deals normal 5d10 damage to stationary, unattended objects such as walls or doors.
  - Requires **four power packs** to operate.
  - Repo identity is present under the shortened name `Battering Ram`.

## 7. Micro Grenade Launcher

- **Published name:** Micro Grenade Launcher
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 2500 credits
- **Base damage:** Special
- **Stun:** payload-derived / special
- **Weight:** 3 kg
- **Damage type:** varies
- **Availability:** illegal
- **Rate of fire:** S
- **Qualities:** inaccurate
- **Repo:** weapon-micro-grenade-launcher (`Micro Grenade Launcher`)
- **Repo comparison:** MECHANICS_INCORRECT
  - Uses micro grenades that inherit the normal rules of the selected grenade type but deal **-2 dice of damage on a successful hit**.
  - Capacity **4 grenades**; reload is a **full-round action**.
  - Can be used standalone or mounted on a rifle; mounting takes **1 minute** and a **DC 15 Mechanics** check.
  - Published availability is **Illegal**, not repo Military.
- **Source footnotes/notes:**
  - Inaccurate weapon: This weapon cannot fire at targets at long range.

## 8. Snare Rifle

- **Published name:** Snare rifle
- **Group:** Rifle
- **Size:** Medium
- **Cost:** 1200 credits
- **Base damage:** -
- **Stun:** native 1d6
- **Weight:** 5 kg
- **Damage type:** single: bludgeoning
- **Availability:** licensed
- **Rate of fire:** S
- **Qualities:** none
- **Repo:** weapon-snare-rifle (`Snare Rifle`)
- **Repo comparison:** MECHANICS_INCORRECT
  - Native **1d6 stun** and **Bludgeoning** type; no normal damage.
  - Allows a ranged grab or grapple. A successful grab deals the listed stun damage.
  - Escape: **DC 15 Acrobatics** or **DC 20 Strength**.
  - May use **Pin** and **Trip**; may not use **Crush** or **Throw**.
  - Specialized cartridge holds **5 shots**; replacements weigh **2 kg** and cost **50 credits**.

## 9. Blaster Rifle, Sniper

- **Published name:** Blaster Rifle, Sniper
- **Group:** Rifle
- **Size:** Large
- **Cost:** 2000 credits
- **Base damage:** 3d10
- **Stun:** none
- **Weight:** 8 kg
- **Damage type:** single: energy
- **Availability:** military
- **Rate of fire:** S
- **Qualities:** accurate
- **Repo:** weapon-sniper-blaster-rifle (`Sniper Blaster Rifle`)
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Accurate rifle: no short-range penalty.
  - If the wielder did **not Aim at the target immediately before the attack**, apply **-5 to the attack roll**.
  - Power pack capacity: **10 shots**.
  - Cannot benefit from the **Rapid Recycler** upgrade.
  - Bipod and targeting scope are often mounted, but neither is included in the listed 2,000-credit cost.
- **Source footnotes/notes:**
  - Accurate weapon: This weapon takes no penalty when firing at targets at short range.

---

# Repo discrepancy summary

- **Neural Inhibitor:** repo kinetic type is wrong; persistent poison mechanics and source range uncertainty are not represented.
- **Pulse Rifle:** repo lacks the fixed 6-square cone area model and 5-shot capacity.
- **Deck Sweeper:** repo flattens native stun into ordinary damage and omits cone/prime/capacity mechanics.
- **Electronet:** repo treats ammunition as a standalone heavy weapon and omits area/grab/recurring stun.
- **Subrepeating Blaster:** core stats match, but autofire-only, retractable-stock brace restriction, and 50-shot capacity are missing.
- **Squib Battering Ram:** numeric stats match, but canonical name, two-operator use, target restriction, and four-power-pack requirement are missing.
- **Micro Grenade Launcher:** repo availability is wrong (Military vs published Illegal); payload inheritance, -2 dice transform, capacity/reload, and mounting are missing.
- **Snare Rifle:** repo type is wrong (kinetic vs published Bludgeoning) and native stun/grab/escape/feat/ammo rules are missing.
- **Sniper Blaster Rifle:** numeric stats and Accurate match, but Aim requirement, 10-shot capacity, Rapid Recycler prohibition, and accessory cost caveat are missing.

---

# Claude implementation boundary

This handoff authorizes **book-local authority certification, verifier coverage, and v2.7 structural continuity only**. It does **not** authorize production weapon edits, pack regeneration, runtime changes, or record creation.

Acceptance checks:

- 9 Scum and Villainy claims
- 9 repo-present + 0 repo-missing = 9
- exactly 1 base Accurate claim
- exactly 2 base Inaccurate claims
- exactly 3 Area Attack footnote claims
- exactly 3 native-stun claims
- exactly 1 autofire-only claim
- Neural Inhibitor persistent poison: 1d20+5 vs Fortitude, -1 CT on success, cumulative +1 after failures, DC 20 Treat Injury cure, ends on unconsciousness
- Pulse Rifle and Deck Sweeper each preserve their 6-square cones
- Deck Sweeper requires same-turn swift priming and has 5-shot capacity
- Electronet remains grenade-launcher ammunition with 2x2 area, grab, and recurring 3d8 stun
- Micro Grenade Launcher preserves -2 damage dice, 4-round capacity, full-round reload, Illegal availability, and rifle-mount procedure
- Snare Rifle preserves native 1d6 stun, Bludgeoning type, ranged grab/grapple, escape DCs, and feat restrictions
- Squib Battering Ram preserves two-operator and four-power-pack requirements
- Sniper Blaster Rifle preserves Accurate plus the -5 un-Aimed attack penalty and 10-shot capacity
- every attack profile has `criticalEffects[]`, `activationRequirements[]`, `triggeredEffects[]`, `damageMultiplier: 1`, and `conditionalRangeRules: []`
- every record has `technologyClassification`, `deliveryMethod`, `wieldingRules[]`, `triggeredEffects[]`, and `resourceProfiles[]`
- schema remains v2.7; no v2.8 fields are required
- no rolling/master authority mutation
- no production pack mutation

---

## Repo verification notes (Claude)

- 9 records match the 9 Phase 1 Scum and Villainy records one-to-one (names, repo ids/current names, pending-rename flags, pages); 9 present, 0 missing. Counts verified: 9 ranged, 1 base Accurate, 2 base Inaccurate, 3 area-effect, 3 native-stun, 1 autofire-only.
- No schema change: the book fits `weapon-authority-schema-v2.7`. Aliases normalized to the existing shapes (structure only; see `schemaNormalization` in the JSON and the rolling authority Phase 2 section). Micro Grenade Launcher's payload-dependent -2 dice uses `add-dice` with `dieSize: "same-as-selected-grenade"` (vocabulary tolerance).
- The verifier enforces the Neural Inhibitor persistent poison cycle, 6-square Pulse Rifle / Deck Sweeper cones, Deck Sweeper priming, Electronet launcher-only 2x2 area with grab and recurring stun, Subrepeating Blaster autofire-only stock rule, Squib Battering Ram two operators and four power packs, Micro Grenade Launcher payload rules, Snare Rifle grab/escape/feat rules, and the Sniper -5 un-Aimed penalty without mandatory accessories.
- Negative tests run (20 corruptions): all failed the verifier and were restored.
