# SWSE Item Canonicalization — Rolling Authority

Status: ACTIVE — Phase 0 complete; Phase 0-1 Weapons and Phase 0-2 Armor and Phase 0-3A General Equipment, Phase 0-3B Medical, Phase 0-3C Explosives/Demolitions and Phase 0-3D Cybernetics/Implants certified by owner (armor, equipment and medical renames executed)
Updated: 2026-10-05
Machine-readable companion: `data/audits/item-canonicalization-rolling-authority.json`
Verify against the packs: `node tools/verify-item-weapons-authority.mjs` (weapons, armor, equipment, medical, explosives and cybernetics)

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

## Phase 0-2 — Character armor and personal energy shields: census and repo reconciliation

Scope: character-scale wearable armor and personal energy shields. Excluded: armor upgrades, droid armor/plating, natural armor, vehicle/starship armor, NPC-only/custom variants. Identity and presence only.

| Result | Count |
|---|---:|
| Canonical armor identities | 67 |
| Repo armor records (`packs/armor.db`) | 70 |
| KEEP | 43 |
| EDIT | 24 |
| ADD | 0 |
| REMOVE | 0 |
| REVIEW | 3 |

All 67 canonical identities map one-to-one to repo records; 0 are missing.

### Adjudications

- **KOTOR energy shields:** Treat SR 5, 10, 15, 20, 25, and 30 as six canonical purchasable armor/shield variants. Table 5-3 establishes light/medium/heavy armor classes; Table 5-4 explicitly gives six SR price points.
- **Mandalorian battle armor name:** Canonical identity is Mandalorian Battle Armor. Earlier draft wording "Mandalorian Neo-Crusader Battle Armor" was rejected; KOTOR Table 12-1 prints Mandalorian battle armor.
- **Pressure suits:** Light/Medium/Heavy Pressure Suit are REVIEW, not REMOVE. Repo claims Web Enhancements, but the supplied SSOT files do not contain the defining source. Destructive mutation is blocked.
- **Armor upgrades and droid armor:** Excluded from Phase 0-2 and reserved for their dedicated later batches.

### Source claims by book

| Book | Claims |
|---|---:|
| Clone Wars Campaign Guide | 5 |
| Core Rulebook | 11 |
| Galaxy at War | 7 |
| Jedi Academy Training Manual | 7 |
| Knights of the Old Republic Campaign Guide | 21 |
| Legacy Era Campaign Guide | 5 |
| Rebellion Era Campaign Guide | 4 |
| Scum and Villainy | 8 |

### Canonical armor census

| # | Canonical armor | Sourcebook(s) | Repo record | Disposition |
|---:|---|---|---|---|
| 1 | Armored Spacesuit | Core Rulebook | `armor-armored-space-suit` - Armored Space Suit | EDIT |
| 2 | Battle Armor | Core Rulebook | `armor-battle-armor` - Battle Armor | KEEP |
| 3 | Battle Armor, Heavy | Core Rulebook | `armor-heavy-battle-armor` - Heavy Battle Armor | EDIT |
| 4 | Blast Helmet and Vest | Core Rulebook | `armor-blast-helmet-and-vest` - Blast Helmet and Vest | KEEP |
| 5 | Ceremonial Armor | Core Rulebook | `armor-ceremonial-armor` - Ceremonial Armor | KEEP |
| 6 | Combat Jumpsuit | Core Rulebook | `armor-combat-jumpsuit` - Combat Jumpsuit | KEEP |
| 7 | Corellian Powersuit | Core Rulebook | `armor-corellian-powersuit` - Corellian Powersuit | KEEP |
| 8 | Flight Suit, Armored | Core Rulebook | `armor-armored-flight-suit` - Armored Flight Suit | EDIT |
| 9 | Flight Suit, Padded | Core Rulebook | `armor-padded-flight-suit` - Padded Flight Suit | EDIT |
| 10 | Stormtrooper Armor | Core Rulebook | `armor-stormtrooper-armor` - Stormtrooper Armor | KEEP |
| 11 | Vonduun Crabshell Armor | Core Rulebook | `armor-vonduun-crabshell` - Vonduun Crabshell | EDIT |
| 12 | Camo Armor | Clone Wars Campaign Guide | `armor-camo-armor` - Camo Armor | KEEP |
| 13 | Shadowsuit | Clone Wars Campaign Guide, Scum and Villainy | `armor-shadowsuit` - Shadowsuit | KEEP |
| 14 | Thinsuit | Clone Wars Campaign Guide | `armor-thinsuit` - Thinsuit | KEEP |
| 15 | Tracker Utility Vest | Clone Wars Campaign Guide | `armor-tracker-utility-vest` - Tracker Utility Vest | KEEP |
| 16 | Vacuum Pod | Clone Wars Campaign Guide | `armor-vacuum-pod` - Vacuum Pod | KEEP |
| 17 | Barabel Microbe Armor | Galaxy at War | `armor-microbe-armor` - Microbe Armor | EDIT |
| 18 | Biohazard Suit | Galaxy at War | `armor-biohazard-suit` - Biohazard Suit | KEEP |
| 19 | Camo Scout Armor | Galaxy at War | `armor-camo-scout-armor` - Camo Scout Armor | KEEP |
| 20 | Katarn-Class Commando Armor | Galaxy at War | `armor-katarn-class-commando-armor` - Katarn-Class Commando Armor | KEEP |
| 21 | Marine Armor | Galaxy at War | `armor-marine-armor` - Marine Armor | KEEP |
| 22 | Stalker Armor | Galaxy at War | `armor-m110-stalker-armor` - M1-10 Stalker Armor | EDIT |
| 23 | Stun Cloak | Galaxy at War | `armor-stun-cloak` - Stun Cloak | KEEP |
| 24 | Dark Armor, Light | Jedi Academy Training Manual | `armor-light-dark-armor` - Light Dark Armor | EDIT |
| 25 | Jedi Battle Armor, Light | Jedi Academy Training Manual | `armor-light-jedi-battle-armor` - Light Jedi Battle Armor | EDIT |
| 26 | WJ-880 Blinding Helmet | Jedi Academy Training Manual | `armor-blinding-helmet` - Blinding Helmet | EDIT |
| 27 | Dark Armor, Medium | Jedi Academy Training Manual | `armor-dark-armor` - Dark Armor | EDIT |
| 28 | Jedi Battle Armor, Medium | Jedi Academy Training Manual | `armor-jedi-battle-armor` - Jedi Battle Armor | EDIT |
| 29 | Dark Armor, Heavy | Jedi Academy Training Manual | `armor-heavy-dark-armor` - Heavy Dark Armor | EDIT |
| 30 | Orbalisk Armor | Jedi Academy Training Manual | `armor-orbalisk-armor` - Orbalisk Armor | KEEP |
| 31 | Energy Shield (SR 5) | Knights of the Old Republic Campaign Guide | `armor-energy-shield-sr5` - Energy Shield (SR 5) | KEEP |
| 32 | Energy Shield (SR 10) | Knights of the Old Republic Campaign Guide | `armor-energy-shield-sr10` - Energy Shield (SR 10) | KEEP |
| 33 | Energy Shield (SR 15) | Knights of the Old Republic Campaign Guide | `armor-energy-shield-sr15` - Energy Shield (SR 15) | KEEP |
| 34 | Energy Shield (SR 20) | Knights of the Old Republic Campaign Guide | `armor-energy-shield-sr20` - Energy Shield (SR 20) | KEEP |
| 35 | Energy Shield (SR 25) | Knights of the Old Republic Campaign Guide | `armor-energy-shield-sr25` - Energy Shield (SR 25) | KEEP |
| 36 | Energy Shield (SR 30) | Knights of the Old Republic Campaign Guide | `armor-energy-shield-sr30` - Energy Shield (SR 30) | KEEP |
| 37 | Fiber Armor | Knights of the Old Republic Campaign Guide | `armor-fiber-armor` - Fiber Armor | KEEP |
| 38 | Battle Armor, Light Powered | Knights of the Old Republic Campaign Guide | `armor-light-powered-battle-armor` - Light Powered Battle Armor | EDIT |
| 39 | Battle Armor, Light | Knights of the Old Republic Campaign Guide | `armor-light-battle-armor` - Light Battle Armor | EDIT |
| 40 | Mesh Armor | Knights of the Old Republic Campaign Guide | `armor-mesh-armor` - Mesh Armor | KEEP |
| 41 | Weave Armor | Knights of the Old Republic Campaign Guide | `armor-weave-armor` - Weave Armor | KEEP |
| 42 | Battle Armor, Powered | Knights of the Old Republic Campaign Guide | `armor-powered-battle-armor` - Powered Battle Armor | EDIT |
| 43 | Matrix Armor | Knights of the Old Republic Campaign Guide | `armor-matrix-armor` - Matrix Armor | KEEP |
| 44 | Battle Armor, Heavy Powered | Knights of the Old Republic Campaign Guide | `armor-heavy-powered-battle-armor` - Heavy Powered Battle Armor | EDIT |
| 45 | Republic Light Armor | Knights of the Old Republic Campaign Guide | `armor-republic-light-armor` - Republic Light Armor | KEEP |
| 46 | Republic Combat Armor | Knights of the Old Republic Campaign Guide | `armor-republic-combat-armor` - Republic Combat Armor | KEEP |
| 47 | Republic Heavy Armor | Knights of the Old Republic Campaign Guide | `armor-republic-heavy-armor` - Republic Heavy Armor | KEEP |
| 48 | Neo-Crusader Light Armor | Knights of the Old Republic Campaign Guide | `armor-neo-crusader-light-armor` - Neo-Crusader Light Armor | KEEP |
| 49 | Mandalorian Combat Suit | Knights of the Old Republic Campaign Guide | `armor-mandalorian-combat-suit` - Mandalorian Combat Suit | KEEP |
| 50 | Mandalorian Battle Armor | Knights of the Old Republic Campaign Guide | `armor-mandalorian-battle-armor` - Mandalorian Battle Armor | KEEP |
| 51 | Neo-Crusader Assault Armor | Knights of the Old Republic Campaign Guide | `armor-neo-crusader-assault-armor` - Neo-Crusader Assault Armor | KEEP |
| 52 | Galactic Alliance Armor | Legacy Era Campaign Guide | `armor-galactic-alliance-armor` - Galactic Alliance Armor | KEEP |
| 53 | Venom Assault Armor | Legacy Era Campaign Guide | `armor-venom-assault-armor` - Venom Assault Armor | KEEP |
| 54 | Cortosis Gauntlet | Legacy Era Campaign Guide | `armor-cortosis-gauntlet` - Cortosis Gauntlet | KEEP |
| 55 | Imperial Knight Armor | Legacy Era Campaign Guide | `armor-imperial-knight-armor` - Imperial Knight Armor | KEEP |
| 56 | Knighthunter Armor | Legacy Era Campaign Guide | `armor-knighthunter-armor` - Knighthunter Armor | KEEP |
| 57 | Merr-Sonn KZZ Riot Armor | Rebellion Era Campaign Guide | `armor-kzz-riot-armor` - KZZ Riot Armor | EDIT |
| 58 | Shield Gauntlet | Rebellion Era Campaign Guide | `armor-shield-gauntlet` - Shield Gauntlet | KEEP |
| 59 | Seatrooper Armor | Rebellion Era Campaign Guide | `armor-seatrooper-armor` - Seatrooper Armor | KEEP |
| 60 | Zero-Gravity Stormtrooper Armor | Rebellion Era Campaign Guide | `armor-zero-gravity-stormtrooper-armor` - Zero-Gravity Stormtrooper Armor | KEEP |
| 61 | Beskar'gam, Light | Scum and Villainy | `armor-light-beskargam` - Light Beskar'gam | EDIT |
| 62 | Half-Vest | Scum and Villainy | `armor-half-vest` - Half-Vest | KEEP |
| 63 | Beskar'gam, Medium | Scum and Villainy | `armor-medium-beskargam` - Medium Beskar'gam | EDIT |
| 64 | GTU AV-1S Scout Armor | Scum and Villainy | `armor-av1s-scout-armor` - AV-1S Scout Armor | EDIT |
| 65 | Krall 210 Personal Armor | Scum and Villainy | `armor-model-210-personal-armor` - Model 210 Personal Armor | EDIT |
| 66 | Beskar'gam, Heavy | Scum and Villainy | `armor-heavy-beskargam` - Heavy Beskar'gam | EDIT |
| 67 | GTU AV-1C Combat Armor | Scum and Villainy | `armor-av1c-combat-armor` - AV-1C Combat Armor | EDIT |

### Repo-only / unresolved (REVIEW)

| Repo ID | Repo name | Source claim | Disposition | Action |
|---|---|---|---|---|
| `armor-heavy-pressure-suit` | Heavy Pressure Suit | Web Enhancements | REVIEW | NO_AUTOMATIC_MUTATION_SOURCE_NOT_IN_SSOT |
| `armor-light-pressure-suit` | Light Pressure Suit | Web Enhancements | REVIEW | NO_AUTOMATIC_MUTATION_SOURCE_NOT_IN_SSOT |
| `armor-medium-pressure-suit` | Medium Pressure Suit | Web Enhancements | REVIEW | NO_AUTOMATIC_MUTATION_SOURCE_NOT_IN_SSOT |

The pressure suits claim Web Enhancements, which is outside the supplied source set. Not removed, not renamed, not modified until the defining source is supplied.

### EDIT rename ledger and measured name-based consumers

| Repo ID | Current name | Canonical name | Name-based consumers (scripts / tests / store) |
|---|---|---|---|
| `armor-armored-space-suit` | Armored Space Suit | Armored Spacesuit | data/store/armor-store-descriptions.json ×1 |
| `armor-heavy-battle-armor` | Heavy Battle Armor | Battle Armor, Heavy | data/store/armor-store-descriptions.json ×1 |
| `armor-armored-flight-suit` | Armored Flight Suit | Flight Suit, Armored | data/store/armor-store-descriptions.json ×1 |
| `armor-padded-flight-suit` | Padded Flight Suit | Flight Suit, Padded | data/store/armor-store-descriptions.json ×1 |
| `armor-vonduun-crabshell` | Vonduun Crabshell | Vonduun Crabshell Armor | data/store/armor-store-descriptions.json ×1 |
| `armor-microbe-armor` | Microbe Armor | Barabel Microbe Armor | data/store/armor-store-descriptions.json ×1 |
| `armor-m110-stalker-armor` | M1-10 Stalker Armor | Stalker Armor | data/store/armor-store-descriptions.json ×1; tests/energy-shield-defense-and-activation-authority.test.mjs ×2; tests/garee-full-skill-derivation-parity.test.mjs ×1; tests/legacy-equip-state-single-pass-authority.test.mjs ×1 |
| `armor-light-dark-armor` | Light Dark Armor | Dark Armor, Light | data/store/armor-store-descriptions.json ×1; scripts/apps/force-alchemy/force-alchemy-mechanics-service.js ×1; scripts/talents/DarkSidePowers.js ×1 |
| `armor-light-jedi-battle-armor` | Light Jedi Battle Armor | Jedi Battle Armor, Light | data/store/armor-store-descriptions.json ×1 |
| `armor-blinding-helmet` | Blinding Helmet | WJ-880 Blinding Helmet | data/store/armor-store-descriptions.json ×1 |
| `armor-dark-armor` | Dark Armor | Dark Armor, Medium | data/store/armor-store-descriptions.json ×1; scripts/apps/force-alchemy/force-alchemy-context-resolver.js ×1; scripts/apps/force-alchemy/force-alchemy-mechanics-service.js ×1; scripts/talents/DarkSidePowers.js ×1 |
| `armor-jedi-battle-armor` | Jedi Battle Armor | Jedi Battle Armor, Medium | data/store/armor-store-descriptions.json ×1 |
| `armor-heavy-dark-armor` | Heavy Dark Armor | Dark Armor, Heavy | data/store/armor-store-descriptions.json ×1; scripts/apps/force-alchemy/force-alchemy-mechanics-service.js ×1; scripts/talents/DarkSidePowers.js ×1 |
| `armor-light-powered-battle-armor` | Light Powered Battle Armor | Battle Armor, Light Powered | data/store/armor-store-descriptions.json ×1 |
| `armor-light-battle-armor` | Light Battle Armor | Battle Armor, Light | data/store/armor-store-descriptions.json ×1 |
| `armor-powered-battle-armor` | Powered Battle Armor | Battle Armor, Powered | data/store/armor-store-descriptions.json ×1 |
| `armor-heavy-powered-battle-armor` | Heavy Powered Battle Armor | Battle Armor, Heavy Powered | data/store/armor-store-descriptions.json ×1 |
| `armor-kzz-riot-armor` | KZZ Riot Armor | Merr-Sonn KZZ Riot Armor | data/store/armor-store-descriptions.json ×1 |
| `armor-light-beskargam` | Light Beskar'gam | Beskar'gam, Light | data/store/armor-store-descriptions.json ×1 |
| `armor-medium-beskargam` | Medium Beskar'gam | Beskar'gam, Medium | data/store/armor-store-descriptions.json ×1 |
| `armor-av1s-scout-armor` | AV-1S Scout Armor | GTU AV-1S Scout Armor | data/store/armor-store-descriptions.json ×1 |
| `armor-model-210-personal-armor` | Model 210 Personal Armor | Krall 210 Personal Armor | data/store/armor-store-descriptions.json ×1 |
| `armor-heavy-beskargam` | Heavy Beskar'gam | Beskar'gam, Heavy | data/store/armor-store-descriptions.json ×1 |
| `armor-av1c-combat-armor` | AV-1C Combat Armor | GTU AV-1C Combat Armor | data/store/armor-store-descriptions.json ×1 |

Notes:

- Measured at readback 2026-10-05 from quoted exact old-name strings; ID references are limited to data/store/armor-store-descriptions.json and tools/fix-armor-data.js (generator history).
- Force Alchemy (scripts/apps/force-alchemy/force-alchemy-mechanics-service.js, force-alchemy-context-resolver.js) and scripts/talents/DarkSidePowers.js hard-code result names 'Light Dark Armor', 'Dark Armor', 'Heavy Dark Armor' and their own stat profiles; they do not look up the pack record by name, so a record rename will not break them but newly crafted items will keep the old display names until those strings are updated.
- data/armor/{light,medium,heavy}.json are unconsumed evidence files (see Phase 0 census) and are not rename targets.

### Execution guardrails

1. Apply only explicit EDIT identity renames if executing Phase 0-2 now.
2. Do not alter descriptions, stats, schema, tags, source/page fields, or mechanics in this phase.
3. Do not delete the three pressure-suit records; they are REVIEW pending source verification.
4. Do not fold energy-shield SR records into three generic light/medium/heavy records; the supplied KOTOR source explicitly distinguishes six SR price variants.
5. Do not touch armor upgrades, droid armor/plating, vehicle/starship armor, or natural armor.
6. Renames keep the record _id. Before any rename executes, update name-based consumers listed in renameImpact (Force Alchemy result names, tests, data/store/armor-store-descriptions.json) and apply to the aggregate and all derived subpacks together.
7. No production mutation is authorized by Phase 0-2 until the owner explicitly directs execution (see ownerRulings).

### Execution record — 24 identity renames (2026-10-05)

Authorized by the owner as the exact Phase 0-2 execution package. Executed in this PR:

- **Packs:** 24 records renamed in `packs/armor.db` and the matching 24 mirrors in `armor-light` (11), `armor-medium` (7), `armor-heavy` (6). Verified against `HEAD`: the only field that changed on any record is `name`; `_id`, stats, descriptions, tags, and schema are untouched. `armor-shields` and the three pressure suits were not modified.
- **Store descriptions:** `name` and `slug` updated for the 24 rows in `data/store/armor-store-descriptions.json` (description text unchanged).
- **Tests:** three tests now use "Stalker Armor".
- **Runtime name consumers:** `DarkSidePowers.js` tier detection accepts the canonical "Battle Armor, Light/Heavy" names (anchored so "Jedi Battle Armor, Light" stays standard tier; a before/after comparison over all 67 armor names shows identical tiers), Force Alchemy result names and UI copy use "Dark Armor, Light/Medium/Heavy", `defense-calculator.js` also recognizes "Armored Spacesuit", `store-suggestion-context.js` also recognizes "Flight Suit, Armored".
- **Parity gate:** `tools/verify-item-weapons-authority.mjs` now asserts the pack carries the canonical name for every EDIT record and that each armor subpack name equals the aggregate.

Follow-ups: store description text still opens with the old display name; `tools/fix-armor-data.js` would regenerate the old names if re-run and must not be used; `data/armor/*.json` remain unconsumed evidence with old names; Force Alchemy's hard-coded Sith armor stats belong to the Phase 4 stat pass.

### QA gate

- 67/67 canonical identities map to exactly one repo record; 70/70 repo records covered exactly once (67 mapped + 3 REVIEW).
- 24 EDIT (name differs), 43 KEEP (name equals), 0 duplicates.
- Verified against `packs/armor.db` by `tools/verify-item-weapons-authority.mjs`; aggregate and armor subpack names currently agree for all 70 records.

## Phase 0-3A — General equipment: census and repo reconciliation

Character-scale general equipment: communications, computers/storage, detection/surveillance, life support, survival/field gear, ordinary tools/restraints/carrying gear, accessories, and specialty nonmedical equipment. Excludes medical/consumable care gear, demolitions-specific gear, cybernetics/implants, weapon/armor/universal upgrades, lightsaber components, droid equipment, and vehicle/starship systems.

Excluded and deferred to later sub-batches: medical/treatment gear (0-3B), demolitions (0-3C), cybernetics/implants (0-3D), weapon/armor/universal upgrades (0-3E), lightsaber components, droid equipment, vehicle/starship systems. Identity and presence only.

| Result | Count |
|---|---:|
| Canonical general-equipment identities | 121 |
| Records in `packs/equipment.db` (all families) | 142 |
| Repo records in 0-3A scope | 91 |
| KEEP | 77 |
| EDIT | 9 |
| ADD | 35 |
| REMOVE (repo, from this corpus) | 4 |
| REVIEW | 1 |
| Deferred (Demolitions Sensor → 0-3C) | 1 |

### Adjudications

- **Camouflage Netting is two canonical identities.** Clone Wars (6,000 cr, 40 kg) and Galaxy at War (2,000 cr, 5 kg) publish different items under one name. They are kept distinct by source-qualified `canonicalIdentityKey`. The existing repo record is the Galaxy at War identity; the Clone Wars one is an ADD.
- **No canonical `Holster, Standard`.** Core has Holster (Concealed/Hip) and Targeting Scope (Standard/Enhanced Low-Light).
- **One Utility Belt.** `Utility Belt (Empty)` is a repo convenience variant.
- **Species special equipment** is included when the source gives a concrete named, costed item (Antiox Breath Mask, Ultraviolet Visor, Ubese Environmental Suit). The Celegian Life-Support Chamber is REVIEW.
- **Heat Sensor** is a battlestation/facility security system; the concept is preserved for a later facility track.

### Canonical census

| # | Canonical identity | Source | Repo record | Disposition |
|---:|---|---|---|---|
| 1 | Comlink, Short-Range | Core Rulebook | `comms-comlink-short-range` - Comlink, Short-Range | KEEP |
| 2 | Comlink, Long-Range | Core Rulebook | `comms-comlink-long-range` - Comlink, Long-Range | KEEP |
| 3 | Pocket Scrambler | Core Rulebook | `comms-pocket-scrambler` - Pocket Scrambler | KEEP |
| 4 | Code Cylinder | Core Rulebook | `computer-code-cylinder` - Code Cylinder | KEEP |
| 5 | Credit Chip | Core Rulebook | `computer-credit-chip` - Credit Chip | KEEP |
| 6 | Datacards, Blank (10) | Core Rulebook | `computer-datacards-blank-10` - Blank Datacards (10) | EDIT |
| 7 | Datapad | Core Rulebook | `computer-datapad-standard` - Datapad, Standard | EDIT |
| 8 | Datapad, Basic | Core Rulebook | `computer-datapad-basic` - Datapad, Basic | KEEP |
| 9 | Holoprojector, Personal | Core Rulebook | `computer-personal-holoprojector` - Personal Holoprojector | EDIT |
| 10 | Portable Computer | Core Rulebook | `computer-portable-computer` - Portable Computer | KEEP |
| 11 | Electrobinoculars | Core Rulebook | `detect-electrobinoculars` - Electrobinoculars | KEEP |
| 12 | Glow Rod | Core Rulebook | `detect-glow-rod` - Glow Rod | KEEP |
| 13 | Fusion Lantern | Core Rulebook | `detect-fusion-lantern` - Fusion Lantern | KEEP |
| 14 | Audiorecorder | Core Rulebook | `detect-audiorecorder` - Audiorecorder | KEEP |
| 15 | Holorecorder | Core Rulebook | `detect-holorecorder` - Holorecorder | KEEP |
| 16 | Videorecorder | Core Rulebook | `detect-videorecorder` - Videorecorder | KEEP |
| 17 | Sensor Pack | Core Rulebook | `detect-sensor-pack` - Sensor Pack | KEEP |
| 18 | Aquata Breather | Core Rulebook | `life-aquata-breather` - Aquata Breather | KEEP |
| 19 | Breath Mask | Core Rulebook | `life-breath-mask` - Breath Mask | KEEP |
| 20 | Atmosphere Canister/Filter | Core Rulebook | — | ADD |
| 21 | Flight Suit | Core Rulebook | `life-flight-suit` - Flight Suit | KEEP |
| 22 | Space Suit | Core Rulebook | `life-space-suit` - Space Suit | KEEP |
| 23 | All-Temperature Cloak | Core Rulebook | `survival-all-temperature-cloak` - All-Temperature Cloak | KEEP |
| 24 | Chain (3 meters) | Core Rulebook | `survival-chain-3m` - Chain (3 meters) | KEEP |
| 25 | Field Kit | Core Rulebook | `survival-field-kit` - Field Kit | KEEP |
| 26 | Liquid Cable Dispenser (15 meters) | Core Rulebook | `survival-liquid-cable-dispenser` - Liquid Cable Dispenser (15 meters) | KEEP |
| 27 | Ration Pack | Core Rulebook | `survival-ration-pack` - Ration Pack | KEEP |
| 28 | Syntherope (45 meters) | Core Rulebook | `survival-syntherope-45m` - Syntherope (45 meters) | KEEP |
| 29 | Binder Cuffs | Core Rulebook | `tool-binder-cuffs` - Binder Cuffs | KEEP |
| 30 | Energy Cell | Core Rulebook | `tool-energy-cell` - Energy Cell | KEEP |
| 31 | Fire Extinguisher | Core Rulebook | — | ADD |
| 32 | Mesh Tape | Core Rulebook | — | ADD |
| 33 | Power Generator | Core Rulebook | — | ADD |
| 34 | Power Pack | Core Rulebook | `tool-power-pack` - Power Pack | KEEP |
| 35 | Power Recharger | Core Rulebook | `tool-power-recharger` - Power Recharger | KEEP |
| 36 | Security Kit | Core Rulebook | `tool-security-kit` - Security Kit | KEEP |
| 37 | Tool Kit | Core Rulebook | `tool-kit` - Tool Kit | KEEP |
| 38 | Utility Belt | Core Rulebook | `tool-utility-belt-standard` - Utility Belt (Standard) | EDIT |
| 39 | Bandolier | Core Rulebook | `accessory-bandolier` - Bandolier | KEEP |
| 40 | Helmet Package | Core Rulebook | `accessory-helmet-package` - Helmet Package | KEEP |
| 41 | Holster, Concealed | Core Rulebook | `accessory-holster-concealed` - Holster, Concealed | KEEP |
| 42 | Holster, Hip | Core Rulebook | `accessory-holster-hip` - Holster, Hip | KEEP |
| 43 | Vox-Box | Core Rulebook | `comms-vox-box` - Vox-Box | KEEP |
| 44 | Bracer Computer | Clone Wars Campaign Guide | `computer-bracer-computer` - Bracer Computer | KEEP |
| 45 | Halo Lamp | Clone Wars Campaign Guide | `detect-halo-lamp` - Halo Lamp | KEEP |
| 46 | Visual Wrist Comm | Clone Wars Campaign Guide | `comms-visual-wrist-comm` - Visual Wrist Comm | KEEP |
| 47 | Decoy Glowrod | Force Unleashed Campaign Guide | `detect-decoy-glow-rod` - Decoy Glow Rod | EDIT |
| 48 | Holoshroud | Force Unleashed Campaign Guide | `detect-holoshroud` - Holoshroud | KEEP |
| 49 | Arakyd Hush-About Personal Jetpack | Force Unleashed Campaign Guide | — | ADD |
| 50 | Repulsor Pad | Force Unleashed Campaign Guide | — | ADD |
| 51 | Sound Sponge | Force Unleashed Campaign Guide | `detect-sound-sponge` - Sound Sponge | KEEP |
| 52 | Com Scrambler | Galaxy at War | `comms-com-scrambler` - Com Scrambler | KEEP |
| 53 | Comlink, Tightbeam | Galaxy at War | `comms-tightbeam-comlink` - Tightbeam Comlink | EDIT |
| 54 | Targeting Beacon | Galaxy at War | `comms-targeting-beacon` - Targeting Beacon | KEEP |
| 55 | Triangulation Visor | Galaxy at War | `computer-triangulation-visor` - Triangulation Visor | KEEP |
| 56 | Communication Scanner | Galaxy at War | `detect-communication-scanner` - Communication Scanner | KEEP |
| 57 | Proximity Flare | Galaxy at War | `detect-proximity-flare` - Proximity Flare | KEEP |
| 58 | Radiation Detector | Galaxy at War | `detect-radiation-detector` - Radiation Detector | KEEP |
| 59 | Camouflage Poncho | Galaxy at War | `survival-camouflage-poncho` - Camouflage Poncho | KEEP |
| 60 | Field Food Processor | Galaxy at War | — | ADD |
| 61 | Personal Field Shelter | Galaxy at War | — | ADD |
| 62 | Plasma Bridge | Galaxy at War | — | ADD |
| 63 | Vacuum Survival Pouch | Galaxy at War | — | ADD |
| 64 | Comlink, Earbud | Galaxy of Intrigue | `comms-earbud-comlink` - Earbud Comlink | EDIT |
| 65 | Panic Ring | Galaxy of Intrigue | `comms-panic-ring` - Panic Ring | KEEP |
| 66 | Holo Converter | Galaxy of Intrigue | `comms-holo-converter` - Holo Converter | KEEP |
| 67 | Surveillance Detector | Galaxy of Intrigue | `detect-surveillance-detector` - Surveillance Detector | KEEP |
| 68 | Surveillance Tagger | Galaxy of Intrigue | `detect-surveillance-tagger` - Surveillance Tagger | KEEP |
| 69 | Veridicator | Galaxy of Intrigue | `detect-veridicator` - Veridicator | KEEP |
| 70 | Vid-Vox Scrambler | Galaxy of Intrigue | `detect-vid-vox-scrambler` - Vid-Vox Scrambler | KEEP |
| 71 | Sith Battle Harness | Jedi Academy Training Manual | — | ADD |
| 72 | Force Detector | Jedi Academy Training Manual | — | ADD |
| 73 | Force Training Aid | Jedi Academy Training Manual | — | ADD |
| 74 | Universal Energy Cage | Jedi Academy Training Manual | — | ADD |
| 75 | Computer Interface Visor | Knights of the Old Republic Campaign Guide | `computer-interface-visor` - Computer Interface Visor | KEEP |
| 76 | Aural Amplifier | Knights of the Old Republic Campaign Guide | `detect-aural-amplifier` - Aural Amplifier | KEEP |
| 77 | Motion Sensing Visor | Knights of the Old Republic Campaign Guide | `detect-motion-sensing-visor` - Motion Sensing Visor | KEEP |
| 78 | Neural Band | Knights of the Old Republic Campaign Guide | `detect-neural-band` - Neural Band | KEEP |
| 79 | Stealth Field Generator | Knights of the Old Republic Campaign Guide | `detect-stealth-field-generator` - Stealth Field Generator | KEEP |
| 80 | Vacuum Mask | Knights of the Old Republic Campaign Guide | `life-vacuum-mask` - Vacuum Mask | KEEP |
| 81 | Mechanical Interface Visor | Knights of the Old Republic Campaign Guide | — | ADD |
| 82 | Comlink, Hands-Free | Legacy Era Campaign Guide | `comms-hands-free-comlink` - Hands-Free Comlink | EDIT |
| 83 | Spy Bug | Legacy Era Campaign Guide | `detect-spy-bug` - Spy Bug | KEEP |
| 84 | Xcalq-3GA "Slicer Special" Portable Computer | Legacy Era Campaign Guide | `computer-xcalq-3ga-slicer-special` - Xcalq-3GA "Slicer Special" Portable Computer | KEEP |
| 85 | Xcalq Stealth Pack | Legacy Era Campaign Guide | `computer-xcalq-stealth-pack` - Xcalq Stealth Pack | KEEP |
| 86 | Ambient Aural Amplifier | Rebellion Era Campaign Guide | `detect-ambient-aural-amplifier` - Ambient Aural Amplifier | KEEP |
| 87 | Computerized Interface Scope | Rebellion Era Campaign Guide | — | ADD |
| 88 | Propulsion Pack | Rebellion Era Campaign Guide | `life-propulsion-pack` - Propulsion Pack | KEEP |
| 89 | ABC Scrambler | Scum and Villainy | — | ADD |
| 90 | Force Cage | Scum and Villainy | — | ADD |
| 91 | Lock Breaking Kit | Scum and Villainy | — | ADD |
| 92 | Man Trap | Scum and Villainy | — | ADD |
| 93 | Spacer's Chest | Scum and Villainy | — | ADD |
| 94 | Computer Spike | Threats of the Galaxy | `computer-spike` - Computer Spike | KEEP |
| 95 | HiBaka 2000 Mem-Stik | Threats of the Galaxy | `computer-hibaka-2000-mem-stik` - HiBaka 2000 Mem-Stik | KEEP |
| 96 | Lectroticker | Threats of the Galaxy | `computer-lectroticker` - Lectroticker | KEEP |
| 97 | Climbing Harness | Unknown Regions | — | ADD |
| 98 | Emergency Vacuum Seal | Unknown Regions | `life-emergency-vacuum-seal` - Emergency Vacuum Seal | KEEP |
| 99 | Fire Paste | Unknown Regions | — | ADD |
| 100 | Fire Rod | Unknown Regions | — | ADD |
| 101 | Personal Multitool | Unknown Regions | — | ADD |
| 102 | Personal Translator | Unknown Regions | — | ADD |
| 103 | Plastent | Unknown Regions | — | ADD |
| 104 | Portable Beacon | Unknown Regions | — | ADD |
| 105 | Repulsor Boots | Unknown Regions | — | ADD |
| 106 | Repulsor Hitch | Unknown Regions | — | ADD |
| 107 | Saddle, Riding | Unknown Regions | — | ADD |
| 108 | Saddle, War | Unknown Regions | — | ADD |
| 109 | Shipsuit | Unknown Regions | `life-shipsuit` - Shipsuit | KEEP |
| 110 | Signal Wand | Unknown Regions | `comms-signal-wand` - Signal Wand | KEEP |
| 111 | Sonar Mapper | Unknown Regions | `detect-sonar-mapper` - Sonar Mapper | KEEP |
| 112 | Subsonic Field Emitter | Unknown Regions | — | ADD |
| 113 | Water Extractor | Unknown Regions | — | ADD |
| 114 | Camouflage Netting | Clone Wars Campaign Guide | — | ADD |
| 115 | Camouflage Netting | Galaxy at War | `survival-field-camouflage-netting` - Field Camouflage Netting | EDIT |
| 116 | Jet Pack | Core Rulebook | `survival-jetpack` - Jet Pack | KEEP |
| 117 | Targeting Scope, Standard | Core Rulebook | `accessory-targeting-scope-standard` - Targeting Scope, Standard | KEEP |
| 118 | Targeting Scope, Enhanced Low-Light | Core Rulebook | `accessory-targeting-scope-enhanced-low-light` - Targeting Scope, Enhanced Low-Light | KEEP |
| 119 | Antiox Breath Mask | Core Rulebook | `life-antiox-breath-mask` - Antiox Breath Mask | KEEP |
| 120 | Ultraviolet Visor | Galaxy of Intrigue | `life-ultraviolet-visor` - Ultraviolet Visor | KEEP |
| 121 | Ubese Environmental Suit | Scum and Villainy | `life-ubese-environmental-suit` - Ubese Environmental Suit | KEEP |

### Repo records outside the canonical corpus

| Repo ID | Repo name | Disposition | Reason |
|---|---|---|---|
| `detect-heat-sensor` | Heat Sensor | REMOVE | Published as a battlestation/facility security sensor rather than a character general-equipment item; preserve for later facility/security-system track if desired. |
| `life-breathing-apparatus` | Breathing Apparatus | REMOVE | No standalone published equipment identity found in supplied TXT/PDF sources; phrase appears generically, not as a priced/rules item. |
| `life-celegian-support-chamber` | Celegian Life-Support Chamber | REVIEW | Published as Ooroo/Celegian life-support equipment with explicit mechanics, but not as a normal priced general-equipment entry. Retain pending a later special-equipment scope decision. |
| `life-transliterator` | Transliterator | REMOVE | No published equipment identity found in the supplied TXT/PDF source corpus. |
| `tool-utility-belt-empty` | Utility Belt (Empty) | REMOVE | Repo convenience/container variant; Core publishes a single Utility Belt identity with standard contents, not a separate empty item. |

Provenance findings deferred beyond 0-3A (source-book corrections for later phases):

- `life-ubese-environmental-suit` — Repo claims Unknown Regions; supplied source supports the Ubese environmental suit in Scum and Villainy. Provenance correction is deferred beyond Phase 0-3A identity execution.
- `life-ultraviolet-visor` — Repo claims Unknown Regions; supplied source explicitly presents Ultraviolet Visor as Defel Special Equipment in Galaxy of Intrigue. Provenance correction is deferred beyond Phase 0-3A identity execution.
- `life-celegian-support-chamber` — Repo claims Unknown Regions; supplied source evidence located in Jedi Academy Training Manual for Ooroo/Celegian life-support chamber. Record remains REVIEW because it is not a normal priced equipment entry.
- `detect-heat-sensor` — Repo claims Threats of the Galaxy; portable handheld description is not supported. Galaxy at War publishes Heat Sensors as battlestation/facility systems.

### Execution record — 9 identity renames (2026-10-05)

Applied under the 0-3A execution contract (authorized identity normalizations only, after a name/ID consumer check). IDs, stats, descriptions, `skillHooks`, tags and schema are untouched.

| Repo ID | Old name | Canonical name |
|---|---|---|
| `computer-datacards-blank-10` | Blank Datacards (10) | Datacards, Blank (10) |
| `computer-datapad-standard` | Datapad, Standard | Datapad |
| `computer-personal-holoprojector` | Personal Holoprojector | Holoprojector, Personal |
| `tool-utility-belt-standard` | Utility Belt (Standard) | Utility Belt |
| `detect-decoy-glow-rod` | Decoy Glow Rod | Decoy Glowrod |
| `comms-tightbeam-comlink` | Tightbeam Comlink | Comlink, Tightbeam |
| `comms-earbud-comlink` | Earbud Comlink | Comlink, Earbud |
| `comms-hands-free-comlink` | Hands-Free Comlink | Comlink, Hands-Free |
| `survival-field-camouflage-netting` | Field Camouflage Netting | Camouflage Netting |

- **Packs:** 9 records in `packs/equipment.db` plus the same 9 in the derived subpacks (comlinks 3, security 1, survival 1, tech 3, tools 1). Compared with the previous commit, `name` is the only field that changed.
- **Store descriptions:** data/store/equipment-store-descriptions.json (name + slug for 9 rows; description text unchanged).
- **Character templates:** data/character-templates.json (name field for 7 template entries; ids and displayName unchanged).
- **Runtime:** `equipment-skill-hook-resolver.js` matched the earbud comlink by name; it now also matches "comlink, earbud".
- **Parity gate:** the verifier asserts canonical names in the pack after execution and aggregate/subpack name parity for all 142 records.

Follow-ups:

- Record-internal strings still carry old names and were left alone (mechanics data): skillHooks source/label/note on Earbud, Tightbeam, Field Camouflage Netting; Tightbeam description. Candidates for the stats/hooks pass.
- Store description text still opens with the old display name.
- tools/fix-equipment-data.js would regenerate equipment.db with the OLD names if re-run; do not run it.
- Camouflage Netting: the repo record (renamed) is the Galaxy at War identity; the Clone Wars identity is an ADD and will share the display name, so source-qualified keys (canonicalIdentityKey) must be used to disambiguate.
- Out-of-scope packs: 51 equipment records belong to later batches (16 medical, 17 tech incl. implants/cybernetics/demolitions, 11 tools, 6 security, plus Demolitions Sensor deferred to 0-3C). Duplicate name "Subelectronic Converter" is cyber-subelectronic-converter + implant-subelectronic-converter.

### Execution guardrails

1. Do not invent missing descriptions, statistics, costs, weights, mechanics, schema fields, or tags in Phase 0-3A.
2. Do not merge same-name Camouflage Netting records across sourcebooks; they have materially different published implementations.
3. Do not mutate items deferred to medical, demolitions, cybernetics/implants, upgrade, lightsaber, droid, vehicle, or starship batches.
4. Celegian Life-Support Chamber is not authorized for automatic deletion in this batch despite lacking a standalone general-equipment entry.
5. Preserve record IDs unless a later explicit migration authority says otherwise.

### Reference-impact note for REMOVE/REVIEW records (measured 2026-10-05)

| Repo ID | Disposition | Referenced by id | Referenced by name |
|---|---|---|---|
| `detect-heat-sensor` | REMOVE | data/store/equipment-store-descriptions.json ×1 | data/heroic.json ×2; data/nonheroic.json ×1; data/nonheroic/nonheroic_units.json ×1 |
| `life-breathing-apparatus` | REMOVE | data/store/equipment-store-descriptions.json ×1 | data/heroic.json ×1; data/species-canonical-stats.json ×2; data/species-traits-migrated.json ×4; data/species-traits.json ×4; scripts/engine/poison/poison-engine.js ×1 |
| `life-celegian-support-chamber` | REVIEW | data/store/equipment-store-descriptions.json ×1 | data/heroic.json ×1; data/species-canonical-stats.json ×1; data/species-traits-migrated.json ×1; data/species-traits.json ×1 |
| `life-transliterator` | REMOVE | data/store/equipment-store-descriptions.json ×1 | data/heroic.json ×2; data/species-canonical-stats.json ×2; data/species-languages.json ×2; data/species-traits-migrated.json ×4; data/species-traits.json ×4 |
| `tool-utility-belt-empty` | REMOVE | data/store/equipment-store-descriptions.json ×1 | — |

Name matches in `data/species-*.json`, `data/heroic.json`, `data/nonheroic*.json` are mostly species-trait or NPC prose and must be reviewed individually before any removal.

## Phase 0-3B — Medical / treatment equipment: census and repo reconciliation

Character-scale medical and treatment equipment: kits, medpacs, bacta, diagnostic and treatment devices, poison/radiation treatment and detection devices. Excluded: cybernetic prostheses and implants (0-3D), general scientific gear (0-3A), medical droids, vehicle/starship medical installations. Identity and presence only.

| Result | Count |
|---|---:|
| Canonical identities | 16 |
| Repo records in scope (all of `equipment-medical`) | 16 |
| KEEP | 13 |
| EDIT | 3 |
| ADD / REMOVE / REVIEW | 0 / 0 / 0 |

| # | Canonical identity | Source | Repo record | Disposition |
|---:|---|---|---|---|
| 1 | Bacta Tank (Empty) | Core Rulebook p. 137 | `medical-bacta-tank-empty` - Bacta Tank (Empty) | KEEP |
| 2 | Bacta, 1 Liter | Core Rulebook p. 137 | `medical-bacta-per-liter` - Bacta (Per Liter) | EDIT |
| 3 | Medical Kit | Core Rulebook p. 137 | `medical-kit` - Medical Kit | KEEP |
| 4 | Medpac | Core Rulebook p. 137 | `medical-medpac` - Medpac | KEEP |
| 5 | Surgery Kit | Core Rulebook p. 137 | `medical-surgery-kit` - Surgery Kit | KEEP |
| 6 | Bioscanner | Clone Wars Campaign Guide (page: Phase 1) | `medical-bioscanner` - Bioscanner | KEEP |
| 7 | Anti-Rad Dose | Galaxy at War p. 45 | `medical-anti-rad-dose` - Anti-Rad Dose | KEEP |
| 8 | Cryogenic Pouch | Galaxy at War p. 46 | `medical-cryogenic-pouch` - Cryogenic Pouch | KEEP |
| 9 | Antitoxin Patch | Galaxy of Intrigue p. 66 | `medical-antitoxin-patch` - Antitoxin Patch | KEEP |
| 10 | Toxin Detector | Galaxy of Intrigue p. 67 | `medical-toxin-detector` - Toxin Detector | KEEP |
| 11 | 8-2A Medical Bundle | Jedi Academy Training Manual (page: Phase 1) | `medical-bundle` - Medical Bundle | EDIT |
| 12 | Medical Interface Visor | Knights of the Old Republic Campaign Guide (page: Phase 1) | `medical-interface-visor` - Medical Interface Visor | KEEP |
| 13 | MDS-50 Medisensor | Threats of the Galaxy (page: Phase 1) | `medical-medisensor` - Medisensor | EDIT |
| 14 | FastFlesh Medpac | Threats of the Galaxy (page: Phase 1) | `medical-fastflesh-medpac` - FastFlesh Medpac | KEEP |
| 15 | Antidote Synthesizer | Unknown Regions p. 40 | `medical-antidote-synthesizer` - Antidote Synthesizer | KEEP |
| 16 | Hypoinjector Wristband | Unknown Regions p. 40 | `medical-hypoinjector-wristband` - Hypoinjector Wristband | KEEP |

### Boundary findings

- **Cybernetic Prosthesis** (Core Rulebook p. 137 Medical Gear table): DEFER_TO_0_3D_CYBERNETICS — Although printed in the Medical Gear table, its operative identity is a cybernetic prosthesis and it belongs in the cybernetics/implants census.
- **Subelectronic Converter** (Jedi Academy Training Manual Medical Gear table): DEFER_TO_0_3D_CYBERNETICS — Its own rules explicitly call it a cybernetic enhancement implanted into the subject's head and requiring Cybernetic Surgery. Do not double-count it as ordinary medical gear.
- **Microlab** (Unknown Regions p. 40): ALREADY_0_3A_GENERAL_EQUIPMENT — Scientific analysis equipment, not a medical-treatment identity despite being referenced by Antidote Synthesizer.
- **Medical Suite / Medical Bed** (Starships of the Galaxy): DEFER_VEHICLE_STARSHIP_SYSTEM — Starship installation/system, not a character-scale equipment identity.
- **Bacta patches / synthetic flesh** (Jedi Academy Training Manual 8-2A Medical Bundle description): NOT_SEPARATE_IDENTITY — Mentioned as ordinary contents/materials absent from the bundle; no separate catalog identity is established in this source passage.

### Execution record — 3 identity renames (2026-10-05)

| Repo ID | Old name | Canonical name |
|---|---|---|
| `medical-bacta-per-liter` | Bacta (Per Liter) | Bacta, 1 Liter |
| `medical-bundle` | Medical Bundle | 8-2A Medical Bundle |
| `medical-medisensor` | Medisensor | MDS-50 Medisensor |

- **Packs:** renamed in `packs/equipment.db` and the mirror in `packs/equipment-medical.db`; compared with the previous commit `name` is the only field that changed.
- **Store descriptions:** name and slug updated for the 3 rows (description text unchanged).
- **Consumers:** no character template references these IDs; `equipment-normalizer.js` matches the unchanged record id, so no runtime string needed to change.

Follow-ups:

- Store description text and slugs: description text still opens with the old display name.
- data/nonheroic.json and data/nonheroic/nonheroic_units.json mention "Medisensor" in NPC possessions prose; left unchanged (not a record reference).
- Page provenance for Bioscanner, 8-2A Medical Bundle, Medical Interface Visor, MDS-50 Medisensor and FastFlesh Medpac is deferred to Phase 1.
- tools/fix-equipment-data.js would regenerate the old names if re-run; do not run it.

### Execution guardrails

1. Only the three EDIT display-name normalizations are Phase 0 execution-authorized: Bacta (Per Liter) -> Bacta, 1 Liter; Medical Bundle -> 8-2A Medical Bundle; Medisensor -> MDS-50 Medisensor.
2. Preserve record IDs and all mechanics/stats/descriptions/tags/schema in this phase.
3. Update derived mirrors, store-description keys, tests, templates, or runtime name literals only when required to preserve parity after an authorized rename.
4. Do not create/delete medical records in Phase 0-3B; ADD=0 and REMOVE=0.
5. Do not claim Cybernetic Prosthesis or Subelectronic Converter here; they belong to Phase 0-3D.
6. Do not create Medical Suite/Medical Bed as character equipment; defer to vehicle/starship systems.
7. Do not convert Microlab into a medical record.

## Phase 0-3C — Explosives / demolitions: census and repo reconciliation

Non-grenade explosives, mines, detonation hardware, demolition materials and named improvised explosive constructs. Excluded: grenades and thermal detonators (weapons batch), Demolitions Sensor (0-3A), droid self-destruct systems, facility traps, and upgrades. Identity and presence only. **Authority-only: no repo change.**

| Result | Count |
|---|---:|
| Canonical identities | 14 |
| Repo records in scope (`packs/equipment.db`, all in `equipment-security`) | 6 |
| KEEP | 6 |
| ADD (recorded, not created) | 8 |
| EDIT / REMOVE / REVIEW | 0 / 0 / 0 |

| # | Canonical identity | Source | Repo record | Disposition |
|---:|---|---|---|---|
| 1 | Explosive Charge | Core Rulebook p. 130 | `explosive-charge` - Explosive Charge | KEEP |
| 2 | Detonite | Core Rulebook p. 130 | `explosive-detonite` - Detonite | KEEP |
| 3 | Timer | Core Rulebook p. 130 | `explosive-timer` - Timer | KEEP |
| 4 | Antivehicle Mine | Force Unleashed Campaign Guide p. 100 | — (suggested `explosive-antivehicle-mine`) | ADD |
| 5 | Flechette Mine | Force Unleashed Campaign Guide p. 100 | — (suggested `explosive-flechette-mine`) | ADD |
| 6 | Land Mine | Force Unleashed Campaign Guide p. 100 | — (suggested `explosive-land-mine`) | ADD |
| 7 | Laser Trip Mine | Force Unleashed Campaign Guide p. 101 | — (suggested `explosive-laser-trip-mine`) | ADD |
| 8 | Manual Trigger | Force Unleashed Campaign Guide p. 101 | `explosive-manual-trigger` - Manual Trigger | KEEP |
| 9 | Proximity Mine | Force Unleashed Campaign Guide p. 101 | — (suggested `explosive-proximity-mine`) | ADD |
| 10 | Antipersonnel Mine | Galaxy at War p. 42 | — (suggested `explosive-antipersonnel-mine`) | ADD |
| 11 | Detonite Cord | Galaxy at War p. 43 | `explosive-detonite-cord` - Detonite Cord | KEEP |
| 12 | Ion Mine | Galaxy at War p. 43 | — (suggested `explosive-ion-mine`) | ADD |
| 13 | Limpet Mine | Galaxy at War p. 43 | — (suggested `explosive-limpet-mine`) | ADD |
| 14 | Power-Pack Bomb | Rebellion Era Campaign Guide p. 108 | `explosive-power-pack-bomb` - Power Pack Bomb | KEEP |

### Special findings

- **Smart Mines** (Galaxy at War p. 99): DEFER_NONCATALOG_SYSTEM — Published under Active and Static Defenses as a programmable battlefield-defense system with no normal equipment purchase/stat row. Do not create a standard equipment record in Phase 0-3C.
- **Remote-controlled detonator** (Rebellion Era Campaign Guide p. 108): NOT_SEPARATE_IDENTITY — Mentioned as an optional component of the Power-Pack Bomb recipe; no distinct priced/stat-block equipment identity is established here. Manual Trigger remains the explicit published detonator equipment identity.

- **Power-Pack Bomb:** Canonical name is "Power-Pack Bomb"; repo display name "Power Pack Bomb" is preserved for Phase 0 per the authority (recipe-generated construct; punctuation normalization deferred to content/schema review).

### Execution record

No pack, store-description, template or runtime change. The 8 ADD identities (Antivehicle, Flechette, Land, Laser Trip, Proximity, Antipersonnel, Ion and Limpet Mines) are queued for creation only after canonical description/stat/schema certification.

### Execution guardrails

1. Do not create the 8 ADD records until canonical description/stat/schema certification authorizes production creation.
2. Do not remove or rename any existing explosive record from this authority.
3. Do not convert Smart Mines (Galaxy at War p. 99) into a normal equipment record.
4. Do not create a second detonator record from the Rebellion Era remote-controlled detonator mention.
5. Do not modify weapon grenade records, the Demolitions Sensor (0-3A), droid self-destruct systems, or upgrade catalogs.

### QA gate

- 14 unique canonical ids; 6/6 repo explosive records exist exactly once with matching names; 8 absent and none already present under the suggested ids.
- No overlap with Phase 0-3A scope; verified by `tools/verify-item-weapons-authority.mjs`.

## Phase 0-3D — Cybernetics and implants: census and repo reconciliation

Standard cybernetic prostheses, KOTOR mechanical implants, named cybernetic enhancements, Galaxy at War unique cybernetics, and Legacy Era Yuuzhan Vong bio-implants. Excluded: talent-generated temporary implants, droid-only modifications, vehicle/starship systems, bespoke NPC augmentations, and the Total Replacement Cyborg procedure. Identity and presence only. **Authority-only: no repo change.**

| Result | Count |
|---|---:|
| Canonical identities | 25 |
| Repo `cyber-*` / `implant-*` records (all in `equipment-tech`) | 12 |
| KEEP | 9 |
| EDIT (Subelectronic Converter consolidation) | 1 |
| ADD (recorded, not created) | 15 |
| Repo records to remove/relocate after dependency migration | 2 |

| # | Canonical identity | Source | Repo representation | Disposition |
|---:|---|---|---|---|
| 1 | Cybernetic Prosthesis | Core Rulebook p. 137 | `cyber-prosthesis` - Cybernetic Prosthesis | KEEP |
| 2 | Bio-Stabilizer Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-bio-stabilizer` - Bio-Stabilizer Implant | KEEP |
| 3 | Cardio Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-cardio` - Cardio Implant | KEEP |
| 4 | Combat Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-combat` - Combat Implant | KEEP |
| 5 | Memory Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-memory` - Memory Implant | KEEP |
| 6 | Nerve Reinforcement Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-nerve-reinforcement` - Nerve Reinforcement Implant | KEEP |
| 7 | Regenerative Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-regenerative` - Regenerative Implant | KEEP |
| 8 | Sensory Implant | Knights of the Old Republic Campaign Guide p. 74-75 | `implant-sensory` - Sensory Implant | KEEP |
| 9 | Subelectronic Converter | Jedi Academy Training Manual p. 64 | `cyber-subelectronic-converter` (PRESERVE_CANONICAL_RECORD)<br>`implant-subelectronic-converter` (DUPLICATE_WRONG_FAMILY) | EDIT |
| 10 | Rhen-Orm Biocomputer | Threats of the Galaxy p. 36 | `cyber-rhen-orm-biocomputer` - Rhen-Orm Biocomputer | KEEP |
| 11 | Borg Construct | Galaxy at War p. 49 | — (suggested `cyber-borg-construct`) | ADD |
| 12 | Comlink, Subcutaneous | Galaxy at War p. 49 | — (suggested `cyber-comlink-subcutaneous`) | ADD |
| 13 | Eye, Infrared Sensor | Galaxy at War p. 49 | — (suggested `cyber-eye-infrared-sensor`) | ADD |
| 14 | Eye, Targeting | Galaxy at War p. 49 | — (suggested `cyber-eye-targeting`) | ADD |
| 15 | Eye, Telescopic | Galaxy at War p. 49 | — (suggested `cyber-eye-telescopic`) | ADD |
| 16 | Skeletal Reinforcement | Galaxy at War p. 50 | — (suggested `cyber-skeletal-reinforcement`) | ADD |
| 17 | Sensory Enhancement | Galaxy at War p. 50 | — (suggested `cyber-sensory-enhancement`) | ADD |
| 18 | Tremor Sensor | Galaxy at War p. 50 | — (suggested `cyber-tremor-sensor`) | ADD |
| 19 | Body Spikes | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-body-spikes`) | ADD |
| 20 | Cosmetic Enhancements | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-cosmetic-enhancements`) | ADD |
| 21 | Enhanced Vision | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-enhanced-vision`) | ADD |
| 22 | Natural Armor | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-natural-armor`) | ADD |
| 23 | Natural Weapon | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-natural-weapon`) | ADD |
| 24 | Poison Filter | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-poison-filter`) | ADD |
| 25 | Replacement Body Part | Legacy Era Campaign Guide p. 68 | — (suggested `bioimplant-replacement-body-part`) | ADD |

### Dependency-gated cleanups (NOT executed)

**`implant-subelectronic-converter`** — duplicate of the Jedi Academy Subelectronic Converter; survivor is `cyber-subelectronic-converter`. Dependents measured 2026-10-05: data/implants/implant-effects.json ×1; data/implants/implant-reference-catalog.json ×2; data/implants/sample-implant-items.json ×5; data/store/implant-store-descriptions.json ×2; scripts/dev/audit-implant-effects.mjs ×2; scripts/dev/audit-implant-store-catalog.mjs ×1; scripts/engine/implants/ImplantEffectRules.js ×2. scripts/engine/implants/ImplantEffectRules.js keys its Subelectronic Converter rule (subelectronicConverter flag) on the id "implant-subelectronic-converter". data/implants/{implant-effects,implant-reference-catalog,sample-implant-items}.json and data/store/implant-store-descriptions.json (a dedicated implant store entry, 23,000 cr, Jedi Academy Training Manual) carry the implant id. The survivor cyber-subelectronic-converter must not inherit KOTOR Implant Training mechanics.

**`cyber-energy-binding-prosthesis`** — a misclassification of Bao-Dur's Cybernetic Arm (KOTOR p. 176); relocate to Bao-Dur-specific data, do not erase the concept. Dependents: data/store/equipment-store-descriptions.json ×1. scripts/engine/feats/skill-feat-normalization-hooks.js:86 lists 'energy-binding-prosthesis' in selfInstallAllowedDevices. Bao-Dur appears in data/heroic.json and nonheroic damage-profile data; the unique arm concept must be preserved in Bao-Dur-specific data.

### Noncatalog findings

- **Legacy Era Shaper implant talents:** NOT_EQUIPMENT_IDENTITIES — These are temporary effects created by talents, not priced equipment records.
- **Total Replacement Cyborg:** NONCATALOG_PROCEDURE — A character transformation procedure/rules package, not a standalone equipment identity.
- **Augmented Neurosystem:** NPC_SPECIFIC_NONCATALOG — Appears as Dengar's bespoke cybernetic enhancement in an NPC stat block; no standalone equipment entry in the supplied source corpus.

### Execution guardrails

1. Do not create the 15 ADD records until canonical description/stat/schema certification authorizes production creation.
2. Do not apply KOTOR Implant Training penalties to the Jedi Academy Subelectronic Converter merely because it is implanted; the source calls it a cybernetic enhancement, not a KOTOR implant.
3. Preserve cyber-subelectronic-converter as the canonical Subelectronic Converter identity; remove implant-subelectronic-converter only after dependency migration and verification.
4. Remove cyber-energy-binding-prosthesis from the general equipment catalog only after Bao-Dur-specific references and any runtime/store dependents are rerouted; do not erase Bao-Dur's canonical unique arm concept.
5. Do not create equipment records for Legacy Era Shaper talent-generated temporary implants.
6. Do not create a normal equipment record for Total Replacement Cyborg.
7. Do not promote bespoke NPC augmentations such as Dengar's augmented neurosystem into catalog equipment without a standalone published item entry.
8. Do not alter descriptions, stats, tags, runtime effects, prices, or schema in Phase 0-3D except as strictly necessary to consolidate/remove catalog identity duplicates after dependency migration.

### QA gate

- 25 unique canonical ids; all 12 `cyber-`/`implant-` repo records covered; none of the 15 suggested ADD ids exists; no overlap with 0-3A/0-3B/0-3C.
- The verifier fails if a gated record disappears before its cleanup is marked executed.
- After this phase the only unclaimed equipment records are the 16 `upgrade-*` records (Phase 0-3E).

## Pending phases

0-3E Upgrades / Modifications · 1 Provenance (pages) · 2 Descriptions · 3 Schema · 4 Stats · 5 Reconciliation · 6 Legacy tags · 7 Semantic tags · 8 Migration
