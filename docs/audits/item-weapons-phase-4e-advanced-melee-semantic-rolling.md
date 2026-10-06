# Phase 4E — Advanced Melee Semantic Tags + Rule Selectors — Rolling Planner Authority

**Status:** `WEAPON_TAG_PHASE_4E_ADVANCED_MELEE_ROUND_1_PLANNER_ADJUDICATED`

## Census

- Canonical Advanced Melee identities: **22**
- Repo-present: **5**
- Repo-missing: **17**
- Round 1 adjudicated: **10**
- Remaining: **12**
- Next identity: **Shock Whip**

Repo-present identities are Electropole, Electrostaff, Vibroblade, Vibrodagger, and Vibrosword. All other category identities are canonical Phase 3B identities that currently lack a production record.

## Baseline — Vibroblade

- Damage: **2d6**
- Damage type: slashing or piercing
- Stun: none
- Powered by an energy cell
- Baseline semantic role: `melee`, `offense_melee`

Advanced Melee comparison focuses on **damage role, stun/nonlethal behavior, double-weapon/full-attack support, hands/wielding rules, reach, ranged secondary profiles, defensive durability, control effects, and mounted use**.

## Architecture guardrails

- `advanced_melee` is a structural weapon group/proficiency concept, not a semantic tag.
- `thrown` and `condition_track` remain forbidden weapon semantic tags.
- Missing Phase 3B identities remain explicit with `repoIdentityKey: null`; this authority does not invent production records.
- Named ability interactions remain directional and explicit.
- Raw larger damage dice do not automatically create `damage_bonus` or `burst_damage` semantics.

## Round 1 — 10 / 22

### 1. Dire Vibroblade

- Phase 3B identity: `unmapped::Dire Vibroblade`
- Repo: **missing**
- Source: Knights of the Old Republic Campaign Guide p.65 / table p.64
- Canonical mechanic: Medium 2d6 vibroblade intended for two-handed use. A Medium wielder using it two-handed applies double the wielder's Strength bonus to damage. It requires an energy cell.
- **Final tags:** `melee`, `offense_melee`, `damage_bonus`
- Exact canonical selector: `canonical-weapon:dire-vibroblade`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:dire-vibroblade`, `weapon-family:two-handed-melee`
- Recommendation fit: Strength-focused two-handed melee option for characters who want a conventional vibroblade profile with stronger ability-modifier scaling.

### 2. Double Vibroblade

- Phase 3B identity: `unmapped::Double Vibroblade`
- Repo: **missing**
- Source: Knights of the Old Republic Campaign Guide p.65 / table p.64
- Canonical mechanic: Large double weapon dealing 2d6 with each end. Attacking with both ends uses the normal full-round double-weapon attack rules and penalties. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`
- Exact canonical selector: `canonical-weapon:double-vibroblade`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:double-vibroblade`, `weapon-family:double-weapon`
- Recommendation fit: Dedicated double-weapon choice for full-attack builds. Prefer when the character invests in double-weapon penalty reduction and multiattack support.

### 3. Electropole

- Phase 3B identity: `weapon-gungan-electropole`
- Repo: **present** — `weapon-gungan-electropole`
- Source: The Unknown Regions p.36 / table p.37
- Canonical mechanic: Medium 2d8 bludgeoning/energy pole weapon with a same-as-base stun setting. It can be thrown like a javelin. Gungans proficient with simple weapons are also proficient with it. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`, `stun`, `nonlethal`
- Exact canonical selector: `canonical-weapon:electropole`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:electropole`, `weapon-family:polearm`, `weapon-family:throwable-melee`
- Guardrail: Do not add forbidden semantic tag `thrown`; thrown behavior is structural.
- Guardrail: Gungan simple-weapon proficiency is an alternate proficiency rule, not a semantic tag.
- Recommendation fit: Versatile melee/thrown weapon with strong base damage and stun. Especially attractive to Gungans because of the alternate proficiency rule.

### 4. Electrostaff

- Phase 3B identity: `weapon-electrostaff`
- Repo: **present** — `weapon-electrostaff`
- Source: Core Rulebook p.121 / table p.122
- Canonical mechanic: Large 2d6/2d6 double weapon. Either end can deal normal or 2d6 stun damage. Phrik construction gives the weapon itself DR 20, including against lightsaber attacks. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`, `stun`, `nonlethal`, `durability`, `damage_reduction`
- Exact canonical selector: `canonical-weapon:electrostaff`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:electrostaff`, `weapon-family:staff`, `weapon-family:double-weapon`, `weapon-family:phrik-weapon`
- Recommendation fit: Durable double-weapon platform for full-attack users who also want strong nonlethal flexibility and a weapon that resists lightsaber damage.

### 5. Energy Lance

- Phase 3B identity: `unmapped::Energy Lance`
- Repo: **missing**
- Source: Rebellion Era Campaign Guide p.48 / table p.48
- Canonical mechanic: Large 2d8 piercing/energy mounted lance. A Ride-trained Medium rider can wield it one-handed while mounted; a Medium wielder using it unmounted takes -1 to attacks. It also fires a plasma bolt as a no-stun blaster carbine and both profiles function underwater.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`, `sustained_damage`, `mount`, `ride`, `rider`
- Exact canonical selector: `canonical-weapon:energy-lance`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:lance`, `weapon-family:energy-lance`, `weapon-family:mounted-weapon`, `weapon-family:hybrid-melee-ranged`
- Guardrail: Underwater operation is structured environment metadata; do not invent an `aquatic` semantic tag.
- Guardrail: Ranged plasma mode uses Rifle proficiency because it functions as a blaster carbine.
- Recommendation fit: Hybrid cavalry weapon for Ride-trained mounted characters who want both melee striking and rifle-class ranged fire from one platform.

### 6. Force Pike

- Phase 3B identity: `unmapped::Force Pike`
- Repo: **missing**
- Source: Core Rulebook p.121 / table p.122
- Canonical mechanic: Medium 2d8 piercing/energy pole weapon with lethal and 2d8 stun settings. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `stun`, `nonlethal`
- Exact canonical selector: `canonical-weapon:force-pike`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:polearm`, `weapon-family:force-pike`, `weapon-family:stun-melee`
- Recommendation fit: Straightforward high-damage advanced melee weapon with a strong stun option; a broadly useful nonlethal alternative to the baseline Vibroblade.

### 7. Power Hammer

- Phase 3B identity: `unmapped::Power Hammer`
- Repo: **missing**
- Source: Force Unleashed Campaign Guide p.97 / table p.96
- Canonical mechanic: Large 2d12 gravity-assisted hammer. Power Attack extra damage applies to objects and vehicles when used with it. Double Attack, Triple Attack, and Rapid Strike each impose an additional -2 attack penalty. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `vehicle`
- Tradeoff tags: `full_attack`, `precision`, `sustained_damage`
- Exact canonical selector: `canonical-weapon:power-hammer`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:power-hammer`, `weapon-family:hammer`, `weapon-family:anti-object-melee`, `weapon-family:anti-vehicle-melee`
- Ability interaction: **Power Attack** → `EXPLICIT_WEAPON_BENEFIT` — Power Attack extra damage can apply to objects and vehicles when using the Power Hammer.
- Ability interaction: **Double Attack** → `EXTRA_ATTACK_PENALTY` — Additional -2 attack penalty.
- Ability interaction: **Triple Attack** → `EXTRA_ATTACK_PENALTY` — Additional -2 attack penalty.
- Ability interaction: **Rapid Strike** → `EXTRA_ATTACK_PENALTY` — Additional -2 attack penalty.
- Recommendation fit: Heavy single-hit and anti-object/anti-vehicle option. Excellent for Power Attack builds; deliberately poor for Double Attack, Triple Attack, and Rapid Strike users because of the extra -2 penalty.

### 8. Power Lance

- Phase 3B identity: `unmapped::Power Lance`
- Repo: **missing**
- Source: Rebellion Era Campaign Guide p.48 / table p.48
- Canonical mechanic: Large 2d8 bludgeoning/energy mounted lance. It retains the Energy Lance's Ride-trained one-handed mounted handling and the -1 Medium-unmounted penalty, but has no plasma-bolt firing mode.
- **Final tags:** `melee`, `offense_melee`, `mount`, `ride`, `rider`
- Exact canonical selector: `canonical-weapon:power-lance`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:lance`, `weapon-family:power-lance`, `weapon-family:mounted-weapon`
- Recommendation fit: Melee-only cavalry weapon for Ride-trained mounted characters who want the Energy Lance's mounted handling without paying for a ranged profile.

### 9. San-Ni Staff

- Phase 3B identity: `unmapped::San-Ni Staff`
- Repo: **missing**
- Source: Jedi Academy Training Manual p.53 / table p.52
- Canonical mechanic: Large 2d6 double staff. It can be used with Block as though it were a lightsaber. On each attack the wielder may choose to deal stun instead of lethal damage. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`, `stun`, `nonlethal`, `block`
- Exact canonical selector: `canonical-weapon:san-ni-staff`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:staff`, `weapon-family:san-ni-staff`, `weapon-family:double-weapon`, `weapon-family:block-compatible`
- Ability interaction: **Block** → `EXPLICIT_WEAPON_COMPATIBILITY` — May use Block with the San-Ni Staff as though it were a lightsaber.
- Guardrail: Block compatibility does not make the weapon a lightsaber and does not imply other lightsaber-only abilities apply.
- Recommendation fit: Defensive double-weapon option for Block users who want full-attack capability and per-attack lethal/stun flexibility without using a lightsaber.

### 10. Shock Stick

- Phase 3B identity: `unmapped::Shock Stick`
- Repo: **missing**
- Source: Galaxy at War p.37 / table p.36
- Canonical mechanic: Large melee weapon dealing native 3d6 stun only. If pre-halving stun damage equals or exceeds a susceptible target's current hit points, the target moves -5 condition-track steps and falls unconscious. It can mount as a rifle bayonet; proficiency with that rifle removes the advanced-melee nonproficiency penalty for the mounted shock stick.
- **Final tags:** `melee`, `offense_melee`, `stun`, `nonlethal`, `control`, `battlefield_control`
- Exact canonical selector: `canonical-weapon:shock-stick`
- Group/proficiency: `weapon-group:advanced-melee`, `weapon-proficiency:advanced-melee`
- Families: `weapon-family:shock-weapon`, `weapon-family:shock-stick`, `weapon-family:stun-melee`, `weapon-family:bayonet-compatible`
- Guardrail: The rifle-bayonet proficiency waiver is configuration-specific; it does not globally change the weapon's proficiency category.
- Guardrail: Do not add forbidden semantic tag `condition_track`; use control/battlefield_control and preserve the exact track effect structurally.
- Recommendation fit: Dedicated stun/control weapon, especially attractive as a rifle-mounted bayonet or for characters who want to disable weakened targets rather than kill them.

## Round 1 design notes

- **Dire Vibroblade:** preserves its explicit two-handed Strength scaling as `damage_bonus`, not merely its raw 2d6 dice.
- **Double Vibroblade:** `double_weapon` + `full_attack`; no false `dual_wield` tag.
- **Electropole:** melee + thrown ranged profiles and stun; Gungan proficiency is structural.
- **Electrostaff:** double weapon, stun, and weapon-self DR 20 including against lightsabers.
- **Energy Lance:** true hybrid profile — Advanced Melee lance plus Rifle-proficiency blaster-carbine mode, with mounted Ride synergy.
- **Power Hammer:** anti-vehicle/Power Attack specialist with explicit penalties to Double Attack, Triple Attack, and Rapid Strike.
- **San-Ni Staff:** Block-compatible but **not** a lightsaber; its Block permission is an exact ability interaction.
- **Shock Stick:** native stun/control weapon with rifle-bayonet proficiency override only while mounted on a rifle.

## Implementation contract

- Preserve planner semantic rulings exactly.
- Validate all semantic tags against the frozen certified feat/talent-used vocabulary.
- Keep canonical identity selectors and weapon families out of `system.tags`.
- Do not create missing production records during this semantic-certification step.
- Preserve explicit wielding, proficiency, profile, stun, and feat-interaction rules structurally.
- Phase 3D production mutation remains frozen.
- Do not modify `packs/weapons.db` or `template.json`.