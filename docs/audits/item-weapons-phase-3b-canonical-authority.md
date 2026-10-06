# Weapons Phase 3B — 203-Identity Canonical Authority

**Status:** `WEAPON_PHASE_3B_203_IDENTITY_CANONICAL_AUTHORITY_CERTIFIED` (authority-only; production mutation not authorized)

Generated deterministically by `tools/build-item-weapons-phase-3b-canonical-authority.mjs` from the certified Phase 1 content, Phase 2A–2L mechanics (schema weapon-authority-schema-v2.9), the v2.9 ammo overlay and the Phase 3A reconciliation. Do not edit by hand; rebuild instead. Data: `data/audits/item-weapons-phase-3b-canonical-authority.json`.

## Counts

- Certified source claims: **209** across 12 books
- Canonical production identities: **203** (197 single-claim, 6 two-claim)
- Repo-present identities: 151; repo-missing: 52
- Identities carrying explicit source ambiguities: 13

## Cross-published identities (6)

- **BlasTech 500 Riot Gun** — Clone Wars Campaign Guide p.61 (superseded-conflict) + Rebellion Era Campaign Guide p.50 (controlling); precedence resolved: costCredits, weightKg, qualities.inaccurate, singleShotAttackPenalty
- **Flechette Launcher** — Force Unleashed Campaign Guide p.199 (compatible) + Rebellion Era Campaign Guide p.49 (compatible)
- **Guard Shoto** — Force Unleashed Campaign Guide p.96 (superseded-conflict) + Jedi Academy Training Manual p.50 (controlling); precedence resolved: availability.restriction, defensiveInteractions.lightsaberDrCondition
- **Lightsaber Pike** — Force Unleashed Campaign Guide p.199 (compatible) + Jedi Academy Training Manual p.53 (additive)
- **Long-Handle Lightsaber** — Jedi Academy Training Manual p.53 (additive) + Legacy Era Campaign Guide p.62 (compatible)
- **Stunning Gauntlet** — Knights of the Old Republic Campaign Guide p.202 (additive) + Clone Wars Campaign Guide p.60 (compatible)

## Planner rulings applied

- `guard-shoto-phrik-dr`
- `lightsaber-pike-phrik-dr`
- `guard-shoto-availability`
- `riot-gun-precedence`
- `bowcaster-range-profile`
- `cr1-area-effect`
- `concussion-grenade-description-page`
- `xerrol-nightstinger-group`

Precedence policy: Field-local later-publication precedence for exact same-identity direct contradictions; silence never supersedes; earlier-only compatible mechanics survive; both claims stay preserved (planner ruling, Phase 3B).

## Identities

| Identity | Claims | Group | Repo id | Ammo | Ambiguities |
|---|---:|---|---|---|---|
| ARC-9965 Blaster Rifle | 1 | Rifle | weapon-arc-9965-blaster | established |  |
| Adhesive Grenade | 1 | Simple Weapon | weapon-adhesive-grenade | self-contained |  |
| Amphistaff | 1 | Exotic Weapon | (missing) | none (null) |  |
| Arggarok | 1 | Exotic Weapon | (missing) | none (null) |  |
| Ascension Gun | 1 | Pistol | weapon-ascension-gun | established |  |
| Atlatl | 1 | Exotic Weapon | (missing) | none (null) |  |
| Aurial Blaster | 1 | Exotic Weapon | weapon-aurial-blaster | established |  |
| Axe | 1 | Simple Weapon | (missing) | self-contained |  |
| Bayonet | 1 | Simple Weapon | (missing) | none (null) |  |
| Black-Powder Pistol | 1 | Pistol | weapon-black-powder-pistol | established |  |
| BlasTech 500 Riot Gun | 2 | Rifle | weapon-espo-500-riot-gun | established |  |
| BlasTech DH-23 Outback Blaster Pistol | 1 | Pistol | weapon-dh-23-blaster-pistol | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| BlasTech DLT-20A "Longbarrel" Blaster Rifle | 1 | Rifle | weapon-dlt-20a-longblaster | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| BlasTech DT-12 Heavy Blaster Pistol | 1 | Pistol | weapon-dt-12-heavy-blaster | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| Blaster Cannon | 1 | Heavy Weapon | weapon-blaster-cannon | established |  |
| Blaster Carbine | 1 | Rifle | weapon-blaster-carbine | established |  |
| Blaster Carbine, Double-Barreled | 1 | Rifle | weapon-double-barreled-blaster-carbine | established |  |
| Blaster Carbine, Hunting | 1 | Rifle | weapon-hunting-blaster-carbine | established |  |
| Blaster Carbine, Repeating | 1 | Rifle | weapon-repeating-blaster-carbine | established |  |
| Blaster Carbine, Sporting | 1 | Rifle | weapon-sporting-blaster-carbine | established |  |
| Blaster Pistol | 1 | Pistol | weapon-blaster-pistol | established |  |
| Blaster Pistol, Bluebolt | 1 | Pistol | weapon-bluebolt-blaster-pistol | established |  |
| Blaster Pistol, Heavy | 1 | Pistol | weapon-heavy-blaster-pistol | established |  |
| Blaster Pistol, Hold-Out | 1 | Pistol | weapon-hold-out-blaster-pistol | established |  |
| Blaster Pistol, Sidearm | 1 | Pistol | weapon-sidearm-blaster-pistol | established |  |
| Blaster Pistol, Snap Shot | 1 | Pistol | weapon-snap-shot-blaster-pistol | established |  |
| Blaster Pistol, Sporting | 1 | Pistol | weapon-sporting-blaster-pistol | established |  |
| Blaster Rifle | 1 | Rifle | weapon-blaster-rifle | established |  |
| Blaster Rifle, Assault | 1 | Rifle | weapon-assault-blaster-rifle | established |  |
| Blaster Rifle, Heavy | 1 | Rifle | weapon-heavy-blaster-rifle | established |  |
| Blaster Rifle, Heavy Assault | 1 | Rifle | weapon-heavy-assault-blaster | established |  |
| Blaster Rifle, Heavy Variable | 1 | Rifle | weapon-heavy-variable-blaster | established |  |
| Blaster Rifle, Light Repeating | 1 | Rifle | weapon-light-repeating-blaster | established |  |
| Blaster Rifle, Sniper | 1 | Rifle | weapon-sniper-blaster-rifle | established |  |
| Blaster Rifle, Sporting | 1 | Rifle | weapon-sporting-blaster-rifle | established |  |
| Blaster Rifle, Variable | 1 | Rifle | weapon-variable-blaster | established |  |
| Blaster, Wrist | 1 | Pistol | weapon-wrist-blaster | established |  |
| Blastsword | 1 | Exotic Weapon | (missing) | none (null) |  |
| Bow | 1 | Simple Weapon | weapon-bow | established |  |
| Bowcaster | 1 | Exotic Weapon | weapon-bowcaster | established | SOURCE_NOT_EXPLICIT |
| Bryar Pistol | 1 | Pistol | weapon-bryar-pistol | established |  |
| Bryar Rifle | 1 | Rifle | weapon-bryar-rifle | established |  |
| CR-1 Blast Cannon | 1 | Exotic Weapon | weapon-cr-1-blast-cannon | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| Carbonite Rifle | 1 | Heavy Weapon | weapon-carbonite-rifle | established |  |
| Cesta | 1 | Exotic Weapon | (missing) | none (null) |  |
| Club/Baton | 1 | Simple Weapon | (missing) | none (null) |  |
| Combat Gloves | 1 | Simple Weapon | (missing) | none (null) |  |
| Commando Special Rifle | 1 | Rifle | weapon-commando-special-rifle | established |  |
| Concealed Dart Launcher | 1 | Exotic Weapon | weapon-concealed-dart-launcher | established |  |
| Concussion Grenade | 1 | Simple Weapon | weapon-concussion-grenade | self-contained |  |
| Concussion Rifle | 1 | Rifle | weapon-concussion-rifle | established |  |
| Contact Stunner | 1 | Simple Weapon | (missing) | none (null) |  |
| Crossbow | 1 | Simple Weapon | weapon-crossbow | established |  |
| Crossbow, Repeating | 1 | Simple Weapon | weapon-repeating-crossbow | established |  |
| Crossguard Lightsaber | 1 | Lightsaber | lightsaber-chassis-crossguard | none (null) |  |
| CryoBan Grenade | 1 | Simple Weapon | weapon-cryoban-grenade | self-contained |  |
| Czerka Adjudicator | 1 | Pistol | weapon-adjudicator-slugthrower | established |  |
| Czerka Adventurer | 1 | Rifle | weapon-adventurer-slugthrower | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| DX-2 Disruptor Pistol | 1 | Pistol | weapon-disruptor-pistol | established |  |
| DXR-6 Disruptor Rifle | 1 | Rifle | weapon-disruptor-rifle | established |  |
| Darkstick | 1 | Exotic Weapon | (missing) | self-contained |  |
| Darter | 1 | Simple Weapon | weapon-darter | partially-established | AMMO_PARTIALLY_STATED_BY_SOURCE |
| Datadagger | 1 | Simple Weapon | (missing) | none (null) |  |
| Deck Sweeper | 1 | Exotic Weapon | weapon-deck-sweeper | established |  |
| Dire Sword | 1 | Simple Weapon | (missing) | none (null) |  |
| Dire Vibroblade | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Discblade | 1 | Exotic Weapon | weapon-discblade | self-contained |  |
| Double Vibroblade | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Double-Bladed Sword | 1 | Simple Weapon | (missing) | none (null) |  |
| Dueling Lightsaber | 1 | Lightsaber | lightsaber-chassis-dueling | none (null) |  |
| E-Web Missile Launcher | 1 | Heavy Weapon | weapon-e-web-missile-launcher | established |  |
| E-Web Repeating Blaster | 1 | Heavy Weapon | weapon-e-web-repeating-blaster | established |  |
| EMP Grenade | 1 | Simple Weapon | weapon-emp-grenade | self-contained |  |
| Electronet | 1 | Heavy Weapon (Ammunition) | weapon-electronet | established | SOURCE_ASSIGNS_NO_RANGE_PROFILE |
| Electropole | 1 | Advanced Melee Weapon | weapon-gungan-electropole | established |  |
| Electrostaff | 1 | Advanced Melee Weapon | weapon-electrostaff | none (null) |  |
| Energy Ball | 1 | Simple Weapon | weapon-energy-ball | established |  |
| Energy Lance | 1 | Advanced Melee Weapon | (missing) | established |  |
| Entrenching Tool | 1 | Simple Weapon | (missing) | none (null) |  |
| Felucian Skullblade | 1 | Exotic Weapon | (missing) | none (null) |  |
| Fira | 1 | Exotic Weapon | (missing) | none (null) |  |
| Fire Blade | 1 | Simple Weapon | (missing) | none (null) |  |
| Flame Cannon | 1 | Heavy Weapon | weapon-flame-cannon | established |  |
| Flamethrower | 1 | Exotic Weapon | weapon-flamethrower | established |  |
| Flechette Launcher | 2 | Rifle | weapon-flechette-launcher | established |  |
| Force Pike | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Gaderffii | 1 | Simple Weapon | weapon-tusken-gaderffii-stick | none (null) |  |
| Garrote | 1 | Exotic Weapon | (missing) | none (null) |  |
| Gas Grenade | 1 | Simple Weapon | weapon-gas-grenade | self-contained |  |
| Gee-Tech 12 Defender Microblaster | 1 | Pistol | weapon-defender-microblaster | established |  |
| Grenade Launcher | 1 | Heavy Weapon | weapon-grenade-launcher | established |  |
| Grenade, Frag | 1 | Simple Weapon | weapon-frag-grenade | self-contained |  |
| Grenade, Ion | 1 | Simple Weapon | weapon-ion-grenade | self-contained |  |
| Grenade, Radiation | 1 | Simple Weapon | weapon-radiation-grenade | self-contained |  |
| Grenade, Smoke | 1 | Simple Weapon | weapon-smoke-grenade | self-contained |  |
| Grenade, Stun | 1 | Simple Weapon | weapon-stun-grenade | self-contained |  |
| Guard Shoto | 2 | Lightsaber | lightsaber-chassis-guard-shoto | none (null) |  |
| Heavy Blaster Cannon | 1 | Heavy Weapon | weapon-heavy-blaster-cannon | established |  |
| Heavy Repeating Blaster | 1 | Heavy Weapon | weapon-heavy-repeating-blaster | established |  |
| Heavy Slugthrower Pistol | 1 | Pistol | weapon-heavy-slugthrower-pistol | established |  |
| Heavy Sonic Pistol | 1 | Pistol | weapon-heavy-sonic-pistol | established |  |
| Incinerator Rifle | 1 | Rifle | weapon-incinerator-rifle | established |  |
| Interchangeable Weapon System | 1 | Rifle (Special) | weapon-interchangeable-weapon-system | established |  |
| Ion Carbine | 1 | Rifle | weapon-ion-carbine | established |  |
| Ion Pistol | 1 | Pistol | weapon-ion-pistol | established |  |
| Ion Rifle | 1 | Rifle | weapon-ion-rifle | established |  |
| Knife | 1 | Simple Weapon | (missing) | none (null) |  |
| Light Concussion Missile Launcher | 1 | Heavy Weapon | weapon-light-concussion-missile-launcher | established |  |
| Lightfoil | 1 | Lightsaber | weapon-lightfoil | none (null) |  |
| Lightfoil, Archaic | 1 | Lightsaber | lightsaber-chassis-archaic-lightfoil | none (null) |  |
| Lightfoil, Modern | 1 | Lightsaber | lightsaber-chassis-modern-lightfoil | none (null) |  |
| Lightsaber | 1 | Lightsaber | weapon-lightsaber | none (null) |  |
| Lightsaber Pike | 2 | Lightsaber | lightsaber-chassis-pike | none (null) |  |
| Lightsaber, Archaic | 1 | Lightsaber | lightsaber-chassis-archaic-lightsaber | none (null) |  |
| Lightsaber, Double | 1 | Lightsaber | weapon-double-bladed-lightsaber | none (null) |  |
| Lightsaber, Dual-Phase | 1 | Lightsaber | lightsaber-chassis-dual-phase | none (null) |  |
| Lightsaber, Great | 1 | Lightsaber | lightsaber-chassis-great | none (null) |  |
| Lightsaber, Short | 1 | Lightsaber | lightsaber-chassis-short | none (null) |  |
| Lightwhip | 1 | Lightsaber | lightsaber-chassis-lightwhip | none (null) |  |
| Long-Handle Lightsaber | 2 | Lightsaber | lightsaber-chassis-longhandle | none (null) |  |
| Mace | 1 | Simple Weapon | (missing) | none (null) |  |
| Magna Caster | 1 | Exotic Weapon | weapon-magna-caster | established |  |
| Massassi Lanvarok | 1 | Exotic Weapon | weapon-massassi-lanvarok | established |  |
| Merr-Sonn Model 434 DeathHammer | 1 | Pistol | weapon-model-434-deathhammer | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| Merr-Sonn PLX-2M Portable Missile Launcher | 1 | Heavy Weapon | weapon-plx-2m-portable-missile-launcher | established |  |
| Micro Grenade Launcher | 1 | Rifle | weapon-micro-grenade-launcher | established |  |
| Miniature Proton Torpedo Launcher | 1 | Heavy Weapon | weapon-miniature-proton-torpedo-launcher | established |  |
| Missile Launcher | 1 | Heavy Weapon | weapon-missile-launcher | established |  |
| Mortar Launcher | 1 | Heavy Weapon | weapon-mortar-launcher | established |  |
| Mythosaur Axe | 1 | Simple Weapon | (missing) | none (null) |  |
| Needler | 1 | Pistol | weapon-needler | established |  |
| Net | 1 | Simple Weapon | weapon-net | self-contained |  |
| Neural Inhibitor | 1 | Exotic Weapon | weapon-neural-inhibitor | not-stated | AMMO_NOT_STATED_BY_SOURCE, SOURCE_ASSIGNS_NO_RANGE_PROFILE |
| Neuronic Whip | 1 | Exotic Weapon | (missing) | none (null) |  |
| Power Hammer | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Power Lance | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Pulse Rifle | 1 | Exotic Weapon | weapon-pulse-rifle | established |  |
| Pulse-Wave Pistol | 1 | Pistol | weapon-pulse-wave-pistol | established |  |
| Pulse-Wave Rifle | 1 | Rifle | weapon-pulse-wave-rifle | established |  |
| Quarterstaff | 1 | Simple Weapon | (missing) | none (null) |  |
| R-9 Flash Canister | 1 | Simple Weapon | weapon-flash-canister | self-contained |  |
| Rail Detonator Gun | 1 | Rifle | weapon-rail-detonator-gun | established |  |
| Razor Bug | 1 | Simple Weapon | weapon-razor-bug | self-contained |  |
| Remote Grenade | 1 | Simple Weapon | weapon-remote-grenade | self-contained |  |
| Retrosaber | 1 | Lightsaber | lightsaber-chassis-retrosaber | none (null) |  |
| Ripper | 1 | Pistol | weapon-ripper | established |  |
| Rotary Blaster Cannon | 1 | Heavy Weapon | weapon-rotary-blaster-cannon | established |  |
| Ryyk Blade | 1 | Exotic Weapon | weapon-wookiee-ryyk-blade | none (null) |  |
| SG-4 Blaster Rifle | 1 | Rifle | weapon-sg-4-blaster-rifle | established |  |
| San-Ni Staff | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Scatter Gun | 1 | Rifle | weapon-scattergun | established |  |
| Shock Stick | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Shock Whip | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Shockboxing Gloves | 1 | Simple Weapon | (missing) | none (null) |  |
| Shockstaff | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Short Sword | 1 | Simple Weapon | (missing) | none (null) |  |
| Shyarn | 1 | Exotic Weapon | (missing) | none (null) |  |
| Siang Lance | 1 | Exotic Weapon | weapon-siang-lance | established |  |
| Sith Lanvarok | 1 | Exotic Weapon | weapon-sith-lanvarok | established |  |
| Sith Sword | 1 | Simple Weapon | weapon-sith-sword | none (null) |  |
| Sling | 1 | Simple Weapon | weapon-sling | established |  |
| Slugthrower Pistol | 1 | Pistol | weapon-slugthrower-pistol | established |  |
| Slugthrower Rifle | 1 | Rifle | weapon-slugthrower-rifle | established |  |
| Snap Baton | 1 | Simple Weapon | weapon-snap-baton | none (null) |  |
| Snare Pistol | 1 | Pistol | weapon-snare-pistol | established |  |
| Snare Rifle | 1 | Rifle | weapon-snare-rifle | established |  |
| Sonic Disruptor | 1 | Pistol | weapon-sonic-disruptor | established |  |
| Sonic Pistol | 1 | Pistol | weapon-sonic-pistol | established |  |
| Sonic Rifle | 1 | Rifle | weapon-sonic-rifle | established |  |
| Sonic Stunner | 1 | Pistol | weapon-sonic-stunner | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| SoroSuub Firelance Blaster Rifle | 1 | Rifle | weapon-firelance-blaster-rifle | not-stated | AMMO_NOT_STATED_BY_SOURCE |
| Spear | 1 | Simple Weapon | (missing) | none (null) |  |
| Squib Battering Ram | 1 | Simple Weapon | weapon-battering-ram | established |  |
| Squib Tensor Rifle | 1 | Exotic Weapon | weapon-squib-tensor-rifle | established |  |
| Static Pike | 1 | Advanced Melee Weapon | (missing) | established |  |
| Stokhli Spray Stick | 1 | Rifle | weapon-stokhli-spray-stick | established |  |
| Stun Baton | 1 | Simple Weapon | weapon-stun-baton | none (null) |  |
| Stun Pistol | 1 | Pistol | weapon-stun-pistol | established |  |
| Stunning Gauntlet | 2 | Simple Weapon | (missing) | none (null) |  |
| Subrepeating Blaster | 1 | Pistol | weapon-subrepeating-blaster | established |  |
| Survival Knife | 1 | Simple Weapon | (missing) | self-contained |  |
| Tactical Tractor Beam | 1 | Heavy Weapon | weapon-tactical-tractor-beam | established |  |
| Targeting Blaster Rifle | 1 | Rifle | weapon-targeting-blaster-rifle | established |  |
| Targeting Laser | 1 | Simple Weapon | weapon-targeting-laser | established |  |
| Tehkla Blade | 1 | Exotic Weapon | (missing) | none (null) |  |
| Thermal Detonator | 1 | Simple Weapon | weapon-thermal-detonator | self-contained |  |
| Thud Bug | 1 | Simple Weapon | weapon-thud-bug | self-contained |  |
| Verpine Shatter Gun | 1 | Exotic Weapon | weapon-verpine-shattergun | established |  |
| Vibro-Ax | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Vibro-Saw | 1 | Exotic Weapon | (missing) | none (null) |  |
| Vibrobayonet | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Vibroblade | 1 | Advanced Melee Weapon | weapon-vibroblade | none (null) |  |
| Vibroblade, Double | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Vibrodagger | 1 | Advanced Melee Weapon | weapon-vibrodagger | none (null) |  |
| Vibroknucklers | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Vibrolance | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Vibrorapier | 1 | Advanced Melee Weapon | (missing) | none (null) |  |
| Vibrosword | 1 | Advanced Melee Weapon | weapon-vibrosword | none (null) |  |
| Wan-Shen | 1 | Simple Weapon | (missing) | none (null) |  |
| War Sword | 1 | Simple Weapon | (missing) | none (null) |  |
| Wrist Rocket Launcher | 1 | Exotic Weapon | weapon-wrist-rocket-launcher | established | SOURCE_ASSIGNS_NO_RANGE_PROFILE |
| Xerrol Nightstinger | 1 | Exotic Weapon | weapon-xerrol-nightstinger | established |  |
| Zhaboka | 1 | Exotic Weapon | (missing) | none (null) |  |
