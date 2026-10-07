# Phase 4G — Exotic Weapons Semantic / Selector / Recommendation Rolling Planner Authority

**Status:** `WEAPON_TAG_PHASE_4G_EXOTIC_ROUND_3_PLANNER_ADJUDICATED_CORRECTED`

## Progress

- Canonical Exotic-proficiency identities: **32**
- Adjudicated: **15 / 32**
- Remaining: **17**
- Round 1: **Amphistaff → Blastsword**
- Round 2: **Bowcaster → Darkstick**
- Round 3: **Deck Sweeper → Flamethrower**
- Next identity: **Garrote**
- Production mutation: **NOT AUTHORIZED**

## Exotic semantic ruling

`exotic_weapon` is an unconditional semantic tag for a canonical weapon identity that genuinely requires weapon-specific Exotic Weapon Proficiency.

A species or ancestry rule that supplies an alternate legal proficiency route does **not** erase the weapon's Exotic identity. Hybrid items with only one Exotic mode/profile will be handled conditionally when reached.

Structural selectors such as `weapon-proficiency:*`, `weapon-family:*`, `weapon-group:exotic`, species overrides, modes, payloads, range profiles, templates, configuration states, and full-round reload timing are **not semantic tags**.

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
  - mode=quarterstaff; attackProfile=melee
  - mode=spear; attackProfile=melee-or-thrown-ranged
  - mode=whip; attackProfile=melee-reach
  - mode=venom-spit; attackProfile=ranged; action=standard; usage=once-per-24-hours
- Explicit ability interactions:
  - ability=Pin; interaction=PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM
  - ability=Trip; interaction=PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM

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
- Modes:
  - mode=launcher; attackProfile=ranged; payload=energy-ball
  - mode=club; attackProfile=melee
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
  - ability=Weapon Finesse; interaction=TREAT_AS_LIGHT_WEAPON_FOR_THIS_FEAT

### Recommendation fit

Exotic melee option with a direct Weapon Finesse compatibility hook. Particularly relevant to Dexterity-oriented melee builds that already possess or are pursuing Weapon Finesse.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Blastsword).

### Guardrails

- Weapon Finesse compatibility is an exact named-ability interaction and must not be generalized to every light-weapon talent automatically.
- Do not invent a finesse semantic tag.
- Do not convert 3d6 base damage into damage_bonus.

## 6. Bowcaster

- **Identity:** `weapon-bowcaster`
- **Repo:** present (`weapon-bowcaster`)
- **Source:** Core Rulebook — description p.127 / table p.126
- **Canonical mechanic:** Wookiee-crafted exotic ranged weapon dealing 3d10 damage with explosive energy quarrels. Although the bowcaster is an exotic weapon, Wookiees with Weapon Proficiency (rifles) are treated as proficient. A quiver holds 10 quarrels. Phase 3B leaves canonical range unresolved; rifle proficiency familiarity must not be used to infer rifle range.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Bowcaster)**
- Alternate: **Species is Wookiee** + **Weapon Proficiency (rifles)** → Proficient with the Bowcaster without Exotic Weapon Proficiency (Bowcaster).

### Rule selectors

- Exact: `weapon:weapon-bowcaster`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:bowcaster`
- Families: `weapon-family:bowcaster`, `weapon-family:wookiee-weapon`
- Species overrides:
  - species=Wookiee; requiresProficiency=rifles; effect=Treated as proficient with the Bowcaster.

### Recommendation fit

High-damage exotic ranged weapon with a major Wookiee proficiency shortcut. Species-aware recommendation must not suggest redundant Exotic Weapon Proficiency to qualifying Wookiees.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Bowcaster).
- Character is Wookiee and has Weapon Proficiency (rifles).

### Guardrails

- Do not infer rifle range from the Wookiee rifle-proficiency familiarity rule; Phase 3B explicitly leaves Bowcaster range unresolved.
- Do not add burst_damage from the descriptive phrase 'explosive energy quarrel' without a separate mechanical burst/splash rule.
- Wookiee familiarity supplies an alternate proficiency route but does not erase the Bowcaster's canonical Exotic identity.

## 7. CR-1 Blast Cannon

- **Identity:** `weapon-cr-1-blast-cannon`
- **Repo:** present (`weapon-cr-1-blast-cannon`)
- **Source:** Force Unleashed Campaign Guide — description p.198 / table p.199
- **Canonical mechanic:** Exotic 3d8 ranged blast cannon using pistol range. It does not take normal range penalties on attack rolls; those penalties apply to damage rolls instead. Against adjacent targets it deals +1d8 damage. Against nonadjacent targets it becomes a splash weapon with a 1-square splash radius. It is Inaccurate and cannot attack at long range.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `precision`, `damage_bonus`, `positioning`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (CR-1 Blast Cannon)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:weapon-cr-1-blast-cannon`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:cr-1-blast-cannon`
- Families: `weapon-family:cr-1-blast-cannon`, `weapon-family:blast-cannon`
- Distance modes:
  - condition=target is adjacent; effect=+1d8 damage
  - condition=target is nonadjacent; effect=1-square splash radius

### Recommendation fit

Close/medium-range exotic for characters who value reliable hit chance across its legal range and gain different benefits by distance: extra adjacent damage or nonadjacent splash.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (CR-1 Blast Cannon).

### Guardrails

- Pistol range does not make the CR-1 a Pistol-group weapon and does not grant pistol proficiency.
- Phase 3B explicitly requires base areaEffect to remain false; nonadjacent splash is a structured conditional mode.
- Do not invent area_damage or inaccurate semantic tags.
- The +1d8 adjacent rider justifies damage_bonus; raw 3d8 base damage alone does not.

## 8. Cesta

- **Identity:** `unmapped::Cesta`
- **Repo:** missing
- **Source:** Core Rulebook — description p.121 / table p.122
- **Canonical mechanic:** Gungan exotic flexible pole used to hurl energy balls and usable as a stafflike melee weapon. Although Exotic, Gungans with Weapon Proficiency (simple weapons) are treated as proficient. The Core energy-ball rules state that an energy ball hurled by a cesta uses simple-weapon range and is Accurate.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`, `precision`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Cesta)**
- Alternate: **Species is Gungan** + **Weapon Proficiency (simple weapons)** → Proficient with the Cesta without Exotic Weapon Proficiency (Cesta).

### Rule selectors

- Exact: `weapon:unmapped::Cesta`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:cesta`
- Families: `weapon-family:cesta`, `weapon-family:gungan-weapon`, `weapon-family:energy-ball-launcher`
- Modes:
  - mode=launcher; attackProfile=ranged; payload=energy-ball; rangeProfile=simple; accurate=True
  - mode=staff; attackProfile=melee
- Species overrides:
  - species=Gungan; requiresProficiency=simple-weapons; effect=Treated as proficient with the Cesta.

### Recommendation fit

Hybrid Gungan melee/ranged weapon with an especially strong energy-ball delivery profile because cesta-fired energy balls are Accurate. Species-aware recommendation should avoid redundant Exotic Weapon Proficiency for qualifying Gungans.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Cesta).
- Character is Gungan and has Weapon Proficiency (simple weapons).

### Guardrails

- Energy Ball is a payload/ammunition relationship, not a separate Exotic proficiency identity.
- precision is justified by the explicit Accurate rule for energy balls hurled by a Cesta.
- Gungan Simple Weapon proficiency is an alternate route, not a global reclassification of the Cesta.

## 9. Concealed Dart Launcher

- **Identity:** `weapon-concealed-dart-launcher`
- **Repo:** present (`weapon-concealed-dart-launcher`)
- **Source:** Legacy Era Campaign Guide — description p.65 / table p.64
- **Canonical mechanic:** Wrist-mounted exotic launcher firing darts. The default sedative payload deals 3d8 stun damage and can affect targets beyond the normal 6-square stun limit. Darts may instead carry contact poison. The launcher uses pistol range, grants +5 equipment bonus to Stealth checks made to conceal it, and holds 6 darts per bundle.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `poison`, `concealment`, `stealth`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Concealed Dart Launcher)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:weapon-concealed-dart-launcher`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:concealed-dart-launcher`
- Families: `weapon-family:concealed-dart-launcher`, `weapon-family:wrist-launcher`
- Payload profiles:
  - id=sedative; effect=3d8 stun damage; default=True; extendedStunRange=True
  - id=contact-poison; effect=delivers loaded contact poison; default=False
- Capacity: `6`

### Recommendation fit

Concealable capture/infiltration exotic with long-reach stun capability and optional contact-poison payloads. Strong for stealthy bounty-hunter or nonlethal-control builds.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Concealed Dart Launcher).

### Guardrails

- Pistol range does not make this a Pistol-group weapon and does not grant pistol proficiency.
- Sedative and contact-poison darts are structural payload profiles, not separate Exotic weapon identities.
- Do not flatten poison into every shot; poison applies when the dart is loaded with a contact poison.
- The +5 concealment bonus supports concealment and stealth semantics; the exact numeric bonus remains structured.

## 10. Darkstick

- **Identity:** `unmapped::Darkstick`
- **Repo:** missing
- **Source:** Galaxy at War — description p.36 / table p.36
- **Canonical mechanic:** Kerestian exotic melee blade dealing 1d6 slashing damage and throwable as a ranged attack. A proficient wielder can hold multiple darksticks in one hand while still being treated as wielding one weapon; two or more increase the damage dice to 2d8. A thrown darkstick immediately returns to the wielder's hand if the attack exceeds Reflex Defense by 5 or more. Later light-absorbing versions give total concealment against adjacent enemies unless they have darkvision, but the wielder must also be able to see in darkness.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`, `damage_bonus`
- **Conditional semantic tags:**
  - `concealment` when **light-absorbing-cell darkstick version is used and adjacent observer lacks darkvision** — Later versions explicitly shroud the wielder so adjacent enemies treat the wielder as having total concealment.
  - `defense` when **light-absorbing-cell darkstick version is used and adjacent observer lacks darkvision** — The conditional total-concealment effect directly protects the wielder from adjacent attacks.

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Darkstick)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:unmapped::Darkstick`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:darkstick`
- Families: `weapon-family:darkstick`, `weapon-family:kerestian-weapon`, `weapon-family:throwable-melee`
- Modes:
  - mode=melee; attackProfile=melee
  - mode=thrown; attackProfile=ranged; returnTrigger=attack exceeds target Reflex Defense by 5 or more
- Configuration rules:
  - condition=proficient wielder holds two or more darksticks in one hand; treatedAsWeaponCount=1; damage=2d8; baseDamage=1d6
- Variant rules:
  - variant=light-absorbing-cell later version; effect=adjacent enemies treat wielder as having total concealment unless they have darkvision; selfRequirement=wielder must be able to see in darkness or suffers the concealment penalty as well

### Recommendation fit

Flexible melee/thrown exotic for characters who can exploit its multi-blade damage configuration. Later light-absorbing versions add a specialized adjacent-defense niche for characters able to see in darkness.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Darkstick).

### Guardrails

- Do not add dual_wield: multiple Darksticks held in one hand are explicitly treated as one weapon.
- Do not add a thrown semantic tag; thrown capability remains structural.
- damage_bonus is justified by the explicit 1d6-to-2d8 configuration rule, not by high raw damage alone.
- Concealment/defense are conditional to the later light-absorbing version and must not be promoted into unconditional finalTags.

## 11. Deck Sweeper

- **Identity:** `weapon-deck-sweeper`
- **Repo:** present (`weapon-deck-sweeper`)
- **Source:** Scum and Villainy — description p.50 / table p.51
- **Canonical mechanic:** Exotic ranged weapon that fires only on the stun setting. It attacks every target in a 6-square cone with one attack roll; a hit deals full stun damage and a miss deals half stun damage. It must be primed with a swift action during the same turn before firing. Its power pack provides 5 shots.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `swift_action`, `action_economy`, `setup`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Deck Sweeper)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:weapon-deck-sweeper`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:deck-sweeper`
- Families: `weapon-family:deck-sweeper`, `weapon-family:stun-area-weapon`
- attackProfile: shape=cone; lengthSquares=6; areaAttack=True; hitEffect=full stun damage; missEffect=half stun damage
- activation: requiredBeforeAttack=True; action=swift; timing=same turn; failureEffect=weapon does not fire
- Capacity: `5`

### Recommendation fit

Dedicated nonlethal crowd-control exotic for characters willing to spend a swift action to prime it before firing. Its 6-square cone and half-stun-on-miss behavior make it especially useful when multiple targets must be subdued.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Deck Sweeper).

### Guardrails

- Do not create area_damage as a semantic tag; cone geometry and area-attack resolution remain structured mechanics.
- The same-turn swift-action prime is mandatory setup, not optional flavor.
- The weapon is stun-only; do not infer a lethal firing mode.

## 12. Discblade

- **Identity:** `weapon-discblade`
- **Repo:** present (`weapon-discblade`)
- **Source:** Jedi Academy Training Manual — description p.61 / table p.61
- **Canonical mechanic:** Exotic aerodynamic thrown ring weapon favored by the Zeison Sha. The base weapon does not automatically return after a throw. Certified Zeison Sha talents provide the weapon-specific return, range, and multi-target interactions.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Discblade)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:weapon-discblade`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:discblade`
- Families: `weapon-family:discblade`, `weapon-family:zeison-sha-weapon`
- Explicit ability interactions:
  - ability=Discblade Arc; interaction=FULL_ROUND_THREE_TARGET_AREA_ATTACK_WITH_DISCBLADE
  - ability=Distant Discblade Throw; interaction=TREAT_DISCBLADE_AS_PISTOL_FOR_RANGE_ONLY
  - ability=Recall Discblade; interaction=USE_THE_FORCE_DC_15_AFTER_RANGED_ATTACK_TO_RETURN_DISCBLADE_AS_FREE_ACTION
  - ability=Weapon Specialization (discblade); interaction=NAMED_DISCBLADE_DAMAGE_SYNERGY
- attackProfile: type=thrown-ranged

### Recommendation fit

Signature exotic ranged weapon for Zeison Sha and other builds investing in its named talent package. Its strongest recommendation value comes from exact Discblade-specific ability joins rather than from broad thrown-weapon inference.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Discblade).

### Guardrails

- Do not add force, telekinesis, pistol, or area semantics to the base weapon merely because named talents can grant those interactions.
- Return-to-hand is not an innate property of every Discblade throw.
- Do not create a thrown semantic tag; thrown status remains structural.

## 13. Felucian Skullblade

- **Identity:** `unmapped::Felucian Skullblade`
- **Repo:** missing
- **Source:** Force Unleashed Campaign Guide — description p.96 / table p.96
- **Canonical mechanic:** Small exotic swordlike melee weapon made from Felucian animal skulls containing trace Force-reactive crystal. The weapon can be imbued with Force energy and, while so imbued, can block lightsaber strikes. It is culturally important and normally obtained through Felucian Force adepts rather than ordinary commerce.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`
- **Conditional semantic tags:**
  - `force` when **skullblade is imbued with Force energy** — The lightsaber-blocking property exists only when Force-imbued.
  - `lightsaber` when **skullblade is imbued with Force energy** — The special defensive interaction specifically concerns lightsaber strikes.
  - `block` when **skullblade is imbued with Force energy** — The source explicitly states that the imbued skullblade can block lightsaber strikes.
  - `melee_defense` when **skullblade is imbued with Force energy** — The special property is a defensive melee interaction.
  - `defense` when **skullblade is imbued with Force energy** — The special property defensively answers lightsaber attacks.

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Felucian Skullblade)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:unmapped::Felucian Skullblade`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:felucian-skullblade`
- Families: `weapon-family:felucian-skullblade`, `weapon-family:felucian-weapon`, `weapon-family:force-reactive-weapon`
- States:
  - state=force-imbued; effect=can block lightsaber strikes; activationMechanic=SOURCE_DOES_NOT_DEFINE_HERE

### Recommendation fit

Specialized exotic melee weapon for Force-sensitive/Felucian concepts, with its distinctive value coming from the Force-imbued lightsaber-blocking state rather than raw weapon statistics.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Felucian Skullblade).

### Guardrails

- Do not make force, lightsaber, block, melee_defense, or defense unconditional final tags; the source gates the interaction behind Force imbuement.
- Do not invent an activation action, skill check, duration, or Force Point cost for imbuing the weapon; the cited weapon entry does not define one.
- Cultural scarcity belongs to availability/recommendation data, not semantic tags.

## 14. Fira

- **Identity:** `unmapped::Fira`
- **Repo:** missing
- **Source:** Knights of the Old Republic Campaign Guide — description p.65 / table p.64
- **Canonical mechanic:** Selkath exotic melee sword made from a cortosis-bearing alloy and benefiting from the Cortosis Weave/Phrik Alloy template. Against a living creature, if the attack roll equals or exceeds both Reflex Defense and Fortitude Defense, the target takes half the attack's damage again on the following round from the grievous wound.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `damage_bonus`, `sustained_damage`, `targeting`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Fira)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:unmapped::Fira`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:fira`
- Families: `weapon-family:fira`, `weapon-family:selkath-weapon`, `weapon-family:sword`
- Explicit ability interactions:
  - ability=Greater Weapon Focus (Fira); interaction=NAMED_FIRA_ATTACK_BONUS_SYNERGY
- damageRider: targetCondition=living creature; secondaryDefense=Fortitude Defense; trigger=attack roll equals or exceeds both Reflex Defense and Fortitude Defense; effect=target takes half the attack's damage again on the following round
- Templates: `gear-template:cortosis-weave-phrikh-alloy`

### Recommendation fit

Exotic melee weapon for accuracy-focused characters who can reliably clear both Reflex and Fortitude with the same attack roll, converting strong hits into delayed additional damage. It also has an exact named build join with Greater Weapon Focus (Fira).

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Fira).

### Guardrails

- The grievous-wound rider applies only to living creatures and only when the same attack roll clears both defenses.
- The delayed half-damage rider supports damage_bonus and sustained_damage; do not rewrite it as immediate burst damage.
- Cortosis/Phrik behavior remains a structured gear-template property and must not be generalized into unrelated lightsaber semantics.

## 15. Flamethrower

- **Identity:** `weapon-flamethrower`
- **Repo:** present (`weapon-flamethrower`)
- **Source:** Core Rulebook — description p.127 / table p.126
- **Canonical mechanic:** Exotic ranged weapon dealing 3d6 damage in a cone 6 squares long and 6 squares wide at the terminus. Make one attack roll against the Reflex Defense of every target in the area; Evasion modifies the area attack normally. The chemical supply provides 5 uses, and reloading the chemical cartridge is a full-round action.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`
- **Tradeoff tags (not promoted to finalTags):** `action_economy`, `setup`

### Proficiency routes

- Canonical: **Exotic Weapon Proficiency (Flamethrower)**
- Alternate: none certified.

### Rule selectors

- Exact: `weapon:weapon-flamethrower`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:flamethrower`
- Families: `weapon-family:flamethrower`, `weapon-family:chemical-area-weapon`
- attackProfile: shape=cone; lengthSquares=6; terminusWidthSquares=6; areaAttack=True; defense=Reflex Defense; evasionApplies=True
- ammo: type=chemical-cartridge; uses=5; reloadAction=full-round

### Recommendation fit

Short-range multi-target exotic for builds that value broad cone coverage and can tolerate limited five-use ammunition and a full-round reload requirement.

Eligible without nonproficiency penalty when:
- Character has Exotic Weapon Proficiency (Flamethrower).

### Guardrails

- Do not create area_damage, cone, or fire as semantic tags unless separately certified; geometry and damage type remain structured.
- Do not add control merely because the attack covers an area.
- The chemical cartridge reload is a full-round action, but full_round_action is retained as structured/plain-text mechanics rather than a Phase 4G semantic tag.
- action_economy and setup describe the reload tradeoff but are not promoted into finalTags under the Phase 4C–4G planner convention.

## Rolling guardrails

- Do not mutate production weapon records from this planner authority.
- Do not flatten species-specific proficiency alternatives into global weapon-group changes.
- Do not recommend Exotic Weapon Proficiency when an already-owned species/proficiency route makes the character proficient.
- Do not treat range-profile equivalence as proficiency-group equivalence.
- Hybrids with only one Exotic attack mode must use conditional/profile-scoped Exotic semantics rather than globally misclassifying every mode.
