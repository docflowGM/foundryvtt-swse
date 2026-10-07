# Phase 4G — Exotic Weapons Semantic / Selector / Recommendation Authority

**Status:** `WEAPON_TAG_PHASE_4G_EXOTIC_32_IDENTITY_PLANNER_AUTHORITY_COMPLETE`

## Completion

- Canonical Exotic-proficiency identities: **32 / 32**
- Repo-present: **18**
- Repo-missing: **14**
- Remaining: **0**
- Production mutation: **NOT AUTHORIZED**

## Vocabulary invariant QA

- Rule: every semantic tag attached to a weapon must already appear in certified feat/talent `finalTags`.
- Certified-used union: **183 tags**.
- Distinct semantic tags used by Phase 4G: **41**.
- Forbidden runtime/weapon pseudo-tags in semantic fields: **0**.
- Completion-pass candidate tags checked against the exact 183-tag repository union: **PASS**.

### Architecture rulings

- `exotic_weapon` remains unconditional for genuine Exotic-proficiency identities even when a species has an alternate legal proficiency route.
- **Siang Lance** is the exception: `exotic_weapon` is profile-scoped to the native ranged lance profile; the bayonet profile is Simple.
- **Wrist Rocket Launcher** does not inherit every rocket payload tag statically. Loaded-payload semantics must resolve dynamically.
- Range/proficiency equivalence such as pistol/rifle treatment remains structural and does not create `pistol`/`rifle` semantics unless independently justified.

## Source-authority flags caught during final QA

1. **Massassi Lanvarok:** KOTOR species text says Massassi treat the lanvarok as Simple, while the weapon entry says Advanced Melee. The frozen Phase 3B Advanced Melee ruling remains controlling.
2. **Tehk'la Blade:** Legacy species text explicitly says Nagai treat tehk'la blades as Simple weapons, but the frozen 4G census did not include that route among its nine alternate cases. This is flagged for earlier-authority correction rather than silently changing the frozen census.
3. **Xerrol Nightstinger:** Phase 1 labeled it Rifle, while the frozen Phase 3B Exotic census includes it as an Exotic-proficiency identity. Phase 3B controls Phase 4G.

## 1. Amphistaff

- **Identity:** `unmapped::Amphistaff`
- **Repo:** missing
- **Source:** Core Rulebook — p.121 / table p.122
- **Canonical mechanic:** Living Yuuzhan Vong weapon with quarterstaff, spear, and whip forms. Changing forms is a swift action. Spear form can be thrown and applies a poison condition-track rider. Whip form has 2-square reach, applies the same poison rider, and a proficient wielder can use it to Pin or Trip without possessing those feats. In any form it can spit venom up to 10 squares as a standard action once per 24 hours.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`, `poison`, `control`, `battlefield_control`, `grapple`, `restrain`, `positioning`, `swift_action`, `standard_action`, `action_economy`, `biotech`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Amphistaff)
- Alternate: none certified in this planner record.

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

### Recommendation

High-complexity control weapon for characters who can exploit reach, poison, thrown/ranged options, and Pin/Trip utility. Strongest when the build values flexible mode switching and battlefield control.

### Guardrails

- Do not create a thrown semantic tag; thrown capability remains structural.
- Do not create a reach semantic tag; positioning expresses the semantic consequence while exact reach remains structured.
- Pin/Trip feat emulation is exact rule-selector authority and must not be generalized to unrelated grapple abilities.

## 2. Arggarok

- **Identity:** `unmapped::Arggarok`
- **Repo:** missing
- **Source:** Knights of the Old Republic Campaign Guide — p.64 / table p.64
- **Canonical mechanic:** Large Gamorrean exotic melee axe dealing 2d12 slashing damage. A wielder with Strength below 15 takes a -5 penalty on attack rolls with it. Gamorreans treat the Arg'garok as an advanced melee weapon instead of an exotic weapon.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Arg'garok)
- Alternate: Species is Gamorrean + Weapon Proficiency (advanced melee weapons) or another valid source of Advanced Melee proficiency → Proficient without needing Exotic Weapon Proficiency (Arg'garok).

### Rule selectors

- Exact: `weapon:unmapped::Arggarok`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:arggarok`
- Families: `weapon-family:arggarok`, `weapon-family:axe`

### Recommendation

Raw-damage melee exotic for Strength-focused characters. Do not recommend normally to Strength-below-15 characters even if proficient because the weapon imposes its own separate -5 attack penalty.

### Guardrails

- Do not convert 2d12 base damage into damage_bonus; raw weapon dice remain structured comparison data.
- The Strength 15 rule is separate from proficiency and must be checked independently.
- Gamorrean alternate handling changes the legal proficiency route, not the canonical Exotic identity.

## 3. Atlatl

- **Identity:** `unmapped::Atlatl`
- **Repo:** missing
- **Source:** Core Rulebook — p.121 / table p.122
- **Canonical mechanic:** Gungan exotic weapon used to hurl energy balls farther than an unaided throw and usable as a club-like melee weapon in close combat. Although Exotic, a Gungan is treated as proficient with it if the Gungan has Weapon Proficiency (simple weapons).
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Atlatl)
- Alternate: Species is Gungan + Weapon Proficiency (simple weapons) → Proficient with the Atlatl without Exotic Weapon Proficiency (Atlatl).

### Rule selectors

- Exact: `weapon:unmapped::Atlatl`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:atlatl`
- Families: `weapon-family:atlatl`, `weapon-family:gungan-weapon`, `weapon-family:energy-ball-launcher`
- Modes:
  - mode=launcher; attackProfile=ranged; payload=energy-ball
  - mode=club; attackProfile=melee

### Recommendation

Hybrid Gungan weapon for characters who want energy-ball ranged attacks while retaining an emergency melee profile. Species-aware recommendation should strongly avoid suggesting a redundant Exotic Weapon Proficiency feat to qualifying Gungans.

### Guardrails

- Energy Ball is a payload/ammunition relationship, not a second Exotic weapon identity.
- Do not give the Atlatl precision merely because the Cesta makes Energy Balls Accurate; that benefit belongs to Cesta delivery.
- Gungan Simple Weapon proficiency is an alternate route, not a reclassification of the weapon for non-Gungans.

## 4. Aurial Blaster

- **Identity:** `weapon-aurial-blaster`
- **Repo:** present (`weapon-aurial-blaster`)
- **Source:** Knights of the Old Republic Campaign Guide — p.67 / table p.68
- **Canonical mechanic:** Exotic sonic blaster dealing 3d6 energy (sonic) damage. On a hit, if the attack roll also beats the target's Fortitude Defense, the target takes -5 on Perception checks until the end of the attacker's next turn. It uses pistol range and has a 50-shot power pack.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `control`, `perception`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Aurial Blaster)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-aurial-blaster`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:aurial-blaster`
- Families: `weapon-family:aurial-blaster`, `weapon-family:sonic-blaster`

### Recommendation

Ranged exotic sidearm for builds that value short-duration sensory/perception suppression in addition to direct damage.

### Guardrails

- Pistol range does not make the weapon a Pistol-group weapon and does not grant pistol proficiency.
- Do not add pistol as an unconditional semantic tag from range treatment alone.
- The Perception penalty is a control rider; exact duration and -5 value remain structured.

## 5. Blastsword

- **Identity:** `unmapped::Blastsword`
- **Repo:** missing
- **Source:** The Unknown Regions — p.36 / table p.37
- **Canonical mechanic:** Adumari exotic melee weapon combining a vibroblade with blaster components, dealing 3d6 damage. On a successful stab the blaster energy discharges. It may be treated as a light weapon for the purpose of using Weapon Finesse and requires a power pack.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Blastsword)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Blastsword`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:blastsword`
- Families: `weapon-family:blastsword`, `weapon-family:sword`, `weapon-family:powered-melee`
- Explicit ability interactions:
  - ability=Weapon Finesse; interaction=TREAT_AS_LIGHT_WEAPON_FOR_THIS_FEAT

### Recommendation

Exotic melee option with a direct Weapon Finesse compatibility hook. Particularly relevant to Dexterity-oriented melee builds that already possess or are pursuing Weapon Finesse.

### Guardrails

- Weapon Finesse compatibility is an exact named-ability interaction and must not be generalized to every light-weapon talent automatically.
- Do not invent a finesse semantic tag.
- Do not convert 3d6 base damage into damage_bonus.

## 6. Bowcaster

- **Identity:** `weapon-bowcaster`
- **Repo:** present (`weapon-bowcaster`)
- **Source:** Core Rulebook — p.127 / table p.126
- **Canonical mechanic:** Wookiee-crafted exotic ranged weapon dealing 3d10 damage with explosive energy quarrels. Although the bowcaster is an exotic weapon, Wookiees with Weapon Proficiency (rifles) are treated as proficient. A quiver holds 10 quarrels. Phase 3B leaves canonical range unresolved; rifle proficiency familiarity must not be used to infer rifle range.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Bowcaster)
- Alternate: Species is Wookiee + Weapon Proficiency (rifles) → Proficient with the Bowcaster without Exotic Weapon Proficiency (Bowcaster).

### Rule selectors

- Exact: `weapon:weapon-bowcaster`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:bowcaster`
- Families: `weapon-family:bowcaster`, `weapon-family:wookiee-weapon`

### Recommendation

High-damage exotic ranged weapon with a major Wookiee proficiency shortcut. Species-aware recommendation must not suggest redundant Exotic Weapon Proficiency to qualifying Wookiees.

### Guardrails

- Do not infer rifle range from the Wookiee rifle-proficiency familiarity rule; Phase 3B explicitly leaves Bowcaster range unresolved.
- Do not add burst_damage from the descriptive phrase 'explosive energy quarrel' without a separate mechanical burst/splash rule.
- Wookiee familiarity supplies an alternate proficiency route but does not erase the Bowcaster's canonical Exotic identity.

## 7. CR-1 Blast Cannon

- **Identity:** `weapon-cr-1-blast-cannon`
- **Repo:** present (`weapon-cr-1-blast-cannon`)
- **Source:** Force Unleashed Campaign Guide — p.198 / table p.199
- **Canonical mechanic:** Exotic 3d8 ranged blast cannon using pistol range. It does not take normal range penalties on attack rolls; those penalties apply to damage rolls instead. Against adjacent targets it deals +1d8 damage. Against nonadjacent targets it becomes a splash weapon with a 1-square splash radius. It is Inaccurate and cannot attack at long range.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `precision`, `damage_bonus`, `positioning`

### Proficiency

- Canonical: Exotic Weapon Proficiency (CR-1 Blast Cannon)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-cr-1-blast-cannon`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:cr-1-blast-cannon`
- Families: `weapon-family:cr-1-blast-cannon`, `weapon-family:blast-cannon`

### Recommendation

Close/medium-range exotic for characters who value reliable hit chance across its legal range and gain different benefits by distance: extra adjacent damage or nonadjacent splash.

### Guardrails

- Pistol range does not make the CR-1 a Pistol-group weapon and does not grant pistol proficiency.
- Phase 3B explicitly requires base areaEffect to remain false; nonadjacent splash is a structured conditional mode.
- Do not invent area_damage or inaccurate semantic tags.
- The +1d8 adjacent rider justifies damage_bonus; raw 3d8 base damage alone does not.

## 8. Cesta

- **Identity:** `unmapped::Cesta`
- **Repo:** missing
- **Source:** Core Rulebook — p.121 / table p.122
- **Canonical mechanic:** Gungan exotic flexible pole used to hurl energy balls and usable as a stafflike melee weapon. Although Exotic, Gungans with Weapon Proficiency (simple weapons) are treated as proficient. The Core energy-ball rules state that an energy ball hurled by a cesta uses simple-weapon range and is Accurate.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`, `precision`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Cesta)
- Alternate: Species is Gungan + Weapon Proficiency (simple weapons) → Proficient with the Cesta without Exotic Weapon Proficiency (Cesta).

### Rule selectors

- Exact: `weapon:unmapped::Cesta`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:cesta`
- Families: `weapon-family:cesta`, `weapon-family:gungan-weapon`, `weapon-family:energy-ball-launcher`
- Modes:
  - mode=launcher; attackProfile=ranged; payload=energy-ball; rangeProfile=simple; accurate=True
  - mode=staff; attackProfile=melee

### Recommendation

Hybrid Gungan melee/ranged weapon with an especially strong energy-ball delivery profile because cesta-fired energy balls are Accurate. Species-aware recommendation should avoid redundant Exotic Weapon Proficiency for qualifying Gungans.

### Guardrails

- Energy Ball is a payload/ammunition relationship, not a separate Exotic proficiency identity.
- precision is justified by the explicit Accurate rule for energy balls hurled by a Cesta.
- Gungan Simple Weapon proficiency is an alternate route, not a global reclassification of the Cesta.

## 9. Concealed Dart Launcher

- **Identity:** `weapon-concealed-dart-launcher`
- **Repo:** present (`weapon-concealed-dart-launcher`)
- **Source:** Legacy Era Campaign Guide — p.65 / table p.64
- **Canonical mechanic:** Wrist-mounted exotic launcher firing darts. The default sedative payload deals 3d8 stun damage and can affect targets beyond the normal 6-square stun limit. Darts may instead carry contact poison. The launcher uses pistol range, grants +5 equipment bonus to Stealth checks made to conceal it, and holds 6 darts per bundle.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `poison`, `concealment`, `stealth`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Concealed Dart Launcher)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-concealed-dart-launcher`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:concealed-dart-launcher`
- Families: `weapon-family:concealed-dart-launcher`, `weapon-family:wrist-launcher`
- Payload profiles:
  - id=sedative; effect=3d8 stun damage; default=True; extendedStunRange=True
  - id=contact-poison; effect=delivers loaded contact poison; default=False

### Recommendation

Concealable capture/infiltration exotic with long-reach stun capability and optional contact-poison payloads. Strong for stealthy bounty-hunter or nonlethal-control builds.

### Guardrails

- Pistol range does not make this a Pistol-group weapon and does not grant pistol proficiency.
- Sedative and contact-poison darts are structural payload profiles, not separate Exotic weapon identities.
- Do not flatten poison into every shot; poison applies when the dart is loaded with a contact poison.
- The +5 concealment bonus supports concealment and stealth semantics; the exact numeric bonus remains structured.

## 10. Darkstick

- **Identity:** `unmapped::Darkstick`
- **Repo:** missing
- **Source:** Galaxy at War — p.36 / table p.36
- **Canonical mechanic:** Kerestian exotic melee blade dealing 1d6 slashing damage and throwable as a ranged attack. A proficient wielder can hold multiple darksticks in one hand while still being treated as wielding one weapon; two or more increase the damage dice to 2d8. A thrown darkstick immediately returns to the wielder's hand if the attack exceeds Reflex Defense by 5 or more. Later light-absorbing versions give total concealment against adjacent enemies unless they have darkvision, but the wielder must also be able to see in darkness.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`, `damage_bonus`
- **Conditional semantic tags:**
  - `concealment` when **light-absorbing-cell darkstick version is used and adjacent observer lacks darkvision** — Later versions explicitly shroud the wielder so adjacent enemies treat the wielder as having total concealment.
  - `defense` when **light-absorbing-cell darkstick version is used and adjacent observer lacks darkvision** — The conditional total-concealment effect directly protects the wielder from adjacent attacks.

### Proficiency

- Canonical: Exotic Weapon Proficiency (Darkstick)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Darkstick`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:darkstick`
- Families: `weapon-family:darkstick`, `weapon-family:kerestian-weapon`, `weapon-family:throwable-melee`
- Modes:
  - mode=melee; attackProfile=melee
  - mode=thrown; attackProfile=ranged; returnTrigger=attack exceeds target Reflex Defense by 5 or more

### Recommendation

Flexible melee/thrown exotic for characters who can exploit its multi-blade damage configuration. Later light-absorbing versions add a specialized adjacent-defense niche for characters able to see in darkness.

### Guardrails

- Do not add dual_wield: multiple Darksticks held in one hand are explicitly treated as one weapon.
- Do not add a thrown semantic tag; thrown capability remains structural.
- damage_bonus is justified by the explicit 1d6-to-2d8 configuration rule, not by high raw damage alone.
- Concealment/defense are conditional to the later light-absorbing version and must not be promoted into unconditional finalTags.

## 11. Deck Sweeper

- **Identity:** `weapon-deck-sweeper`
- **Repo:** present (`weapon-deck-sweeper`)
- **Source:** Scum and Villainy — p.50 / table p.51
- **Canonical mechanic:** Exotic ranged weapon that fires only on the stun setting. It attacks every target in a 6-square cone with one attack roll; a hit deals full stun damage and a miss deals half stun damage. It must be primed with a swift action during the same turn before firing. Its power pack provides 5 shots.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `swift_action`, `action_economy`, `setup`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Deck Sweeper)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-deck-sweeper`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:deck-sweeper`
- Families: `weapon-family:deck-sweeper`, `weapon-family:stun-area-weapon`

### Recommendation

Dedicated nonlethal crowd-control exotic for characters willing to spend a swift action to prime it before firing. Its 6-square cone and half-stun-on-miss behavior make it especially useful when multiple targets must be subdued.

### Guardrails

- Do not create area_damage as a semantic tag; cone geometry and area-attack resolution remain structured mechanics.
- The same-turn swift-action prime is mandatory setup, not optional flavor.
- The weapon is stun-only; do not infer a lethal firing mode.

## 12. Discblade

- **Identity:** `weapon-discblade`
- **Repo:** present (`weapon-discblade`)
- **Source:** Jedi Academy Training Manual — p.61 / table p.61
- **Canonical mechanic:** Exotic aerodynamic thrown ring weapon favored by the Zeison Sha. The base weapon does not automatically return after a throw. Certified Zeison Sha talents provide the weapon-specific return, range, and multi-target interactions.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Discblade)
- Alternate: none certified in this planner record.

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

### Recommendation

Signature exotic ranged weapon for Zeison Sha and other builds investing in its named talent package. Its strongest recommendation value comes from exact Discblade-specific ability joins rather than from broad thrown-weapon inference.

### Guardrails

- Do not add force, telekinesis, pistol, or area semantics to the base weapon merely because named talents can grant those interactions.
- Return-to-hand is not an innate property of every Discblade throw.
- Do not create a thrown semantic tag; thrown status remains structural.

## 13. Felucian Skullblade

- **Identity:** `unmapped::Felucian Skullblade`
- **Repo:** missing
- **Source:** Force Unleashed Campaign Guide — p.96 / table p.96
- **Canonical mechanic:** Small exotic swordlike melee weapon made from Felucian animal skulls containing trace Force-reactive crystal. The weapon can be imbued with Force energy and, while so imbued, can block lightsaber strikes. It is culturally important and normally obtained through Felucian Force adepts rather than ordinary commerce.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`
- **Conditional semantic tags:**
  - `force` when **skullblade is imbued with Force energy** — The lightsaber-blocking property exists only when Force-imbued.
  - `lightsaber` when **skullblade is imbued with Force energy** — The special defensive interaction specifically concerns lightsaber strikes.
  - `block` when **skullblade is imbued with Force energy** — The source explicitly states that the imbued skullblade can block lightsaber strikes.
  - `melee_defense` when **skullblade is imbued with Force energy** — The special property is a defensive melee interaction.
  - `defense` when **skullblade is imbued with Force energy** — The special property defensively answers lightsaber attacks.

### Proficiency

- Canonical: Exotic Weapon Proficiency (Felucian Skullblade)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Felucian Skullblade`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:felucian-skullblade`
- Families: `weapon-family:felucian-skullblade`, `weapon-family:felucian-weapon`, `weapon-family:force-reactive-weapon`

### Recommendation

Specialized exotic melee weapon for Force-sensitive/Felucian concepts, with its distinctive value coming from the Force-imbued lightsaber-blocking state rather than raw weapon statistics.

### Guardrails

- Do not make force, lightsaber, block, melee_defense, or defense unconditional final tags; the source gates the interaction behind Force imbuement.
- Do not invent an activation action, skill check, duration, or Force Point cost for imbuing the weapon; the cited weapon entry does not define one.
- Cultural scarcity belongs to availability/recommendation data, not semantic tags.

## 14. Fira

- **Identity:** `unmapped::Fira`
- **Repo:** missing
- **Source:** Knights of the Old Republic Campaign Guide — p.65 / table p.64
- **Canonical mechanic:** Selkath exotic melee sword made from a cortosis-bearing alloy and benefiting from the Cortosis Weave/Phrik Alloy template. Against a living creature, if the attack roll equals or exceeds both Reflex Defense and Fortitude Defense, the target takes half the attack's damage again on the following round from the grievous wound.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `damage_bonus`, `sustained_damage`, `targeting`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Fira)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Fira`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:fira`
- Families: `weapon-family:fira`, `weapon-family:selkath-weapon`, `weapon-family:sword`
- Explicit ability interactions:
  - ability=Greater Weapon Focus (Fira); interaction=NAMED_FIRA_ATTACK_BONUS_SYNERGY

### Recommendation

Exotic melee weapon for accuracy-focused characters who can reliably clear both Reflex and Fortitude with the same attack roll, converting strong hits into delayed additional damage. It also has an exact named build join with Greater Weapon Focus (Fira).

### Guardrails

- The grievous-wound rider applies only to living creatures and only when the same attack roll clears both defenses.
- The delayed half-damage rider supports damage_bonus and sustained_damage; do not rewrite it as immediate burst damage.
- Cortosis/Phrik behavior remains a structured gear-template property and must not be generalized into unrelated lightsaber semantics.

## 15. Flamethrower

- **Identity:** `weapon-flamethrower`
- **Repo:** present (`weapon-flamethrower`)
- **Source:** Core Rulebook — p.127 / table p.126
- **Canonical mechanic:** Exotic ranged weapon dealing 3d6 damage in a cone 6 squares long and 6 squares wide at the terminus. Make one attack roll against the Reflex Defense of every target in the area; Evasion modifies the area attack normally. The chemical supply provides 5 uses, and reloading the chemical cartridge is a full-round action.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`
- **Tradeoff tags:** `action_economy`, `setup` (not promoted to finalTags)

### Proficiency

- Canonical: Exotic Weapon Proficiency (Flamethrower)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-flamethrower`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:flamethrower`
- Families: `weapon-family:flamethrower`, `weapon-family:chemical-area-weapon`

### Recommendation

Short-range multi-target exotic for builds that value broad cone coverage and can tolerate limited five-use ammunition and a full-round reload requirement.

### Guardrails

- Do not create area_damage, cone, or fire as semantic tags unless separately certified; geometry and damage type remain structured.
- Do not add control merely because the attack covers an area.
- The chemical cartridge reload is a full-round action, but full_round_action is retained as structured/plain-text mechanics rather than a Phase 4G semantic tag.
- action_economy and setup describe the reload tradeoff but are not promoted into finalTags under the Phase 4C–4G planner convention.

## 16. Garrote

- **Identity:** `unmapped::Garrote`
- **Repo:** missing
- **Source:** Clone Wars Campaign Guide — p.59 / table p.60
- **Canonical mechanic:** Two-handed Exotic melee weapon whose attack is treated as a grab attack. Bonuses from feats and talents that apply to the garrote also apply to that grab. At the beginning of the grabbed target's turn, before it acts, the target takes the garrote's damage and moves -1 step on the condition track, in addition to the normal effects of a grab; the target can attempt to break the grab normally.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `grab`, `control`, `battlefield_control`, `sustained_damage`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Garrote)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Garrote`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:garrote`
- Families: `weapon-family:garrote`, `weapon-family:grab-weapon`, `weapon-family:two-handed-melee`

### Recommendation

Dedicated single-target control weapon for grab-focused melee builds. Its value is sustained pressure while the grab persists rather than raw opening damage.

### Guardrails

- Do not introduce condition_track as a semantic tag; the persistent condition-track rider remains structured canonical mechanics.
- Do not add restrain merely from the grab state; the source says grab, not Pin or a stronger restraint mechanic.
- sustained_damage is justified by automatic recurring weapon damage at the beginning of the grabbed target's turns.

## 17. Magna Caster

- **Identity:** `weapon-magna-caster`
- **Repo:** present (`weapon-magna-caster`)
- **Source:** The Unknown Regions — p.38 / table p.38
- **Canonical mechanic:** Exotic projectile ranged weapon using magnetically accelerated bolts. Its low-noise operation grants a +5 equipment bonus to Stealth checks made to snipe. The weapon table marks it Accurate, and it uses 10-shot bolt cases.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `stealth`, `sniper`, `precision`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Magna Caster)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-magna-caster`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:magna-caster`
- Families: `weapon-family:magna-caster`, `weapon-family:magnetic-projectile-weapon`, `weapon-family:sniper-weapon`

### Recommendation

Covert precision exotic for snipers who value stealth after firing. Accurate handling and the explicit Stealth-to-snipe bonus make it a strong ambush weapon.

### Guardrails

- Do not create an accuracy semantic tag; the Accurate quality is represented by certified precision plus structured range mechanics.
- Do not infer a rifle proficiency group merely because the weapon fills a hunting/sniping role.
- The +5 Stealth bonus is specifically for sniping, not a universal bonus to all Stealth checks.

## 18. Massassi Lanvarok

- **Identity:** `weapon-massassi-lanvarok`
- **Repo:** present (`weapon-massassi-lanvarok`)
- **Source:** Knights of the Old Republic Campaign Guide — p.69 / table p.68
- **Canonical mechanic:** Large Exotic polearm that can hurl one disc using thrown-weapon ranges; after the disc is hurled it functions as a two-handed slashing melee weapon. Its ranged use is Inaccurate and it holds one disc at a time. The frozen Phase 3B authority follows the weapon entry and treats Massassi as using Advanced Melee proficiency instead of Exotic proficiency.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `ranged`, `offense_ranged`
- **Tradeoff tags:** `precision` (not promoted to finalTags)

### Proficiency

- Canonical: Exotic Weapon Proficiency (Massassi Lanvarok)
- Alternate: Species is Massassi + Weapon Proficiency (advanced melee weapons) → Treat as proficient under the frozen Phase 3B weapon-entry ruling.

### Rule selectors

- Exact: `weapon:weapon-massassi-lanvarok`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:massassi-lanvarok`
- Families: `weapon-family:massassi-lanvarok`, `weapon-family:lanvarok`, `weapon-family:polearm`, `weapon-family:throwable-melee`
- Modes:
  - mode=disc; attackProfile=ranged; rangeProfile=thrown-weapon; capacity=1; inaccurate=True
  - mode=polearm; attackProfile=melee; hands=2

### Recommendation

Hybrid melee/ranged exotic with a one-disc opening throw followed by two-handed melee use. Particularly efficient for Massassi under the frozen alternate-proficiency ruling.

### Guardrails

- Do not add thrown as a semantic tag; thrown range is structural.
- Inaccurate ranged use is a precision tradeoff, not a negative final tag.
- KOTOR species text separately says Massassi treat 'the lanvarok' as a simple weapon, while the weapon entry says advanced melee. Phase 3B froze the weapon-entry advanced-melee interpretation; preserve that ruling and keep the source conflict visible.

## 19. Neural Inhibitor

- **Identity:** `weapon-neural-inhibitor`
- **Repo:** present (`weapon-neural-inhibitor`)
- **Source:** Scum and Villainy — p.50 / table p.51
- **Canonical mechanic:** Exotic dart weapon that injects neurotoxin into a living target. After the weapon hits, the poison makes a 1d20+5 attack against Fortitude Defense; success moves the target -1 condition step. Failed poison attacks gain a cumulative +1 until one succeeds. The poison attacks again at the beginning of the target's turns until cured with DC 20 Treat Injury or until the target falls unconscious.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `poison`, `control`, `battlefield_control`, `targeting`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Neural Inhibitor)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-neural-inhibitor`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:neural-inhibitor`
- Families: `weapon-family:neural-inhibitor`, `weapon-family:dart-weapon`, `weapon-family:poison-delivery`

### Recommendation

Persistent anti-living control weapon for builds that want to pressure Fortitude rather than rely only on normal Reflex attacks. Strong against durable targets that are hard to drop immediately.

### Guardrails

- Do not add condition_track; the condition movement is structured mechanics.
- Do not use sustained_damage because the recurring effect is a poison/condition attack rather than repeated damage.
- Treat Injury is counterplay, not a recommendation semantic for the wielder, so it is retained structurally rather than tagged.
- The neurotoxin applies to living targets.

## 20. Neuronic Whip

- **Identity:** `unmapped::Neuronic Whip`
- **Repo:** missing
- **Source:** Force Unleashed Campaign Guide — p.200 / table p.199
- **Canonical mechanic:** Exotic melee whip that deals its normal stun damage plus 1d4 slashing damage on a successful hit. It increases the wielder's reach by 1 square and requires an energy cell.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `stun`, `nonlethal`, `damage_bonus`, `positioning`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Neuronic Whip)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Neuronic Whip`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:neuronic-whip`
- Families: `weapon-family:neuronic-whip`, `weapon-family:whip`, `weapon-family:reach-weapon`, `weapon-family:stun-weapon`

### Recommendation

Reach-oriented capture weapon for melee characters who want native stun pressure without giving up some lethal chip damage.

### Guardrails

- damage_bonus is justified by the explicit extra 1d4 slashing damage added to the normal stun damage.
- positioning represents the explicit +1-square reach; do not invent a reach semantic tag.
- The weapon is not purely nonlethal because it also deals slashing damage, but its primary damage package explicitly includes stun.

## 21. Pulse Rifle

- **Identity:** `weapon-pulse-rifle`
- **Repo:** present (`weapon-pulse-rifle`)
- **Source:** Scum and Villainy — p.50 / table p.51
- **Canonical mechanic:** Exotic ranged weapon that fires a 6-square cone. Make one attack roll and compare it to the Reflex Defense of every target in the area; hits take normal damage and misses take half damage. A power pack provides 5 shots.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `burst_damage`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Pulse Rifle)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-pulse-rifle`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:pulse-rifle`
- Families: `weapon-family:pulse-rifle`, `weapon-family:cone-weapon`, `weapon-family:area-weapon`

### Recommendation

Short-range multi-target exotic for characters who want dependable cone pressure, including half damage on misses, and can work within its five-shot capacity.

### Guardrails

- Do not add rifle; that string is not part of the certified weapon semantic vocabulary.
- Do not create area_damage or cone semantic tags; cone geometry remains structured.
- burst_damage is justified by the direct multi-target cone attack.

## 22. Ryyk Blade

- **Identity:** `weapon-wookiee-ryyk-blade`
- **Repo:** present (`weapon-wookiee-ryyk-blade`)
- **Source:** Force Unleashed Campaign Guide — p.97 / table p.96
- **Canonical mechanic:** Traditional Wookiee Exotic melee blade. Wookiees with Weapon Proficiency (advanced melee weapons) are proficient with it. A proficient character carrying one gains a +2 bonus on Survival checks made for basic survival in forest or jungle wilderness.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `survival`, `exploration`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Ryyk Blade)
- Alternate: Species is Wookiee + Weapon Proficiency (advanced melee weapons) → Proficient with the Ryyk Blade without Exotic Weapon Proficiency (Ryyk Blade).

### Rule selectors

- Exact: `weapon:weapon-wookiee-ryyk-blade`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:ryyk-blade`
- Families: `weapon-family:ryyk-blade`, `weapon-family:wookiee-weapon`, `weapon-family:survival-weapon`

### Recommendation

Wookiee-friendly exotic melee weapon with genuine wilderness utility. Best for forest/jungle survival builds, especially Wookiees who already have Advanced Melee proficiency.

### Guardrails

- The +2 Survival bonus applies only to basic survival in forest or jungle wilderness.
- Do not recommend redundant Exotic Weapon Proficiency to a qualifying Wookiee.
- survival and exploration are direct mechanical utility tags, not flavor inference.

## 23. Shyarn

- **Identity:** `unmapped::Shyarn`
- **Repo:** missing
- **Source:** Knights of the Old Republic Campaign Guide — p.65 / table p.64
- **Canonical mechanic:** Rare Cerean Exotic melee blade. A character wielding a shyarn takes no penalty to attack rolls when using the Rapid Strike feat.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `precision`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Shyarn)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Shyarn`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:shyarn`
- Families: `weapon-family:shyarn`, `weapon-family:cerean-weapon`, `weapon-family:sword`
- Explicit ability interactions:
  - ability=Rapid Strike; interaction=REMOVE_RAPID_STRIKE_ATTACK_PENALTY

### Recommendation

Rapid Strike specialist weapon: it removes Rapid Strike's attack penalty while preserving the feat's offensive benefit.

### Guardrails

- Do not add damage_bonus or burst_damage from Rapid Strike itself; the weapon's explicit benefit is removal of the attack penalty.
- Do not infer broader melee accuracy benefits beyond the named Rapid Strike interaction.

## 24. Siang Lance

- **Identity:** `weapon-siang-lance`
- **Repo:** present (`weapon-siang-lance`)
- **Source:** Rebellion Era Campaign Guide — p.50 / table p.50
- **Canonical mechanic:** Ancient one-handed sporting blaster with an affixed bayonet. It can make attacks of opportunity; when one is triggered, the wielder may choose either a ranged shot with the lance or a melee bayonet attack. The frozen Exotic census treats the ranged lance profile as Exotic and the affixed bayonet profile as Simple. Siang Lance Mastery can instead make the lance count as a rifle and grants +1 to attacks with it.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`, `attack_of_opportunity`
- **Conditional semantic tags:**
  - `exotic_weapon` when **using the ranged lance profile under its native proficiency treatment** — The Exotic proficiency classification applies to the lance's ranged profile; the affixed bayonet is a Simple profile.

### Proficiency

- Canonical: Exotic Weapon Proficiency (Siang Lance) for the ranged lance profile
- Canonical: Weapon Proficiency (simple weapons) for the affixed bayonet profile
- Alternate: Character has Siang Lance Mastery + Siang Lance Mastery talent → Treat the Siang Lance as a rifle instead of as an exotic weapon; the talent also grants +1 to attack rolls with it.

### Rule selectors

- Exact: `weapon:weapon-siang-lance`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:siang-lance`
- Families: `weapon-family:siang-lance`, `weapon-family:blaster-bayonet`, `weapon-family:hybrid-melee-ranged`
- Modes:
  - mode=lance-shot; attackProfile=ranged; nativeProficiency=exotic
  - mode=bayonet; attackProfile=melee; nativeProficiency=simple
- Explicit ability interactions:
  - ability=Siang Lance Mastery; interaction=TREAT_AS_RIFLE_INSTEAD_OF_EXOTIC_AND_GAIN_PLUS_1_ATTACK

### Recommendation

Hybrid opportunity-attack weapon for one-handed ranged/melee builds. It is especially attractive to Kilian Ranger builds using Siang Lance Mastery, which replaces the Exotic treatment with rifle treatment.

### Guardrails

- Do not place exotic_weapon in unconditional finalTags; this is the category's key profile-scoped hybrid case.
- Do not add rifle as a semantic tag when Siang Lance Mastery changes proficiency treatment; rifle remains structural.
- Do not add lightsaber or lightsaber_polearm to the weapon merely because Siang Lance Mastery is a certified talent with its own semantic vocabulary.
- The ranged and bayonet opportunity attacks are both explicitly legal when an attack of opportunity is triggered.

## 25. Sith Lanvarok

- **Identity:** `weapon-sith-lanvarok`
- **Repo:** present (`weapon-sith-lanvarok`)
- **Source:** Knights of the Old Republic Campaign Guide — p.69 / table p.68
- **Canonical mechanic:** Wrist-mounted Exotic disc launcher that is worn rather than held, leaving the wielder's hands free. It uses pistol ranges and can be fired as though it were a second weapon for two-weapon fighting. It is Inaccurate and holds 5 discs.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `dual_wield`
- **Tradeoff tags:** `precision` (not promoted to finalTags)

### Proficiency

- Canonical: Exotic Weapon Proficiency (Sith Lanvarok)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-sith-lanvarok`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:sith-lanvarok`
- Families: `weapon-family:sith-lanvarok`, `weapon-family:lanvarok`, `weapon-family:wrist-launcher`, `weapon-family:dual-wield-ranged`
- Explicit ability interactions:
  - ability=two-weapon fighting; interaction=MAY_BE_FIRED_AS_SECOND_WEAPON_WHILE_WORN

### Recommendation

Hands-free off-hand exotic for dual-wield builds. It is particularly valuable when a character wants a second ranged weapon without occupying a hand.

### Guardrails

- Pistol range does not make the Sith Lanvarok a Pistol-group weapon and does not grant pistol proficiency.
- Do not add pistol as a semantic tag from range equivalence.
- Inaccurate is a precision tradeoff and remains structured.
- Do not reproduce the old repo's invented three-disc cone/spread attack; Phase 1 explicitly rejected it.

## 26. Squib Tensor Rifle

- **Identity:** `weapon-squib-tensor-rifle`
- **Repo:** present (`weapon-squib-tensor-rifle`)
- **Source:** The Unknown Regions — p.39 / table p.38
- **Canonical mechanic:** Exotic ranged tensor weapon that attacks Fortitude Defense rather than Reflex Defense. On a successful attack the target moves -1 step on the condition track regardless of the damage roll. Squibs treat the weapon as a rifle rather than an Exotic weapon; it also uses rifle range and a 15-shot power pack.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `control`, `battlefield_control`, `targeting`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Squib Tensor Rifle)
- Alternate: Species is Squib + Weapon Proficiency (rifles) → Treat the Squib Tensor Rifle as a rifle rather than as an exotic weapon.

### Rule selectors

- Exact: `weapon:weapon-squib-tensor-rifle`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:squib-tensor-rifle`
- Families: `weapon-family:squib-tensor-rifle`, `weapon-family:tensor-weapon`, `weapon-family:tractor-beam-weapon`

### Recommendation

Defense-targeting exotic that pressures Fortitude and condition state directly. Especially efficient for Squibs who already possess rifle proficiency.

### Guardrails

- Do not add condition_track; the -1 condition-step effect remains structured.
- Do not add rifle as a semantic tag; rifle treatment is a structural proficiency/range rule.
- targeting captures the explicit alternate-defense attack profile without implying an accuracy bonus.

## 27. Tehk'la Blade

- **Identity:** `unmapped::Tehkla Blade`
- **Repo:** missing
- **Source:** Legacy Era Campaign Guide — p.62 / table p.62
- **Canonical mechanic:** Nagai Exotic melee blade. If the attack roll equals or exceeds both the target's Reflex Defense and Fortitude Defense, the target takes an additional 1d6 damage from bleeding at the start of its next turn. Legacy species text separately states that Nagai treat tehk'la blades as simple weapons instead of exotic weapons.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `damage_bonus`, `sustained_damage`, `targeting`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Tehk'la Blade)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Tehkla Blade`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:tehkla-blade`
- Families: `weapon-family:tehkla-blade`, `weapon-family:nagai-weapon`, `weapon-family:vibro-weapon`

### Recommendation

Accuracy-rewarding melee exotic that converts attacks clearing both Reflex and Fortitude into delayed bonus damage.

### Guardrails

- The delayed 1d6 rider triggers only when the same attack roll equals or exceeds both Reflex and Fortitude.
- damage_bonus and sustained_damage represent the explicit delayed bleeding damage.
- The frozen 4G census did not include Nagai's simple-weapon familiarity among its nine alternate cases. The source text does. Preserve this as an authority discrepancy rather than silently rewriting the frozen census.

## 28. Verpine Shatter Gun

- **Identity:** `weapon-verpine-shattergun`
- **Repo:** present (`weapon-verpine-shattergun`)
- **Source:** The Unknown Regions — p.39 / table p.38
- **Canonical mechanic:** Exotic magnetic-coil handgun. The weapon table marks it Accurate. On a successful critical hit it deals an additional 1d10 damage after the normal critical multiplication. If the weapon takes any damage it becomes disabled until repaired with Mechanics. Verpines treat it as a pistol rather than an exotic weapon; it uses pistol range and a 50-shot special ammunition clip.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `precision`, `critical_hit`, `damage_bonus`
- **Tradeoff tags:** `durability` (not promoted to finalTags)

### Proficiency

- Canonical: Exotic Weapon Proficiency (Verpine Shatter Gun)
- Alternate: Species is Verpine + Weapon Proficiency (pistols) → Treat the Verpine Shatter Gun as a pistol rather than as an exotic weapon.

### Rule selectors

- Exact: `weapon:weapon-verpine-shattergun`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:verpine-shatter-gun`
- Families: `weapon-family:verpine-shatter-gun`, `weapon-family:magnetic-projectile-weapon`, `weapon-family:critical-weapon`

### Recommendation

High-end critical-hit exotic with Accurate handling. Excellent for crit-focused Verpine or pistol-adjacent builds, but unusually fragile if the weapon itself is damaged.

### Guardrails

- Do not add stealth merely because the weapon is described as nearly silent; the entry grants no Stealth modifier or explicit concealment rule.
- The weapon's fragility is a durability tradeoff; do not put durability into finalTags as though it were an advantage.
- Pistol range and Verpine pistol treatment are structural and do not justify a global pistol semantic tag.
- The additional 1d10 applies after normal critical-hit multiplication.

## 29. Vibro-Saw

- **Identity:** `unmapped::Vibro-Saw`
- **Repo:** missing
- **Source:** The Unknown Regions — p.36 / table p.37
- **Canonical mechanic:** Large Exotic vibro cutting tool/weapon dealing heavy melee damage. A vibro-saw ignores a target's Damage Reduction and requires two energy cells.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Vibro-Saw)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Vibro-Saw`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:vibro-saw`
- Families: `weapon-family:vibro-saw`, `weapon-family:vibro-weapon`, `weapon-family:cutting-tool`

### Recommendation

Heavy melee exotic for characters who specifically need to defeat Damage Reduction. Its signature advantage is DR bypass, which remains structured because no certified offensive DR-penetration tag exists.

### Guardrails

- Do not use damage_reduction for offensive DR penetration; prior weapon authority reserves that semantic for actual DR/durability behavior.
- Do not add damage_bonus merely because the base damage is high.
- Record DR bypass as structured recommendation data / ontology gap rather than inventing a new tag.

### Ontology gaps

- **DAMAGE_REDUCTION_BYPASS** — Ignores a target's Damage Reduction. No certified feat/talent-used tag cleanly represents offensive DR penetration; damage_reduction has a different semantic meaning.

## 30. Wrist Rocket Launcher

- **Identity:** `weapon-wrist-rocket-launcher`
- **Repo:** present (`weapon-wrist-rocket-launcher`)
- **Source:** Clone Wars Campaign Guide — p.63 / table p.61
- **Canonical mechanic:** Forearm-mounted Exotic single-shot launcher. It must be reloaded after every shot, and its effect depends on the loaded wrist rocket. Published payloads include antipersonnel, antivehicle, flash, hollow-tip empty, hollow-tip nerve toxin, hollow-tip stun gas, and ion-blast rockets.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`
- **Tradeoff tags:** `setup`, `action_economy` (not promoted to finalTags)

### Proficiency

- Canonical: Exotic Weapon Proficiency (Wrist Rocket Launcher)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-wrist-rocket-launcher`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:wrist-rocket-launcher`
- Families: `weapon-family:wrist-rocket-launcher`, `weapon-family:wrist-launcher`, `weapon-family:payload-launcher`
- Payload profiles:
  - id=antipersonnel-rocket; role=damage payload
  - id=antivehicle-rocket; role=damage payload
  - id=flash-rocket; role=special payload
  - id=hollow-tip-empty; role=piercing payload
  - id=hollow-tip-nerve-toxin; role=toxin payload
  - id=hollow-tip-stun-gas; role=stun-gas payload
  - id=ion-blast-rocket; role=ion payload

### Recommendation

Payload-flexible Exotic launcher for characters who want one forearm weapon to serve multiple tactical roles. The recommendation engine should score the launcher together with the currently loaded rocket rather than flatten every payload effect onto the base weapon.

### Guardrails

- Rocket payloads are structural payload profiles, not separate Exotic weapon identities.
- Do not statically attach stun, poison, droid, vehicle, burst_damage, control, or other payload semantics to the base launcher.
- Resolve payload semantics from the loaded rocket at recommendation/runtime time.
- Single-shot reloading is an action-economy/setup tradeoff, not a final semantic advantage.

## 31. Xerrol Nightstinger

- **Identity:** `weapon-xerrol-nightstinger`
- **Repo:** present (`weapon-xerrol-nightstinger`)
- **Source:** Galaxy of Intrigue — p.64 / table p.65
- **Canonical mechanic:** Long-range sporting blaster designed for sniping. It fires visually invisible shots from special exotic-gas canisters, allowing a sniper to shoot without visually revealing the firing position. Each gas canister provides 5 shots. The frozen Phase 3B Exotic census controls its proficiency identity despite older Phase 1 prose classifying it as Rifle.
- **Final tags:** `exotic_weapon`, `ranged`, `offense_ranged`, `stealth`, `sniper`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Xerrol Nightstinger)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:weapon-xerrol-nightstinger`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:xerrol-nightstinger`
- Families: `weapon-family:xerrol-nightstinger`, `weapon-family:sniper-weapon`, `weapon-family:covert-ranged`

### Recommendation

Covert sniping exotic for characters whose priority is firing without visually exposing their position. It trades ammunition economy for strong concealment-of-origin utility.

### Guardrails

- Do not add precision merely because the weapon is intended for sniping; the weapon entry grants no direct attack-roll bonus.
- Do not add concealment; invisible bolts conceal the firing origin visually but do not grant the wielder a concealment state.
- Phase 1 called the weapon a Rifle while the frozen Phase 3B Exotic census includes it as an Exotic-proficiency identity. Phase 3B controls this Phase 4G classification.
- Do not add rifle as a semantic tag.

## 32. Zhaboka

- **Identity:** `unmapped::Zhaboka`
- **Repo:** missing
- **Source:** Knights of the Old Republic Campaign Guide — p.66 / table p.64
- **Canonical mechanic:** Zabrak Exotic double melee weapon with a blade at each end. A character wielding a zhaboka takes no penalty to attack rolls when using Rapid Strike. Both ends can be used in a full-round attack using the normal double-weapon penalties before feat/talent reductions.
- **Final tags:** `exotic_weapon`, `melee`, `offense_melee`, `double_weapon`, `full_attack`, `precision`

### Proficiency

- Canonical: Exotic Weapon Proficiency (Zhaboka)
- Alternate: none certified in this planner record.

### Rule selectors

- Exact: `weapon:unmapped::Zhaboka`
- Group: `weapon-group:exotic`
- Proficiency: `weapon-proficiency:zhaboka`
- Families: `weapon-family:zhaboka`, `weapon-family:zabrak-weapon`, `weapon-family:double-weapon`
- Explicit ability interactions:
  - ability=Rapid Strike; interaction=REMOVE_RAPID_STRIKE_ATTACK_PENALTY

### Recommendation

Double-weapon Exotic for full-attack builds that also use Rapid Strike. It combines normal double-weapon multiattack support with removal of Rapid Strike's attack penalty.

### Guardrails

- Do not add dual_wield merely because both ends can attack; existing weapon authority uses double_weapon + full_attack for double weapons.
- Do not add damage_bonus or burst_damage from Rapid Strike itself; the weapon explicitly removes only the attack penalty.
- precision is justified by the named Rapid Strike penalty-removal rule.

## Final QA

- Identities: **32/32**
- Repo-present / missing: **18 / 14**
- Distinct Phase 4G semantic tags: **41**
- 183-tag invariant: **PASS**
- Forbidden pseudo-tags in semantic fields: **0**
- Hybrid Exotic scoping: **PASS**
- Payload flattening: **PASS**
- Production mutation: **NOT AUTHORIZED**
