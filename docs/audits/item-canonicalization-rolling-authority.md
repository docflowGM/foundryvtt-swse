# SWSE Item Canonicalization — Rolling Authority

Status: ACTIVE — Phase 0 complete; Phase 0-1 Weapons certified by owner
Updated: 2026-10-05
Machine-readable companion: `data/audits/item-canonicalization-rolling-authority.json`
Verify against the pack: `node tools/verify-item-weapons-authority.mjs`

This is the single cumulative authority for item rehabilitation. Per-book/phase files are temporary evidence and must not become competing authorities. Architecture evidence: `docs/audits/item-phase-0-ssot-census.md` (owner rulings in §7a).

Source policy: the user-provided SWSE TXT/PDF sourcebooks are the canonical SSOT; the repository is an implementation target only. Aggregate v2 packs are the edit target; subpacks are derived mirrors.

## Phase 0-1 — Character-scale weapons: census and repo reconciliation

Scope: character-scale weapons only. Excluded: ammunition, weapon upgrades, lightsaber crystals/accessories, armor, equipment, droid accessories, vehicle/starship weapons. Certifies identity and presence only — descriptions, schema, stats, mechanics, tags, and pages are later phases.

| Result | Count |
|---|---:|
| Canonical weapon identities | 203 |
| Repo weapon records (`packs/weapons.db`, type weapon) | 186 |
| KEEP | 99 |
| EDIT | 52 |
| ADD | 52 |
| REMOVE (repo) | 35 |
| REVIEW | 0 |

Dispositions: **KEEP** identity present as published. **EDIT** present under an alias/reordered/shortened name; normalize name, keep `_id`. **ADD** published weapon absent from repo (blocked until fields are certified). **REMOVE** not a supported independent character-weapon identity, a redundant duplicate, or another domain. **REVIEW** unresolved (none).

### Source claims by book

| Book | Claims |
|---|---:|
| Clone Wars Campaign Guide | 16 |
| Core Rulebook | 48 |
| Force Unleashed Campaign Guide | 18 |
| Galaxy at War | 21 |
| Galaxy of Intrigue | 4 |
| Jedi Academy Training Manual | 16 |
| Knights of the Old Republic Campaign Guide | 33 |
| Legacy Era Campaign Guide | 14 |
| Rebellion Era Campaign Guide | 12 |
| Scum and Villainy | 9 |
| Threats of the Galaxy | 4 |
| Unknown Regions | 14 |

### Canonical weapon census

| # | Canonical weapon | Sourcebook(s) | Repo record | Disposition |
|---:|---|---|---|---|
| 1 | Vibrodagger | Core Rulebook | weapon-vibrodagger - Vibrodagger | KEEP |
| 2 | Vibroblade | Core Rulebook | weapon-vibroblade - Vibroblade | KEEP |
| 3 | Vibrobayonet | Core Rulebook | - | ADD |
| 4 | Force Pike | Core Rulebook | - | ADD |
| 5 | Electrostaff | Core Rulebook | weapon-electrostaff - Electrostaff | KEEP |
| 6 | Vibro-Ax | Core Rulebook | - | ADD |
| 7 | Atlatl | Core Rulebook | - | ADD |
| 8 | Amphistaff | Core Rulebook | - | ADD |
| 9 | Cesta | Core Rulebook | - | ADD |
| 10 | Lightsaber, Short | Core Rulebook | lightsaber-chassis-short - Short Lightsaber | EDIT |
| 11 | Lightsaber | Core Rulebook | weapon-lightsaber - Lightsaber | KEEP |
| 12 | Lightsaber, Double | Core Rulebook | weapon-double-bladed-lightsaber - Double-Bladed Lightsaber | EDIT |
| 13 | Knife | Core Rulebook | - | ADD |
| 14 | Club/Baton | Core Rulebook | - | ADD |
| 15 | Stun Baton | Core Rulebook | weapon-stun-baton - Stun Baton | KEEP |
| 16 | Mace | Core Rulebook | - | ADD |
| 17 | Spear | Core Rulebook | - | ADD |
| 18 | Bayonet | Core Rulebook | - | ADD |
| 19 | Quarterstaff | Core Rulebook | - | ADD |
| 20 | Combat Gloves | Core Rulebook | - | ADD |
| 21 | Flamethrower | Core Rulebook | weapon-flamethrower - Flamethrower | KEEP |
| 22 | Bowcaster | Core Rulebook | weapon-bowcaster - Bowcaster | KEEP |
| 23 | Grenade Launcher | Core Rulebook | weapon-grenade-launcher - Grenade Launcher | KEEP |
| 24 | Heavy Repeating Blaster | Core Rulebook | weapon-heavy-repeating-blaster - Heavy Repeating Blaster | KEEP |
| 25 | Blaster Cannon | Core Rulebook | weapon-blaster-cannon - Blaster Cannon | KEEP |
| 26 | Missile Launcher | Core Rulebook | weapon-missile-launcher - Missile Launcher | KEEP |
| 27 | E-Web Repeating Blaster | Core Rulebook | weapon-e-web-repeating-blaster - E-Web Repeating Blaster | KEEP |
| 28 | Blaster Pistol, Hold-Out | Core Rulebook | weapon-hold-out-blaster-pistol - Hold-Out Blaster Pistol | EDIT |
| 29 | Blaster Pistol | Core Rulebook | weapon-blaster-pistol - Blaster Pistol | KEEP |
| 30 | Blaster Pistol, Sporting | Core Rulebook | weapon-sporting-blaster-pistol - Sporting Blaster Pistol | EDIT |
| 31 | Ion Pistol | Core Rulebook | weapon-ion-pistol - Ion Pistol | KEEP |
| 32 | Slugthrower Pistol | Core Rulebook | weapon-slugthrower-pistol - Slugthrower Pistol | KEEP |
| 33 | Blaster Pistol, Heavy | Core Rulebook | weapon-heavy-blaster-pistol - Heavy Blaster Pistol | EDIT |
| 34 | Blaster Carbine | Core Rulebook | weapon-blaster-carbine - Blaster Carbine | KEEP |
| 35 | Blaster Rifle | Core Rulebook | weapon-blaster-rifle - Blaster Rifle | KEEP |
| 36 | Blaster Rifle, Sporting | Core Rulebook | weapon-sporting-blaster-rifle - Sporting Blaster Rifle | EDIT |
| 37 | Ion Rifle | Core Rulebook | weapon-ion-rifle - Ion Rifle | KEEP |
| 38 | Slugthrower Rifle | Core Rulebook | weapon-slugthrower-rifle - Slugthrower Rifle | KEEP |
| 39 | Blaster Rifle, Light Repeating | Core Rulebook | weapon-light-repeating-blaster - Light Repeating Blaster | EDIT |
| 40 | Blaster Rifle, Heavy | Core Rulebook | weapon-heavy-blaster-rifle - Heavy Blaster Rifle | EDIT |
| 41 | Energy Ball | Core Rulebook | weapon-energy-ball - Energy Ball | KEEP |
| 42 | Grenade, Frag | Core Rulebook | weapon-frag-grenade - Frag Grenade | EDIT |
| 43 | Grenade, Ion | Core Rulebook | weapon-ion-grenade - Ion Grenade | EDIT |
| 44 | Grenade, Stun | Core Rulebook | weapon-stun-grenade - Stun Grenade | EDIT |
| 45 | Thermal Detonator | Core Rulebook | weapon-thermal-detonator - Thermal Detonator | KEEP |
| 46 | Sling | Core Rulebook | weapon-sling - Sling | KEEP |
| 47 | Bow | Core Rulebook | weapon-bow - Bow | KEEP |
| 48 | Net | Core Rulebook | weapon-net - Net | KEEP |
| 49 | Vibroknucklers | Clone Wars Campaign Guide | - | ADD |
| 50 | Vibrorapier | Clone Wars Campaign Guide | - | ADD |
| 51 | Garrote | Clone Wars Campaign Guide | - | ADD |
| 52 | Snap Baton | Clone Wars Campaign Guide | weapon-snap-baton - Snap Baton | KEEP |
| 53 | Stunning Gauntlet | Clone Wars Campaign Guide, Knights of the Old Republic Campaign Guide | - | ADD |
| 54 | Wrist Rocket Launcher | Clone Wars Campaign Guide | weapon-wrist-rocket-launcher - Wrist Rocket Launcher | KEEP |
| 55 | Czerka Adjudicator | Clone Wars Campaign Guide | weapon-adjudicator-slugthrower - Adjudicator Slugthrower | EDIT |
| 56 | Gee-Tech 12 Defender Microblaster | Clone Wars Campaign Guide | weapon-defender-microblaster - Defender MicroBlaster | EDIT |
| 57 | BlasTech DH-23 Outback Blaster Pistol | Clone Wars Campaign Guide | weapon-dh-23-blaster-pistol - DH-23 Blaster Pistol | EDIT |
| 58 | BlasTech DT-12 Heavy Blaster Pistol | Clone Wars Campaign Guide | weapon-dt-12-heavy-blaster - DT-12 Heavy Blaster | EDIT |
| 59 | Merr-Sonn Model 434 DeathHammer | Clone Wars Campaign Guide | weapon-model-434-deathhammer - Model 434 DeathHammer | EDIT |
| 60 | BlasTech 500 Riot Gun | Clone Wars Campaign Guide, Rebellion Era Campaign Guide | weapon-espo-500-riot-gun - ESPO 500 Riot Gun | EDIT |
| 61 | Czerka Adventurer | Clone Wars Campaign Guide | weapon-adventurer-slugthrower - Adventurer Slugthrower | EDIT |
| 62 | SoroSuub Firelance Blaster Rifle | Clone Wars Campaign Guide | weapon-firelance-blaster-rifle - Firelance Blaster Rifle | EDIT |
| 63 | BlasTech DLT-20A "Longbarrel" Blaster Rifle | Clone Wars Campaign Guide | weapon-dlt-20a-longblaster - DLT-20A Longblaster | EDIT |
| 64 | EMP Grenade | Clone Wars Campaign Guide | weapon-emp-grenade - EMP Grenade | KEEP |
| 65 | Power Hammer | Force Unleashed Campaign Guide | - | ADD |
| 66 | Vibroblade, Double | Force Unleashed Campaign Guide | - | ADD |
| 67 | Vibrosword | Force Unleashed Campaign Guide | weapon-vibrosword - Vibrosword | KEEP |
| 68 | Felucian Skullblade | Force Unleashed Campaign Guide | - | ADD |
| 69 | Ryyk Blade | Force Unleashed Campaign Guide | weapon-wookiee-ryyk-blade - Wookiee Ryyk Blade | EDIT |
| 70 | Guard Shoto | Force Unleashed Campaign Guide, Jedi Academy Training Manual | lightsaber-chassis-guard-shoto - Guard Shoto | KEEP |
| 71 | Neuronic Whip | Force Unleashed Campaign Guide | - | ADD |
| 72 | Lightsaber Pike | Force Unleashed Campaign Guide, Jedi Academy Training Manual | lightsaber-chassis-pike - Lightsaber Pike | KEEP |
| 73 | Bryar Pistol | Force Unleashed Campaign Guide | weapon-bryar-pistol - Bryar Pistol | KEEP |
| 74 | DX-2 Disruptor Pistol | Force Unleashed Campaign Guide | weapon-disruptor-pistol - Disruptor Pistol | EDIT |
| 75 | Bryar Rifle | Force Unleashed Campaign Guide | weapon-bryar-rifle - Bryar Rifle | KEEP |
| 76 | DXR-6 Disruptor Rifle | Force Unleashed Campaign Guide | weapon-disruptor-rifle - Disruptor Rifle | EDIT |
| 77 | Incinerator Rifle | Force Unleashed Campaign Guide | weapon-incinerator-rifle - Incinerator Rifle | KEEP |
| 78 | Stokhli Spray Stick | Force Unleashed Campaign Guide | weapon-stokhli-spray-stick - Stokhli Spray Stick | KEEP |
| 79 | CR-1 Blast Cannon | Force Unleashed Campaign Guide | weapon-cr-1-blast-cannon - CR-1 Blast Cannon | KEEP |
| 80 | E-Web Missile Launcher | Force Unleashed Campaign Guide | weapon-e-web-missile-launcher - E-Web Missile Launcher | KEEP |
| 81 | Flechette Launcher | Force Unleashed Campaign Guide, Rebellion Era Campaign Guide | weapon-flechette-launcher - Flechette Launcher | KEEP |
| 82 | Rail Detonator Gun | Force Unleashed Campaign Guide | weapon-rail-detonator-gun - Rail Detonator Gun | KEEP |
| 83 | Shock Stick | Galaxy at War | - | ADD |
| 84 | Static Pike | Galaxy at War | - | ADD |
| 85 | Vibrolance | Galaxy at War | - | ADD |
| 86 | Darkstick | Galaxy at War | - | ADD |
| 87 | Entrenching Tool | Galaxy at War | - | ADD |
| 88 | Fire Blade | Galaxy at War | - | ADD |
| 89 | Shockboxing Gloves | Galaxy at War | - | ADD |
| 90 | Flame Cannon | Galaxy at War | weapon-flame-cannon - Flame Cannon | KEEP |
| 91 | Mortar Launcher | Galaxy at War | weapon-mortar-launcher - Mortar Launcher | KEEP |
| 92 | Rotary Blaster Cannon | Galaxy at War | weapon-rotary-blaster-cannon - Rotary Blaster Cannon | KEEP |
| 93 | Tactical Tractor Beam | Galaxy at War | weapon-tactical-tractor-beam - Tactical Tractor Beam | KEEP |
| 94 | Blaster Pistol, Sidearm | Galaxy at War | weapon-sidearm-blaster-pistol - Sidearm Blaster Pistol | EDIT |
| 95 | Ascension Gun | Galaxy at War | weapon-ascension-gun - Ascension Gun | KEEP |
| 96 | Blaster Rifle, Variable | Galaxy at War | weapon-variable-blaster - Variable Blaster | EDIT |
| 97 | Scatter Gun | Galaxy at War | weapon-scattergun - Scattergun | EDIT |
| 98 | Interchangeable Weapon System | Galaxy at War | weapon-interchangeable-weapon-system - Interchangeable Weapon System | KEEP |
| 99 | Blaster Rifle, Heavy Variable | Galaxy at War | weapon-heavy-variable-blaster - Heavy Variable Blaster | EDIT |
| 100 | Crossbow, Repeating | Galaxy at War | weapon-repeating-crossbow - Repeating Crossbow | EDIT |
| 101 | Grenade, Radiation | Galaxy at War | weapon-radiation-grenade - Radiation Grenade | EDIT |
| 102 | Grenade, Smoke | Galaxy at War | weapon-smoke-grenade - Smoke Grenade | EDIT |
| 103 | Targeting Laser | Galaxy at War | weapon-targeting-laser - Targeting Laser | KEEP |
| 104 | Blaster, Wrist | Galaxy of Intrigue | weapon-wrist-blaster - Wrist Blaster | EDIT |
| 105 | Darter | Galaxy of Intrigue | weapon-darter - Darter | KEEP |
| 106 | Snare Pistol | Galaxy of Intrigue | weapon-snare-pistol - Snare Pistol | KEEP |
| 107 | Xerrol Nightstinger | Galaxy of Intrigue | weapon-xerrol-nightstinger - Xerrol Nightstinger | KEEP |
| 108 | San-Ni Staff | Jedi Academy Training Manual | - | ADD |
| 109 | Lightfoil, Archaic | Jedi Academy Training Manual | lightsaber-chassis-archaic-lightfoil - Archaic Lightfoil | EDIT |
| 110 | Lightfoil, Modern | Jedi Academy Training Manual | lightsaber-chassis-modern-lightfoil - Modern Lightfoil | EDIT |
| 111 | Lightsaber, Archaic | Jedi Academy Training Manual | lightsaber-chassis-archaic-lightsaber - Archaic Lightsaber | EDIT |
| 112 | Crossguard Lightsaber | Jedi Academy Training Manual | lightsaber-chassis-crossguard - Crossguard Lightsaber | KEEP |
| 113 | Lightsaber, Dual-Phase | Jedi Academy Training Manual | lightsaber-chassis-dual-phase - Dual-Phase Lightsaber | EDIT |
| 114 | Dueling Lightsaber | Jedi Academy Training Manual | lightsaber-chassis-dueling - Dueling Lightsaber | KEEP |
| 115 | Lightwhip | Jedi Academy Training Manual | lightsaber-chassis-lightwhip - Lightwhip | KEEP |
| 116 | Lightsaber, Great | Jedi Academy Training Manual | lightsaber-chassis-great - Great Lightsaber | EDIT |
| 117 | Long-Handle Lightsaber | Jedi Academy Training Manual, Legacy Era Campaign Guide | lightsaber-chassis-longhandle - Long-Handle Lightsaber | KEEP |
| 118 | Wan-Shen | Jedi Academy Training Manual | - | ADD |
| 119 | Retrosaber | Jedi Academy Training Manual | lightsaber-chassis-retrosaber - Retrosaber | KEEP |
| 120 | Discblade | Jedi Academy Training Manual | weapon-discblade - Discblade | KEEP |
| 121 | R-9 Flash Canister | Jedi Academy Training Manual | weapon-flash-canister - Flash Canister | EDIT |
| 122 | Dire Vibroblade | Knights of the Old Republic Campaign Guide | - | ADD |
| 123 | Double Vibroblade | Knights of the Old Republic Campaign Guide | - | ADD |
| 124 | Shockstaff | Knights of the Old Republic Campaign Guide | - | ADD |
| 125 | Shyarn | Knights of the Old Republic Campaign Guide | - | ADD |
| 126 | Fira | Knights of the Old Republic Campaign Guide | - | ADD |
| 127 | Arggarok | Knights of the Old Republic Campaign Guide | - | ADD |
| 128 | Zhaboka | Knights of the Old Republic Campaign Guide | - | ADD |
| 129 | Lightfoil | Knights of the Old Republic Campaign Guide | weapon-lightfoil - Lightfoil | KEEP |
| 130 | Short Sword | Knights of the Old Republic Campaign Guide | - | ADD |
| 131 | War Sword | Knights of the Old Republic Campaign Guide | - | ADD |
| 132 | Dire Sword | Knights of the Old Republic Campaign Guide | - | ADD |
| 133 | Double-Bladed Sword | Knights of the Old Republic Campaign Guide | - | ADD |
| 134 | Aurial Blaster | Knights of the Old Republic Campaign Guide | weapon-aurial-blaster - Aurial Blaster | KEEP |
| 135 | Sith Lanvarok | Knights of the Old Republic Campaign Guide | weapon-sith-lanvarok - Sith Lanvarok | KEEP |
| 136 | Massassi Lanvarok | Knights of the Old Republic Campaign Guide | weapon-massassi-lanvarok - Massassi Lanvarok | KEEP |
| 137 | Carbonite Rifle | Knights of the Old Republic Campaign Guide | weapon-carbonite-rifle - Carbonite Rifle | KEEP |
| 138 | Needler | Knights of the Old Republic Campaign Guide | weapon-needler - Needler | KEEP |
| 139 | Pulse-Wave Pistol | Knights of the Old Republic Campaign Guide | weapon-pulse-wave-pistol - Pulse-Wave Pistol | KEEP |
| 140 | Ripper | Knights of the Old Republic Campaign Guide | weapon-ripper - Ripper | KEEP |
| 141 | Sonic Disruptor | Knights of the Old Republic Campaign Guide | weapon-sonic-disruptor - Sonic Disruptor | KEEP |
| 142 | Sonic Pistol | Knights of the Old Republic Campaign Guide | weapon-sonic-pistol - Sonic Pistol | KEEP |
| 143 | Heavy Sonic Pistol | Knights of the Old Republic Campaign Guide | weapon-heavy-sonic-pistol - Heavy Sonic Pistol | KEEP |
| 144 | Ion Carbine | Knights of the Old Republic Campaign Guide | weapon-ion-carbine - Ion Carbine | KEEP |
| 145 | Pulse-Wave Rifle | Knights of the Old Republic Campaign Guide | weapon-pulse-wave-rifle - Pulse-Wave Rifle | KEEP |
| 146 | Sonic Rifle | Knights of the Old Republic Campaign Guide | weapon-sonic-rifle - Sonic Rifle | KEEP |
| 147 | Blaster Rifle, Assault | Knights of the Old Republic Campaign Guide | weapon-assault-blaster-rifle - Assault Blaster Rifle | EDIT |
| 148 | Blaster Carbine, Repeating | Knights of the Old Republic Campaign Guide | weapon-repeating-blaster-carbine - Repeating Blaster Carbine | EDIT |
| 149 | Adhesive Grenade | Knights of the Old Republic Campaign Guide | weapon-adhesive-grenade - Adhesive Grenade | KEEP |
| 150 | CryoBan Grenade | Knights of the Old Republic Campaign Guide | weapon-cryoban-grenade - CryoBan Grenade | KEEP |
| 151 | Commando Special Rifle | Knights of the Old Republic Campaign Guide | weapon-commando-special-rifle - Commando Special Rifle | KEEP |
| 152 | Remote Grenade | Knights of the Old Republic Campaign Guide | weapon-remote-grenade - Remote Grenade | KEEP |
| 153 | Mythosaur Axe | Knights of the Old Republic Campaign Guide | - | ADD |
| 154 | Shock Whip | Legacy Era Campaign Guide | - | ADD |
| 155 | Tehkla Blade | Legacy Era Campaign Guide | - | ADD |
| 156 | Concealed Dart Launcher | Legacy Era Campaign Guide | weapon-concealed-dart-launcher - Concealed Dart Launcher | KEEP |
| 157 | Blaster Pistol, Snap Shot | Legacy Era Campaign Guide | weapon-snap-shot-blaster-pistol - Snap-Shot Blaster Pistol | EDIT |
| 158 | Blaster Pistol, Bluebolt | Legacy Era Campaign Guide | weapon-bluebolt-blaster-pistol - Bluebolt Blaster Pistol | EDIT |
| 159 | Blaster Carbine, Double-Barreled | Legacy Era Campaign Guide | weapon-double-barreled-blaster-carbine - Double-Barreled Blaster Carbine | EDIT |
| 160 | Blaster Carbine, Hunting | Legacy Era Campaign Guide | weapon-hunting-blaster-carbine - Hunting Blaster Carbine | EDIT |
| 161 | Blaster Carbine, Sporting | Legacy Era Campaign Guide | weapon-sporting-blaster-carbine - Sporting Blaster Carbine | EDIT |
| 162 | Blaster Rifle, Heavy Assault | Legacy Era Campaign Guide | weapon-heavy-assault-blaster - Heavy Assault Blaster | EDIT |
| 163 | Razor Bug | Legacy Era Campaign Guide | weapon-razor-bug - Razor Bug | KEEP |
| 164 | Thud Bug | Legacy Era Campaign Guide | weapon-thud-bug - Thud Bug | KEEP |
| 165 | Heavy Blaster Cannon | Legacy Era Campaign Guide | weapon-heavy-blaster-cannon - Heavy Blaster Cannon | KEEP |
| 166 | ARC-9965 Blaster Rifle | Legacy Era Campaign Guide | weapon-arc-9965-blaster - ARC-9965 Blaster | EDIT |
| 167 | Energy Lance | Rebellion Era Campaign Guide | - | ADD |
| 168 | Power Lance | Rebellion Era Campaign Guide | - | ADD |
| 169 | Axe | Rebellion Era Campaign Guide | - | ADD |
| 170 | Gaderffii | Rebellion Era Campaign Guide | weapon-tusken-gaderffii-stick - Tusken Gaderffii Stick | EDIT |
| 171 | Siang Lance | Rebellion Era Campaign Guide | weapon-siang-lance - Siang Lance | KEEP |
| 172 | Merr-Sonn PLX-2M Portable Missile Launcher | Rebellion Era Campaign Guide | weapon-plx-2m-portable-missile-launcher - PLX-2M Portable Missile Launcher | EDIT |
| 173 | Miniature Proton Torpedo Launcher | Rebellion Era Campaign Guide | weapon-miniature-proton-torpedo-launcher - Miniature Proton Torpedo Launcher | KEEP |
| 174 | SG-4 Blaster Rifle | Rebellion Era Campaign Guide | weapon-sg-4-blaster-rifle - SG-4 Blaster Rifle | KEEP |
| 175 | Concussion Grenade | Rebellion Era Campaign Guide | weapon-concussion-grenade - Concussion Grenade | KEEP |
| 176 | Gas Grenade | Rebellion Era Campaign Guide | weapon-gas-grenade - Gas Grenade | KEEP |
| 177 | Neural Inhibitor | Scum and Villainy | weapon-neural-inhibitor - Neural Inhibitor | KEEP |
| 178 | Pulse Rifle | Scum and Villainy | weapon-pulse-rifle - Pulse Rifle | KEEP |
| 179 | Deck Sweeper | Scum and Villainy | weapon-deck-sweeper - Deck Sweeper | KEEP |
| 180 | Electronet | Scum and Villainy | weapon-electronet - Electronet | KEEP |
| 181 | Subrepeating Blaster | Scum and Villainy | weapon-subrepeating-blaster - Subrepeating Blaster | KEEP |
| 182 | Squib Battering Ram | Scum and Villainy | weapon-battering-ram - Battering Ram | EDIT |
| 183 | Micro Grenade Launcher | Scum and Villainy | weapon-micro-grenade-launcher - Micro Grenade Launcher | KEEP |
| 184 | Snare Rifle | Scum and Villainy | weapon-snare-rifle - Snare Rifle | KEEP |
| 185 | Blaster Rifle, Sniper | Scum and Villainy | weapon-sniper-blaster-rifle - Sniper Blaster Rifle | EDIT |
| 186 | Datadagger | Threats of the Galaxy | - | ADD |
| 187 | Blastsword | Unknown Regions | - | ADD |
| 188 | Contact Stunner | Unknown Regions | - | ADD |
| 189 | Electropole | Unknown Regions | weapon-gungan-electropole - Gungan Electropole | EDIT |
| 190 | Survival Knife | Unknown Regions | - | ADD |
| 191 | Vibro-Saw | Unknown Regions | - | ADD |
| 192 | Black-Powder Pistol | Unknown Regions | weapon-black-powder-pistol - Black-Powder Pistol | KEEP |
| 193 | Concussion Rifle | Unknown Regions | weapon-concussion-rifle - Concussion Rifle | KEEP |
| 194 | Crossbow | Unknown Regions | weapon-crossbow - Crossbow | KEEP |
| 195 | Heavy Slugthrower Pistol | Unknown Regions | weapon-heavy-slugthrower-pistol - Heavy Slugthrower Pistol | KEEP |
| 196 | Magna Caster | Unknown Regions | weapon-magna-caster - Magna Caster | KEEP |
| 197 | Squib Tensor Rifle | Unknown Regions | weapon-squib-tensor-rifle - Squib Tensor Rifle | KEEP |
| 198 | Stun Pistol | Unknown Regions | weapon-stun-pistol - Stun Pistol | KEEP |
| 199 | Targeting Blaster Rifle | Unknown Regions | weapon-targeting-blaster-rifle - Targeting Blaster Rifle | KEEP |
| 200 | Verpine Shatter Gun | Unknown Regions | weapon-verpine-shattergun - Verpine Shattergun | EDIT |
| 201 | Light Concussion Missile Launcher | Threats of the Galaxy | weapon-light-concussion-missile-launcher - Light Concussion Missile Launcher | KEEP |
| 202 | Sonic Stunner | Threats of the Galaxy | weapon-sonic-stunner - Sonic Stunner | KEEP |
| 203 | Sith Sword | Threats of the Galaxy | weapon-sith-sword - Sith Sword | KEEP |

### Repo records marked REMOVE

| Repo ID | Repo name | Action | Reason | Referenced outside weapon packs |
|---|---|---|---|---|
| lightsaber-chassis-double | Lightsaber (Double-Bladed) | CONSOLIDATE_DUPLICATE_AFTER_RUNTIME_MIGRATION | Redundant repo duplicate/alias of canonical Lightsaber, Double; survivor candidate is weapon-double-bladed-lightsaber. | data/lightsaber-components.json ×1; data/lightsaber-items-import.ndjson ×1; data/store/weapon-store-descriptions.json ×1 |
| lightsaber-chassis-standard | Lightsaber (Standard) | CONSOLIDATE_DUPLICATE_AFTER_RUNTIME_MIGRATION | Redundant repo duplicate/alias of canonical Lightsaber; survivor candidate is weapon-lightsaber. | data/lightsaber-components.json ×1; data/lightsaber-items-import.ndjson ×1; data/store/weapon-store-descriptions.json ×1; scripts/apps/customization/item-customization-workbench.js ×1; scripts/apps/progression-framework/shell/progression-finalizer.js ×1 |
| weapon-blast-cannon | Blast Cannon | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published character-weapon identity found; source corpus has CR-1 Blast Cannon and Blaster Cannon as distinct canonical items. | data/store/weapon-store-descriptions.json ×1; packs/nonheroic.db ×1; packs/npc.db ×1 |
| weapon-charric | Charric | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published weapon identity found in the supplied TXT/PDF source corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-clone-dc15a-blaster-rifle | Clone DC-15A Blaster Rifle | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | Source corpus presents the DC-15A as an example of the canonical Blaster Rifle, Heavy Variable; redundant model-specific repo record. | data/store/weapon-store-descriptions.json ×1 |
| weapon-clone-dc15s-blaster-carbine | Clone DC-15S Blaster Carbine | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No canonical DC-15S carbine entry; source corpus uses DC-15s/DC-15S as examples under other generic weapon identities. | data/store/weapon-store-descriptions.json ×1 |
| weapon-concussion-missile-launcher | Concussion Missile Launcher | REMOVE_FROM_CHARACTER_WEAPON_CORPUS_ONLY | No independent character-scale weapon entry in the supplied corpus; occurrences are vehicle/starship/NPC-system contexts. | data/store/weapon-store-descriptions.json ×1 |
| weapon-cortosis-sword | Cortosis Sword | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity with this name in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-electro-net | Electro-net | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published identity; canonical Electronet exists separately in Scum and Villainy. | data/store/weapon-store-descriptions.json ×1 |
| weapon-electro-whip | Electro-whip | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published weapon identity with this name; corpus has Shock Whip and Neuronic Whip as distinct weapons. | data/store/weapon-store-descriptions.json ×1 |
| weapon-heavy-laser-cannon | Heavy Laser Cannon | REMOVE_FROM_CHARACTER_WEAPON_CORPUS_ONLY | Vehicle/starship weapon terminology in the supplied corpus, not an independent character-scale weapon entry. | data/store/weapon-store-descriptions.json ×1 |
| weapon-hh-15-projectile-launcher | HH-15 Projectile Launcher | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1; packs/nonheroic.db ×1; packs/npc.db ×1 |
| weapon-hold-out-blaster | Hold-out Blaster | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | Redundant noncanonical alias; canonical source identity is Blaster Pistol, Hold-Out and a closer repo record also exists. | data/character-templates.json ×4; data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json ×8; data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json ×8; data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json ×4; data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json ×6; data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json ×12; data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json ×24; data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json ×44; data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json ×2; data/store/weapon-store-descriptions.json ×2; docs/audits/generated/nonheroic-damage-profile-candidates.json ×10; docs/audits/generated/nonheroic-lane-b-remainder.json ×2; packs/heroic.db ×24; packs/nonheroic.db ×30; packs/npc.db ×54 |
| weapon-ion-blaster | Ion Blaster | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found; corpus has Ion Pistol, Ion Rifle, and Ion Carbine. | data/store/weapon-store-descriptions.json ×1 |
| weapon-jedi-training-saber | Jedi Training Saber | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-laser-cannon | Laser Cannon | REMOVE_FROM_CHARACTER_WEAPON_CORPUS_ONLY | Vehicle/starship weapon terminology in the supplied corpus, not an independent character-scale weapon entry. | data/store/weapon-store-descriptions.json ×1 |
| weapon-mandalorian-ripper | Mandalorian Ripper | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published identity; canonical KOTOR weapon is Ripper and is already represented. | data/store/weapon-store-descriptions.json ×1 |
| weapon-miniature-missile-launcher | Miniature Missile Launcher | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-monomolecular-knife | Monomolecular Knife | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found; corpus has Knife and Survival Knife as separate canonical items. | data/store/weapon-store-descriptions.json ×1 |
| weapon-proton-torpedo-launcher | Proton Torpedo Launcher | REMOVE_FROM_CHARACTER_WEAPON_CORPUS_ONLY | Vehicle/starship/vehicle-model weapon context, not an independent character-scale weapon entry. | data/store/weapon-store-descriptions.json ×1 |
| weapon-repeating-blaster | Repeating Blaster | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published character-weapon identity found; corpus has Heavy Repeating Blaster and Blaster Rifle, Light Repeating. | data/store/weapon-store-descriptions.json ×2 |
| weapon-s-5-heavy-blaster-pistol | S-5 Heavy Blaster Pistol | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1; docs/audits/generated/nonheroic-damage-profile-candidates.json ×1; docs/audits/generated/nonheroic-lane-b-remainder.json ×1; packs/heroic.db ×2; packs/npc.db ×2 |
| weapon-saberdart-launcher | Saberdart Launcher | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | Appears as NPC possession, but no independent published equipment/weapon entry was found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1; packs/heroic.db ×1; packs/npc.db ×1 |
| weapon-sith-tremor-sword | Sith Tremor Sword | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found; corpus has Sith Sword and other Sith weapons. | data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json ×2; data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json ×2; data/store/weapon-store-descriptions.json ×1; docs/audits/generated/nonheroic-damage-profile-candidates.json ×6; docs/audits/generated/nonheroic-lane-b-remainder.json ×2; packs/nonheroic.db ×3; packs/npc.db ×3 |
| weapon-sniper-rifle | Sniper Rifle | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published character-weapon identity found; corpus has Blaster Rifle, Sniper. | data/store/weapon-store-descriptions.json ×1 |
| weapon-stealth-blaster-carbine | Stealth Blaster Carbine | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json ×2; data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json ×2; data/store/weapon-store-descriptions.json ×1; docs/audits/generated/nonheroic-damage-profile-candidates.json ×2; docs/audits/generated/nonheroic-lane-b-remainder.json ×1; packs/nonheroic.db ×1; packs/npc.db ×1 |
| weapon-stealth-carbine | Stealth Carbine | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-trandoshan-repeater-rifle | Trandoshan Repeater Rifle | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-tusken-cycler-rifle | Tusken Cycler Rifle | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-verpine-shatter-pistol | Verpine Shatter Pistol | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published identity; supplied corpus has one Verpine Shatter Gun weapon entry. | data/store/weapon-store-descriptions.json ×1 |
| weapon-verpine-shatter-rifle | Verpine Shatter Rifle | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published identity; supplied corpus has one Verpine Shatter Gun weapon entry. | data/store/weapon-store-descriptions.json ×1 |
| weapon-verpine-sniper-rifle | Verpine Sniper Rifle | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published identity; supplied corpus has one Verpine Shatter Gun weapon entry. | data/store/weapon-store-descriptions.json ×1 |
| weapon-wrist-laser | Wrist Laser | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No independent published weapon identity; Galaxy of Intrigue has Blaster, Wrist. | data/store/weapon-store-descriptions.json ×1 |
| weapon-zabrak-combat-staff | Zabrak Combat Staff | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |
| weapon-zeltron-neural-whip | Zeltron Neural Whip | REMOVE_UNSUPPORTED_CHARACTER_WEAPON_RECORD | No published character-weapon identity found in the supplied corpus. | data/store/weapon-store-descriptions.json ×1 |

### Repo records marked REVIEW

None.

### Execution guardrails

1. Claude must not infer new canonical identities from repo prose.
2. ADD means create a canonical weapon identity in the authoritative weapon layer during the execution phase.
3. EDIT means preserve the matched repo record identity (_id) unless a later schema/stat phase explicitly directs otherwise, but normalize its canonical identity/name as directed.
4. REMOVE is scoped to the character-weapon corpus. Respect per-record executionAction/executionBlockedBy; do not physically delete runtime-dependent lightsaber chassis or vehicle/starship-domain records without the later owning batch.
5. KEEP means no identity/presence change is required in Phase 0-1.
6. Do not modify descriptions, stats, tags, or schema from this Phase 0-1 authority alone.
7. ADD records are blocked from production creation until later content/stat/schema phases certify the fields needed for a complete item.
8. Before any REMOVE is executed, reroute or migrate every entry in referencedOutsideWeaponPacks (actor packs, templates, nonheroic profiles, store descriptions).

### Reference-impact note (measured by Claude at readback, 2026-10-05)

- All 52 EDIT records keep their `_id`, so ID-based references stay valid. Name-based references (if any) are not covered here and must be checked at execution.
- Many REMOVE records are referenced by actor packs (`heroic`, `nonheroic`, `npc`), `data/character-templates.json`, nonheroic damage profiles, and `data/store/weapon-store-descriptions.json`; the per-record list is in the table above and the JSON (`referencedOutsideWeaponPacks`). `tools/fix-weapons-data.js` references are historical generator data and excluded.
- `lightsaber-chassis-standard` is referenced by `item-customization-workbench.js` and `progression-finalizer.js`; both lightsaber chassis duplicates are also in `data/lightsaber-components.json` and `data/lightsaber-items-import.ndjson`.

## Pending phases

0-2 Armor · 0-3 Equipment · 1 Provenance (pages) · 2 Descriptions · 3 Schema · 4 Stats · 5 Reconciliation · 6 Legacy tags · 7 Semantic tags · 8 Migration
