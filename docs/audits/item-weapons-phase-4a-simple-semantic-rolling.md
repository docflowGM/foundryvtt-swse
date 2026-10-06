# Phase 4A — Simple Weapon Semantic Tags — Rolling Planner Authority

**Status:** `WEAPON_TAG_PHASE_4A_SIMPLE_ROLLING_ROUND_1_PLANNER_ADJUDICATED`

This is the rolling planner authority for Simple Weapon semantic tags. It is designed to be appended round-by-round until all 49 frozen canonical Simple Weapon identities are adjudicated.

Production mutation is **not authorized**. Runtime suggestion code is **not authorized** to change in this phase.

## Frozen baseline

- Repository: `docflowGM/foundryvtt-swse`
- Branch: `claude/dazzling-meitner-czyh1x`
- Baseline commit: `8b99a62ff34b7726261866569b9845d9f5dc144f`
- Phase 3D: `WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN`
- Phase 3B canonical authority: `data/audits/item-weapons-phase-3b-canonical-authority.json`

## Vocabulary rule

Weapons may use **only tags already used by certified feats and/or certified talents**.

The derived feat/talent-used union contains **183 tags**. The broader approved ontology contains 187 tags, but the four approved-yet-unused tags (`beast_companion`, `jury_rig`, `spellcasting`, `telepath`) are not available to weapons under this policy.

The following runtime/weapon tags are explicitly **not** allowed because they are not used by the certified feat/talent authorities:

`accuracy`, `area_damage`, `condition_track`, `explosives`, `grenade`, `rifle`, `thrown`

If a future weapon concept cannot be represented faithfully with the 183-tag used vocabulary, record an ontology gap instead of creating a weapon-only tag.

## Simple Weapon census

- Canonical Simple Weapon identities: **49**
- Repo-present: **28**
- Repo-missing: **21**
- Round 1 adjudicated: **12**
- Remaining after Round 1: **37**
- Round 1 repo-present / missing: **7 / 5**
- Round 1 tag assignments: **49**
- Distinct tags used in Round 1: **23**
- Round 1 ontology gaps: **0**
- Next canonical identity: **Datadagger**

## Round 1 rulings

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

## Claude implementation contract

Claude should implement these files into the repository at:

- `data/audits/item-weapons-phase-4a-simple-semantic-rolling.json`
- `docs/audits/item-weapons-phase-4a-simple-semantic-rolling.md`

Claude may add deterministic verification/comparison metadata and a verifier, but **must not alter the planner-supplied `finalTags` arrays or membership**.

At minimum, the implementation verifier should prove:

- the frozen Phase 3B authority still contains exactly 49 Simple Weapon identities;
- these 12 identity keys and names match Phase 3B exactly;
- all 12 occur exactly once in the rolling authority;
- Round 1 is exactly 7 repo-present / 5 repo-missing;
- every final tag belongs to the exact 183-tag union actually used by certified feat/talent assignments;
- none of the seven rejected runtime-only tags appears;
- every tag has a rationale and no rationale exists without its tag;
- Phase 3D remains frozen;
- `packs/weapons.db` and `template.json` remain unchanged;
- `productionMutationAuthorized` remains `false`.

Do not begin Round 2 or Advanced Melee Weapons until the planner reviews the committed Round 1 implementation.
