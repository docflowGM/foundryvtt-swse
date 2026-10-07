# Phase 4G — Exotic Weapons Semantic / Selector / Recommendation Rolling Planner Authority

**Status:** `WEAPON_TAG_PHASE_4G_EXOTIC_ROUND_1_PLANNER_ADJUDICATED`

## Progress

- Canonical Exotic-proficiency identities: **32**
- Adjudicated: **5 / 32**
- Remaining: **27**
- Round 1: **Amphistaff → Blastsword**
- Next identity: **Bowcaster**
- Production mutation: **NOT AUTHORIZED**

## Exotic semantic ruling

`exotic_weapon` is an unconditional semantic tag for a canonical weapon identity that genuinely requires weapon-specific Exotic Weapon Proficiency.

A species or ancestry rule that supplies an alternate legal proficiency route does **not** erase the weapon's Exotic identity. Hybrid items with only one Exotic mode/profile will be handled conditionally when reached.

Structural selectors such as `weapon-proficiency:*`, `weapon-family:*`, `weapon-group:exotic`, species overrides, modes, and payloads are **not semantic tags**.

## 1. Amphistaff

- **Identity:** `unmapped::Amphistaff`
- **Repo:** missing
- **Source:** Core Rulebook — description p.121 / table p.122
- **Canonical mechanic:** Living Yuuzhan Vong weapon with quarterstaff, spear, and whip forms. Changing forms is a swift action. Spear form can be thrown and applies a poison condition-track rider. Whip form has 2-square reach, applies the same poison rider, and a proficient wielder can use it to Pin or Trip without possessing those feats. In any form it can spit venom up to 10 squares as a standard action once per 24 hours.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`, `poison`, `control`, `battlefield_control`, `grapple`, `restrain`, `positioning`, `swift_action`, `standard_action`, `action_economy`, `biotech`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Amphistaff)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:unmapped::Amphistaff`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:amphistaff`
- Families: `weapon-family:amphistaff`, `weapon-family:yuuzhan-vong-biotech`, `weapon-family:multi-form-melee`
- Modes:
  - mode=quarterstaff, attackProfile=melee
  - mode=spear, attackProfile=melee-or-thrown-ranged
  - mode=whip, attackProfile=melee-reach
  - mode=venom-spit, attackProfile=ranged, action=standard, usage=once-per-24-hours
- Explicit ability interactions:
  - **Pin** → `PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM`
  - **Trip** → `PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM`

### Recommendation fit

High-complexity control weapon for characters who can exploit reach, poison, thrown/ranged options, and Pin/Trip utility. Strongest when the build values flexible mode switching and battlefield control.

Eligible without nonproficiency penalty when:
- Character is proficient with the Amphistaff through Exotic Weapon Proficiency (Amphistaff).

### Guardrails

- Do not create a thrown semantic tag; thrown capability remains structural.
- Do not create a reach semantic tag; positioning expresses the semantic consequence while exact reach remains structured.
- Pin/Trip feat emulation is exact rule-selector authority and must not be generalized to unrelated grapple abilities.

## 2. Arggarok

- **Identity:** `unmapped::Arggarok`
- **Repo:** missing
- **Source:** Knights of the Old Republic Campaign Guide — description p.64 / table p.64
- **Canonical mechanic:** Large Gamorrean exotic melee axe dealing 2d12 slashing damage. A wielder with Strength below 15 takes a -5 penalty on attack rolls with it. Gamorreans treat the Arg'garok as an advanced melee weapon instead of an exotic weapon.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Arg'garok)**
- Alternate: **Species is Gamorrean** + **Weapon Proficiency (advanced melee weapons) or another valid source of Advanced Melee proficiency** → Proficient without needing Exotic Weapon Proficiency (Arg'garok).

### Rule selectors

- Exact: `weapon:unmapped::Arggarok`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:arggarok`
- Families: `weapon-family:arggarok`, `weapon-family:axe`
- Species overrides:
  - species=Gamorrean; treatAsGroup=advanced-melee; effect=Treat the Arg'garok as an advanced melee weapon instead of an exotic weapon.
- Attribute requirements:
  - attribute=strength; minimum=15; failureEffect=-5 attack penalty with the weapon

### Recommendation fit

Raw-damage melee exotic for Strength-focused characters. Do not recommend normally to Strength-below-15 characters even if proficient because the weapon imposes its own separate -5 attack penalty.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Arg'garok).
- Character is Gamorrean and proficient with Advanced Melee Weapons.

### Guardrails

- Do not convert 2d12 base damage into damage_bonus; raw weapon dice remain structured comparison data.
- The Strength 15 rule is separate from proficiency and must be checked independently.
- Gamorrean alternate handling changes the legal proficiency route, not the canonical Exotic identity.

## 3. Atlatl

- **Identity:** `unmapped::Atlatl`
- **Repo:** missing
- **Source:** Core Rulebook — description p.121 / table p.122
- **Canonical mechanic:** Gungan exotic weapon used to hurl energy balls farther than an unaided throw and usable as a club-like melee weapon in close combat. Although Exotic, a Gungan is treated as proficient with it if the Gungan has Weapon Proficiency (simple weapons).
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Atlatl)**
- Alternate: **Species is Gungan** + **Weapon Proficiency (simple weapons)** → Proficient with the Atlatl without Exotic Weapon Proficiency (Atlatl).

### Rule selectors

- Exact: `weapon:unmapped::Atlatl`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:atlatl`
- Families: `weapon-family:atlatl`, `weapon-family:gungan-weapon`, `weapon-family:energy-ball-launcher`
- Payloads: `payload:energy-ball`
- Modes:
  - mode=launcher, attackProfile=ranged, payload=energy-ball
  - mode=club, attackProfile=melee
- Species overrides:
  - species=Gungan; requiresProficiency=simple-weapons; effect=Treated as proficient with the Atlatl.

### Recommendation fit

Hybrid Gungan weapon for characters who want energy-ball ranged attacks while retaining an emergency melee profile. Species-aware recommendation should strongly avoid suggesting a redundant Exotic Weapon Proficiency feat to qualifying Gungans.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Atlatl).
- Character is Gungan and has Weapon Proficiency (simple weapons).

### Guardrails

- Energy Ball is a payload/ammunition relationship, not a second Exotic weapon identity.
- Do not give the Atlatl precision merely because the Cesta makes Energy Balls Accurate; that benefit belongs to Cesta delivery.
- Gungan Simple Weapon proficiency is an alternate route, not a reclassification of the weapon for non-Gungans.

## 4. Aurial Blaster

- **Identity:** `weapon-aurial-blaster`
- **Repo:** present (`weapon-aurial-blaster`)
- **Source:** Knights of the Old Republic Campaign Guide — description p.67 / table p.68
- **Canonical mechanic:** Exotic sonic blaster dealing 3d6 energy (sonic) damage. On a hit, if the attack roll also beats the target's Fortitude Defense, the target takes -5 on Perception checks until the end of the attacker's next turn. It uses pistol range and has a 50-shot power pack.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `control`, `perception`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Aurial Blaster)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:weapon-aurial-blaster`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:aurial-blaster`
- Families: `weapon-family:aurial-blaster`, `weapon-family:sonic-blaster`
- Range profile: `pistol`
- Defense rider: successful hit → Fortitude Defense → -5 Perception until end of attacker's next turn

### Recommendation fit

Ranged exotic sidearm for builds that value short-duration sensory/perception suppression in addition to direct damage.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Aurial Blaster).

### Guardrails

- Pistol range does not make the weapon a Pistol-group weapon and does not grant pistol proficiency.
- Do not add pistol as an unconditional semantic tag from range treatment alone.
- The Perception penalty is a control rider; exact duration and -5 value remain structured.

## 5. Blastsword

- **Identity:** `unmapped::Blastsword`
- **Repo:** missing
- **Source:** The Unknown Regions — description p.36 / table p.37
- **Canonical mechanic:** Adumari exotic melee weapon combining a vibroblade with blaster components, dealing 3d6 damage. On a successful stab the blaster energy discharges. It may be treated as a light weapon for the purpose of using Weapon Finesse and requires a power pack.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Blastsword)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:unmapped::Blastsword`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:blastsword`
- Families: `weapon-family:blastsword`, `weapon-family:sword`, `weapon-family:powered-melee`
- Explicit ability interactions:
  - **Weapon Finesse** → `TREAT_AS_LIGHT_WEAPON_FOR_THIS_FEAT`

### Recommendation fit

Exotic melee option with a direct Weapon Finesse compatibility hook. Particularly relevant to Dexterity-oriented melee builds that already possess or are pursuing Weapon Finesse.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Blastsword).

### Guardrails

- Weapon Finesse compatibility is an exact named-ability interaction and must not be generalized to every light-weapon talent automatically.
- Do not invent a finesse semantic tag.
- Do not convert 3d6 base damage into damage_bonus.

## Rolling guardrails

- Do not mutate production weapon records from this planner authority.
- Do not flatten species-specific proficiency alternatives into global weapon-group changes.
- Do not recommend Exotic Weapon Proficiency when an already-owned species/proficiency route makes the character proficient.
- Do not treat range-profile equivalence as proficiency-group equivalence.
- Hybrids with only one Exotic attack mode must use conditional/profile-scoped Exotic semantics rather than globally misclassifying every mode.
