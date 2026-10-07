# Phase 4E — Advanced Melee Semantic Tags + Rule Selectors — Complete Planner Authority

**Status:** `WEAPON_TAG_PHASE_4E_ADVANCED_MELEE_COMPLETE_PLANNER_AUTHORITY`

## Completion

- Canonical Advanced Melee identities: **22**
- Adjudicated: **22 / 22**
- Repo-present: **5**
- Repo-missing: **17**
- Round 2 final semantic-tag assignments: **55**
- Total final semantic-tag assignments: **109**
- Distinct semantic tags used: **28**
- Production mutation: **NOT AUTHORIZED**

## Baseline — Vibroblade

The standard Vibroblade remains the comparison baseline: **2d6**, melee, no stun, no reach, no double-weapon profile, and no ranged secondary profile.

## Architecture

- Semantic tags remain restricted to the certified feat/talent-used vocabulary.
- Exact identity, family, weapon group, proficiency, configuration, thrown status, and profile applicability remain structural rule selectors.
- The **17 Phase 3B repo-missing identities remain explicit canonical identities**; this phase does not create production records.
- Raw larger damage dice do not become `damage_bonus` without an explicit additive/scaling mechanic.
- Double weapons use `double_weapon` and `full_attack`, not automatic `dual_wield`.
- Block compatibility on the San-Ni Staff is exact and does not make the weapon a lightsaber.
- Hybrid profiles such as Energy Lance preserve profile-specific proficiency.

## Complete authority — 22 identities

### 1. Dire Vibroblade

- Phase 3B identity: `unmapped::Dire Vibroblade`
- Repo: **missing**
- Source: Knights of the Old Republic Campaign Guide p.65 / table p.64
- Canonical mechanic: Medium 2d6 vibroblade intended for two-handed use. A Medium wielder using it two-handed applies double the wielder's Strength bonus to damage. It requires an energy cell.
- **Final tags:** `melee`, `offense_melee`, `damage_bonus`
- Exact selector: `canonical-weapon:dire-vibroblade`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:dire-vibroblade`, `weapon-family:two-handed-melee`
- Recommendation fit: Strength-focused two-handed melee option for characters who want a conventional vibroblade profile with stronger ability-modifier scaling.

### 2. Double Vibroblade

- Phase 3B identity: `unmapped::Double Vibroblade`
- Repo: **missing**
- Source: Knights of the Old Republic Campaign Guide p.65 / table p.64
- Canonical mechanic: Large double weapon dealing 2d6 with each end. Attacking with both ends uses the normal full-round double-weapon attack rules and penalties. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`
- Exact selector: `canonical-weapon:double-vibroblade`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:double-vibroblade`, `weapon-family:double-weapon`
- Recommendation fit: Dedicated double-weapon choice for full-attack builds. Prefer when the character invests in double-weapon penalty reduction and multiattack support.

### 3. Electropole

- Phase 3B identity: `weapon-gungan-electropole`
- Repo: **present** — `weapon-gungan-electropole`
- Source: The Unknown Regions p.36 / table p.37
- Canonical mechanic: Medium 2d8 bludgeoning/energy pole weapon with a same-as-base stun setting. It can be thrown like a javelin. Gungans proficient with simple weapons are also proficient with it. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`, `stun`, `nonlethal`
- Exact selector: `canonical-weapon:electropole`
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
- Exact selector: `canonical-weapon:electrostaff`
- Families: `weapon-family:electrostaff`, `weapon-family:staff`, `weapon-family:double-weapon`, `weapon-family:phrik-weapon`
- Recommendation fit: Durable double-weapon platform for full-attack users who also want strong nonlethal flexibility and a weapon that resists lightsaber damage.

### 5. Energy Lance

- Phase 3B identity: `unmapped::Energy Lance`
- Repo: **missing**
- Source: Rebellion Era Campaign Guide p.48 / table p.48
- Canonical mechanic: Large 2d8 piercing/energy mounted lance. A Ride-trained Medium rider can wield it one-handed while mounted; a Medium wielder using it unmounted takes -1 to attacks. It also fires a plasma bolt as a no-stun blaster carbine and both profiles function underwater.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`, `sustained_damage`, `mount`, `ride`, `rider`
- Exact selector: `canonical-weapon:energy-lance`
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
- Exact selector: `canonical-weapon:force-pike`
- Families: `weapon-family:polearm`, `weapon-family:force-pike`, `weapon-family:stun-melee`
- Recommendation fit: Straightforward high-damage advanced melee weapon with a strong stun option; a broadly useful nonlethal alternative to the baseline Vibroblade.

### 7. Power Hammer

- Phase 3B identity: `unmapped::Power Hammer`
- Repo: **missing**
- Source: Force Unleashed Campaign Guide p.97 / table p.96
- Canonical mechanic: Large 2d12 gravity-assisted hammer. Power Attack extra damage applies to objects and vehicles when used with it. Double Attack, Triple Attack, and Rapid Strike each impose an additional -2 attack penalty. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `vehicle`
- Tradeoff tags: `full_attack`, `precision`, `sustained_damage`
- Exact selector: `canonical-weapon:power-hammer`
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
- Exact selector: `canonical-weapon:power-lance`
- Families: `weapon-family:lance`, `weapon-family:power-lance`, `weapon-family:mounted-weapon`
- Recommendation fit: Melee-only cavalry weapon for Ride-trained mounted characters who want the Energy Lance's mounted handling without paying for a ranged profile.

### 9. San-Ni Staff

- Phase 3B identity: `unmapped::San-Ni Staff`
- Repo: **missing**
- Source: Jedi Academy Training Manual p.53 / table p.52
- Canonical mechanic: Large 2d6 double staff. It can be used with Block as though it were a lightsaber. On each attack the wielder may choose to deal stun instead of lethal damage. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`, `stun`, `nonlethal`, `block`
- Exact selector: `canonical-weapon:san-ni-staff`
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
- Exact selector: `canonical-weapon:shock-stick`
- Families: `weapon-family:shock-weapon`, `weapon-family:shock-stick`, `weapon-family:stun-melee`, `weapon-family:bayonet-compatible`
- Guardrail: The rifle-bayonet proficiency waiver is configuration-specific; it does not globally change the weapon's proficiency category.
- Guardrail: Do not add forbidden semantic tag `condition_track`; use control/battlefield_control and preserve the exact track effect structurally.
- Recommendation fit: Dedicated stun/control weapon, especially attractive as a rifle-mounted bayonet or for characters who want to disable weakened targets rather than kill them.

### 11. Shock Whip

- Phase 3B identity: `unmapped::Shock Whip`
- Repo: **missing**
- Source: Legacy Era Campaign Guide p.62 / table p.62
- Canonical mechanic: Small reach-2 shock whip dealing 1d6 bludgeoning damage. After a hit it can make a free no-grab-penalty grab attack against a target no more than one size larger. Once per turn, a swift action automatically deals 2d6 energy damage to a target grabbed by the whip. With Trip, the wielder may knock the target prone instead of grabbing it.
- **Final tags:** `melee`, `offense_melee`, `positioning`, `grab`, `control`, `battlefield_control`, `swift_action`, `action_economy`, `sustained_damage`
- Exact selector: `canonical-weapon:shock-whip`
- Families: `weapon-family:shock-weapon`, `weapon-family:shock-whip`, `weapon-family:reach-weapon`, `weapon-family:grab-weapon`
- Ability interaction: **Trip** → `EXPLICIT_WEAPON_OPTION` — After a hit, Trip may replace the whip's optional grab and knock the target prone.
- Recommendation fit: Control-oriented reach weapon for characters built around grabs, Trip, positioning, and action-efficient sustained pressure rather than raw first-hit damage.

### 12. Shockstaff

- Phase 3B identity: `unmapped::Shockstaff`
- Repo: **missing**
- Source: Knights of the Old Republic Campaign Guide p.65 / table p.64
- Canonical mechanic: Large 2d6/2d6 phrik double weapon. It can deal stun equal to normal damage and can be switched to stun as a swift action. Its phrik construction prevents lightsabers from ignoring the weapon's damage reduction, though this source does not state the DR value. It uses two energy cells.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`, `stun`, `nonlethal`, `swift_action`, `action_economy`, `durability`, `damage_reduction`
- Exact selector: `canonical-weapon:shockstaff`
- Families: `weapon-family:shock-weapon`, `weapon-family:shockstaff`, `weapon-family:staff`, `weapon-family:double-weapon`, `weapon-family:phrik-weapon`
- Guardrail: Do not invent a numeric DR value; KOTOR establishes lightsaber resistance to its DR but does not state the number.
- Recommendation fit: Full-attack/stun double weapon for users who also care about the weapon surviving lightsaber contact.

### 13. Static Pike

- Phase 3B identity: `unmapped::Static Pike`
- Repo: **missing**
- Source: Galaxy at War p.37 / table p.36
- Canonical mechanic: Large 2d6 piercing/energy reach pike with lethal and 2d6 stun settings. It can also be thrown like a spear and requires an energy cell.
- **Final tags:** `melee`, `offense_melee`, `positioning`, `ranged`, `offense_ranged`, `stun`, `nonlethal`
- Exact selector: `canonical-weapon:static-pike`
- Families: `weapon-family:pike`, `weapon-family:static-pike`, `weapon-family:reach-weapon`, `weapon-family:throwable-melee`
- Guardrail: Do not add forbidden semantic tag `thrown`; throwing is a structural quality/profile.
- Recommendation fit: Versatile reach/stun/thrown pike for characters who want control of melee distance plus a fallback ranged attack.

### 14. Vibro-Ax

- Phase 3B identity: `unmapped::Vibro-Ax`
- Repo: **missing**
- Source: Core Rulebook p.124 / table p.122
- Canonical mechanic: Large 2d10 slashing vibro-ax powered by two energy cells. It has no special attack mode beyond its high base cutting damage.
- **Final tags:** `melee`, `offense_melee`
- Exact selector: `canonical-weapon:vibro-ax`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibro-ax`, `weapon-family:axe`
- Recommendation fit: Straightforward high-damage melee option. Prefer when raw single-hit damage matters more than stun, reach, double-weapon, or utility features.

### 15. Vibrobayonet

- Phase 3B identity: `unmapped::Vibrobayonet`
- Repo: **missing**
- Source: Core Rulebook p.124 / table p.122
- Canonical mechanic: Powered rifle bayonet dealing 2d6 piercing damage when mounted. Even after using the rifle for a ranged attack on the previous turn, the wielder still threatens adjacent squares and can make attacks of opportunity. Mounted use requires two hands and is incompatible with a folded stock. Detached, it functions as a Vibrodagger.
- **Final tags:** `melee`, `offense_melee`, `attack_of_opportunity`
- Exact selector: `canonical-weapon:vibrobayonet`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibrobayonet`, `weapon-family:bayonet`, `weapon-family:rifle-mounted-melee`
- Recommendation fit: Excellent rifle-sidearm integration for characters who need to preserve melee threat and opportunity attacks without switching away from their rifle.

### 16. Vibroblade

- Phase 3B identity: `weapon-vibroblade`
- Repo: **present** — `weapon-vibroblade`
- Source: Core Rulebook p.124 / table p.122
- Canonical mechanic: Small 2d6 slashing-or-piercing powered melee weapon. It has no stun, reach, double-weapon, ranged, or other special combat profile and requires an energy cell.
- **Final tags:** `melee`, `offense_melee`
- Exact selector: `canonical-weapon:vibroblade`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:standard-vibroblade`
- Recommendation fit: Default Advanced Melee choice when no specialized weapon aligns more closely with the character's build.

### 17. Vibroblade, Double

- Phase 3B identity: `unmapped::Vibroblade, Double`
- Repo: **missing**
- Source: Force Unleashed Campaign Guide p.98 / table p.96
- Canonical mechanic: Large 2d6/2d6 double vibroblade powered by two energy cells. Both ends can attack in a full-round action using the normal double-weapon penalties before feat/talent reductions.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`
- Exact selector: `canonical-weapon:vibroblade-double`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:double-vibroblade`, `weapon-family:double-weapon`
- Guardrail: Keep this Phase 3B identity distinct from KOTOR's `Double Vibroblade` until identity normalization explicitly merges them.
- Recommendation fit: Dedicated double-weapon full-attack platform. Mechanically similar to KOTOR's Double Vibroblade but retained as a separate canonical Phase 3B identity.

### 18. Vibrodagger

- Phase 3B identity: `weapon-vibrodagger`
- Repo: **present** — `weapon-vibrodagger`
- Source: Core Rulebook p.124 / table p.122
- Canonical mechanic: Tiny 2d4 slashing-or-piercing vibro weapon that can be thrown and is lightly regulated because it is commonly treated as a tool. It requires an energy cell.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`
- Exact selector: `canonical-weapon:vibrodagger`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibrodagger`, `weapon-family:throwable-melee`
- Guardrail: Do not add `concealment` or `stealth` merely from Tiny size/light regulation; no source mechanical concealment benefit is stated.
- Guardrail: Do not add forbidden `thrown` semantic tag.
- Recommendation fit: Compact throwable vibro option for characters who value portability and a melee/ranged fallback over raw damage.

### 19. Vibroknucklers

- Phase 3B identity: `unmapped::Vibroknucklers`
- Repo: **missing**
- Source: Clone Wars Campaign Guide p.60 / table p.60
- Canonical mechanic: Worn vibro weapon that adds +3 damage to successful unarmed attacks. While worn, attacks count both as normal unarmed/simple-weapon attacks and as Advanced Melee attacks. The knucklers cannot be disarmed or dropped and require an energy cell.
- **Final tags:** `melee`, `offense_melee`, `unarmed`, `martial_arts`, `damage_bonus`
- Exact selector: `canonical-weapon:vibroknucklers`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroknucklers`, `weapon-family:unarmed-augment`
- Recommendation fit: Premier Advanced Melee option for unarmed/Martial Arts builds because it adds damage without making the attack cease to count as unarmed.

### 20. Vibrolance

- Phase 3B identity: `unmapped::Vibrolance`
- Repo: **missing**
- Source: Galaxy at War p.37 / table p.36
- Canonical mechanic: Large 2d10 piercing-or-slashing reach vibro polearm. It is explicitly too large and unwieldy to throw effectively and requires an energy cell.
- **Final tags:** `melee`, `offense_melee`, `positioning`
- Exact selector: `canonical-weapon:vibrolance`
- Families: `weapon-family:vibro-weapon`, `weapon-family:lance`, `weapon-family:vibrolance`, `weapon-family:reach-weapon`
- Guardrail: Source explicitly says it cannot be thrown effectively; do not infer a thrown profile from its lance form.
- Recommendation fit: High-damage reach weapon for front-line characters who want superior melee spacing without a thrown or stun option.

### 21. Vibrorapier

- Phase 3B identity: `unmapped::Vibrorapier`
- Repo: **missing**
- Source: Clone Wars Campaign Guide p.60 / table p.60
- Canonical mechanic: Medium 2d6 slashing vibro weapon designed to suppress the ultrasonic noise of normal vibro weapons, making it completely silent in use. It requires two energy cells.
- **Final tags:** `melee`, `offense_melee`, `stealth`, `infiltration`
- Exact selector: `canonical-weapon:vibrorapier`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibrorapier`, `weapon-family:silent-melee`
- Recommendation fit: Covert melee alternative to the baseline Vibroblade: same damage role, but completely silent in operation.

### 22. Vibrosword

- Phase 3B identity: `weapon-vibrosword`
- Repo: **present** — `weapon-vibrosword`
- Source: Force Unleashed Campaign Guide p.98 / table p.96
- Canonical mechanic: Large 2d8 slashing-or-piercing oversized vibroblade intended for two-handed use. It requires an energy cell.
- **Final tags:** `melee`, `offense_melee`
- Exact selector: `canonical-weapon:vibrosword`
- Families: `weapon-family:vibro-weapon`, `weapon-family:vibroblade`, `weapon-family:vibrosword`, `weapon-family:two-handed-melee`
- Recommendation fit: Straightforward two-handed damage upgrade over the standard Vibroblade, with no additional control, stun, reach, or defensive utility.

## Completion notes

- **Shock Whip** — reach/grab control, Trip substitution, and swift recurring damage.
- **Shockstaff** — phrik stun double weapon; numeric DR intentionally remains unstated because KOTOR does not provide it.
- **Static Pike** — reach + stun + thrown capability; its Phase 3B thrown profile remains structurally modeled rather than using a `thrown` semantic tag.
- **Vibrobayonet** — preserves melee threat/AoO after rifle fire and has mounted/detached configuration behavior.
- **Vibroknucklers** — +3 unarmed damage while attacks remain unarmed/simple and also count as Advanced Melee.
- **Vibrorapier** — explicit completely-silent stealth/infiltration role.
- **Vibro-Ax** and **Vibrosword** — high-damage role variants without invented semantic damage tags.
- **Double Vibroblade** and **Vibroblade, Double** remain separate Phase 3B identities pending later identity normalization.

## Implementation contract

- Preserve planner semantic rulings exactly.
- Validate all semantic tags against the frozen 183-tag certified-used vocabulary.
- Keep rule selectors out of `system.tags`.
- Preserve exact ability interactions, profile selectors, configuration rules, and source omissions.
- Do not create the 17 missing production records during this semantic-certification phase.
- Phase 3D remains frozen.
- Do not modify `packs/weapons.db` or `template.json`.
