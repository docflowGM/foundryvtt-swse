# Galaxy of Intrigue Weapons - Phase 2K Standalone Book Authority

**Repo files:** `data/audits/item-weapons-phase-2k-galaxy-of-intrigue-standalone-authority.json`, verified by `tools/verify-item-weapons-authority.mjs` against Phase 1 and the schema v2.8 contract.

**Status:** `GALAXY_OF_INTRIGUE_PHASE_2K_STANDALONE_CERTIFIED`

This package is intentionally **book-local**. It contains the 4 Galaxy of Intrigue weapon claims only. Do not merge it into a rolling/master authority as part of this handoff.

## Acceptance totals

- Source claims: **4**
- Repo-present: **4**
- Repo-missing: **0**
- Melee claims: **0**
- Ranged claims: **4**
- Cross-publication claims: **0**
- Explicit Accurate claims: **0**
- Explicit Inaccurate claims: **2**
- Native-stun claims: **1**
- Fixed-damage claims: **1**

## Source authority

- Fast/searchable layer: `Galaxy of Intrigue_djvu.txt`
- Final table/layout authority: `Galaxy of Intrigue.pdf`
- Table 3-1 (Ranged Weapons), p.65: visually verified
- Weapon descriptions, p.64: visually verified
- Existing repository values are comparison evidence only.

## Repo reconciliation

All **4/4** Galaxy of Intrigue claims are repo-present. There are no missing production identities in this book pass.

Phase 1 alias/edit mapping that must preserve the existing production ID later:

- `Blaster, Wrist` -> repo `weapon-wrist-blaster` / current name `Wrist Blaster`

---

# Schema decision for Claude

**A narrow schema bump is required: `weapon-authority-schema-v2.8-fixed-damage`.**

Galaxy of Intrigue introduces the first certified weapon in this Phase 2 corpus whose printed base weapon damage is a **fixed numeric value** rather than dice, dash/none, inherited/modifier damage, or payload-derived damage:

```text
Darter = 1 damage
```

Do **not** encode this as `1d1`, `1d4`, or any other invented dice expression.

## v2.8 extension

Extend the allowed values of:

```text
canonicalStats.baseDamage.mode
attackProfiles[].damage.mode
```

with:

```json
{
  "mode": "fixed",
  "diceCount": 0,
  "dieSize": null,
  "flatBonus": 1,
  "formula": "1"
}
```

### Contract semantics

When `mode = "fixed"`:

- `diceCount` must be `0`
- `dieSize` must be `null`
- `flatBonus` is the **complete published fixed base weapon-damage value**
- `formula` is display/compatibility metadata

This adds **no new field**, so earlier books need **no record backfill**. Claude should update schema/verifier acceptance to recognize the new enum value while leaving all existing book facts untouched.

### Suggested completion state

`WEAPON_AUTHORITY_SCHEMA_V2_8_NORMALIZED_THROUGH_GALAXY_OF_INTRIGUE`

## Existing structures reused

- `range.allowedBands`: Wrist Blaster and Snare Pistol use this book's stricter Inaccurate footnote; Darter uses a source-specific Short-range maximum without gaining the Inaccurate quality.
- `payloadProfiles[]` / `triggeredEffects[]`: Darter can carry poison; delivery occurs only when the darter successfully deals damage.
- Native stun + ranged-grab structures: Snare Pistol reuses the Snare Rifle model from Scum and Villainy with its own 1d4 stun and 2-shot cartridge.
- Resource economics: one-shot Wrist Blaster power cell, Snare Pistol cartridge, and Nightstinger five-shot gas canister.
- v2.7 defaults remain mandatory: every attack profile retains `damageMultiplier: 1` and `conditionalRangeRules: []`; every record retains `resourceProfiles: []` unless the source establishes multiple independent resources.

---

# Required guardrails

- Do not update a rolling/master weapon authority from this package.
- Do not mutate production packs, template/schema runtime, actors, feats, talents, or equipment records during certification.
- Do not create any new production weapon records; all four claims are repo-present.
- Repo fields are comparison evidence only.
- Bump to v2.8 **only** for the fixed-damage enum extension.
- Do not rewrite prior book facts; no earlier record requires a new field.
- Do not convert Darter damage `1` into a die expression.
- Do not tag Darter Inaccurate. Its Short-range maximum is a weapon-specific rule, not footnote 1.
- Do not apply Galaxy of Intrigue's stricter Inaccurate wording globally. It applies locally to Wrist Blaster and Snare Pistol: **no Medium or Long range**.
- Do not flatten Snare Pistol's native 1d4 stun into ordinary lethal damage.
- Do not omit Snare Pistol ranged grab/grapple, escape DCs, feat restrictions, or its 2-shot cartridge.
- Do not treat Xerrol Nightstinger as rifle-proficient merely because the prose calls it a sporting blaster rifle; the published table places it under **Exotic Weapons**.
- Do not infer Accurate for Xerrol Nightstinger from its sniper role.
- Surveillance Tagger and Redirection Crystal are equipment records referenced by these weapons; do not create duplicate weapon identities for them.

---

# Galaxy of Intrigue book entries

## 1. Blaster, Wrist

- **Published name:** Blaster, wrist
- **Group:** Pistol
- **Size:** Tiny
- **Cost:** 800 credits
- **Base damage:** 3d4
- **Stun:** none
- **Weight:** 0.5 kg
- **Damage type:** Energy
- **Availability:** Illegal
- **Rate of fire:** S
- **Qualities:** Inaccurate
- **Repo:** `weapon-wrist-blaster` (`Wrist Blaster`)
- **Repo comparison:** MECHANICS_INCOMPLETE
  - Table 3-1 footnote 1 forbids attacks at **Medium and Long** range.
  - Internal power cell contains energy for **one shot**.
  - Detecting the wrist blaster with a weapon sensor scan requires **DC 25 Use Computer**.
  - Repo omits Inaccurate and the one-shot/sensor rules; its legacy `8 squares` range string is not source authority.

## 2. Darter

- **Published name:** Darter
- **Group:** Simple Weapon
- **Size:** Medium
- **Cost:** 150 credits
- **Base damage:** **fixed 1**
- **Stun:** none
- **Weight:** 3 kg
- **Damage type:** Piercing
- **Availability:** Licensed
- **Rate of fire:** S
- **Qualities:** none
- **Repo:** `weapon-darter` (`Darter`)
- **Repo comparison:** MECHANICS_INCORRECT
  - The printed damage cell is exactly **1**; this is the v2.8 fixed-damage case.
  - Source describes the weapon as a **large pistol** and caps maximum range at the **Short range increment**.
  - A poison-carrying dart delivers the toxin only if the darter **successfully deals damage**.
  - The description also establishes compatibility with a Surveillance Tagger; its full mechanics remain in the equipment authority.
  - Repo kinetic type is wrong; source type is **Piercing**. Repo `simple-weapons` range profile is not source-certified.

## 3. Snare Pistol

- **Published name:** Snare pistol
- **Group:** Pistol
- **Size:** Medium
- **Cost:** 600 credits
- **Base damage:** -
- **Stun:** native **1d4**
- **Weight:** 2 kg
- **Damage type:** Bludgeoning
- **Availability:** Licensed
- **Rate of fire:** S
- **Qualities:** Inaccurate
- **Repo:** `weapon-snare-pistol` (`Snare Pistol`)
- **Repo comparison:** MECHANICS_INCORRECT
  - Table 3-1 footnote 1 forbids attacks at Medium and Long range.
  - Allows a ranged **grab or grapple** against an enemy at up to Short range.
  - Escape: **DC 15 Acrobatics** or **DC 20 Strength**.
  - May use **Pin** and **Trip**; may not use **Crush, Throw, or Bone Crusher**.
  - Specialized cartridge holds **2 shots**; replacement cartridge costs **25 credits** and weighs **1 kg**.
  - Repo flattens 1d4 stun into normal damage and omits Bludgeoning, Inaccurate, and the capture mechanics.

## 4. Xerrol Nightstinger

- **Published name:** Xerrol nightstinger
- **Group:** Exotic Weapon
- **Size:** Medium
- **Cost:** 1,500 credits
- **Base damage:** 3d6
- **Stun:** none
- **Weight:** 4.5 kg
- **Damage type:** Energy
- **Availability:** Illegal
- **Rate of fire:** S
- **Qualities:** none
- **Repo:** `weapon-xerrol-nightstinger` (`Xerrol Nightstinger`)
- **Repo comparison:** MECHANICS_INCORRECT
  - Table 3-1 places this weapon under **Exotic Weapons**; repo rifle proficiency must not override the source.
  - The prose identifies it as a sporting blaster rifle designed for long-range sniping, supporting **rifle range behavior** while remaining an Exotic Weapon for proficiency.
  - Special gas canister capacity: **5 shots**; replacement canister costs **1,000 credits**.
  - Shots are invisible to the eye, allowing the sniper to fire **without revealing position**.
  - Redirection Crystal use is a compatible tactic, not an integrated weapon feature.
  - The source does **not** mark the Nightstinger Accurate.

---

# Repo discrepancy summary

- **Wrist Blaster:** numeric core stats mostly match, but Inaccurate, one-shot power, and DC 25 sensor-detection mechanics are missing; legacy 8-square range must not become canonical.
- **Darter:** repo damage number matches, but type is wrong (kinetic vs Piercing), range modeling is unsupported, and poison/tagger interactions are absent.
- **Snare Pistol:** repo misrepresents native 1d4 stun as normal damage, omits Bludgeoning and Inaccurate, and lacks capture/escape/feat/ammunition rules.
- **Xerrol Nightstinger:** core numeric stats mostly match, but repo proficiency is rifles instead of the published Exotic Weapon identity; gas-canister and invisible-shot mechanics are absent.

---

# Claude implementation boundary

This handoff authorizes **book-local authority certification, verifier coverage, and the v2.8 fixed-damage contract extension only**. It does **not** authorize production weapon edits, pack regeneration, runtime changes, or record creation.

Acceptance checks:

- 4 Galaxy of Intrigue claims
- 4 repo-present + 0 repo-missing = 4
- exactly 2 base Inaccurate claims: Wrist Blaster and Snare Pistol
- exactly 0 base Accurate claims
- exactly 1 native-stun claim: Snare Pistol
- exactly 1 fixed-damage claim: Darter
- Darter fixed damage remains `1`, not a die expression
- Darter is not Inaccurate; its explicit maximum is the Short range increment
- Wrist Blaster and Snare Pistol use allowed bands `[pointBlank, short]`
- Wrist Blaster preserves one-shot capacity and DC 25 Use Computer sensor detection
- Snare Pistol preserves 1d4 native stun, ranged grab/grapple, DC 15/20 escape checks, feat restrictions, and 2-shot cartridge economics
- Xerrol Nightstinger remains an Exotic Weapon with rifle-style range behavior, 5-shot / 1,000-credit gas canister, invisible shots, and no inferred Accurate quality
- every attack profile has `criticalEffects[]`, `activationRequirements[]`, `triggeredEffects[]`, `damageMultiplier: 1`, and `conditionalRangeRules: []`
- every record has `technologyClassification`, `deliveryMethod`, `wieldingRules[]`, `triggeredEffects[]`, and `resourceProfiles[]`
- schema advances to **v2.8** only for `damage.mode = fixed`
- no rolling/master authority mutation
- no production pack mutation

---

## Repo verification notes (Claude)

- 4 records match the 4 Phase 1 Galaxy of Intrigue records one-to-one (names, repo ids/current names, pending-rename flags, pages); 4 present, 0 missing. Counts verified: 4 ranged, 0 base Accurate, 2 base Inaccurate, 1 native-stun, 1 fixed-damage.
- Schema v2.8 (`damage.mode = "fixed"`) is implemented in the repo contract and verifier; no earlier record needed a new field.
- Aliases and corrections (see `schemaNormalization` in the JSON): pistol range bands restored to the canonical pistols profile (the package listed medium 41-100 / long 101-200); Darter Short-increment cap stored as `hardMaxSquares` 40; surveillance-tagger note moved to `operation`; Snare Pistol escape-options effect key. **Xerrol Nightstinger** is Exotic Weapon here but "Rifle" in the certified Phase 1 record; Phase 1 is unchanged and the override is registry-documented.
- Negative tests run (21 corruptions covering the fixed-damage shape, Darter inaccuracy/cap/poison, Wrist and Snare Pistol allowed bands and resources, Nightstinger group/quality/canister, pistol bands, tagger identity, counts, and a malformed `fixed` on a prior book): all failed the verifier and were restored.
