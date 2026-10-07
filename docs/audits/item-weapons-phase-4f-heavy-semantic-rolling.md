# Phase 4F — Heavy Weapons Semantic Tags + Rule Selectors — Complete Planner Authority

**Status:** `WEAPON_TAG_PHASE_4F_HEAVY_COMPLETE_PLANNER_AUTHORITY`

## Completion

- Primary Heavy Weapon identities: **15**
- Heavy-proficiency adjunct identities: **2** — Electronet and Interchangeable Weapon System
- Total Heavy Weapons proficiency surface: **17**
- Adjudicated: **17 / 17**
- Repo-present: **17**
- Repo-missing: **0**
- Final semantic-tag assignments: **105**
- Conditional semantic-tag assignments: **1**
- Distinct semantic tags used: **25**
- Production mutation: **NOT AUTHORIZED**

## Core architecture rulings

- `heavy_weapon` is semantic only when the active attack profile actually uses Heavy Weapons proficiency.
- Interchangeable Weapon System receives `heavy_weapon` only in anti-armor mode; its Phase 4D Rifle authority remains globally controlling.
- Launchers own delivery, capacity, reload, targeting, and mode rules; loaded missiles/grenades/torpedoes own payload damage/type/area unless the launcher explicitly transforms them.
- Electronet is Heavy Weapon ammunition, not a standalone firearm.
- Crew dependencies remain structural and do not automatically become `teamwork` semantics.
- Mortar indirect-fire geometry is represented with `cover` + `positioning` and preserved structurally.
- Tactical Tractor Beam is technological grab/reposition control, not `telekinesis`.

## Complete authority — 17 identities

### 1. Blaster Cannon

- Identity: `weapon-blaster-cannon`
- Source: Core Rulebook p.125 / table p.126
- Canonical mechanic: 3d12 single-fire area cannon; 10 shots; full/half primary-target resolution plus half damage to adjacent targets on a hit.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`
- Families: `weapon-family:blaster-cannon`, `weapon-family:area-cannon`, `weapon-family:shoulder-fired-heavy`
- Recommendation fit: Portable high-damage area baseline.

### 2. Carbonite Rifle

- Identity: `weapon-carbonite-rifle`
- Source: Knights of the Old Republic Campaign Guide p.69 / table p.68
- Canonical mechanic: Native 3d10 stun; 20-shot carbonite cartridge; a target moved down the condition track is also immobilized until the end of its next turn.
- **Final tags:** `heavy_weapon`, `ranged`, `stun`, `nonlethal`, `control`, `battlefield_control`
- Families: `weapon-family:carbonite-rifle`, `weapon-family:stun-heavy-weapon`
- Recommendation fit: Nonlethal control Heavy Weapon.

### 3. E-Web Missile Launcher

- Identity: `weapon-e-web-missile-launcher`
- Source: Force Unleashed Campaign Guide p.198 / table p.199
- Canonical mechanic: Tripod single-shot 2x2 area missile launcher; normally crew-reloaded as a move action; two swift actions can improve effective range one step; max one shot per round.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`, `swift_action`, `action_economy`, `setup`
- Tradeoff tags: `full_attack`, `sustained_damage`
- Families: `weapon-family:missile-launcher`, `weapon-family:e-web-missile-launcher`, `weapon-family:crew-served-heavy`, `weapon-family:payload-launcher`
- Recommendation fit: Prepared crew-served area missile platform.

### 4. E-Web Repeating Blaster

- Identity: `weapon-e-web-repeating-blaster`
- Source: Core Rulebook p.125 / table p.126
- Canonical mechanic: 3d12 autofire-only generator-powered tripod weapon; normally requires a second crew member to regulate power or attacks take -2.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `sustained_damage`
- Families: `weapon-family:repeating-blaster`, `weapon-family:e-web-repeating-blaster`, `weapon-family:autofire-heavy`, `weapon-family:crew-served-heavy`
- Recommendation fit: Emplacement sustained-fire platform.

### 5. Electronet

- Identity: `weapon-electronet`
- Source: Scum and Villainy p.50 / table p.51
- Canonical mechanic: Grenade-launcher ammunition affecting a 2x2 area; hits deal 3d8 stun and grab; trapped targets take recurring 3d8 stun each round.
- **Final tags:** `heavy_weapon`, `ranged`, `stun`, `nonlethal`, `grab`, `restrain`, `control`, `battlefield_control`, `sustained_damage`
- Families: `weapon-family:electronet`, `weapon-family:net-ammunition`, `weapon-family:grenade-launcher-ammunition`, `weapon-family:capture-payload`
- Recommendation fit: Multi-target capture/control payload.

### 6. Flame Cannon

- Identity: `weapon-flame-cannon`
- Source: Galaxy at War p.39 / table p.41
- Canonical mechanic: 5d6 fire cone 12 squares long and 8 wide at the end; 20-use tank; full-round reload; tripod reduces effective wielding size.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`
- Tradeoff tags: `action_economy`, `sustained_damage`
- Families: `weapon-family:flame-cannon`, `weapon-family:cone-heavy`, `weapon-family:tripod-heavy`
- Recommendation fit: Broad cone battlefield-clearing weapon.

### 7. Grenade Launcher

- Identity: `weapon-grenade-launcher`
- Source: Core Rulebook p.128 / table p.126
- Canonical mechanic: Four-round payload launcher; loaded grenade determines damage/type/burst/effects; full-round reload; rifle-mountable in 1 minute with DC 15 Mechanics; cannot fire thermal detonators.
- **Final tags:** `heavy_weapon`, `ranged`, `equipment`, `mechanics`, `setup`
- Tradeoff tags: `action_economy`, `sustained_damage`
- Families: `weapon-family:grenade-launcher`, `weapon-family:payload-launcher`, `weapon-family:rifle-mounted-heavy`
- Recommendation fit: Payload-flexible launcher; semantics should inherit from the loaded grenade.

### 8. Heavy Blaster Cannon

- Identity: `weapon-heavy-blaster-cannon`
- Source: Legacy Era Campaign Guide p.182 / table p.183
- Canonical mechanic: Huge Inaccurate 4d12 area cannon; 10 shots; Medium or smaller wielder must spend two swift actions immediately before firing to brace it; no Long range.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`, `swift_action`, `action_economy`, `setup`
- Tradeoff tags: `precision`, `sustained_damage`
- Families: `weapon-family:blaster-cannon`, `weapon-family:heavy-blaster-cannon`, `weapon-family:area-cannon`, `weapon-family:braced-heavy`
- Recommendation fit: Maximum cannon damage with a setup tax.

### 9. Heavy Repeating Blaster

- Identity: `weapon-heavy-repeating-blaster`
- Source: Core Rulebook p.125 / table p.126
- Canonical mechanic: 3d10 autofire-only; 20-shot pack or generator; cannot brace unless mounted on tripod or another mount.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `sustained_damage`
- Families: `weapon-family:repeating-blaster`, `weapon-family:heavy-repeating-blaster`, `weapon-family:autofire-heavy`
- Recommendation fit: Mobile sustained-fire Heavy Weapon.

### 10. Interchangeable Weapon System

- Identity: `weapon-interchangeable-weapon-system`
- Source: Galaxy at War p.39 / table p.41
- Canonical mechanic: DC-17m switches among rifle, sniper, and anti-armor modes. Only anti-armor mode uses Heavy Weapons proficiency and fires a 4d6 3-square-burst round.
- **Final tags:** `ranged`, `offense_ranged`, `stun`, `nonlethal`, `sustained_damage`, `sniper`, `targeting`, `precision`, `standard_action`, `action_economy`, `setup`, `burst_damage`
- Conditional semantic tag: `heavy_weapon` when **anti-armor mode active** — Only the anti-armor profile uses Heavy Weapons proficiency.
- Families: `weapon-family:interchangeable-weapon-system`, `weapon-family:modular-weapon-system`
- Recommendation fit: Hybrid rifle/heavy platform; Heavy Weapon relevance is conditional on anti-armor mode.

### 11. Light Concussion Missile Launcher

- Identity: `weapon-light-concussion-missile-launcher`
- Source: Threats of the Galaxy p.134
- Canonical mechanic: Single-shot antivehicle launcher firing one light concussion missile per attack. The missile deals 4d10x2 slashing damage with a 2-square splash. Attacks against targets smaller than Huge take -10, and Rapid Shot cannot be used.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`, `vehicle`
- Tradeoff tags: `precision`, `full_attack`, `sustained_damage`
- Families: `weapon-family:missile-launcher`, `weapon-family:light-concussion-missile-launcher`, `weapon-family:anti-vehicle-launcher`, `weapon-family:payload-launcher`
- Recommendation fit: Dedicated anti-vehicle launcher for Huge targets and larger battlefield threats.

### 12. Merr-Sonn PLX-2M Portable Missile Launcher

- Identity: `weapon-plx-2m-portable-missile-launcher`
- Source: Rebellion Era Campaign Guide p.49 / table p.50
- Canonical mechanic: Six-shot portable missile launcher firing 8d6 energy 3-square-burst missiles. Specialized targeting modes impose -2 Reflex Defense on the selected target type. Reloading is a full-round action; a microrepulsorlift removes its weight from encumbrance while active and drawn.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`, `targeting`, `mobility`
- Tradeoff tags: `action_economy`, `sustained_damage`
- Families: `weapon-family:missile-launcher`, `weapon-family:plx-2m`, `weapon-family:portable-missile-launcher`, `weapon-family:payload-launcher`
- Recommendation fit: Portable guided-area launcher with target-category assistance.

### 13. Miniature Proton Torpedo Launcher

- Identity: `weapon-miniature-proton-torpedo-launcher`
- Source: Rebellion Era Campaign Guide p.49 / table p.50
- Canonical mechanic: Four-shot proton torpedo launcher. Area mode fires a 6d10 2-square blast. A swift action switches to single-target mode for 6d10x2 with -10 against targets smaller than Huge. After every shot the launcher must be reset with a standard action.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`, `vehicle`, `swift_action`, `standard_action`, `action_economy`
- Tradeoff tags: `full_attack`, `sustained_damage`, `precision`
- Families: `weapon-family:torpedo-launcher`, `weapon-family:miniature-proton-torpedo-launcher`, `weapon-family:anti-vehicle-launcher`, `weapon-family:payload-launcher`
- Recommendation fit: High-output anti-vehicle launcher with a heavy action-economy cost.

### 14. Missile Launcher

- Identity: `weapon-missile-launcher`
- Source: Core Rulebook p.130 / table p.126
- Canonical mechanic: Four-shot launcher firing standard 6d6 slashing missiles in a 2-square burst; full-round reload.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`
- Tradeoff tags: `action_economy`, `sustained_damage`
- Families: `weapon-family:missile-launcher`, `weapon-family:standard-missile-launcher`, `weapon-family:payload-launcher`
- Recommendation fit: Core general-purpose missile launcher.

### 15. Mortar Launcher

- Identity: `weapon-mortar-launcher`
- Source: Galaxy at War p.40 / table p.41
- Canonical mechanic: Five-shell indirect launcher; cannot attack at point-blank range; for line of sight and cover its origin can be treated as 20 squares in the air; shells are statistically identical to grenades.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `burst_damage`, `cover`, `positioning`
- Families: `weapon-family:mortar-launcher`, `weapon-family:indirect-fire-heavy`, `weapon-family:grenade-equivalent-shell`
- Recommendation fit: Indirect-fire weapon for attacking around terrain and conventional cover.

### 16. Rotary Blaster Cannon

- Identity: `weapon-rotary-blaster-cannon`
- Source: Galaxy at War p.40 / table p.41
- Canonical mechanic: 3d10 autofire-only cannon. Bracing expands autofire from 2x2 to 2x4; unbraced fire takes an additional -5. Uses a 20-shot pack or generator.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `sustained_damage`, `setup`, `burst_damage`
- Tradeoff tags: `precision`
- Families: `weapon-family:rotary-blaster-cannon`, `weapon-family:autofire-heavy`, `weapon-family:braced-heavy`
- Recommendation fit: Wide-area sustained-fire cannon for braced firing lanes.

### 17. Tactical Tractor Beam

- Identity: `weapon-tactical-tractor-beam`
- Source: Galaxy at War p.42 / table p.41
- Canonical mechanic: Generator-powered Heavy Weapon affecting Huge or smaller targets. A grabbed object can be moved up to 10 squares or hurled within 10 squares for falling-object damage. Normally crew-regulated each round; tripod mounting reduces effective size.
- **Final tags:** `heavy_weapon`, `ranged`, `offense_ranged`, `grab`, `control`, `battlefield_control`, `movement`, `positioning`
- Tradeoff tags: `action_economy`
- Families: `weapon-family:tractor-beam`, `weapon-family:tactical-tractor-beam`, `weapon-family:crew-served-heavy`, `weapon-family:tripod-heavy`
- Recommendation fit: Heavy Weapon control platform for grabbing, moving, and hurling battlefield objects.

## Implementation contract

- Preserve planner semantic rulings exactly.
- Keep structural group/family/proficiency/mode/payload facts out of semantic tags unless they have separately certified semantic meaning.
- Do not introduce `grenade`, `explosives`, `area_damage`, `accuracy`, or `autofire` as semantic tags.
- Phase 3D production mutation remains frozen.
- Do not modify `packs/weapons.db` or `template.json`.
