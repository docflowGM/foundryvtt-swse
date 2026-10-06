# Phase 4A — Simple Weapon Semantic Tags — Rolling Planner Authority

**Status:** `WEAPON_TAG_PHASE_4A_SIMPLE_ROLLING_ROUND_3_PLANNER_ADJUDICATED`

This is the rolling planner authority for Simple Weapon semantic tags. Each round appends new frozen canonical identities; earlier planner rulings are preserved.

Production mutation is **not authorized**. Runtime suggestion code is **not authorized** to change in this phase.

## Frozen baseline

- Repository: `docflowGM/foundryvtt-swse`
- Branch: `claude/dazzling-meitner-czyh1x`
- Baseline commit: `8b99a62ff34b7726261866569b9845d9f5dc144f`
- Phase 3D: `WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN`
- Phase 3B canonical authority: `data/audits/item-weapons-phase-3b-canonical-authority.json`

## Vocabulary rule

Weapons may use **only tags already used by certified feats and/or certified talents**.

The derived feat/talent-used union contains **183 tags**. No weapon-only or runtime-only vocabulary may be introduced.

Explicitly rejected runtime-only examples:

`accuracy`, `area_damage`, `condition_track`, `explosives`, `grenade`, `rifle`, `thrown`

If a weapon concept cannot be represented faithfully with those existing feat/talent tags, it is recorded as an ontology gap.

## Simple Weapon census

- Canonical Simple Weapon identities: **49**
- Repo-present: **28**
- Repo-missing: **21**
- Adjudicated through Round 3: **36**
- Remaining: **13**
- Cumulative tag assignments: **151**
- Distinct tags used cumulatively: **39**
- Cumulative ontology-gap concepts: **2**
- Next canonical identity: **Sith Sword**

## Round ledger

- Round 1: Adhesive Grenade → Darter — 12 identities; 7 present / 5 missing; 49 tag assignments; 0 ontology gaps.
- Round 2: Datadagger → Grenade, Radiation — 12 identities; 7 present / 5 missing; 50 tag assignments; 1 ontology gaps.
- Round 3: Grenade, Smoke → Short Sword — 12 identities; 6 present / 6 missing; 52 tag assignments; 1 ontology gaps.

## Adjudicated identities

### 1. Adhesive Grenade

- Identity: `weapon-adhesive-grenade`
- Repo: present (`weapon-adhesive-grenade`)
- Source: Knights of the Old Republic Campaign Guide — description p.67, stat table p.68
- Canonical mechanic: Riot-control grenade that can hold targets in place for up to 3 rounds until they win the opposed grapple check.
- **Final tags:** `ranged`, `control`, `battlefield_control`, `grapple`, `restrain`, `opposed_check`

Rationale:

- `ranged` — The weapon resolves its use with the attacker's ranged attack roll.
- `control` — Its defining effect denies movement rather than dealing normal damage.
- `battlefield_control` — The adhesive affects every target in the blast radius and can hold multiple creatures in place.
- `grapple` — Targets explicitly make grapple checks to resist or escape the adhesive.
- `restrain` — A failed check leaves the target unable to move for the effect's duration.
- `opposed_check` — The target's grapple check is explicitly opposed by the attacker's ranged attack roll.

Adjudication notes:

- Do not add grenade, thrown, area_damage, or other weapon-runtime-only tags; they are outside the certified feat/talent-used vocabulary.

### 2. Axe

- Identity: `unmapped::Axe`
- Repo: missing
- Source: Rebellion Era Campaign Guide — description p.48, stat table p.48
- Canonical mechanic: Simple chopping weapon with both a normal melee profile and an explicit thrown attack profile.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`

Rationale:

- `melee` — The axe has a canonical melee attack profile.
- `offense_melee` — Its normal use deals melee weapon damage.
- `ranged` — The axe has an explicit thrown ranged attack profile.
- `offense_ranged` — Its thrown profile deals weapon damage at range.

Adjudication notes:

- No thrown tag is permitted because thrown is not in the certified feat/talent-used vocabulary.

### 3. Bayonet

- Identity: `unmapped::Bayonet`
- Repo: missing
- Source: Core Rulebook — description p.121, stat table p.123
- Canonical mechanic: Rifle-mounted melee blade that preserves melee threat and attacks of opportunity even after firing the rifle; detached it functions as a knife.
- **Final tags:** `melee`, `offense_melee`, `attack_of_opportunity`

Rationale:

- `melee` — Mounted on a rifle, the bayonet explicitly turns the rifle into a melee weapon; detached, it is treated as a knife.
- `offense_melee` — Its canonical attack use deals melee weapon damage.
- `attack_of_opportunity` — The text explicitly states that a mounted bayonet can make attacks of opportunity and preserves threatened squares after a ranged attack.

Adjudication notes:

- Do not add rifle: rifle is not in the certified feat/talent-used vocabulary, and the bayonet remains a Simple Weapon identity.

### 4. Bow

- Identity: `weapon-bow`
- Repo: present (`weapon-bow`)
- Source: Core Rulebook — description p.127, stat table p.127
- Canonical mechanic: Ranged bow whose wielder adds Strength modifier to damage.
- **Final tags:** `ranged`, `offense_ranged`, `damage_bonus`

Rationale:

- `ranged` — The bow is a ranged weapon.
- `offense_ranged` — Its normal function is a damaging ranged attack.
- `damage_bonus` — The wielder's Strength modifier explicitly applies to bow damage.

Adjudication notes:

- Arrow capacity and free-action reload remain structured weapon mechanics rather than semantic tags.

### 5. Club/Baton

- Identity: `unmapped::Club/Baton`
- Repo: missing
- Source: Core Rulebook — description p.121, stat table p.123
- Canonical mechanic: Basic bludgeoning melee weapon with no additional special weapon rule.
- **Final tags:** `melee`, `offense_melee`

Rationale:

- `melee` — The club/baton is used as a melee weapon.
- `offense_melee` — Its canonical function is to deal melee weapon damage.

### 6. Combat Gloves

- Identity: `unmapped::Combat Gloves`
- Repo: missing
- Source: Core Rulebook — description p.121, stat table p.123
- Canonical mechanic: Worn gloves add +1 damage to successful unarmed attacks and cannot be disarmed or dropped.
- **Final tags:** `melee`, `offense_melee`, `unarmed`, `damage_bonus`

Rationale:

- `melee` — Combat gloves operate through unarmed melee attacks.
- `offense_melee` — They directly improve melee attack damage.
- `unarmed` — Their bonus applies specifically to successful unarmed attacks.
- `damage_bonus` — They add +1 damage to a successful unarmed attack.

Adjudication notes:

- The cannot-be-disarmed/dropped rule stays in structured canonical mechanics; no existing feat/talent tag needs to duplicate it.

### 7. Concussion Grenade

- Identity: `weapon-concussion-grenade`
- Repo: present (`weapon-concussion-grenade`)
- Source: Rebellion Era Campaign Guide — description p.48, stat table p.50
- Canonical mechanic: Contact-detonated ranged explosive delivering an immediate high-damage 8d6 attack across its burst area.
- **Final tags:** `ranged`, `offense_ranged`, `burst_damage`

Rationale:

- `ranged` — The grenade is resolved as a ranged attack.
- `offense_ranged` — Its primary role is delivering direct damage at range.
- `burst_damage` — Its defining combat role is a single high-impact 8d6 damage event, matching the existing feat/talent meaning of burst damage as concentrated spike damage.

Adjudication notes:

- Do not add area_damage, grenade, explosives, or thrown because those tags are not used by certified feats/talents.
- Area geometry remains structured canonical mechanics and does not need a semantic tag duplicate.

### 8. Contact Stunner

- Identity: `unmapped::Contact Stunner`
- Repo: missing
- Source: Unknown Regions — description p.36, stat table p.37
- Canonical mechanic: Compact melee contact weapon with a stun setting and +5 equipment bonus to Stealth checks made to conceal it.
- **Final tags:** `melee`, `offense_melee`, `stun`, `nonlethal`, `concealment`, `stealth`

Rationale:

- `melee` — The weapon's contact strike is a melee attack.
- `offense_melee` — It deals melee weapon damage.
- `stun` — It has an explicit stun setting with its own stun damage.
- `nonlethal` — The stun mode provides a nonlethal attack role.
- `concealment` — The weapon explicitly improves attempts to conceal the weapon itself.
- `stealth` — It grants a +5 equipment bonus to Stealth checks made to conceal it.

### 9. Crossbow

- Identity: `weapon-crossbow`
- Repo: present (`weapon-crossbow`)
- Source: Unknown Regions — description p.37, stat table p.38
- Canonical mechanic: Single-bolt ranged crossbow that requires a move action to reload.
- **Final tags:** `ranged`, `offense_ranged`, `move_action`, `action_economy`

Rationale:

- `ranged` — The crossbow is a ranged weapon.
- `offense_ranged` — Its primary function is a damaging ranged attack.
- `move_action` — Reloading the crossbow explicitly requires a move action.
- `action_economy` — Its reload procedure directly consumes combat action economy.

Adjudication notes:

- The Inaccurate quality remains structured canonical mechanics; do not invent an accuracy/inaccurate semantic tag.

### 10. Crossbow, Repeating

- Identity: `weapon-repeating-crossbow`
- Repo: present (`weapon-repeating-crossbow`)
- Source: Galaxy at War — description p.39, stat table p.41
- Canonical mechanic: Self-recocking ranged crossbow with a 10-quarrel magazine that is replaced as a move action.
- **Final tags:** `ranged`, `offense_ranged`, `move_action`, `action_economy`

Rationale:

- `ranged` — The repeating crossbow is a ranged weapon.
- `offense_ranged` — Its primary function is a damaging ranged attack.
- `move_action` — Replacing its 10-quarrel magazine explicitly requires a move action.
- `action_economy` — Magazine replacement directly consumes combat action economy.

Adjudication notes:

- Magazine size and ammunition structure remain canonical mechanics rather than semantic tags.

### 11. CryoBan Grenade

- Identity: `weapon-cryoban-grenade`
- Repo: present (`weapon-cryoban-grenade`)
- Source: Knights of the Old Republic Campaign Guide — description p.69, stat table p.68
- Canonical mechanic: Damaging ranged grenade whose Fortitude rider reduces a target's speed to 2 squares until the end of its next turn.
- **Final tags:** `ranged`, `offense_ranged`, `control`, `battlefield_control`, `movement`

Rationale:

- `ranged` — The grenade resolves as a ranged attack.
- `offense_ranged` — It deals direct damage at range.
- `control` — Beating Fortitude imposes a temporary speed restriction on the target.
- `battlefield_control` — The speed reduction constrains enemy movement and tactical options.
- `movement` — The published rider directly changes the target's movement speed.

Adjudication notes:

- Do not add grenade, thrown, area_damage, or cold; they are not part of the certified feat/talent-used tag vocabulary.

### 12. Darter

- Identity: `weapon-darter`
- Repo: present (`weapon-darter`)
- Source: Galaxy of Intrigue — description p.64, stat table p.65
- Canonical mechanic: Short-range dart launcher that can deliver poison on damage or fire surveillance taggers.
- **Final tags:** `ranged`, `offense_ranged`, `poison`, `recon`, `tracking`

Rationale:

- `ranged` — The darter launches darts as ranged attacks.
- `offense_ranged` — Its dart attack can deal damage and deliver payload effects at range.
- `poison` — A poison-carrying dart explicitly delivers its toxin when the attack deals damage.
- `recon` — The weapon explicitly supports surveillance taggers, giving it a reconnaissance use beyond direct damage.
- `tracking` — Surveillance taggers are explicitly supported payloads for following or monitoring a tagged target.

Adjudication notes:

- The source-unresolved dart/ammo capacity remains unresolved and must not be inferred from production.

### 13. Datadagger

- Identity: `unmapped::Datadagger`
- Repo: missing
- Source: Threats of the Galaxy — description p.13
- Canonical mechanic: Concealed code-cylinder dagger; +5 to Stealth checks to hide it and unusually difficult to detect by touch.
- **Final tags:** `melee`, `offense_melee`, `concealment`, `stealth`

Rationale:

- `melee` — The datadagger has a canonical melee attack profile.
- `offense_melee` — Its weapon profile deals melee piercing damage.
- `concealment` — Its defining special mechanic makes the weapon unusually easy to conceal and harder to detect by touch.
- `stealth` — It grants a +5 equipment bonus to Stealth checks made to conceal the datadagger.

### 14. Dire Sword

- Identity: `unmapped::Dire Sword`
- Repo: missing
- Source: Knights of the Old Republic Campaign Guide — description p.65, stat table p.64
- Canonical mechanic: Large archaic simple sword with no additional special rule.
- **Final tags:** `melee`, `offense_melee`

Rationale:

- `melee` — The dire sword is a melee weapon.
- `offense_melee` — Its canonical function is dealing melee weapon damage.

### 15. Double-Bladed Sword

- Identity: `unmapped::Double-Bladed Sword`
- Repo: missing
- Source: Knights of the Old Republic Campaign Guide — description p.65, stat table p.64
- Canonical mechanic: Simple double sword; both ends can attack as part of the full-round double-weapon attack procedure.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`

Rationale:

- `melee` — Both attack profiles are melee attacks.
- `offense_melee` — Both ends deal melee weapon damage.
- `double_weapon` — The weapon explicitly has two usable weapon ends and is governed by double-weapon rules.
- `full_attack` — Attacking with both ends uses the full-round double-weapon attack procedure.

Adjudication notes:

- Do not add dual_wield solely because the item is double-ended; the existing ontology distinguishes double_weapon from dual_wield.

### 16. EMP Grenade

- Identity: `weapon-emp-grenade`
- Repo: present (`weapon-emp-grenade`)
- Source: Clone Wars Campaign Guide — description p.62, stat table p.61
- Canonical mechanic: Ranged ion burst that can heavily condition and disable droids, vehicles, electronics, and cybernetically enhanced targets.
- **Final tags:** `ranged`, `offense_ranged`, `control`, `battlefield_control`, `droid`, `vehicle`, `tech`

Rationale:

- `ranged` — The EMP grenade resolves as a ranged attack.
- `offense_ranged` — It deals ion damage through a ranged attack.
- `control` — Qualifying electronic/cybernetic targets can be moved five steps down the condition track and disabled.
- `battlefield_control` — The effect applies across a burst and can disable multiple qualifying targets in an area.
- `droid` — Droids are explicitly among the primary targets that suffer the full ion/disable effect.
- `vehicle` — Vehicles are explicitly among the primary targets that suffer the full ion/disable effect.
- `tech` — The weapon is specifically effective against electronic devices and cybernetic technology.

Adjudication notes:

- No condition_track tag is allowed because that runtime tag has not been used by certified feats/talents; control expresses the effect without creating weapon-only vocabulary.

### 17. Energy Ball

- Identity: `weapon-energy-ball`
- Repo: present (`weapon-energy-ball`)
- Source: Core Rulebook — description p.127, stat table p.127
- Canonical mechanic: Gungan ranged projectile whose range mode changes by delivery device; cesta delivery explicitly makes it Accurate.
- **Final tags:** `ranged`, `offense_ranged`, `precision`

Rationale:

- `ranged` — Every certified delivery method uses the energy ball as a ranged projectile.
- `offense_ranged` — Its canonical role is dealing ranged weapon damage.
- `precision` — When hurled by a cesta it explicitly gains the Accurate quality; certified feat/talent use of precision includes direct attack-accuracy improvements.

Adjudication notes:

- Do not add accuracy or thrown; neither is in the certified feat/talent-used vocabulary.

### 18. Entrenching Tool

- Identity: `unmapped::Entrenching Tool`
- Repo: missing
- Source: Galaxy at War — description p.36, stat table p.36
- Canonical mechanic: Multipurpose field tool usable as an improvised melee weapon at only -2 rather than the normal -5 penalty.
- **Final tags:** `melee`, `offense_melee`, `improvised_weapon`, `equipment`

Rationale:

- `melee` — Its certified weapon profile is melee.
- `offense_melee` — When used as a weapon it deals melee damage.
- `improvised_weapon` — Its defining combat rule explicitly replaces the normal improvised-weapon attack penalty.
- `equipment` — It is fundamentally a multipurpose field tool that can also be used as a weapon.

### 19. Fire Blade

- Identity: `unmapped::Fire Blade`
- Repo: missing
- Source: Galaxy at War — description p.40, stat table p.41
- Canonical mechanic: Powered melee cutting blade that ignores the damage reduction of unattended objects.
- **Final tags:** `melee`, `offense_melee`

Rationale:

- `melee` — The fire blade has a canonical melee attack profile.
- `offense_melee` — Its primary combat function is dealing melee weapon damage.

Ontology gaps:

- `OBJECT_DR_BYPASS` — Ignores the damage reduction of unattended objects. Reason: No tag already used by certified feats/talents cleanly represents offensive DR penetration against objects. damage_reduction means mitigating incoming damage and must not be repurposed.

Adjudication notes:

- Do not use damage_reduction for DR penetration.

### 20. Gaderffii

- Identity: `weapon-tusken-gaderffii-stick`
- Repo: present (`weapon-tusken-gaderffii-stick`)
- Source: Rebellion Era Campaign Guide — description p.48, stat table p.48
- Canonical mechanic: Tusken double melee weapon with distinct cutting and bludgeoning ends; both ends can attack in a full-round action.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`

Rationale:

- `melee` — Both certified attack profiles are melee attacks.
- `offense_melee` — Both ends deal melee weapon damage.
- `double_weapon` — The Gaderffii explicitly functions as a double weapon with two distinct ends.
- `full_attack` — Using both ends is resolved through its full-round double-weapon attack procedure.

### 21. Gas Grenade

- Identity: `weapon-gas-grenade`
- Repo: present (`weapon-gas-grenade`)
- Source: Rebellion Era Campaign Guide — description p.49, stat table p.50
- Canonical mechanic: Ranged gas blast using native stun damage, condition-track penalties, and temporary concealment.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `control`, `battlefield_control`, `concealment`

Rationale:

- `ranged` — The gas grenade resolves as a ranged attack.
- `offense_ranged` — It delivers an offensive stun-damage effect at range.
- `stun` — Its certified damage mode is native stun damage.
- `nonlethal` — The stun-damage mode provides a nonlethal combat role.
- `control` — A successful effect moves targets down the condition track.
- `battlefield_control` — The gas blast affects an area and can hinder multiple targets simultaneously.
- `concealment` — The gas cloud explicitly provides temporary concealment.

Adjudication notes:

- Do not add condition_track or grenade; neither is in the certified feat/talent-used vocabulary.

### 22. Grenade, Frag

- Identity: `weapon-frag-grenade`
- Repo: present (`weapon-frag-grenade`)
- Source: Core Rulebook — description p.128, stat table p.127
- Canonical mechanic: Ranged contact-detonated burst weapon dealing 4d6 damage across its affected area.
- **Final tags:** `ranged`, `offense_ranged`, `burst_damage`

Rationale:

- `ranged` — The frag grenade resolves as a ranged attack.
- `offense_ranged` — Its primary role is direct ranged damage.
- `burst_damage` — It delivers a concentrated single-use spike of damage across its burst, consistent with the existing feat/talent burst-damage concept.

Adjudication notes:

- Area geometry is preserved in canonical mechanics rather than represented by a new weapon-only tag.

### 23. Grenade, Ion

- Identity: `weapon-ion-grenade`
- Repo: present (`weapon-ion-grenade`)
- Source: Core Rulebook — description p.128, stat table p.127
- Canonical mechanic: Ranged ion burst especially effective against droids, vehicles, electronics, and cybernetic targets.
- **Final tags:** `ranged`, `offense_ranged`, `control`, `droid`, `vehicle`, `tech`

Rationale:

- `ranged` — The ion grenade resolves as a ranged attack.
- `offense_ranged` — It deals ion damage through a ranged attack.
- `control` — Ion damage is mechanically intended to impair qualifying technological targets rather than merely reduce hit points.
- `droid` — Droids are a primary target class for ion effects.
- `vehicle` — Vehicles are a primary target class for ion effects.
- `tech` — The ion effect directly targets electronic and cybernetic technology.

### 24. Grenade, Radiation

- Identity: `weapon-radiation-grenade`
- Repo: present (`weapon-radiation-grenade`)
- Source: Galaxy at War — description p.39, stat table p.41
- Canonical mechanic: Ranged burst weapon that deals immediate damage and additionally exposes targets to Moderate radiation for damage and Treat Injury purposes.
- **Final tags:** `ranged`, `offense_ranged`, `sustained_damage`, `treat_injury`

Rationale:

- `ranged` — The radiation grenade resolves as a ranged attack.
- `offense_ranged` — It deals direct damage through a ranged attack.
- `sustained_damage` — The attack also exposes targets to Moderate radiation, extending harmful consequences beyond the immediate hit.
- `treat_injury` — The published mechanic explicitly states that the radiation exposure applies for Treat Injury purposes.

### 25. Grenade, Smoke

- Identity: `weapon-smoke-grenade`
- Repo: present (`weapon-smoke-grenade`)
- Source: Galaxy at War — description p.39, stat table p.41
- Canonical mechanic: Ranged smoke weapon that fills a 2-square burst with concealment and a smoke hazard for 10 rounds.
- **Final tags:** `ranged`, `control`, `battlefield_control`, `concealment`

Rationale:

- `ranged` — The smoke grenade is delivered through a ranged attack.
- `control` — Its primary function is to alter visibility and movement-space conditions rather than deal damage.
- `battlefield_control` — It creates a persistent 2-square smoke zone that changes tactical use of the affected area for 10 rounds.
- `concealment` — The published effect explicitly provides concealment.

Adjudication notes:

- Do not add stealth merely because concealment may enable stealth; the weapon itself does not modify Stealth checks.
- Do not add grenade, thrown, or area_damage; those are outside the certified feat/talent-used vocabulary.

### 26. Grenade, Stun

- Identity: `weapon-stun-grenade`
- Repo: present (`weapon-stun-grenade`)
- Source: Core Rulebook — description p.128, stat table p.127
- Canonical mechanic: Ranged 2-square burst dealing native stun damage with condition-track effects; droids, vehicles, and objects are immune.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `control`, `battlefield_control`

Rationale:

- `ranged` — The stun grenade resolves as a ranged attack.
- `offense_ranged` — It directly delivers damaging stun effects at range.
- `stun` — Its certified damage mode is native stun damage.
- `nonlethal` — The weapon's defining damage mode is the system's nonlethal stun mechanic.
- `control` — Stun damage can move affected targets down the condition track.
- `battlefield_control` — The burst can impose stun/control effects on multiple targets in an area.

Adjudication notes:

- Do not add droid or vehicle: those targets are immune rather than favored or supported targets.
- Do not add condition_track because that tag is not used by certified feats/talents.

### 27. Knife

- Identity: `unmapped::Knife`
- Repo: missing
- Source: Core Rulebook — description p.122, stat table p.123
- Canonical mechanic: Silent simple melee blade with certified thrown capability.
- **Final tags:** `melee`, `offense_melee`, `ranged`, `offense_ranged`

Rationale:

- `melee` — The knife's primary certified profile is melee.
- `offense_melee` — It deals melee slashing or piercing damage.
- `ranged` — The frozen canonical authority marks the knife as throwable, giving it a ranged attack use.
- `offense_ranged` — When thrown, the knife deals weapon damage at range.

Adjudication notes:

- Do not add stealth solely from the descriptive statement that a knife is silent; no Stealth modifier or stealth-resolution rule is granted.
- Do not add thrown because that tag is outside the certified feat/talent-used vocabulary.

### 28. Mace

- Identity: `unmapped::Mace`
- Repo: missing
- Source: Core Rulebook — description p.123, stat table p.123
- Canonical mechanic: Basic metal bludgeoning melee weapon.
- **Final tags:** `melee`, `offense_melee`

Rationale:

- `melee` — The mace has a canonical melee attack profile.
- `offense_melee` — Its canonical function is dealing melee weapon damage.

### 29. Mythosaur Axe

- Identity: `unmapped::Mythosaur Axe`
- Repo: missing
- Source: Knights of the Old Republic Campaign Guide — description p.202, stat table p.202
- Canonical mechanic: Ceremonial Mythosaur-bone melee axe; Mandalore the Ultimate's special powered version is a named-character variant, not the generic identity.
- **Final tags:** `melee`, `offense_melee`

Rationale:

- `melee` — The generic Mythosaur axe has a canonical melee attack profile.
- `offense_melee` — Its generic weapon function is dealing melee slashing damage.

Adjudication notes:

- Do not tag the generic identity from Mandalore the Ultimate's named special double-damage powered variant.

### 30. Net

- Identity: `weapon-net`
- Repo: present (`weapon-net`)
- Source: Core Rulebook — description p.129, stat table p.127
- Canonical mechanic: Ranged grab/grapple weapon; targets can escape with Acrobatics or Strength, and the wielder can use Pin or Trip.
- **Final tags:** `ranged`, `control`, `battlefield_control`, `grab`, `grapple`, `restrain`, `acrobatics`

Rationale:

- `ranged` — The net initiates grab or grapple attempts at range.
- `control` — Its purpose is to hinder and contain a target rather than deal normal weapon damage.
- `battlefield_control` — A successful net use restricts enemy freedom of movement and action at range.
- `grab` — The text explicitly allows a ranged grab.
- `grapple` — The text explicitly allows a ranged grapple.
- `restrain` — The net can hold a target and explicitly supports Pin.
- `acrobatics` — An affected target can explicitly escape with a DC 15 Acrobatics check.

Ontology gaps:

- `TRIP_COMPATIBILITY` — The wielder may explicitly use the Trip feat with a net. Reason: No tag already used by certified feats/talents represents Trip as a distinct weapon synergy. General control tags do not encode the specific feat interaction.

Adjudication notes:

- Do not invent a trip tag in the weapon authority.
- Crush and Throw are explicitly disallowed and therefore must not contribute semantic tags.

### 31. Quarterstaff

- Identity: `unmapped::Quarterstaff`
- Repo: missing
- Source: Core Rulebook — description p.124, stat table p.123
- Canonical mechanic: Simple double melee weapon; both ends can be used in a full-round double-weapon attack.
- **Final tags:** `melee`, `offense_melee`, `double_weapon`, `full_attack`

Rationale:

- `melee` — Both ends of the quarterstaff are melee attack profiles.
- `offense_melee` — Both ends deal melee weapon damage.
- `double_weapon` — The rules explicitly identify the quarterstaff as a double weapon.
- `full_attack` — Using both ends requires the published full-round attack procedure.

Adjudication notes:

- Do not add dual_wield merely because both ends can be attacked with; double_weapon is the precise existing semantic tag.

### 32. R-9 Flash Canister

- Identity: `weapon-flash-canister`
- Repo: present (`weapon-flash-canister`)
- Source: Jedi Academy Training Manual — description p.61, stat table p.61
- Canonical mechanic: Ranged 3-square flash burst that deals no damage but gives all other targets total concealment from each affected creature until the next turn.
- **Final tags:** `ranged`, `control`, `battlefield_control`, `concealment`

Rationale:

- `ranged` — The flash canister is delivered as a ranged attack.
- `control` — Its effect denies affected creatures normal visual targeting rather than dealing damage.
- `battlefield_control` — The burst can simultaneously disrupt multiple creatures' ability to see and engage other targets.
- `concealment` — The published mechanic explicitly grants total concealment against each affected creature.

Adjudication notes:

- No separate blindness/vision-denial tag is needed here because the published mechanic is explicitly expressed through total concealment.

### 33. Razor Bug

- Identity: `weapon-razor-bug`
- Repo: present (`weapon-razor-bug`)
- Source: Legacy Era Campaign Guide — description p.65, stat table p.64
- Canonical mechanic: Accurate Yuuzhan Vong biotech ranged weapon using simple-weapon ranges despite being thrown by hand.
- **Final tags:** `ranged`, `offense_ranged`, `precision`, `biotech`

Rationale:

- `ranged` — The razor bug has a canonical ranged attack profile.
- `offense_ranged` — Its primary role is dealing ranged slashing damage.
- `precision` — The weapon is explicitly Accurate and takes no short-range attack penalty; certified feat/talent use of precision covers direct attack-accuracy improvements.
- `biotech` — The frozen canonical authority identifies the razor bug as a Yuuzhan Vong bio-weapon.

Adjudication notes:

- Do not add accuracy or thrown because those tags are outside the certified feat/talent-used vocabulary.

### 34. Remote Grenade

- Identity: `weapon-remote-grenade`
- Repo: present (`weapon-remote-grenade`)
- Source: Knights of the Old Republic Campaign Guide — description p.180, stat table p.180
- Canonical mechanic: Programmable ranged explosive deployed for remote detonation with a dedicated transmitter and a 100-meter safety interlock.
- **Final tags:** `ranged`, `offense_ranged`, `burst_damage`, `setup`, `trap`

Rationale:

- `ranged` — The remote grenade has a canonical ranged attack profile.
- `offense_ranged` — It delivers direct damage at range.
- `burst_damage` — Its 4d6 detonation is a concentrated single-event damage effect, consistent with the established burst_damage semantic.
- `setup` — Its defining mechanic requires deployment and remote detonation rather than only immediate attack use.
- `trap` — Remote placement and later detonation directly support prepared trap-style use.

Adjudication notes:

- Do not add ambush solely because a remotely detonated explosive could be used during an ambush; the published rule directly supports setup/trap behavior, not a specific ambush mechanic.

### 35. Shockboxing Gloves

- Identity: `unmapped::Shockboxing Gloves`
- Repo: missing
- Source: Galaxy at War — description p.37, stat table p.36
- Canonical mechanic: Powered gloves add +1 unarmed damage and can switch the wearer's unarmed attacks to stun damage as a swift action.
- **Final tags:** `melee`, `offense_melee`, `unarmed`, `damage_bonus`, `stun`, `nonlethal`, `swift_action`, `action_economy`

Rationale:

- `melee` — Shockboxing gloves operate through unarmed melee attacks.
- `offense_melee` — They directly improve melee attack damage.
- `unarmed` — Both lethal and stun profiles apply specifically to the wearer's unarmed attacks.
- `damage_bonus` — They add +1 damage to successful unarmed attacks.
- `stun` — They can convert the wearer's unarmed damage to stun damage.
- `nonlethal` — The stun setting provides a nonlethal combat mode.
- `swift_action` — Switching the gloves to stun is explicitly a swift action.
- `action_economy` — The stun-mode switch directly consumes a defined combat action.

Adjudication notes:

- The cannot-be-disarmed/dropped rule remains structured canonical mechanics.

### 36. Short Sword

- Identity: `unmapped::Short Sword`
- Repo: missing
- Source: Knights of the Old Republic Campaign Guide — description p.65, stat table p.64
- Canonical mechanic: Compact simple melee sword commonly used in two-weapon fighting, but with no standalone mechanical two-weapon or defensive bonus.
- **Final tags:** `melee`, `offense_melee`

Rationale:

- `melee` — The short sword has a canonical melee attack profile.
- `offense_melee` — Its canonical function is dealing melee weapon damage.

Adjudication notes:

- Do not add dual_wield from descriptive usage alone.
- Do not add defense or deflect from flavor text; the published entry grants no standalone numerical or rules benefit for deflecting melee attacks.

## Claude implementation contract

Implement/update these repository files:

- `data/audits/item-weapons-phase-4a-simple-semantic-rolling.json`
- `docs/audits/item-weapons-phase-4a-simple-semantic-rolling.md`

Claude must preserve planner-supplied identity membership, `finalTags`, ontology-gap decisions, and all earlier-round rulings exactly.

The verifier should derive the exact 183-tag allowable vocabulary from the certified feat/talent authority files rather than accepting a hand-maintained weapon vocabulary.

Do not begin Round 4 or Advanced Melee Weapons until planner review.
