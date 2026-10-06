# Phase 4D — Rifle Semantic Tags + Rule Selectors — Complete Planner Authority

**Status:** `WEAPON_TAG_PHASE_4D_RIFLE_COMPLETE_PLANNER_AUTHORITY`

## Completion

- Frozen Phase 3B Rifle identities: **38**
- Adjudicated identities: **38 / 38**
- Repo-present: **38**
- Repo-missing: **0**
- Total final semantic-tag assignments: **213**
- Distinct semantic tags used: **35**
- Tradeoff tags used: **5 distinct**
- Production mutation: **NOT AUTHORIZED**

The earlier 30-Rifle census was corrected in Round 2 after direct enumeration of the frozen Phase 3B authority. This completed authority reconciles exactly **38 = 38** identities.

## Architecture

Rifles retain three separate layers:

1. **Semantic tags** — only concepts already present in the certified feat/talent-used vocabulary.
2. **Rule selectors** — exact weapon, family, group, proficiency, mode, and named ability applicability.
3. **Recommendation comparison profiles** — damage, range, capacity, fire modes, stun/ion/sonic behavior, setup, aim dependency, payload behavior, environmental use, and other comparative facts.

Forbidden weapon-only pseudo-tags remain excluded from semantic tags, including `rifle`, `autofire`, `accuracy`, `area_damage`, `explosives`, `grenade`, `ion`, `sonic`, and `thrown`.

## Major selector/role decisions

- **Riflemaster** uses only its printed named weapon cases; broad blaster-rifle family membership does not grant those benefits.
- **Sport Hunter** explicitly links to Slugthrower Rifle and Sporting Blaster Rifle. Similar-sounding weapons do not inherit it by name/flavor alone.
- **Interchangeable Weapon System** resolves selectors by active mode; its anti-armor mode is a Heavy Weapons profile.
- **Micro Grenade Launcher** inherits semantic relevance dynamically from its loaded grenade payload instead of accumulating every grenade role statically.
- **Sonic Rifle** explicitly bypasses Deflect through rule selectors while using `anti-force` as the recommendation semantic.
- **Ion rifles/carbines** use droid/vehicle/tech/control semantics while ion remains structured damage/effect metadata.
- **SG-4 Blaster Rifle** preserves its amphibious blaster/harpoon role structurally without inventing an aquatic semantic tag.

## Complete Rifle authority — 38 identities

### 1. ARC-9965 Blaster Rifle

- Identity: `weapon-arc-9965-blaster`
- Source: Legacy Era Campaign Guide p.182 / table p.183
- Canonical mechanic: Accurate 3d8 S/A blaster rifle with a same-as-base 3d8 stun setting, 40-shot power pack, retractable stock, and 10-shot ammunition consumption for each autofire attack.
- **Final tags:** `ranged`, `offense_ranged`, `precision`, `stun`, `nonlethal`, `sustained_damage`
- Exact selector: `weapon:weapon-arc-9965-blaster`
- Families: `weapon-family:blaster-rifle`, `weapon-family:arc-9965-blaster-rifle`
- Guardrail: Do not infer the Riflemaster Blaster Rifle benefit from broad blaster-rifle family membership; named Riflemaster cases remain exact.
- Recommendation fit: Accurate general-purpose rifle with full S/A flexibility and stronger stun damage than the standard rifle, balanced by a smaller pack and expensive autofire bursts.

### 2. BlasTech 500 Riot Gun

- Identity: `weapon-espo-500-riot-gun`
- Source: Rebellion Era Campaign Guide p.50 / table p.50
- Canonical mechanic: 3d8 rifle with stun and single/autofire modes. The controlling Rebellion Era publication imposes -1 on single-shot ranged attacks and grants +2 equipment bonus to autofire attacks; a power pack provides 50 shots.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-espo-500-riot-gun`
- Families: `weapon-family:blaster-rifle`, `weapon-family:riot-gun`, `weapon-family:autofire-rifle`
- Guardrail: Do not infer the Riflemaster Blaster Carbine benefit merely because the descriptive text says the riot gun functions in most ways as a blaster carbine.
- Recommendation fit: Autofire-focused rifle. Prefer for characters who routinely use autofire; de-prioritize for single-shot precision builds.

### 3. BlasTech DLT-20A "Longbarrel" Blaster Rifle

- Identity: `weapon-dlt-20a-longblaster`
- Source: Clone Wars Campaign Guide p.62 / table p.61
- Canonical mechanic: Accurate 3d10 S/A blaster rifle with an integrated standard targeting scope and a magnatomic adhesion grip that grants +1 equipment bonus to Reflex Defense when the wielder is targeted by a disarm attack.
- **Final tags:** `ranged`, `offense_ranged`, `precision`, `targeting`, `defense`, `sustained_damage`
- Exact selector: `weapon:weapon-dlt-20a-longblaster`
- Families: `weapon-family:blaster-rifle`, `weapon-family:dlt-20a`, `weapon-family:longbarrel-blaster-rifle`
- Guardrail: An integrated scope and long-range role do not make this a published sniper-rifle identity.
- Guardrail: Do not infer the Riflemaster Blaster Rifle benefit from broad family membership.
- Recommendation fit: High-damage accurate rifle for precision-capable generalists who still want autofire, with extra protection against disarm attempts.

### 4. Blaster Carbine

- Identity: `weapon-blaster-carbine`
- Source: Core Rulebook p.125 / table p.126
- Canonical mechanic: Compact 3d8/2d8-stun S/A rifle with 50-shot power pack and optional retractable stock. A carbine can make attacks of opportunity even when its stock is not folded.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`, `attack_of_opportunity`
- Exact selector: `weapon:weapon-blaster-carbine`
- Families: `weapon-family:blaster-rifle`, `weapon-family:blaster-carbine`
- Ability interaction: **Riflemaster** → `EXPLICIT_WEAPON_BENEFIT` — A proficient user may brace a Blaster Carbine set to autofire even though it is not an autofire-only weapon.
- Recommendation fit: Close-quarters/generalist rifle with standard damage and autofire plus unusual AoO flexibility; particularly strong with Riflemaster.

### 5. Blaster Carbine, Double-Barreled

- Identity: `weapon-double-barreled-blaster-carbine`
- Source: Legacy Era Campaign Guide p.63 / table p.64
- Canonical mechanic: Inaccurate 3d8 single-shot carbine with 3d8 stun and 50 shots. It cannot autofire, but a swift action enables a two-shot 2x2 area attack. Double-shot consumes 2 shots and cannot combine with effects such as Double Attack or Rapid Shot. It retains the carbine attack-of-opportunity rule.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `attack_of_opportunity`, `swift_action`, `action_economy`, `burst_damage`
- Tradeoff tags: `precision`, `sustained_damage`
- Exact selector: `weapon:weapon-double-barreled-blaster-carbine`
- Families: `weapon-family:blaster-rifle`, `weapon-family:blaster-carbine`, `weapon-family:double-barreled-blaster-carbine`
- Guardrail: Do not grant the exact Riflemaster Blaster Carbine benefit without explicit named-variant applicability; this variant cannot autofire.
- Recommendation fit: Close-quarters area-fire carbine for characters who want burst coverage without autofire. De-prioritize for Long-range and multi-shot feat builds.

### 6. Blaster Carbine, Hunting

- Identity: `weapon-hunting-blaster-carbine`
- Source: Legacy Era Campaign Guide p.63 / table p.64
- Canonical mechanic: Inaccurate 3d8 single-shot hunting carbine with 3d8 stun, 50-shot power pack, retractable stock, and the normal carbine attack-of-opportunity rule. On a critical hit, its damage dice increase from d8s to d10s.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `attack_of_opportunity`, `critical_hit`, `burst_damage`
- Tradeoff tags: `precision`, `sustained_damage`
- Exact selector: `weapon:weapon-hunting-blaster-carbine`
- Families: `weapon-family:blaster-rifle`, `weapon-family:blaster-carbine`, `weapon-family:hunting-blaster-carbine`
- Guardrail: Do not attach Sport Hunter; the feat does not list hunting blaster carbines.
- Guardrail: Do not infer the Riflemaster Blaster Carbine benefit without exact applicability.
- Recommendation fit: Single-shot carbine for critical-hit builds and close-quarters flexibility; poor for Long-range or autofire-oriented characters.

### 7. Blaster Carbine, Repeating

- Identity: `weapon-repeating-blaster-carbine`
- Source: Knights of the Old Republic Campaign Guide p.67 / table p.68
- Canonical mechanic: Large 3d10 repeating carbine with a same-as-base stun setting. It is autofire-only, an area-attack weapon, Inaccurate so it cannot attack at Long range, and holds 30 shots.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-repeating-blaster-carbine`
- Families: `weapon-family:blaster-rifle`, `weapon-family:blaster-carbine`, `weapon-family:repeating-blaster-carbine`, `weapon-family:autofire-rifle`
- Guardrail: Do not automatically grant the Riflemaster Blaster Carbine benefit without exact published applicability adjudication; this variant is already autofire-only.
- Recommendation fit: High-damage autofire specialist. Excellent for characters committed to area/sustained fire; poor for long-range or single-shot builds.

### 8. Blaster Carbine, Sporting

- Identity: `weapon-sporting-blaster-carbine`
- Source: Legacy Era Campaign Guide p.63 / table p.64
- Canonical mechanic: 3d8 single-shot sporting carbine with 3d8 stun, 100-shot power pack, and the carbine attack-of-opportunity rule. It is normally Inaccurate, but when wielded in two hands it is no longer treated as Inaccurate and regains Long-range capability.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `attack_of_opportunity`
- Tradeoff tags: `precision`, `sustained_damage`
- Exact selector: `weapon:weapon-sporting-blaster-carbine`
- Families: `weapon-family:blaster-rifle`, `weapon-family:blaster-carbine`, `weapon-family:sporting-blaster-carbine`
- Guardrail: Sport Hunter does not list Sporting Blaster Carbine; do not create a Sport Hunter interaction from the word 'sporting'.
- Guardrail: Do not infer the Riflemaster Blaster Carbine benefit without exact applicability.
- Recommendation fit: High-capacity single-shot carbine that becomes a capable long-range option when used two-handed while retaining carbine AoO flexibility.

### 9. Blaster Rifle

- Identity: `weapon-blaster-rifle`
- Source: Core Rulebook p.126 / table p.127
- Canonical mechanic: Standard rifle comparison baseline: 3d8 lethal, 2d8 stun, single/autofire modes, 50-shot power pack, normal rifle range, with optional retractable stock.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`
- Exact selector: `weapon:weapon-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:standard-blaster-rifle`
- Ability interaction: **Riflemaster** → `EXPLICIT_WEAPON_BENEFIT` — Treat the standard Blaster Rifle as an Accurate weapon.
- Recommendation fit: Default rifle when no specialized rifle offers a build-aligned advantage sufficient to justify its tradeoffs.

### 10. Blaster Rifle, Assault

- Identity: `weapon-assault-blaster-rifle`
- Source: Knights of the Old Republic Campaign Guide p.67 / table p.68
- Canonical mechanic: Accurate 3d8 assault blaster rifle with single/autofire modes, 50-shot power pack, and published stun setting. Accurate removes the normal Short-range attack penalty.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`, `precision`
- Exact selector: `weapon:weapon-assault-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:assault-blaster-rifle`
- Guardrail: Do not infer the standard Blaster Rifle Riflemaster effect from the broad blaster-rifle family; Riflemaster's named weapon cases remain exact.
- Recommendation fit: A cleaner general combat rifle than the baseline when Short-range accuracy matters, without sacrificing standard damage, autofire, stun, or capacity.

### 11. Blaster Rifle, Heavy

- Identity: `weapon-heavy-blaster-rifle`
- Source: Core Rulebook p.127 / table p.127
- Canonical mechanic: Large 3d10 heavy blaster rifle with 2d10 stun, single/autofire modes, and a 30-shot power pack. It emphasizes raw rifle firepower over compactness and ammunition endurance.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`
- Exact selector: `weapon:weapon-heavy-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:heavy-blaster-rifle`
- Ability interaction: **Riflemaster** → `EXPLICIT_WEAPON_BENEFIT` — When using a Heavy Blaster Rifle, its damage dice increase from d10 to d12.
- Recommendation fit: Raw-damage general combat rifle. Prefer when per-shot damage matters more than weight and ammunition endurance; Riflemaster substantially strengthens it.

### 12. Blaster Rifle, Heavy Assault

- Identity: `weapon-heavy-assault-blaster`
- Source: Legacy Era Campaign Guide p.65 / table p.64
- Canonical mechanic: Large 3d10 autofire-only heavy assault rifle with a 50-shot power pack, no stun setting, and Inaccurate range. On a critical hit, its damage dice increase from d10s to d12s.
- **Final tags:** `ranged`, `offense_ranged`, `sustained_damage`, `critical_hit`, `burst_damage`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-heavy-assault-blaster`
- Families: `weapon-family:blaster-rifle`, `weapon-family:heavy-assault-blaster-rifle`, `weapon-family:autofire-rifle`
- Guardrail: Do not grant Riflemaster's Heavy Blaster Rifle benefit; Heavy Assault Blaster Rifle is a distinct named identity.
- Recommendation fit: High-damage autofire rifle with strong critical spikes. Excellent for dedicated autofire/critical builds; poor for stun, single-shot precision, or Long-range roles.

### 13. Blaster Rifle, Heavy Variable

- Identity: `weapon-heavy-variable-blaster`
- Source: Galaxy at War p.38 / table p.41
- Canonical mechanic: Large variable-power rifle with 500-shot pack, 3d6/3d8/3d10 power profiles consuming 1x/10x/20x ammunition, stun tied to active power, and Inaccurate range. It also has an ascension mode with two syntherope tethers, swift-action mode switching, 12-square-per-round lift/zipline movement, and 30-square ascension range.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `swift_action`, `action_economy`, `burst_damage`, `mobility`, `movement`, `positioning`, `exploration`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-heavy-variable-blaster`
- Families: `weapon-family:blaster-rifle`, `weapon-family:heavy-blaster-rifle`, `weapon-family:variable-blaster-rifle`, `weapon-family:heavy-variable-blaster-rifle`, `weapon-family:ascension-system`
- Recommendation fit: Hybrid damage/utility rifle for characters who want selectable output and exceptional traversal. Avoid for autofire builds or characters who need Long-range capability.

### 14. Blaster Rifle, Light Repeating

- Identity: `weapon-light-repeating-blaster`
- Source: Core Rulebook p.127 / table p.127
- Canonical mechanic: Large 3d8 autofire-only rifle with no stun setting. It uses a 30-shot power pack or can attach to a power generator for extended use.
- **Final tags:** `ranged`, `offense_ranged`, `sustained_damage`
- Exact selector: `weapon:weapon-light-repeating-blaster`
- Families: `weapon-family:blaster-rifle`, `weapon-family:repeating-blaster-rifle`, `weapon-family:light-repeating-blaster`, `weapon-family:autofire-rifle`
- Ability interaction: **Riflemaster** → `EXPLICIT_WEAPON_BENEFIT` — Treat the Light Repeating Blaster as Medium instead of Large.
- Recommendation fit: Dedicated sustained-fire rifle. Excellent for autofire builds and prolonged positions with generator access; poor for single-shot, stun, or low-profile use.

### 15. Blaster Rifle, Sniper

- Identity: `weapon-sniper-blaster-rifle`
- Source: Scum and Villainy p.50 / table p.51
- Canonical mechanic: Accurate 3d10 single-shot sniper rifle with built-in bipod and targeting scope, no stun setting, and only 10 shots. If the wielder does not Aim at the target immediately before attacking, the attack takes -5. It cannot benefit from the rapid recycler upgrade.
- **Final tags:** `ranged`, `offense_ranged`, `precision`, `targeting`, `setup`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-sniper-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:sniper-rifle`, `weapon-family:sniper-blaster-rifle`
- Recommendation fit: Dedicated precision/sniper rifle. Strong for Aim-based long-range characters; poor for mobile firing, autofire, stun, or ammunition-intensive combat.

### 16. Blaster Rifle, Sporting

- Identity: `weapon-sporting-blaster-rifle`
- Source: Core Rulebook p.127 / table p.127
- Canonical mechanic: Civilian/hunting 3d6 rifle with 2d6 stun, single-shot fire, normal rifle range, and 50-shot power pack. Targeting scopes are common but are not included in the listed weapon cost.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-sporting-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:sporting-rifle`, `weapon-family:sporting-blaster-rifle`
- Ability interaction: **Sport Hunter** → `EXPLICIT_WEAPON_BENEFIT` — When using a Sporting Blaster Rifle, gain +1 to the attack roll when aiming before firing.
- Guardrail: Do not add `precision` to finalTags solely because Sport Hunter can improve this weapon; the benefit belongs to the feat/weapon join, not the unmodified weapon.
- Recommendation fit: Lower-power civilian hunting rifle. Normally inferior to a military blaster rifle for raw combat, but materially more attractive to Sport Hunter/Aim-oriented characters.

### 17. Blaster Rifle, Variable

- Identity: `weapon-variable-blaster`
- Source: Galaxy at War p.38 / table p.41
- Canonical mechanic: Variable-power S/A rifle with 500-shot pack and same-as-active-profile stun. Its swift-action power settings deal 3d4 at 1x consumption, 3d6 at 5x, or 3d8 at 10x.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`, `swift_action`, `action_economy`, `burst_damage`
- Exact selector: `weapon:weapon-variable-blaster`
- Families: `weapon-family:blaster-rifle`, `weapon-family:variable-blaster-rifle`
- Guardrail: Do not infer Riflemaster's exact Blaster Rifle benefit from family membership.
- Recommendation fit: Flexible logistics rifle for characters who want to conserve ammunition against weak targets and dial up to standard-rifle output when needed, while retaining autofire and stun.

### 18. Bryar Rifle

- Identity: `weapon-bryar-rifle`
- Source: Force Unleashed Campaign Guide p.98 / table p.99
- Canonical mechanic: Inaccurate 3d8 single-shot rifle with a 50-shot rechargeable pack. A swift action can prime it; if the wielder makes no attack before the start of the next turn, the next attack before encounter end gains +1 weapon die, consumes 5 shots, and cannot combine with a multi-shot ability.
- **Final tags:** `ranged`, `offense_ranged`, `swift_action`, `action_economy`, `setup`, `damage_bonus`, `burst_damage`
- Tradeoff tags: `precision`, `sustained_damage`
- Exact selector: `weapon:weapon-bryar-rifle`
- Families: `weapon-family:bryar-rifle`, `weapon-family:charged-shot-rifle`
- Recommendation fit: Prepared-shot rifle for characters who can afford setup turns and want single-hit burst damage. Poor for Long-range, autofire, Rapid Shot, Double Attack, or constant-pressure builds.

### 19. Commando Special Rifle

- Identity: `weapon-commando-special-rifle`
- Source: Knights of the Old Republic Campaign Guide p.180 / table p.180
- Canonical mechanic: Compact 3d10 S/A Republic commando rifle with full rifle range, no stun setting, and a 25-shot power pack.
- **Final tags:** `ranged`, `offense_ranged`, `sustained_damage`
- Exact selector: `weapon:weapon-commando-special-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:commando-rifle`, `weapon-family:commando-special-rifle`
- Guardrail: Do not infer Riflemaster's exact Blaster Rifle benefit from broad family membership.
- Recommendation fit: High-damage compact generalist with both single and autofire modes. Strong when stopping power matters more than stun capability or ammunition endurance.

### 20. Concussion Rifle

- Identity: `weapon-concussion-rifle`
- Source: Unknown Regions p.37 / table p.38
- Canonical mechanic: 2d10 sonic-energy single-shot rifle with 25 shots. Its attacks target Fortitude Defense instead of Reflex Defense, and every successful hit knocks the target prone in addition to dealing damage.
- **Final tags:** `ranged`, `offense_ranged`, `control`, `battlefield_control`, `positioning`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-concussion-rifle`
- Families: `weapon-family:concussion-rifle`, `weapon-family:sonic-rifle`
- Recommendation fit: Control rifle for builds that value reliable knockdown and alternative-defense targeting over raw damage, autofire, stun, or ammunition endurance.

### 21. Czerka Adventurer

- Identity: `weapon-adventurer-slugthrower`
- Source: Clone Wars Campaign Guide p.62 / table p.61
- Canonical mechanic: Accurate 2d10 single-shot slugthrower rifle. It can be broken down for concealment and reassembled; either operation is a move action. The source does not state its slug-ammunition capacity.
- **Final tags:** `ranged`, `offense_ranged`, `precision`, `concealment`, `move_action`, `action_economy`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-adventurer-slugthrower`
- Families: `weapon-family:projectile-rifle`, `weapon-family:slugthrower-rifle`, `weapon-family:czerka-adventurer`
- Guardrail: Sport Hunter's Slugthrower Rifle case is an ability-side family match. Its published transform is specifically d8 -> d12; do not silently rewrite this weapon's 2d10 profile without a rule that supports that transform.
- Guardrail: Do not infer a numerical Stealth bonus merely because the rifle can be broken down for concealment.
- Recommendation fit: Accurate covert-carry slugthrower for precision characters who value a concealable long arm. Less attractive for autofire or sustained-fire builds.

### 22. DXR-6 Disruptor Rifle

- Identity: `weapon-disruptor-rifle`
- Source: Force Unleashed Campaign Guide p.99 / table p.99
- Canonical mechanic: 3d8 disruptor rifle that treats every target's Damage Threshold as 5 lower and disintegrates a creature, droid, vehicle, or object it kills or destroys. It can fire only once every other round, cannot use multi-shot-consuming abilities, and has a 10-shot rechargeable pack.
- **Final tags:** `ranged`, `offense_ranged`, `damage_threshold`
- Tradeoff tags: `full_attack`, `sustained_damage`
- Exact selector: `weapon:weapon-disruptor-rifle`
- Families: `weapon-family:disruptor`, `weapon-family:disruptor-rifle`
- Recommendation fit: Damage-threshold specialist for fewer, more consequential shots. Very poor fit for Rapid Shot, Double Attack, autofire, or other sustained-fire builds.

### 23. Flechette Launcher

- Identity: `weapon-flechette-launcher`
- Source: Rebellion Era Campaign Guide p.49 / table p.50 (also Force Unleashed Campaign Guide p.199 / table p.199)
- Canonical mechanic: Inaccurate 3d8 piercing single-shot launcher treated as a Rifle. It is a splash weapon with a 1-square splash radius, uses four-shot flechette canisters, and cannot be used with Rapid Shot or another feat/talent that expends more than one shot.
- **Final tags:** `ranged`, `offense_ranged`, `burst_damage`
- Tradeoff tags: `precision`, `full_attack`, `sustained_damage`
- Exact selector: `weapon:weapon-flechette-launcher`
- Families: `weapon-family:flechette`, `weapon-family:flechette-launcher`, `weapon-family:splash-rifle`
- Ability interaction: **Rapid Shot** → `PROHIBITED` — The weapon's source explicitly prohibits Rapid Shot.
- Recommendation fit: Anti-personnel splash rifle for characters who want compact area pressure without autofire. Poor fit for Long-range and multi-shot feat chains.

### 24. Incinerator Rifle

- Identity: `weapon-incinerator-rifle`
- Source: Force Unleashed Campaign Guide p.99 / table p.99
- Canonical mechanic: 3d6 single-shot energy rifle with a 20-shot power pack. Any creature it kills, or droid, object, or vehicle it destroys, is automatically disintegrated and leaves no trace.
- **Final tags:** `ranged`, `offense_ranged`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-incinerator-rifle`
- Families: `weapon-family:incinerator-rifle`, `weapon-family:disintegration-weapon`
- Recommendation fit: Niche rifle whose distinctive value is eliminating the remains of targets it kills or destroys. It is otherwise weaker than the standard rifle in damage, capacity, stun, and fire-mode flexibility.

### 25. Interchangeable Weapon System

- Identity: `weapon-interchangeable-weapon-system`
- Source: Galaxy at War p.39 / table p.41
- Canonical mechanic: DC-17m modular weapon that switches as a standard action among a normal 3d8 S/A blaster-rifle mode with stun, an Accurate 3d10 scoped sniper-rifle mode with -2 against unmodified point-blank targets, and a single-shot 4d6 3-square-burst anti-armor grenade-launcher mode using Heavy Weapons proficiency.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`, `sniper`, `targeting`, `precision`, `standard_action`, `action_economy`, `setup`, `burst_damage`
- Exact selector: `weapon:weapon-interchangeable-weapon-system`
- Families: `weapon-family:interchangeable-weapon-system`, `weapon-family:modular-weapon-system`
- Mode selectors:
  - **blaster-rifle** → `weapon-group:rifle`, `weapon-proficiency:rifles`; `weapon-family:blaster-rifle`
  - **sniper** → `weapon-group:rifle`, `weapon-proficiency:rifles`; `weapon-family:sniper-rifle`
  - **anti-armor** → `weapon-group:heavy-weapon`, `weapon-proficiency:heavy-weapons`; `weapon-family:grenade-launcher`, `weapon-family:anti-armor-launcher`
- Guardrail: Do not apply Rifle-only benefits to the anti-armor configuration merely because the parent item is cataloged under Rifles.
- Guardrail: Resolve ability applicability against the active mode selector.
- Recommendation fit: Premium all-role platform for characters who can afford a standard action to change jobs: general rifle, precision sniper, or heavy-weapon area launcher. Especially valuable to characters proficient in both Rifles and Heavy Weapons.

### 26. Ion Carbine

- Identity: `weapon-ion-carbine`
- Source: Knights of the Old Republic Campaign Guide p.69 / table p.68
- Canonical mechanic: 3d8 ion S/A carbine with a 30-shot power pack. It uses ion-damage rules against droids, vehicles, electronics, and cybernetically enhanced creatures. It is Inaccurate and cannot attack at Long range.
- **Final tags:** `ranged`, `offense_ranged`, `droid`, `vehicle`, `tech`, `control`, `battlefield_control`, `sustained_damage`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-ion-carbine`
- Families: `weapon-family:ion`, `weapon-family:ion-carbine`, `weapon-family:blaster-carbine`
- Guardrail: No certified `ion` semantic tag exists; ion is structural damage/effect metadata.
- Guardrail: Do not infer Riflemaster's exact Blaster Carbine benefit for this ion variant unless the ability authority explicitly includes it.
- Recommendation fit: Autofire-capable anti-technology rifle for droid-, vehicle-, and electronics-heavy encounters. De-prioritize against ordinary organic opposition and Long-range builds.

### 27. Ion Rifle

- Identity: `weapon-ion-rifle`
- Source: Core Rulebook p.129 / table p.127
- Canonical mechanic: 3d8 single-shot ion rifle with a 20-shot power pack. It uses the standard ion-damage rules and retains full rifle range.
- **Final tags:** `ranged`, `offense_ranged`, `droid`, `vehicle`, `tech`, `control`, `battlefield_control`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-ion-rifle`
- Families: `weapon-family:ion`, `weapon-family:ion-rifle`
- Guardrail: No certified `ion` semantic tag exists; ion remains structural rules metadata.
- Recommendation fit: Long-range ion specialist for characters expecting technological opposition. Lower capacity and no autofire make it less attractive as a general-purpose rifle.

### 28. Micro Grenade Launcher

- Identity: `weapon-micro-grenade-launcher`
- Source: Scum and Villainy p.50 / table p.51
- Canonical mechanic: Inaccurate Rifle-class launcher holding four micro grenades with a full-round reload. It can be used standalone or mounted on a rifle in 1 minute with a DC 15 Mechanics check. Loaded micro grenades inherit their normal grenade rules but deal two fewer damage dice on a successful hit.
- **Final tags:** `ranged`, `mechanics`, `equipment`, `setup`
- Tradeoff tags: `precision`, `action_economy`, `sustained_damage`
- Exact selector: `weapon:weapon-micro-grenade-launcher`
- Families: `weapon-family:grenade-launcher`, `weapon-family:micro-grenade-launcher`, `weapon-family:payload-launcher`
- Guardrail: Do not statically copy every possible grenade semantic tag onto the launcher.
- Guardrail: At recommendation/runtime resolution, inherit payload semantics from the loaded micro-grenade and then apply this launcher's -2 damage-dice transform.
- Guardrail: Do not introduce semantic tags `grenade`, `explosives`, or `area_damage`.
- Recommendation fit: Payload-flexible launcher for characters who value access to multiple grenade effects and can support the mounting/reload burden. Recommendation semantics should come primarily from the loaded micro-grenade.

### 29. Pulse-Wave Rifle

- Identity: `weapon-pulse-wave-rifle`
- Source: Knights of the Old Republic Campaign Guide p.69 / table p.68
- Canonical mechanic: Inaccurate 2d8 S/A energy rifle with a 50-shot power pack. It gains a +5 equipment bonus to damage at point-blank range and cannot attack at Long range.
- **Final tags:** `ranged`, `offense_ranged`, `damage_bonus`, `burst_damage`, `sustained_damage`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-pulse-wave-rifle`
- Families: `weapon-family:pulse-wave`, `weapon-family:pulse-wave-rifle`
- Recommendation fit: Aggressive close-range rifle for builds that stay inside point-blank range and want both single-shot and autofire. Poor choice for sniper or Long-range play.

### 30. Rail Detonator Gun

- Identity: `weapon-rail-detonator-gun`
- Source: Force Unleashed Campaign Guide p.200 / table p.199
- Canonical mechanic: Large 3d8 piercing single-shot rifle firing special explosive canisters. It is a splash weapon with a 1-square splash radius and uses 10-shot magazines.
- **Final tags:** `ranged`, `offense_ranged`, `burst_damage`
- Exact selector: `weapon:weapon-rail-detonator-gun`
- Families: `weapon-family:rail-detonator-gun`, `weapon-family:splash-rifle`, `weapon-family:explosive-canister-weapon`
- Guardrail: Explosive canister ammunition is structured mechanics; do not add forbidden semantic tag `explosives`.
- Recommendation fit: Full-range splash rifle for characters who want multi-target pressure without the Inaccurate limitation of the flechette launcher, at the cost of low ammunition capacity and no stun/autofire.

### 31. Scatter Gun

- Identity: `weapon-scattergun`
- Source: Galaxy at War p.40 / table p.41
- Canonical mechanic: Inaccurate single-shot scatter weapon firing individual shells. It deals 3d8 piercing damage at point-blank range, 2d8 at short range, and no damage at medium or long range. It holds 10 shells.
- **Final tags:** `ranged`, `offense_ranged`, `positioning`
- Tradeoff tags: `precision`, `sustained_damage`
- Exact selector: `weapon:weapon-scattergun`
- Families: `weapon-family:projectile-rifle`, `weapon-family:scatter-gun`, `weapon-family:close-quarters-rifle`
- Guardrail: Do not infer area/splash behavior from the shotgun-like fiction; the published weapon is not an area attack.
- Guardrail: Do not introduce a semantic `shotgun` tag unless a future certified feat/talent vocabulary establishes it.
- Recommendation fit: Close-quarters projectile rifle for characters who consistently fight at point-blank or short range. Avoid for general field, sniper, stun, or sustained-fire roles.

### 32. SG-4 Blaster Rifle

- Identity: `weapon-sg-4-blaster-rifle`
- Source: Rebellion Era Campaign Guide p.50 / table p.50
- Canonical mechanic: Amphibious combination rifle with a normal 3d8 S/A blaster profile, 2d8 stun, and a one-shot 2d6 piercing harpoon profile. Blaster mode uses a 50-shot pack; harpoon mode reloads as a swift action. Using blaster mode underwater or harpoon mode out of water halves range.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`
- Tradeoff tags: `swift_action`, `action_economy`
- Exact selector: `weapon:weapon-sg-4-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:sg-4-blaster-rifle`, `weapon-family:amphibious-rifle`, `weapon-family:harpoon-rifle`
- Mode selectors:
  - **blaster** → `weapon-group:rifle`, `weapon-proficiency:rifles`; `weapon-family:blaster-rifle`, `weapon-family:sg-4-blaster-rifle`
  - **harpoon** → `weapon-group:rifle`, `weapon-proficiency:rifles`; `weapon-family:harpoon-rifle`, `weapon-family:sg-4-blaster-rifle`
- Guardrail: Aquatic/amphibious role is structural recommendation data; do not invent an `aquatic` semantic tag.
- Guardrail: Do not infer Riflemaster's exact Blaster Rifle benefit merely from broad blaster-rifle family membership.
- Recommendation fit: Environment-flexible rifle for aquatic/amphibious missions. Above water it remains a standard S/A blaster rifle; underwater the harpoon gives it a dedicated physical-damage option.

### 33. Slugthrower Rifle

- Identity: `weapon-slugthrower-rifle`
- Source: Core Rulebook p.129 / table p.127
- Canonical mechanic: Standard 2d8 S/A ballistic rifle using 20-round slug clips rather than power packs. It has full rifle range and no stun setting.
- **Final tags:** `ranged`, `offense_ranged`, `sustained_damage`
- Exact selector: `weapon:weapon-slugthrower-rifle`
- Families: `weapon-family:projectile-rifle`, `weapon-family:slugthrower-rifle`
- Ability interaction: **Sport Hunter** → `EXPLICIT_WEAPON_BENEFIT` — When using a Slugthrower Rifle, its d8 damage dice increase to d12.
- Recommendation fit: Baseline ballistic rifle and a major Sport Hunter target. Without that feat it trades damage, capacity, and stun for physical ammunition; with Sport Hunter its damage profile becomes much more competitive.

### 34. Snare Rifle

- Identity: `weapon-snare-rifle`
- Source: Scum and Villainy p.51 / table p.51
- Canonical mechanic: Five-shot capture rifle that initiates a grab or grapple at range. A successful grab deals 1d6 native stun damage. Snared targets escape with DC 15 Acrobatics or DC 20 Strength. Pin and Trip are supported; Crush and Throw are prohibited.
- **Final tags:** `ranged`, `stun`, `nonlethal`, `grab`, `grapple`, `restrain`, `control`, `battlefield_control`
- Exact selector: `weapon:weapon-snare-rifle`
- Families: `weapon-family:snare-weapon`, `weapon-family:snare-rifle`, `weapon-family:capture-weapon`
- Ability interaction: **Pin** → `SUPPORTED` — Pin can be used with the snare rifle.
- Ability interaction: **Trip** → `SUPPORTED` — Trip can be used with the snare rifle.
- Ability interaction: **Crush** → `PROHIBITED` — Crush cannot be used with the snare rifle.
- Ability interaction: **Throw** → `PROHIBITED` — Throw cannot be used with the snare rifle.
- Recommendation fit: Dedicated nonlethal capture rifle for bounty hunters, law enforcement, grapplers, and control builds. Poor choice when lethal damage, autofire, or ammunition endurance is required.

### 35. Sonic Rifle

- Identity: `weapon-sonic-rifle`
- Source: Knights of the Old Republic Campaign Guide p.70 / table p.68
- Canonical mechanic: 2d8 S/A sonic-energy rifle with a 50-shot rechargeable power pack. Its ranged attacks cannot be negated by Deflect or talents that have Deflect as a prerequisite.
- **Final tags:** `ranged`, `offense_ranged`, `anti-force`, `sustained_damage`
- Exact selector: `weapon:weapon-sonic-rifle`
- Families: `weapon-family:sonic`, `weapon-family:sonic-rifle`
- Ability interaction: **Deflect** → `CANNOT_NEGATE_ATTACK` — Deflect cannot negate a ranged sonic attack.
- Ability interaction: **Talents with Deflect as prerequisite** → `CANNOT_NEGATE_ATTACK` — Deflect-dependent talents cannot negate the ranged sonic attack.
- Guardrail: Do not introduce a `sonic` semantic tag; sonic remains damage/selector metadata.
- Recommendation fit: General anti-Deflect rifle. It gives up damage and stun flexibility relative to the standard Blaster Rifle in exchange for a clean counter to lightsaber Deflect while retaining autofire.

### 36. SoroSuub Firelance Blaster Rifle

- Identity: `weapon-firelance-blaster-rifle`
- Source: Clone Wars Campaign Guide p.63 / table p.61
- Canonical mechanic: 3d8 S/A light blaster rifle whose defining feature is an unusually strong 4d6 stun setting. The source does not state its ammunition source or capacity.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`
- Exact selector: `weapon:weapon-firelance-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:firelance-blaster-rifle`
- Guardrail: Do not infer Riflemaster's exact Blaster Rifle benefit from broad blaster-rifle family membership.
- Recommendation fit: Nonlethal general-purpose rifle for characters who want standard lethal output and autofire but substantially stronger stun damage than the baseline rifle.

### 37. Stokhli Spray Stick

- Identity: `weapon-stokhli-spray-stick`
- Source: Force Unleashed Campaign Guide p.100 / table p.99
- Canonical mechanic: Inaccurate long-range capture rifle dealing native 3d8 stun and coating the target in sticky webbing that functions as a net, allowing a ranged grab or grapple. It uses 80-shot spraymist canisters.
- **Final tags:** `ranged`, `stun`, `nonlethal`, `grab`, `grapple`, `restrain`, `control`, `battlefield_control`
- Tradeoff tags: `precision`
- Exact selector: `weapon:weapon-stokhli-spray-stick`
- Families: `weapon-family:stun-rifle`, `weapon-family:capture-weapon`, `weapon-family:net-weapon`, `weapon-family:stokhli-spray-stick`
- Guardrail: The source establishes net-like ranged grab/grapple, but Phase 3B does not explicitly name Pin, Trip, Crush, or Throw interactions for the spray stick. Do not copy Snare Rifle feat links onto it without separate authority.
- Recommendation fit: High-capacity long-range capture weapon for bounty hunters and control builds. It combines strong native stun with net-style grab/grapple at ranges ordinary stun weapons cannot reach.

### 38. Targeting Blaster Rifle

- Identity: `weapon-targeting-blaster-rifle`
- Source: The Unknown Regions p.39 / table p.38
- Canonical mechanic: Accurate 3d6 single-shot rifle with same-as-base stun and a 50-shot power pack. If the wielder Aims before attacking, its damage dice change from d6s to d8s. It can be assembled or disassembled as a full-round action and has no folding stock.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `precision`, `targeting`, `setup`, `damage_bonus`, `burst_damage`
- Tradeoff tags: `sustained_damage`
- Exact selector: `weapon:weapon-targeting-blaster-rifle`
- Families: `weapon-family:blaster-rifle`, `weapon-family:targeting-blaster-rifle`, `weapon-family:aim-rifle`
- Guardrail: The source calls this technically a sporting blaster, but Sport Hunter explicitly lists Sporting Blaster Rifle as its named case. Do not automatically apply Sport Hunter to Targeting Blaster Rifle without separate ability authority.
- Guardrail: Do not infer Riflemaster's exact Blaster Rifle benefit from broad family membership.
- Guardrail: Disassembly is described for storage/ease of transport, not as a numerical concealment bonus.
- Recommendation fit: Aim-focused precision rifle for characters who routinely spend actions to line up shots. It reaches standard Blaster Rifle damage only when aimed, but combines that with Accurate and stun capability.

## Completion / implementation contract

- Rifle semantic/selector/recommendation authority is complete at **38/38**.
- Preserve planner semantic rulings exactly.
- Validate every semantic tag against the frozen certified feat/talent-used semantic union before implementation.
- Keep structural selectors out of `system.tags`.
- Preserve named ability directionality and mode/payload conditions.
- Preserve damage dice, ammunition, range bands, fire modes, Accurate/Inaccurate, area geometry, action costs, environment rules, attack-defense substitutions, and configuration state as structured mechanics.
- Phase 3D remains frozen.
- Production mutation remains unauthorized.
- Do not change `packs/weapons.db` or `template.json` during this certification step.