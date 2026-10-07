# Phase 4C — Pistol Semantic Tags + Rule Selectors — Complete Planner Authority

**Status:** `WEAPON_TAG_PHASE_4C_PISTOL_COMPLETE_PLANNER_AUTHORITY`

## Architecture

Pistols use three deliberately separate layers:

1. **Semantic tags** — restricted to the exact certified feat/talent-used vocabulary.
2. **Rule selectors** — exact weapon / family / group / proficiency matching for feats, talents, classes, and suggestion logic.
3. **Recommendation comparison data** — damage, capacity, stun, range, concealment, multiattack compatibility, and action-economy differences relative to the standard Blaster Pistol.

**High damage, low damage, high capacity, low capacity, autofire, ion, and similar raw weapon properties do not automatically become semantic tags when the certified vocabulary lacks those tags.**

## Pistol baseline

- Standard identity: `weapon-blaster-pistol`
- Damage: **3d6**
- Stun: **2d6**
- Capacity: **100 shots**
- Range: normal pistol range
- Rate of fire: **S**
- Baseline semantic role: `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

## Completion

- Canonical Pistol identities: **30**
- Repo-present: **30**
- Repo-missing: **0**
- Round 1: **10**
- Round 2: **10**
- Round 3: **10**
- **Total adjudicated: 30 / 30**
- Total final-tag assignments: **164**
- Distinct final tags used: **34**
- Production mutation remains **unauthorized**.

## Rulings

### 1. Ascension Gun

- Identity: `weapon-ascension-gun`
- Source: Galaxy at War — description p.37, stat table p.41
- Canonical mechanic: Heavy blaster pistol with a swift-action ascension mode that fires a syntherope grappling dart for vertical ascent or downhill zipline movement; blaster mode uses 50 shots, the weapon carries two syntheropes, and its bulk imposes -5 on Stealth checks made to conceal it.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`, `mobility`, `movement`, `positioning`, `swift_action`, `action_economy`, `exploration`
- Tradeoff tags: `stealth`, `concealment`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `mobility`, `movement`, `positioning`, `swift_action`, `action_economy`, `exploration`

**Rule selectors**

- Exact: `weapon:weapon-ascension-gun`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:heavy-blaster-pistol`, `weapon-family:ascension-gun`

**Relative to standard Blaster Pistol**

- Damage: `3d8` — **HIGHER**
- Capacity: `50` / `ESTABLISHED` — **LOWER**
- Stun: **AVAILABLE**
- Range: **MIXED**
- Concealment: **WORSE**
- Multiattack compatibility: **NORMAL**
- Action economy: **MORE_COMPLEX**
- Recommendation fit: Strong utility/mobility sidearm for characters who value traversal and positioning and can accept lower ammunition capacity, poor concealability, and no long-range blaster attacks.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — Both blaster and ascension modes are ranged-use profiles.
- `offense_ranged` — Blaster mode functions as a heavy blaster pistol and deals ranged weapon damage.
- `stun` — The certified weapon authority includes a stun setting.
- `nonlethal` — The stun setting gives the weapon a nonlethal attack mode.
- `mobility` — Ascension mode directly transports the wielder vertically or along a zipline.
- `movement` — The tether moves the wielder at a published 12 squares per round.
- `positioning` — The tether changes vertical and horizontal battlefield position in ways an ordinary pistol cannot.
- `swift_action` — Switching between blaster and ascension modes is explicitly a swift action.
- `action_economy` — The weapon's combat/utility mode switch consumes a defined combat action.
- `exploration` — The grappling tether and zipline provide explicit traversal utility outside ordinary attacks.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — 50-shot blaster power pack and two-use syntherope supply. Capacity and consumable counts are comparison/mechanics data, not semantic tags.
- `NEGATIVE_TRADEOFF` — -5 Stealth to conceal the weapon. Represented directionally through tradeoffTags; exact modifier remains structured data.

### 2. Black-Powder Pistol

- Identity: `weapon-black-powder-pistol`
- Source: The Unknown Regions — description p.37, stat table p.38
- Canonical mechanic: Primitive one-shot pistol dealing 2d4 piercing damage; Inaccurate, requires a full-round reload after every shot, cannot use feats/talents that allow multiple shots, and provides an explicit Mechanics-based procedure for producing ammunition from foraged materials.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `mechanics`, `crafting`, `exploration`
- Tradeoff tags: `action_economy`, `full_attack`, `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `mechanics`, `crafting`, `exploration`

**Rule selectors**

- Exact: `weapon:weapon-black-powder-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:black-powder-pistol`, `weapon-family:projectile-pistol`
- Ability restrictions:
  - `attack-pattern:multiple-shots` → `PROHIBITED` — The source explicitly prohibits feats or talents that allow multiple shots.

**Relative to standard Blaster Pistol**

- Damage: `2d4` — **LOWER**
- Capacity: `1` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **PROHIBITED**
- Action economy: **MUCH_WORSE**
- Recommendation fit: Niche expedition/logistics choice for Mechanics-capable characters who may be cut off from normal ammunition supplies; poor combat recommendation for multiattack or sustained-fire builds.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — The weapon uses pistol ranges.
- `offense_ranged` — Its normal use deals ranged piercing damage.
- `mechanics` — The source explicitly uses a Mechanics check to manufacture ammunition from gathered materials.
- `crafting` — The weapon publishes a timed ammunition-production procedure with a Mechanics DC and scaling output.
- `exploration` — Its defining logistical advantage is the ability to produce ammunition from materials found while away from normal supply.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — One-shot loaded capacity and full-round reload. Exact capacity/reload remain structured data.
- `STRUCTURED_RECOMMENDATION_DATA` — Inaccurate quality prohibits long-range attacks. No new accuracy/inaccurate semantic tag is created.

### 3. BlasTech DH-23 Outback Blaster Pistol

- Identity: `weapon-dh-23-blaster-pistol`
- Source: Clone Wars Campaign Guide — description p.61, stat table p.61
- Canonical mechanic: Reliable 3d6 blaster pistol with a stun setting and unusually durable construction, giving the weapon object Strength 17 and Break DC 20.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`, `durability`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `durability`

**Rule selectors**

- Exact: `weapon:weapon-dh-23-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d6` — **SAME**
- Capacity: `None` / `NOT_STATED` — **None**
- Stun: **AVAILABLE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Prefer when weapon durability/reliability matters more than maximum range; otherwise its damage profile is baseline-like.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — The weapon attacks at range as a pistol.
- `offense_ranged` — It deals direct ranged blaster damage.
- `stun` — The table provides a stun setting.
- `nonlethal` — The stun setting provides a nonlethal combat option.
- `durability` — The source gives the weapon unusually high object Strength and Break DC because of its reinforced construction.

**Structured / unrepresented mechanics**

- `STRUCTURED_MECHANICS_PLUS_SEMANTIC` — Weapon object Strength 17 and Break DC 20. durability captures the recommendation concept; exact values remain structured.

### 4. BlasTech DT-12 Heavy Blaster Pistol

- Identity: `weapon-dt-12-heavy-blaster`
- Source: Clone Wars Campaign Guide — description p.62, stat table p.61
- Canonical mechanic: Powerful 4d6 heavy blaster pistol with a stun setting and an enlarged grip; it is Inaccurate and cannot attack at long range.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

**Rule selectors**

- Exact: `weapon:weapon-dt-12-heavy-blaster`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:heavy-blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `4d6` — **HIGHER**
- Capacity: `None` / `NOT_STATED` — **None**
- Stun: **AVAILABLE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: High-damage close/medium-range pistol choice when raw sidearm damage matters more than long-range capability.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — The weapon uses pistol ranged attacks.
- `offense_ranged` — Its defining role is high-damage ranged offense.
- `stun` — The table provides a stun setting.
- `nonlethal` — The stun setting gives the weapon a nonlethal option.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — 4d6 base damage is higher than the standard pistol's 3d6. Raw damage dice differences are compared structurally, not converted into a damage_bonus semantic tag.
- `STRUCTURED_RECOMMENDATION_DATA` — Inaccurate quality prohibits long-range attacks. No new inaccurate/accuracy semantic tag is created.

### 5. Blaster Pistol

- Identity: `weapon-blaster-pistol`
- Source: Core Rulebook — description p.125, stat table p.126
- Canonical mechanic: Standard pistol comparison baseline: 3d6 lethal damage, 2d6 stun setting, normal pistol range, single-shot rate of fire, and 100 shots per power pack.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

**Rule selectors**

- Exact: `weapon:weapon-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:standard-blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d6` — **BASELINE**
- Capacity: `100` / `ESTABLISHED` — **BASELINE**
- Stun: **BASELINE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **BASELINE**
- Action economy: **BASELINE**
- Recommendation fit: Default/fallback pistol when no specialized sidearm offers a build-relevant advantage sufficient to justify its tradeoffs.

**Tag rationale**

- `pistol` — Canonical standard Pistol-group sidearm.
- `ranged` — Its canonical attack profile is ranged.
- `offense_ranged` — Its normal function is direct ranged damage.
- `stun` — It has an explicit 2d6 stun setting.
- `nonlethal` — Its stun setting provides a nonlethal attack option.

### 6. Blaster Pistol, Bluebolt

- Identity: `weapon-bluebolt-blaster-pistol`
- Source: Legacy Era Campaign Guide — description p.64, stat table p.64
- Canonical mechanic: 3d8 blaster pistol with a stun setting that reaches 8 squares instead of the usual 6; it uses a 50-shot power pack, each stun attack consumes an additional shot, and the weapon is Inaccurate.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

**Rule selectors**

- Exact: `weapon:weapon-bluebolt-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:bluebolt-blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d8` — **HIGHER**
- Capacity: `50` / `ESTABLISHED` — **LOWER**
- Stun: **BETTER_RANGE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Strong higher-damage/stun specialist when extended stun reach matters, at the cost of lower capacity, increased stun ammunition consumption, and no long-range attacks.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — The weapon attacks using pistol ranges.
- `offense_ranged` — It deals direct ranged blaster damage.
- `stun` — Its defining special feature improves the usable range of its stun mode.
- `nonlethal` — The weapon retains a nonlethal stun option.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Stun range is 8 squares instead of the usual 6. stun captures the semantic role; exact range advantage stays structured.
- `STRUCTURED_RECOMMENDATION_DATA` — Each stun attack consumes one additional shot. Ammo consumption is structured resource data.

### 7. Blaster Pistol, Heavy

- Identity: `weapon-heavy-blaster-pistol`
- Source: Core Rulebook — description p.126, stat table p.126
- Canonical mechanic: Rifle-like 3d8 firepower in a pistol package with a 2d8 stun setting, paid for by a reduced 50-shot power-pack capacity.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

**Rule selectors**

- Exact: `weapon:weapon-heavy-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:heavy-blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d8` — **HIGHER**
- Capacity: `50` / `ESTABLISHED` — **LOWER**
- Stun: **HIGHER_DAMAGE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Straightforward damage upgrade over the standard blaster pistol for characters who can accept half the ammunition capacity.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — Its canonical attack profile is ranged.
- `offense_ranged` — Its primary role is higher-damage ranged offense.
- `stun` — It has an explicit 2d8 stun setting.
- `nonlethal` — The stun setting provides a nonlethal attack option.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Higher base/stun damage but half the standard pistol's shot capacity. Raw dice and capacity deltas remain comparison data rather than semantic tags.

### 8. Blaster Pistol, Hold-Out

- Identity: `weapon-hold-out-blaster-pistol`
- Source: Core Rulebook — description p.126, stat table p.126
- Canonical mechanic: Palm-sized 3d4 blaster with no stun setting; grants +5 equipment bonus to Stealth checks made to conceal it and holds only 6 shots per energy cell.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `concealment`, `stealth`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `concealment`, `stealth`

**Rule selectors**

- Exact: `weapon:weapon-hold-out-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:hold-out-blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d4` — **LOWER**
- Capacity: `6` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **MUCH_BETTER**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Concealment/infiltration sidearm for characters who value hidden carry and backup-weapon utility over damage, stun capability, and ammunition endurance.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It is used for ranged pistol attacks.
- `offense_ranged` — It deals direct ranged damage.
- `concealment` — Its defining advantage is being easier to hide on the wielder.
- `stealth` — It explicitly grants +5 equipment bonus to Stealth checks made to conceal the weapon.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — 6-shot energy-cell capacity. Capacity is recommendation/mechanics data, not a semantic tag.

### 9. Blaster Pistol, Sidearm

- Identity: `weapon-sidearm-blaster-pistol`
- Source: Galaxy at War — description p.38, stat table p.41
- Canonical mechanic: 3d6 military sidearm with a stun setting and exceptional 250-shot efficiency; using Rapid Shot or a feat with Rapid Shot as a prerequisite forces a swift-action trigger reset before it can fire again.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: `swift_action`, `action_economy`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

**Rule selectors**

- Exact: `weapon:weapon-sidearm-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:sidearm-blaster-pistol`
- Explicit ability interactions:
  - feat **Rapid Shot** → `TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT`
- Ability restrictions:
  - `feat-with-prerequisite:rapid-shot` → `TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT` — The source explicitly applies the trigger-reset rule to Rapid Shot and feats with Rapid Shot as a prerequisite.

**Relative to standard Blaster Pistol**

- Damage: `3d6` — **SAME**
- Capacity: `250` / `ESTABLISHED` — **MUCH_HIGHER**
- Stun: **AVAILABLE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **CONDITIONAL_PENALTY**
- Action economy: **WORSE_FOR_RAPID_SHOT_BUILDS**
- Recommendation fit: Excellent endurance/logistics sidearm for prolonged fights and supply-poor missions; de-prioritize for Rapid Shot chains that would repeatedly pay the swift-action reset tax.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It uses normal pistol ranged attacks.
- `offense_ranged` — Its shots are as powerful as ordinary blaster-pistol attacks.
- `stun` — The certified authority provides a stun setting.
- `nonlethal` — The stun setting provides a nonlethal option.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — 250-shot power-pack capacity. High capacity is intentionally not a new semantic tag.
- `RULE_SELECTOR_INTERACTION` — Rapid Shot-family use requires a swift trigger reset before the next shot. Represented through tradeoff tags plus explicit rule links; not a positive finalTag.

### 10. Blaster Pistol, Snap Shot

- Identity: `weapon-snap-shot-blaster-pistol`
- Source: Legacy Era Campaign Guide — description p.64, stat table p.64
- Canonical mechanic: Tiny 3d6 hold-out variant with normal pistol range and +5 concealment bonus, but no stun setting and only one shot per power pack.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `concealment`, `stealth`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `concealment`, `stealth`

**Rule selectors**

- Exact: `weapon:weapon-snap-shot-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:hold-out-blaster-pistol`, `weapon-family:snap-shot-blaster-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d6` — **SAME**
- Capacity: `1` / `ESTABLISHED` — **EXTREMELY_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **MUCH_BETTER**
- Multiattack compatibility: **PRACTICALLY_LIMITED_BY_CAPACITY**
- Action economy: **WORSE_AFTER_EACH_SHOT**
- Recommendation fit: Ambush/backup-style concealed sidearm that preserves standard 3d6 damage in a tiny package, but its one-shot capacity makes it a poor primary weapon for sustained combat.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It uses normal pistol range rather than the repo's legacy hard-range value.
- `offense_ranged` — It deals standard-pistol-level 3d6 ranged damage.
- `concealment` — Its source-defined hold-out design grants a concealment advantage.
- `stealth` — It grants +5 to Stealth checks made to conceal the weapon.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — One-shot power pack. Extreme low capacity is a recommendation dimension, not a semantic tag.

### 11. Blaster Pistol, Sporting

- Identity: `weapon-sporting-blaster-pistol`
- Source: Core Rulebook — description p.126, stat table p.126
- Canonical mechanic: Compact civilian 3d4 blaster pistol with a 2d4 stun setting. It can run from a 6-shot energy cell or be attached to a 100-shot power pack.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`

**Rule selectors**

- Exact: `weapon:weapon-sporting-blaster-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:sporting-blaster-pistol`
- Explicit ability interactions:
  - feat **Sport Hunter** → `EXPLICIT_WEAPON_BENEFIT` — Reroll any result of 1 on sporting blaster pistol damage dice until a result other than 1 is obtained.

**Relative to standard Blaster Pistol**

- Damage: `3d4` — **LOWER**
- Capacity: `[6, 100]` / `ESTABLISHED_ALTERNATE_POWER_SOURCES` — **CONFIGURABLE**
- Stun: **LOWER_DAMAGE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Civilian/sporting sidearm with flexible power supply and an explicit Sport Hunter synergy, but lower lethal and stun damage than the standard Blaster Pistol.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — Its canonical attack profile is ranged.
- `offense_ranged` — It deals direct ranged blaster damage.
- `stun` — It has an explicit 2d4 stun setting.
- `nonlethal` — The stun setting provides a nonlethal attack option.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Can use either a 6-shot energy cell or an attached 100-shot power pack. Power-source flexibility and shot counts remain structured mechanics rather than semantic tags.

### 12. Blaster, Wrist

- Identity: `weapon-wrist-blaster`
- Source: Galaxy of Intrigue — description p.64, stat table p.65
- Canonical mechanic: Tiny 3d4 wrist-mounted blaster disguised as jewelry or a bracer. Its integrated cell holds one shot, it cannot attack at Medium or Long range, and weapon-sensor detection requires a DC 25 Use Computer check.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `concealment`, `infiltration`
- Tradeoff tags: `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `concealment`, `infiltration`

**Rule selectors**

- Exact: `weapon:weapon-wrist-blaster`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:wrist-blaster`, `weapon-family:concealed-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d4` — **LOWER**
- Capacity: `1` / `ESTABLISHED` — **EXTREMELY_LOWER**
- Stun: **NONE**
- Range: **MUCH_WORSE**
- Concealment: **MUCH_BETTER**
- Multiattack compatibility: **PRACTICALLY_LIMITED_BY_CAPACITY**
- Action economy: **WORSE_AFTER_FIRST_SHOT**
- Recommendation fit: Security-bypass/infiltration pistol for characters who need a weapon to survive sensor screening; poor primary combat weapon because it is one-shot, low-damage, and short-ranged.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged attacks using the pistol proficiency family.
- `offense_ranged` — It deals direct ranged energy damage.
- `concealment` — Its defining function is to hide a weapon inside jewelry or a bracer and mask it from weapon sensors.
- `infiltration` — The explicit sensor-masking rule makes it useful for carrying a weapon through security screening.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — DC 25 Use Computer check is required to detect the weapon with a sensor scan. Concealment/infiltration capture the semantic role; the exact detection DC remains structured.
- `STRUCTURED_RECOMMENDATION_DATA` — One-shot integrated power cell and no Medium/Long attacks. Capacity and exact range restrictions are not semantic tags.

### 13. Bryar Pistol

- Identity: `weapon-bryar-pistol`
- Source: Force Unleashed Campaign Guide — description p.98, stat table p.99
- Canonical mechanic: Accurate 3d4 pistol with a 100-shot rechargeable pack. As a swift action it can be primed; after waiting until the next turn, the next qualifying attack deals +1 weapon die, consumes 5 shots, and cannot be combined with abilities that consume more than one shot.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `precision`, `swift_action`, `action_economy`, `setup`, `damage_bonus`, `burst_damage`
- Tradeoff tags: `full_attack`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `precision`, `swift_action`, `action_economy`, `setup`, `damage_bonus`, `burst_damage`

**Rule selectors**

- Exact: `weapon:weapon-bryar-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:bryar-pistol`, `weapon-family:charged-shot-pistol`
- Ability restrictions:
  - `attack-option:consumes-more-than-one-shot` → `PROHIBITED_WITH_PRIMED_SHOT` — A primed shot cannot be combined with any ability that consumes more than one shot.

**Relative to standard Blaster Pistol**

- Damage: `3d4` — **LOWER_BASE_HIGHER_PRIMED**
- Capacity: `100` / `ESTABLISHED_RECHARGEABLE` — **SAME**
- Stun: **NONE**
- Range: **BETTER_AT_SHORT**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL_UNPRIMED_PROHIBITED_WITH_PRIMED_SHOT**
- Action economy: **MORE_COMPLEX**
- Recommendation fit: Prepared-shot/precision pistol for characters who can spend a swift action and delay their shot to gain a larger single hit; poor fit for builds trying to stack the primed shot with multi-shot options.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — Its normal and primed shots are direct ranged offense.
- `precision` — Its Accurate quality removes the normal short-range attack penalty.
- `swift_action` — Priming the built-up shot explicitly requires a swift action.
- `action_economy` — The charged-shot mode has a defined action and timing commitment.
- `setup` — The wielder must prime the weapon and refrain from attacking with it until the next turn before the bonus shot becomes available.
- `damage_bonus` — The primed shot explicitly adds +1 weapon die.
- `burst_damage` — The weapon concentrates extra output into one prepared shot rather than sustained fire.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Primed shot consumes 5 ammunition and requires no Bryar attack before the start of the next turn. Exact ammunition and timing conditions remain structured mechanics.

### 14. Czerka Adjudicator

- Identity: `weapon-adjudicator-slugthrower`
- Source: Clone Wars Campaign Guide — description p.62, stat table p.61
- Canonical mechanic: Tiny 2d4 slugthrower hold-out pistol intended as a concealable backup weapon. It carries only four shots and requires a full-round action to reload.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `concealment`
- Tradeoff tags: `action_economy`, `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `concealment`

**Rule selectors**

- Exact: `weapon:weapon-adjudicator-slugthrower`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:slugthrower-pistol`, `weapon-family:hold-out-pistol`, `weapon-family:czerka-adjudicator`

**Relative to standard Blaster Pistol**

- Damage: `2d4` — **LOWER**
- Capacity: `4` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BETTER**
- Multiattack compatibility: **NORMAL_BUT_CAPACITY_LIMITED**
- Action economy: **WORSE**
- Recommendation fit: Concealable projectile backup sidearm for characters who want a hidden non-blaster option; poor sustained-fire choice because of four-shot capacity and full-round reload.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It fires slugthrower ammunition at range.
- `offense_ranged` — Its normal use deals direct ranged piercing damage.
- `concealment` — The source explicitly identifies it as a compact hold-out pistol sharing the small size and ease of concealment of hold-out blasters.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Four-shot capacity and full-round reload. Exact ammunition and reload burden remain structured comparison data.

### 15. DX-2 Disruptor Pistol

- Identity: `weapon-disruptor-pistol`
- Source: Force Unleashed Campaign Guide — description p.99, stat table p.99
- Canonical mechanic: 3d6 disruptor pistol that treats every target's damage threshold as 5 lower and disintegrates creatures or objects it destroys. It fires only once every other round, cannot use multi-shot-consuming abilities, and has a 10-shot rechargeable pack.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `damage_threshold`
- Tradeoff tags: `full_attack`, `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `damage_threshold`

**Rule selectors**

- Exact: `weapon:weapon-disruptor-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:disruptor`, `weapon-family:disruptor-pistol`
- Ability restrictions:
  - `attack-option:consumes-more-than-one-shot` → `PROHIBITED` — The weapon cannot be used with feats, talents, or abilities that consume more than one shot in a round.

**Relative to standard Blaster Pistol**

- Damage: `3d6` — **SAME_BASE_WITH_THRESHOLD_ADVANTAGE**
- Capacity: `10` / `ESTABLISHED_RECHARGEABLE` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **PROHIBITED**
- Action economy: **SEVERELY_RATE_LIMITED**
- Recommendation fit: Damage-threshold specialist for characters who want fewer, more consequential shots; very poor fit for sustained-fire, Rapid Shot, Double Attack, or other multi-shot builds.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged disruptor damage.
- `damage_threshold` — Every target is explicitly treated as having Damage Threshold 5 lower against this weapon.

**Structured / unrepresented mechanics**

- `NO_EXISTING_FEAT_TALENT_TAG` — Destroyed targets are disintegrated and cease to exist. Preserve as canonical effect text; no semantic tag precisely represents disintegration.
- `STRUCTURED_RECOMMENDATION_DATA` — May fire only once every other round. Rate limitation is represented as a negative sustained-fire comparison rather than a positive semantic tag.

### 16. Gee-Tech 12 Defender Microblaster

- Identity: `weapon-defender-microblaster`
- Source: Clone Wars Campaign Guide — description p.62, stat table p.61
- Canonical mechanic: Tiny 3d4 microblaster granting +5 on Stealth checks to conceal it. It has only two shots, a hard maximum range of 3 squares, and an integrated nonrechargeable power supply that makes it disposable after depletion.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `concealment`, `stealth`, `infiltration`
- Tradeoff tags: `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `concealment`, `stealth`, `infiltration`

**Rule selectors**

- Exact: `weapon:weapon-defender-microblaster`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:hold-out-pistol`, `weapon-family:microblaster`, `weapon-family:concealed-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d4` — **LOWER**
- Capacity: `2` / `ESTABLISHED_INTEGRATED_NONRECHARGEABLE` — **EXTREMELY_LOWER**
- Stun: **NONE**
- Range: **EXTREMELY_WORSE**
- Concealment: **MUCH_BETTER**
- Multiattack compatibility: **PRACTICALLY_LIMITED_BY_CAPACITY**
- Action economy: **DISPOSABLE_AFTER_DEPLETION**
- Recommendation fit: Extreme concealment/infiltration backup weapon for point-blank emergencies; not a general combat pistol because of two shots, 3-square maximum range, low damage, and disposable power supply.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged blaster damage.
- `concealment` — Its extremely small design is explicitly optimized for concealment.
- `stealth` — It grants +5 on Stealth checks to conceal the weapon.
- `infiltration` — Its explicit concealment bonus makes it useful for entering places where obvious weapons would be discovered.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Integrated power supply cannot be recharged; weapon is disposable after two shots. Disposable resource behavior remains structured data.

### 17. Heavy Slugthrower Pistol

- Identity: `weapon-heavy-slugthrower-pistol`
- Source: The Unknown Regions — description p.38, stat table p.38
- Canonical mechanic: 2d8 heavy projectile pistol with an 8-shot clip. Recoil imposes an additional -1 attack penalty whenever Double Attack, Triple Attack, or Rapid Shot is used with it.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`
- Tradeoff tags: `precision`, `full_attack`, `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`

**Rule selectors**

- Exact: `weapon:weapon-heavy-slugthrower-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:slugthrower-pistol`, `weapon-family:heavy-slugthrower-pistol`
- Explicit ability interactions:
  - feat **Double Attack** → `EXTRA_ATTACK_PENALTY` value `-1`
  - feat **Triple Attack** → `EXTRA_ATTACK_PENALTY` value `-1`
  - feat **Rapid Shot** → `EXTRA_ATTACK_PENALTY` value `-1`

**Relative to standard Blaster Pistol**

- Damage: `2d8` — **COMPARABLE_AVERAGE_DIFFERENT_PROFILE**
- Capacity: `8` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **WORSE_BY_SIZE_FLAVOR_ONLY**
- Multiattack compatibility: **PENALIZED**
- Action economy: **BASELINE**
- Recommendation fit: Projectile sidearm with strong per-shot stopping power, but specifically de-prioritize it for Double Attack, Triple Attack, and Rapid Shot builds because recoil adds another -1 attack penalty.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It attacks at range using pistol proficiency.
- `offense_ranged` — It deals direct ranged piercing damage.

**Structured / unrepresented mechanics**

- `NO_EXISTING_MECHANICAL_EFFECT_TO_TAG` — Source describes a psychological advantage from size and loud report but provides no numerical intimidation rule. Do not invent an intimidation bonus or tag from descriptive flavor alone.

### 18. Heavy Sonic Pistol

- Identity: `weapon-heavy-sonic-pistol`
- Source: Knights of the Old Republic Campaign Guide — description p.70, stat table p.68
- Canonical mechanic: 2d8 sonic-energy pistol with a 50-shot rechargeable pack. Like other sonic ranged weapons, its attacks cannot be negated by Deflect or talents that have Deflect as a prerequisite.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `anti-force`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `anti-force`

**Rule selectors**

- Exact: `weapon:weapon-heavy-sonic-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:sonic`, `weapon-family:sonic-pistol`, `weapon-family:heavy-sonic-pistol`
- Explicit ability interactions:
  - talent **Deflect** → `CANNOT_NEGATE_ATTACK`
  - talent-family **Talents with Deflect as prerequisite** → `CANNOT_NEGATE_ATTACK`

**Relative to standard Blaster Pistol**

- Damage: `2d8` — **LOWER_AVERAGE**
- Capacity: `50` / `ESTABLISHED_RECHARGEABLE` — **LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Anti-Deflect sidearm for fighting lightsaber users. It sacrifices some average damage, ammunition capacity, and stun flexibility compared with the standard Blaster Pistol in exchange for a defense-bypassing niche.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged sonic-energy damage.
- `anti-force` — Its defining tactical advantage is bypassing Deflect and talents that depend on Deflect, making it specifically useful against lightsaber defense.

**Structured / unrepresented mechanics**

- `RULE_SELECTOR_PLUS_SEMANTIC` — Sonic damage is energy damage but ranged sonic attacks cannot be deflected with a lightsaber. anti-force captures the recommendation role; exact Deflect interaction is preserved as a rule selector.

### 19. Ion Pistol

- Identity: `weapon-ion-pistol`
- Source: Core Rulebook — description p.128, stat table p.126
- Canonical mechanic: 3d6 ion sidearm with a 30-shot power pack. It deals full ion effects to droids, vehicles, electronic devices, and cybernetically enhanced creatures and can move applicable targets down the condition track; ordinary creatures take half damage and no other ion effect.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `droid`, `vehicle`, `tech`, `control`, `battlefield_control`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `droid`, `vehicle`, `tech`, `control`, `battlefield_control`

**Rule selectors**

- Exact: `weapon:weapon-ion-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:ion`, `weapon-family:ion-pistol`

**Relative to standard Blaster Pistol**

- Damage: `3d6 ion` — **TARGET_DEPENDENT**
- Capacity: `30` / `ESTABLISHED` — **LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Dedicated anti-droid/anti-vehicle/electronics sidearm. Strongly recommend when the expected opposition is technological; de-prioritize against ordinary organic targets because they take only half ion damage and no secondary ion effect.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals ion damage through ranged attacks.
- `droid` — Droids are explicit primary targets that take the weapon's full ion effects.
- `vehicle` — Vehicles are explicit primary targets that take the weapon's full ion effects.
- `tech` — The source explicitly targets electronic devices and cybernetically enhanced creatures as well as droids and vehicles.
- `control` — Ion damage can move applicable targets down the condition track rather than functioning as ordinary hit-point damage alone.
- `battlefield_control` — The condition-track effect can degrade or disable electronic/cybernetic targets during combat.

**Structured / unrepresented mechanics**

- `STRUCTURED_RECOMMENDATION_DATA` — Ion damage has target-specific damage and condition-track rules; no certified `ion` tag exists. Use droid/vehicle/tech/control semantics plus the exact ion family selector instead of inventing an ion semantic tag.

### 20. Merr-Sonn Model 434 DeathHammer

- Identity: `weapon-model-434-deathhammer`
- Source: Clone Wars Campaign Guide — description p.63, stat table p.61
- Canonical mechanic: Rugged 3d8 blaster pistol with a stun setting. Heavy durasteel plating grants the weapon itself a +2 equipment bonus to Damage Reduction.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `stun`, `nonlethal`, `durability`, `damage_reduction`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `stun`, `nonlethal`, `durability`, `damage_reduction`

**Rule selectors**

- Exact: `weapon:weapon-model-434-deathhammer`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:heavy-blaster-pistol`, `weapon-family:deathhammer`

**Relative to standard Blaster Pistol**

- Damage: `3d8` — **HIGHER**
- Capacity: `None` / `NOT_STATED_BY_SOURCE` — **None**
- Stun: **HIGHER_DAMAGE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: High-damage, rugged general-purpose pistol for characters who want a durable sidearm without giving up stun capability; especially attractive when weapon destruction/disarm-object durability matters.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct 3d8 ranged energy damage.
- `stun` — The weapon table provides a stun setting.
- `nonlethal` — The stun setting provides a nonlethal combat option.
- `durability` — The weapon is explicitly reinforced for exceptional sturdiness.
- `damage_reduction` — Its durasteel plating grants the weapon itself +2 equipment bonus to Damage Reduction.

**Structured / unrepresented mechanics**

- `STRUCTURED_MECHANICS_PLUS_SEMANTIC` — The +2 DR bonus applies to the weapon object itself, not the wielder. durability and damage_reduction capture the concept while the target of the bonus remains explicit in structured data.

### 21. Needler

- Identity: `weapon-needler`
- Source: Knights of the Old Republic Campaign Guide — description p.69, stat table p.68
- Canonical mechanic: 2d4 piercing dart pistol with a 10-shot clip. It is Inaccurate and cannot attack at Long range. Its ammunition may optionally be laced with contact poison.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `poison`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `poison`

**Rule selectors**

- Exact: `weapon:weapon-needler`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:projectile-pistol`, `weapon-family:needler`, `weapon-family:poison-delivery`

**Relative to standard Blaster Pistol**

- Damage: `2d4` — **LOWER**
- Capacity: `10` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Poison-delivery pistol for builds that want contact-toxin synergy; weak as a general-purpose sidearm because of low base damage, 10-shot capacity, and no Long-range attacks.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct piercing damage at range.
- `poison` — Its ammunition can explicitly be laced with contact poison, making the weapon a valid poison-delivery platform.

**Structured / unrepresented mechanics**

- `CONDITIONAL_CAPABILITY` — Poison is optional ammunition treatment, not inherent to every shot. The poison semantic tag means the weapon supports poison delivery; it must not imply the weapon is always poisoned.

### 22. Pulse-Wave Pistol

- Identity: `weapon-pulse-wave-pistol`
- Source: Knights of the Old Republic Campaign Guide — description p.69, stat table p.68
- Canonical mechanic: 2d6 energy pistol with a 100-shot power pack. It gains +4 equipment bonus to damage at point-blank range but is Inaccurate and cannot attack at Long range.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `damage_bonus`, `burst_damage`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `damage_bonus`, `burst_damage`

**Rule selectors**

- Exact: `weapon:weapon-pulse-wave-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:pulse-wave`, `weapon-family:pulse-wave-pistol`

**Relative to standard Blaster Pistol**

- Damage: `2d6 (+4 equipment at point-blank)` — **LOWER_BASE_CLOSE_RANGE_BONUS**
- Capacity: `100` / `ESTABLISHED` — **SAME**
- Stun: **NONE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Close-range damage specialist: recommend for point-blank pistol builds that can exploit the +4 damage bonus; de-prioritize for long-range or stun-oriented characters.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged energy damage.
- `damage_bonus` — At point-blank range it explicitly gains +4 equipment bonus to damage.
- `burst_damage` — Its tactical identity is concentrated extra damage at close range rather than improved long-range performance.

**Structured / unrepresented mechanics**

- `STRUCTURED_CONDITIONAL_MODIFIER` — +4 equipment bonus applies only at point-blank range. Exact bonus type, amount, and range condition remain structured data.

### 23. Ripper

- Identity: `weapon-ripper`
- Source: Knights of the Old Republic Campaign Guide — description p.69, stat table p.68
- Canonical mechanic: 2d4 shrapnel pistol with a 10-shot clip. If damage exceeds the target's Damage Threshold and moves it at least 1 step down the condition track, embedded shrapnel immediately deals an additional 1d4 damage. It is Inaccurate and cannot attack at Long range.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `damage_threshold`, `damage_bonus`, `burst_damage`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `damage_threshold`, `damage_bonus`, `burst_damage`

**Rule selectors**

- Exact: `weapon:weapon-ripper`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:projectile-pistol`, `weapon-family:shrapnel-pistol`, `weapon-family:ripper`

**Relative to standard Blaster Pistol**

- Damage: `2d4 + conditional 1d4` — **LOWER_BASE_CONDITIONAL_EXTRA**
- Capacity: `10` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Threshold-breaking pistol for builds that already push targets down the condition track; mediocre against high-threshold targets where the bonus 1d4 rarely triggers.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged physical damage.
- `damage_threshold` — Its special effect explicitly keys off exceeding the target's Damage Threshold.
- `damage_bonus` — Meeting the threshold/condition trigger immediately adds 1d4 damage.
- `burst_damage` — A successful threshold-breaking hit produces a second immediate damage packet.

**Structured / unrepresented mechanics**

- `STRUCTURED_TRIGGER` — Bonus 1d4 requires both exceeding Damage Threshold and moving the target at least 1 condition-track step. There is no certified condition_track semantic tag; preserve the full trigger structurally.

### 24. Snare Pistol

- Identity: `weapon-snare-pistol`
- Source: Galaxy of Intrigue — description p.64, stat table p.65
- Canonical mechanic: Two-shot capture pistol with native 1d4 stun damage. It can initiate a grab or grapple at up to Short range; trapped targets escape with DC 15 Acrobatics or DC 20 Strength. Pin and Trip work with it, while Crush, Throw, and Bone Crusher do not.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `stun`, `nonlethal`, `grab`, `grapple`, `restrain`, `control`, `battlefield_control`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `stun`, `nonlethal`, `grab`, `grapple`, `restrain`, `control`, `battlefield_control`

**Rule selectors**

- Exact: `weapon:weapon-snare-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:snare-weapon`, `weapon-family:snare-pistol`, `weapon-family:capture-weapon`
- Explicit ability interactions:
  - feat **Pin** → `SUPPORTED`
  - feat **Trip** → `SUPPORTED`
  - feat **Crush** → `PROHIBITED`
  - feat **Throw** → `PROHIBITED`
  - feat **Bone Crusher** → `PROHIBITED`

**Relative to standard Blaster Pistol**

- Damage: `native 1d4 stun only` — **MUCH_LOWER_NONLETHAL_ONLY**
- Capacity: `2` / `ESTABLISHED` — **EXTREMELY_LOWER**
- Stun: **NATIVE_CAPTURE_PROFILE**
- Range: **WORSE**
- Concealment: **BASELINE**
- Multiattack compatibility: **CAPACITY_LIMITED**
- Action economy: **BASELINE**
- Recommendation fit: Dedicated capture/control sidearm. Strong recommendation for bounty hunters, law enforcement, grapplers, or nonlethal builds; poor choice when raw damage or sustained fire is the priority.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It applies its capture mechanics at range.
- `stun` — The weapon's native damage profile is 1d4 stun.
- `nonlethal` — Its damage and capture function are explicitly nonlethal-oriented.
- `grab` — It explicitly initiates a grab at range.
- `grapple` — It explicitly initiates a grapple at range.
- `restrain` — Weighted synthcord physically confines the target until escape or break-free succeeds.
- `control` — Its primary tactical function is denying or limiting enemy freedom rather than dealing lethal damage.
- `battlefield_control` — Ranged capture changes enemy movement/position options and supports Pin/Trip interactions.

**Structured / unrepresented mechanics**

- `STRUCTURED_CAPTURE_RULE` — Escape DC 15 Acrobatics / break DC 20 Strength. Exact escape mechanics remain structured.
- `STRUCTURED_RECOMMENDATION_DATA` — Two-shot specialized cartridge. Capacity is not a semantic tag.

### 25. Slugthrower Pistol

- Identity: `weapon-slugthrower-pistol`
- Source: Core Rulebook — description p.129, stat table p.126
- Canonical mechanic: Standard ballistic pistol firing metal slugs rather than energy bolts. It uses 10-round ammunition clips instead of power packs.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`

**Rule selectors**

- Exact: `weapon:weapon-slugthrower-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:projectile-pistol`, `weapon-family:slugthrower-pistol`
- Explicit ability interactions:
  - feat **Sport Hunter** → `EXPLICIT_WEAPON_BENEFIT` — At point-blank range, a slugthrower pistol deals +1 die of damage.

**Relative to standard Blaster Pistol**

- Damage: `2d6` — **LOWER**
- Capacity: `10` / `ESTABLISHED` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Straightforward projectile pistol with explicit Sport Hunter synergy; especially relevant to characters specialized in slugthrowers or expecting situations where a physical-ammunition sidearm is preferable.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — Its normal role is direct ranged physical damage.

**Structured / unrepresented mechanics**

- `STRUCTURAL_WEAPON_FAMILY_AND_RESOURCE` — Uses physical 10-round slug clips rather than energy power packs. Projectile/slugthrower identity belongs in rule selectors and ammo data, not a new semantic tag.

### 26. Sonic Disruptor

- Identity: `weapon-sonic-disruptor`
- Source: Knights of the Old Republic Campaign Guide — description p.70, stat table p.68
- Canonical mechanic: 2d6 sonic disruptor pistol. Its attacks cannot be negated by Deflect or talents requiring Deflect; it treats targets' Damage Threshold as 5 lower, disintegrates targets it destroys, fires only once every other round, forbids multi-shot-consuming abilities, and recharges after 10 shots.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `anti-force`, `damage_threshold`
- Tradeoff tags: `full_attack`, `sustained_damage`
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `anti-force`, `damage_threshold`

**Rule selectors**

- Exact: `weapon:weapon-sonic-disruptor`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:sonic`, `weapon-family:disruptor`, `weapon-family:sonic-disruptor`
- Explicit ability interactions:
  - talent **Deflect** → `CANNOT_NEGATE_ATTACK`
  - talent-family **Talents with Deflect as prerequisite** → `CANNOT_NEGATE_ATTACK`
- Ability restrictions:
  - `attack-option:consumes-more-than-one-shot` → `PROHIBITED` — The weapon cannot use feats, talents, or other abilities that consume more than one shot in a round.

**Relative to standard Blaster Pistol**

- Damage: `2d6` — **LOWER_BASE_WITH_THRESHOLD_ADVANTAGE**
- Capacity: `10` / `ESTABLISHED_RECHARGEABLE` — **MUCH_LOWER**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **PROHIBITED**
- Action economy: **SEVERELY_RATE_LIMITED**
- Recommendation fit: Specialized anti-Deflect/damage-threshold weapon for decisive single shots. Strong against lightsaber defenses and threshold-based targets; extremely poor for sustained or multi-shot builds.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged sonic damage.
- `anti-force` — Its sonic attacks explicitly cannot be negated by Deflect or talents with Deflect as a prerequisite.
- `damage_threshold` — It explicitly treats every target's Damage Threshold as 5 lower.

**Structured / unrepresented mechanics**

- `NO_EXISTING_FEAT_TALENT_TAG` — Destroyed targets are disintegrated. Preserve as canonical effect text; do not invent a disintegration tag.

### 27. Sonic Pistol

- Identity: `weapon-sonic-pistol`
- Source: Knights of the Old Republic Campaign Guide — description p.70, stat table p.68
- Canonical mechanic: 2d6 sonic-energy pistol with a 100-shot rechargeable pack. Its ranged attacks cannot be negated by Deflect or by talents that have Deflect as a prerequisite.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `anti-force`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `anti-force`

**Rule selectors**

- Exact: `weapon:weapon-sonic-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:sonic`, `weapon-family:sonic-pistol`
- Explicit ability interactions:
  - talent **Deflect** → `CANNOT_NEGATE_ATTACK`
  - talent-family **Talents with Deflect as prerequisite** → `CANNOT_NEGATE_ATTACK`

**Relative to standard Blaster Pistol**

- Damage: `2d6` — **LOWER**
- Capacity: `100` / `ESTABLISHED_RECHARGEABLE` — **SAME**
- Stun: **NONE**
- Range: **BASELINE**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: General anti-Deflect sidearm: lower raw damage and no stun setting compared with the standard Blaster Pistol, but a clean counter to lightsaber Deflect.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It makes ranged pistol attacks.
- `offense_ranged` — It deals direct ranged sonic-energy damage.
- `anti-force` — Its published tactical distinction is that Deflect and Deflect-dependent talents cannot negate its ranged attacks.

**Structured / unrepresented mechanics**

- `RULE_SELECTOR_PLUS_SEMANTIC` — Sonic damage counts as energy damage while ranged sonic attacks cannot be deflected. anti-force captures recommendation meaning; exact Deflect immunity remains structural.

### 28. Sonic Stunner

- Identity: `weapon-sonic-stunner`
- Source: Threats of the Galaxy — description p.146, stat table p.146
- Canonical mechanic: Tiny pistol dealing native 3d6 stun damage through high-frequency sonic energy. Deaf creatures are still affected, and only the target hears the weapon, making its firing otherwise silent.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `stun`, `nonlethal`, `stealth`, `infiltration`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `stun`, `nonlethal`, `stealth`, `infiltration`

**Rule selectors**

- Exact: `weapon:weapon-sonic-stunner`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:sonic`, `weapon-family:stun-pistol`, `weapon-family:sonic-stunner`

**Relative to standard Blaster Pistol**

- Damage: `native 3d6 stun only` — **NONLETHAL_ONLY**
- Capacity: `None` / `NOT_STATED_BY_SOURCE` — **None**
- Stun: **DEDICATED**
- Range: **BASELINE**
- Concealment: **BETTER_COVERT_FIRING**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Covert nonlethal pistol for infiltration, interrogation, abduction, or quiet takedowns. Unlike ordinary sonic weapons, its defining role here is silent stun delivery rather than anti-Deflect offense.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It delivers its stun effect through a ranged pistol attack.
- `stun` — Its only published damage profile is native 3d6 stun.
- `nonlethal` — It is a dedicated stunning weapon rather than a lethal sidearm.
- `stealth` — Only the target hears the attack; firing is otherwise silent.
- `infiltration` — Silent-to-bystanders operation gives it a clear covert-use niche.

**Structured / unrepresented mechanics**

- `STRUCTURED_TARGETING_EXCEPTION` — Deaf creatures remain affected because the vibrations penetrate the brain. No separate semantic tag is needed for this immunity-bypass detail.

### 29. Stun Pistol

- Identity: `weapon-stun-pistol`
- Source: The Unknown Regions — description p.39, stat table p.38
- Canonical mechanic: Dedicated nonlethal pistol with native 3d6 stun damage, 50-shot power pack, and a special 20-square maximum range instead of the usual 6-square limit for stun attacks.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `stun`, `nonlethal`, `control`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `stun`, `nonlethal`, `control`

**Rule selectors**

- Exact: `weapon:weapon-stun-pistol`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:stun-pistol`, `weapon-family:nonlethal-pistol`

**Relative to standard Blaster Pistol**

- Damage: `native 3d6 stun only` — **NONLETHAL_ONLY**
- Capacity: `50` / `ESTABLISHED` — **LOWER**
- Stun: **MUCH_BETTER_RANGE**
- Range: **SPECIALIZED**
- Concealment: **BASELINE**
- Multiattack compatibility: **NORMAL**
- Action economy: **BASELINE**
- Recommendation fit: Dedicated ranged nonlethal sidearm. Strong for bounty hunters, police, and capture builds because it preserves 3d6 stun out to 20 squares; useless when lethal damage is required.

**Tag rationale**

- `pistol` — Canonical Pistol-group weapon.
- `ranged` — It attacks at range using pistol proficiency.
- `stun` — Its only published damage profile is native 3d6 stun.
- `nonlethal` — The weapon is explicitly designed exclusively for nonlethal use.
- `control` — Its dedicated purpose is crowd control and subduing targets without lethal injury.

**Structured / unrepresented mechanics**

- `STRUCTURED_RANGE_EXCEPTION` — 20-square maximum for native stun attacks. The improved stun range is comparison data, not a new semantic tag.

### 30. Subrepeating Blaster

- Identity: `weapon-subrepeating-blaster`
- Source: Scum and Villainy — description p.49, stat table p.51
- Canonical mechanic: 3d6 autofire-only pistol with a retractable stock and 50-shot power pack. It cannot be braced for autofire unless the stock is extended; Core retractable-stock rules then treat it as a rifle for proficiency and range while extended.
- Shared tags: `pistol`, `ranged`
- Advantage/mechanic tags: `offense_ranged`, `sustained_damage`
- Tradeoff tags: none
- **Final tags:** `pistol`, `ranged`, `offense_ranged`, `sustained_damage`

**Rule selectors**

- Exact: `weapon:weapon-subrepeating-blaster`
- Group: `weapon-group:pistol`
- Proficiency: `weapon-proficiency:pistols`
- Families: `weapon-family:blaster-pistol`, `weapon-family:repeating-blaster`, `weapon-family:subrepeating-blaster`, `weapon-family:autofire-pistol`
- Conditional structural rules:
  - `retractable-stock:extended` — Core retractable-stock rule changes proficiency and range treatment only; do not infer that every rifle-specific feat/talent applies.
  - `retractable-stock:not-extended` — The source explicitly forbids bracing this autofire attack unless the stock is extended.

**Relative to standard Blaster Pistol**

- Damage: `3d6` — **SAME_PER_HIT_PROFILE**
- Capacity: `50` / `ESTABLISHED` — **LOWER**
- Stun: **NONE**
- Range: **CONFIGURATION_DEPENDENT**
- Concealment: **BASELINE**
- Multiattack compatibility: **AUTOFIRE_ONLY**
- Action economy: **CONFIGURATION_DEPENDENT**
- Recommendation fit: Autofire pistol for characters built around sustained/area fire who want a more compact weapon than a rifle. Poor fit for single-shot, stun, or precision pistol builds.

**Tag rationale**

- `pistol` — Published weapon group is Pistol.
- `ranged` — It makes ranged attacks.
- `offense_ranged` — It deals direct ranged blaster damage.
- `sustained_damage` — Its defining firing mode is autofire-only, favoring repeated area/suppressive fire rather than single-shot precision.

**Structured / unrepresented mechanics**

- `STRUCTURED_FIRE_MODE` — Autofire-only firing mode and brace restriction. No certified `autofire` semantic tag exists; use sustained_damage plus explicit fire-mode rules.

## Completion / implementation contract

- Pistol semantic/selector authority is complete at **30/30**.
- Preserve all planner semantic rulings exactly.
- Validate every semantic tag against the certified 183-tag feat/talent-used union.
- Treat `ruleSelectors` as structural rules metadata, never as `system.tags`.
- Keep damage dice, shot capacity, reload burden, firing mode, exact range limits, ammo type, and configuration-state rules as structured mechanics/comparison data unless an existing certified semantic tag directly represents the concept.
- Generic pistol abilities match through `weapon-group:pistol` / `weapon-proficiency:pistols`.
- Named weapon/family interactions such as **Sport Hunter**, **Deflect**, **Pin/Trip**, and multi-shot prohibitions must remain directional and explicit.
- Retractable-stock proficiency/range overrides do not automatically promote a pistol into the rifle family for every feat/talent interaction.
- Phase 3D remains frozen; production mutation is still unauthorized.
- Do not change `packs/weapons.db` or `template.json` during this certification step.