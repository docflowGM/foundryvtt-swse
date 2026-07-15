# Nonheroic Lane B Remainder Audit (generated)

Generated: 2026-07-15T20:44:59.233Z

Read-only classification of everything the Lane A promotion tool cannot
and does not touch. No profile was promoted, no weapon item was created,
and no pack/runtime file was modified in producing this report.

## Summary

- Candidate rows in source report: 4352 (generated 2026-07-14T14:18:55.893Z)
- Profile files scanned for already-covered exclusion: 10 (644 records)
- Weapon compendium items scanned: 372
- Rows excluded as already covered: 1108

- ordinary-weapon-special-mode: 198
- area-autofire-grenade-special: 480
- rider-or-condition: 9
- formula-unclear: 283
- natural-or-unarmed: 1138
- no-compendium-match: 509
- ambiguous-compendium-match: 0
- safe-lane-a-still-uncovered: 617

> "Already covered" uses the same actor-slug + rawIncludes-marker (weapon name substring) convention as every prior pass. This is deliberately coarse: if an actor has both a plain weapon row (Lane-A-promoted) and a separate special-mode/variant row for the same weapon name, the variant row can be swept into "already covered" even though it represents distinct behavior still needing its own handling. This mirrors a known limitation documented since pass 1 and is not fixed here.

## 1. Top 25 Lane B groups by count

- **Unarmed** — 946 rows — bucket: `natural-or-unarmed` — action: `natural-or-unarmed-profile-needed`
- **Blaster Rifle** — 179 rows — bucket: `formula-unclear` — action: `formula-override-review-needed`
- **Lightsaber** — 115 rows — bucket: `ordinary-weapon-special-mode` — action: `special-mode-variant-profile-needed`
- **Bite** — 85 rows — bucket: `natural-or-unarmed` — action: `natural-or-unarmed-profile-needed`
- **Knife** — 73 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Blaster Rifle** — 63 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Frag Grenade (1)** — 56 rows — bucket: `area-autofire-grenade-special` — action: `grenade-or-explosive-profile-needed`
- **Heavy Blaster Rifle** — 55 rows — bucket: `formula-unclear` — action: `formula-override-review-needed`
- **Claws (2)** — 53 rows — bucket: `natural-or-unarmed` — action: `natural-or-unarmed-profile-needed`
- **Combat Gloves** — 53 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Frag Grenade (2)** — 48 rows — bucket: `area-autofire-grenade-special` — action: `grenade-or-explosive-profile-needed`
- **Vibro-Axe / Vibro-Axe *** — 39 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Spear** — 30 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Quarterstaff** — 28 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Stun Grenade (2)** — 27 rows — bucket: `area-autofire-grenade-special` — action: `grenade-or-explosive-profile-needed`
- **Force Pike** — 23 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Heavy Blaster Rifle** — 22 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Light Repeating Blaster** — 21 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Bayonet** — 21 rows — bucket: `no-compendium-match` — action: `missing-compendium-weapon-investigation`
- **Light Repeating Blaster ( Braced )** — 19 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Heavy Repeating Blaster** — 16 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Blaster Pistol** — 16 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Sporting Blaster Pistol** — 15 rows — bucket: `formula-unclear` — action: `formula-override-review-needed`
- **Blaster Carbine** — 14 rows — bucket: `area-autofire-grenade-special` — action: `area-autofire-profile-needed`
- **Gore** — 14 rows — bucket: `natural-or-unarmed` — action: `natural-or-unarmed-profile-needed`

## 2. Special-mode ordinary weapons (198)

- **Lightsaber** (`lightsaber`) — 115 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Dark Jedi, Jedi Commander, Dark Jedi Master, Sith Lord, Jensaarai Defender, Imperial Knight
  - sample raw rows: "Lightsaber +7 (3d8+6) with Rapid Strike"; "Lightsaber +7 (3d8+5) with Rapid Strike"; "Lightsaber +19 (3d8+12) with Rapid Strike"; "Lightsaber +16 (2d8+10) with Double Attack"; "Lightsaber +11 (3d8+10) with Triple Attack"; "Lightsaber +12 (3d8+7) with Mighty Swing"
- **Blaster Rifle** (`blaster rifle`) — 12 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: SpecForce Elite Soldier, Byss Elite Stormtrooper, Wheel Security, Stormtrooper Commander, Durge, Han Solo, Stormtrooper Armor
  - sample raw rows: "Blaster Rifle +15 (3d8+8) with Double Attack"; "Blaster Rifle +13 (3d8+5) with Double Attack"; "Blaster Rifle +10 (3d8+4) with Double Attack"; "Blaster Rifle +5 (3d8+2) with Double Attack"; "Blaster Rifle +15 (3d8+8) with Double Attack"; "Blaster Rifle +9 (3d8+8) with Double Attack"
- **Heavy Blaster Rifle** (`heavy blaster rifle`) — 10 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Trandoshan Sergeant, Elite Warrior, Kagen Brendel, Sisla
  - sample raw rows: "Heavy Blaster Rifle +12 (3d10+8) with Double Attack"; "Heavy Blaster Rifle +10 (5d10+8) with Double Attack"; "Heavy Blaster Rifle +15 (3d10+8) with Double Attack"; "Heavy Blaster Rifle +10 (3d10+8) with Triple Attack"; "Heavy Blaster Rifle +12 (3d10+8) with Double Attack"; "Heavy Blaster Rifle +10 (5d10+8) with Double Attack"
- **Vibroblade** (`vibroblade`) — 8 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Notorious Outlaw, Pirate Captain, Clone Assassin
  - sample raw rows: "Vibroblade +7 (3d6+6) with Rapid Strike"; "Vibroblade +4 (2d6+5) with Double Attack"; "Vibroblade +12 (3d6+7) with Rapid Strike"; "Vibroblade +10 (2d6+7) with Rapid Strike"; "Vibroblade +7 (3d6+6) with Rapid Strike"; "Vibroblade +4 (2d6+5) with Double Attack"
- **Blaster Carbine** (`blaster carbine`) — 6 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Storm Commando, Liash Keane, Boba Fett, Avenger, Boba Fett, Tyber Zann
  - sample raw rows: "Blaster Carbine +7 (3d8+3) with Double Attack"; "Blaster Carbine +7 (3d8+3) with Double Attack"; "Blaster Carbine +5 (3d8+5) with Double Attack"; "Blaster Carbine +5 (3d8+3) with Double Attack"; "Blaster Carbine +15 (3d8+7) with Double Attack"; "Blaster Carbine +8 (3d8+6) with Double Attack"
- **Electrostaff** (`electrostaff`) — 6 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Coruscant Guard Veteran, Knighthunter
  - sample raw rows: "Electrostaff +11 (3d6+4) with Mighty Swing"; "Electrostaff +12 (3d6+8) with Rapid Strike"; "Electrostaff +10 (3d6+8) with Rapid Strike"; "Electrostaff +11 (3d6+4) with Mighty Swing"; "Electrostaff +12 (3d6+8) with Rapid Strike"; "Electrostaff +10 (3d6+8) with Rapid Strike"
- **Blaster Pistol** (`blaster pistol`) — 6 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Elite Commando, Liash Keane, Lando Calrissian, Lando Calrissian, Dashing Scoundrel, Oorn Noth
  - sample raw rows: "Blaster Pistol +11 (3d6+7) with Double Attack"; "Blaster Pistol +5 (3d6+5) with Double Attack"; "Blaster Pistol +4 (3d6+4) with Double Attack"; "Blaster Pistol +11 (3d6+7) with Double Attack"; "Blaster Pistol +3 (3d6+3) with Double Attack"; "Blaster Pistol +6 (3d6+5) with Double Attack"
- **Sniper Blaster Rifle** (`sniper blaster rifle`) — 5 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: First Order Specialist, Zam Wesell
  - sample raw rows: "Sniper Blaster Rifle +8 (3d10+1)"; "Sniper Blaster Rifle +8 (3d10+1)"; "Sniper Blaster Rifle +11 (3d10+5)"; "Sniper Blaster Rifle +12 (4d10+5) with Deadeye"; "Sniper Blaster Rifle +14 (5d10+5) with Deadeye"
- **Heavy Blaster Pistol** (`heavy blaster pistol`) — 4 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Rodian Black Sun Vigo, Dool Pundar, Captain Greeku
  - sample raw rows: "Heavy Blaster Pistol +10 (3d8+9) with Double Attack"; "Heavy Blaster Pistol +10 (3d8+9) with Double Attack"; "Heavy Blaster Pistol +8 (3d8+8) with Double Attack"; "Heavy Blaster Pistol +6 (3d8+5) with Double Attack"
- **Lightsaber Pike *** (`lightsaber pike`) — 4 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Elite Shadow Guard
  - sample raw rows: "Lightsaber Pike * +20 (4d8+14; 2-Square Reach ) with Double Attack"; "Lightsaber Pike * +17 (4d8+14; 2-Square Reach ) with Triple Attack"; "Lightsaber Pike * +20 (4d8+14; 2-Square Reach ) with Double Attack"; "Lightsaber Pike * +17 (4d8+14; 2-Square Reach ) with Triple Attack"
- **Sith Tremor Sword** (`sith tremor sword`) — 4 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Sith Bladeborn
  - sample raw rows: "Sith Tremor Sword +12 (3d6+4) with Rapid Strike"; "Sith Tremor Sword +9 (4d6+4) with Improved Rapid Strike"; "Sith Tremor Sword +12 (3d6+4) with Rapid Strike"; "Sith Tremor Sword +9 (4d6+4) with Improved Rapid Strike"
- **Short Lightsaber** (`short lightsaber`) — 3 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Auxiliary Inquisitor, Vandar Tokare
  - sample raw rows: "Short Lightsaber +4 (3d6+4) with Rapid Strike"; "Short Lightsaber +4 (3d6+4) with Rapid Strike"; "Short Lightsaber +18 (2d6+11) with Double Attack"
- **Sporting Blaster Pistol** (`sporting blaster pistol`) — 3 rows — packs: npc — action: `special-mode-variant-profile-needed`
  - sample actors: Padmé Amidala, Leia Organa
  - sample raw rows: "Sporting Blaster Pistol +4 (3d4+5) with Double Attack"; "Sporting Blaster Pistol +6 (3d4+7) with Double Attack"; "Sporting Blaster Pistol +6 (4d4+7) with Double Attack"
- **Blaster Cannon** (`blaster cannon`) — 2 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Ship Gunner
  - sample raw rows: "Blaster Cannon +6 (3d12+5) with Double Attack"; "Blaster Cannon +6 (3d12+5) with Double Attack"
- **Vibrodagger** (`vibrodagger`) — 2 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Ship Captain
  - sample raw rows: "Vibrodagger +8 (2d4+6) with Double Attack"; "Vibrodagger +8 (2d4+6) with Double Attack"
- **Vibrosword** (`vibrosword`) — 2 rows — packs: nonheroic, npc — action: `special-mode-variant-profile-needed`
  - sample actors: Trandoshan Scavenger
  - sample raw rows: "Vibrosword +7 (3d8+2) with Mighty Swing"; "Vibrosword +7 (3d8+2) with Mighty Swing"
- **Double-Barreled Blaster Carbine** (`double barreled blaster carbine`) — 2 rows — packs: npc — action: `special-mode-variant-profile-needed`
  - sample actors: Cade Skywalker, Bounty Hunter, Cade Skywalker
  - sample raw rows: "Double-Barreled Blaster Carbine +4 (3d8+6) with Double Attack"; "Double-Barreled Blaster Carbine +6 (3d8+7) with Double Attack"
- **Wrist Blaster** (`wrist blaster`) — 1 rows — packs: npc — action: `special-mode-variant-profile-needed`
  - sample actors: Bo-Katan Kryze, Liberator
  - sample raw rows: "Wrist Blaster +20 (4d4+10) with Trigger Work"
- **Lightfoil** (`lightfoil`) — 1 rows — packs: npc — action: `special-mode-variant-profile-needed`
  - sample actors: High Lady Brezwalt III
  - sample raw rows: "Lightfoil +10 (2d8+9) with Double Attack"
- **Double-Bladed Lightsaber** (`double bladed lightsaber`) — 1 rows — packs: npc — action: `special-mode-variant-profile-needed`
  - sample actors: Darth Bandon
  - sample raw rows: "Double-Bladed Lightsaber +13 (3d8+9) with Mighty Swing"
- **Long-Handle Lightsaber** (`long handle lightsaber`) — 1 rows — packs: npc — action: `special-mode-variant-profile-needed`
  - sample actors: Darth Nihl
  - sample raw rows: "Long-Handle Lightsaber +19 (3d10+10) with Rapid Strike"

## 3. Area/autofire/grenade/explosive rows (480)

- **Blaster Rifle** (`blaster rifle`) — 63 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Elite Stormtrooper, Byss Elite Stormtrooper Squad, Veteran Stormtrooper, SpecForce Elite Soldier, CSA Trooper, CSA Commando
  - sample raw rows: "Blaster Rifle +11 (4d8+3) with Rapid Shot"; "Blaster Rifle +8 (5d8+3) with Burst Fire"; "Blaster Rifle +20 (3d8+5, 1-Square Splash )"; "Blaster Rifle +17 (3d8+5, 1-Square Splash )"; "Blaster Rifle +17 (3d8+5, 1-Square Splash ) with Double Attack"; "Blaster Rifle +6 (5d8) with Burst Fire"
- **Frag Grenade (1)** (`frag grenade 1`) — 56 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Elite Stormtrooper, Clone Shadow Trooper, Veteran Stormtrooper, Veteran Heavy Stormtrooper, SpecForce Officer, Scout Trooper
  - sample raw rows: "Frag Grenade (1) +12 (4d6+1, 2-Square Burst )"; "Frag Grenade (1) +10 (4d6+2, 2-Square Burst )"; "Frag Grenade (1) +10 (4d6, 2-Square Burst )"; "Frag Grenade (1) +10 (4d6, 2-Square Burst )"; "Frag Grenade (1) +8 (4d6+3, 2-Square Burst )"; "Frag Grenade (1) +5 (4d6, 2-Square Burst )"
- **Frag Grenade (2)** (`frag grenade 2`) — 48 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Byss Elite Stormtrooper Squad, Mandalorian Scout, Elite Republic Trooper, Commando Strike Leader, CSA Commando, CompForce Trooper
  - sample raw rows: "Frag Grenade (2) +17 (4d6+5, 2-Square Burst , 1-Square Splash )"; "Frag Grenade (2) +6 (4d6+2, 2-Square Burst )"; "Frag Grenade (2) +8 (4d6, 2-square Burst )"; "Frag Grenade (2) +7 (4d6+1, 2-Square Burst )"; "Frag Grenade (2) +7 (4d6+2, 2-Square Burst )"; "Frag Grenade (2) +6 (4d6, 2-Square Burst )"
- **Stun Grenade (2)** (`stun grenade 2`) — 27 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Medic, Pirate, Coruscant Guard Veteran, Military Guard Commander, Citadel Watchman, Clone Commando
  - sample raw rows: "Stun Grenade (2) +5 (4d6 ( Stun ), 2-Square Burst )"; "Stun Grenade (2) +7 (4d6+2 ( Stun ), 2-Square Burst )"; "Stun Grenade (2) +12 (4d6+3 ( Stun ), 2-Square Burst )"; "Stun Grenade (2) +15 (4d6+5 ( Stun ), 2-Square Burst )"; "Stun Grenade (2) +12 (4d6+4 ( Stun ), 2-Square Burst )"; "Stun Grenade (2) +12 (4d6+3 ( Stun ), 2-Square Burst )"
- **Heavy Blaster Rifle** (`heavy blaster rifle`) — 22 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Chiss Mercenary, Enforcer, Trandoshan Bounty Hunter, Trandoshan Sergeant, Elite Soldier, Elite Warrior
  - sample raw rows: "Heavy Blaster Rifle +7 (4d10+2) with Rapid Shot"; "Heavy Blaster Rifle +4 (5d10+2) with Burst Fire"; "Heavy Blaster Rifle +3 (5d10+2) with Burst Fire"; "Heavy Blaster Rifle +3 (4d10+2) with Rapid Shot"; "Heavy Blaster Rifle +13 (5d10+8) with Controlled Burst"; "Heavy Blaster Rifle +13 (4d10+9) with Rapid Shot"
- **Light Repeating Blaster** (`light repeating blaster`) — 21 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Veteran Heavy Stormtrooper, Army Soldier, Heavy Stormtrooper, Sith Commando, Mandalorian Supercommando, Clone Commando
  - sample raw rows: "Light Repeating Blaster +6 (3d8, 2-Square Autofire )"; "Light Repeating Blaster +6 (5d8) with Burst Fire"; "Light Repeating Blaster +3 (3d8+1, 2-Square Autofire )"; "Light Repeating Blaster +2 (3d8, 2-Square Autofire )"; "Light Repeating Blaster +2 (5d8) with Burst Fire"; "Light Repeating Blaster +3 (3d8, 2-Square Autofire )"
- **Light Repeating Blaster ( Braced )** (`light repeating blaster braced`) — 19 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Veteran Heavy Stormtrooper, Heavy Stormtrooper, Sith Commando, Mandalorian Supercommando, Clone Commando, Clone Heavy Trooper
  - sample raw rows: "Light Repeating Blaster ( Braced ) +9 (3d8, 2-Square Autofire )"; "Light Repeating Blaster ( Braced ) +9 (5d8) with Burst Fire"; "Light Repeating Blaster ( Braced ) +5 (3d8, 2-Square Autofire )"; "Light Repeating Blaster ( Braced ) +5 (5d8) with Burst Fire"; "Light Repeating Blaster ( Braced ) +6 (3d8, 2-Square Autofire )"; "Light Repeating Blaster ( Braced ) +17 (3d8+8, 2-Square Autofire )"
- **Heavy Repeating Blaster** (`heavy repeating blaster`) — 16 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: SpecForce Heavy Weapons Specialist, ARC Trooper, Hired Sentry, Swamptrooper, Haden Vazzar, Dob and Del Moomo
  - sample raw rows: "Heavy Repeating Blaster +10 (3d10+3, 2-Square Autofire )"; "Heavy Repeating Blaster +5 (5d10+3) with Burst Fire"; "Heavy Repeating Blaster +10 (3d10+5, 2-Square Autofire )"; "Heavy Repeating Blaster +10 (5d10+5) with Burst Fire"; "Heavy Repeating Blaster +4 (3d10+3, 2-Square Autofire )"; "Heavy Repeating Blaster +4 (5d10+3) with Burst Fire"
- **Blaster Pistol** (`blaster pistol`) — 16 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Army Soldier, Commando, Saboteur, Hired Blaster Squad, Information Broker, Commando Squad Leader
  - sample raw rows: "Blaster Pistol +4 (4d6+1) with Rapid Shot"; "Blaster Pistol +11 (4d6+2) with Rapid Shot"; "Blaster Pistol +7 (4d6+4) with Rapid Shot"; "Blaster Pistol +12 (3d6, 1-Square Splash )"; "Blaster Pistol +4 (4d6+2) with Rapid Shot"; "Blaster Pistol +15 (4d6+4) with Rapid Shot"
- **Blaster Carbine** (`blaster carbine`) — 14 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Trandoshan Elite Mercenary, Mandalorian Commando, Hired Blaster Squad, Trandoshan Elite Mercenary Squad, Trandoshan Mercenary Squad
  - sample raw rows: "Blaster Carbine +15 (5d8+9) with Controlled Burst"; "Blaster Carbine +7 (4d8+4) with Rapid Shot"; "Blaster Carbine +13 (3d8, 1-Square Splash )"; "Blaster Carbine +21 (3d8+9, 1-Square Splash )"; "Blaster Carbine +19 (5d8+9, 1-Square Splash ) with Burst Fire"; "Blaster Carbine +19 (3d8+6, 1-Square Splash )"
- **Heavy Repeating Blaster ( Braced )** (`heavy repeating blaster braced`) — 12 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: SpecForce Heavy Weapons Specialist, ARC Trooper, Hired Sentry
  - sample raw rows: "Heavy Repeating Blaster ( Braced ) +8 (3d10+3, 2-Square Autofire )"; "Heavy Repeating Blaster ( Braced ) +8 (5d10+3) with Burst Fire"; "Heavy Repeating Blaster ( Braced ) +12 (3d10+5, 2-Square Autofire )"; "Heavy Repeating Blaster ( Braced ) +12 (5d10+5) with Burst Fire"; "Heavy Repeating Blaster ( Braced ) +7 (3d10+3, 2-Square Autofire )"; "Heavy Repeating Blaster ( Braced ) +7 (5d10+3) with Burst Fire"
- **Grenade Launcher** (`grenade launcher`) — 12 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: First Order Jet Trooper, Clone Jet Trooper, Trandoshan Bounty Hunter, Wookiee Warrior, Hired Sentry
  - sample raw rows: "Grenade Launcher +5 (4d6+1, 2-Square Burst )"; "Grenade Launcher +8 (3d6+1 ( Ion ), 2-Square Burst )"; "Grenade Launcher +8 (4d6+1 ( Ion ), 2-Square Burst ) with Deadeye"; "Grenade Launcher +5 (4d6+2 ( Stun ), 2-Square Burst )"; "Grenade Launcher +6 (4d6, 2-Square Burst )"; "Grenade Launcher +9 (4d6+3, 2-Square Burst )"
- **Flamethrower** (`flamethrower`) — 12 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Clone Blaze Trooper, IG-88, Jango Fett, Boba Fett, Avenger, Bossk, Durge
  - sample raw rows: "Flamethrower +10 (3d6+3 ( Fire ), 6-Square Cone )"; "Flamethrower +15 (3d6+7 ( Fire ), 6-Square Cone )"; "Flamethrower +13 (4d6+7 ( Fire ), 6-Square Cone ) with Rapid Shot"; "Flamethrower +10 (3d6+7 ( Fire ), 6-Square Cone )"; "Flamethrower +8 (4d6+7 ( Fire ), 6-Square Cone ) with Rapid Shot"; "Flamethrower +17 (3d6+7 ( Fire ), 6-Square Cone )"
- **Thermal Detonator (1)** (`thermal detonator 1`) — 10 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Storm Commando, Mon Calamari Radical, Consortium Defiler, Jodo Kast, Anakin Solo, Kyle Katarn, Jedi Battlemaster
  - sample raw rows: "Thermal Detonator (1) +12 (8d6+3, 4-Square Burst )"; "Thermal Detonator (1) +4 (8d6+2, 4-Square Burst )"; "Thermal Detonator (1) +6 (8d6+3, 4-Square Burst )"; "Thermal Detonator (1) +12 (8d6+5, 4-Square Burst )"; "Thermal Detonator (1) +12 (8d6+3, 4-Square Burst )"; "Thermal Detonator (1) +4 (8d6+2, 4-Square Burst )"
- **Missile Launcher** (`missile launcher`) — 9 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: SpecForce Heavy Weapons Specialist, First Order Specialist, ARC Trooper, Boba Fett, Avenger, Boba Fett, Alpha-17
  - sample raw rows: "Missile Launcher +10 (6d6+3, 2-Square Burst )"; "Missile Launcher +8 (6d6+1, 2-Square Burst )"; "Missile Launcher +12 (6d6+5, 2-Square Splash )"; "Missile Launcher +10 (6d6+3, 2-Square Burst )"; "Missile Launcher +8 (6d6+1, 2-Square Burst )"; "Missile Launcher +10 (6d6+3, 2-Square Splash )"
- **Frag Grenade (4)** (`frag grenade 4`) — 9 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: New Republic Commando, Mandalorian Supercommando, Rebel Vanguard, Bo-Katan Kryze, Liberator, Anakin Solo, Bo-Katan Kryze
  - sample raw rows: "Frag Grenade (4) +6 (4d6+2, 2-Square Burst )"; "Frag Grenade (4) +19 (4d6+8, 2-Square Splash )"; "Frag Grenade (4) +3 (4d6, 2-Square Burst )"; "Frag Grenade (4) +19 (4d6+8, 2-Square Burst )"; "Frag Grenade (4) +6 (4d6+2, 2-Square Burst )"; "Frag Grenade (4) +19 (4d6+8, 2-Square Splash )"
- **Ion Grenade (2)** (`ion grenade 2`) — 7 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Elite Soldier, ARC Trooper, Clone Commando, Alpha-17
  - sample raw rows: "Ion Grenade (2) +13 (4d6+5 ( Ion ), 2-Square Burst )"; "Ion Grenade (2) +11 (4d6+3 ( Ion ), 2-Square Burst )"; "Ion Grenade (2) +12 (4d6+3 ( Ion ), 2-Square Burst )"; "Ion Grenade (2) +13 (4d6+5 ( Ion ), 2-Square Burst )"; "Ion Grenade (2) +11 (4d6+3 ( Ion ), 2-Square Burst )"; "Ion Grenade (2) +12 (4d6+3 ( Ion ), 2-Square Burst )"
- **Rail Detonator Gun** (`rail detonator gun`) — 6 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Militia Soldier, Militia Saboteur, Jumptrooper
  - sample raw rows: "Rail Detonator Gun +9 (3d8, 1-Square Splash )"; "Rail Detonator Gun +10 (3d8+1, 1-Square Splash )"; "Rail Detonator Gun +12 (3d8+3, 1-Square Splash )"; "Rail Detonator Gun +9 (3d8, 1-Square Splash )"; "Rail Detonator Gun +10 (3d8+1, 1-Square Splash )"; "Rail Detonator Gun +12 (3d8+3, 1-Square Splash )"
- **Stun Grenade (1)** (`stun grenade 1`) — 6 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Imperial Dungeoneer, SpecForce Infiltrator, Epsis Sentry
  - sample raw rows: "Stun Grenade (1) +9 (4d6+2 ( Stun ), 2-Square Burst )"; "Stun Grenade (1) +7 (4d6+3 ( Stun ), 2-Square Burst )"; "Stun Grenade (1) +2 (4d6+1 ( Stun ), 2-Square Burst )"; "Stun Grenade (1) +9 (4d6+2 ( Stun ), 2-Square Burst )"; "Stun Grenade (1) +7 (4d6+3 ( Stun ), 2-Square Burst )"; "Stun Grenade (1) +2 (4d6+1 ( Stun ), 2-Square Burst )"
- **Flechette Launcher** (`flechette launcher`) — 5 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Swamptrooper, EVO Trooper, Durge
  - sample raw rows: "Flechette Launcher +7 (3d8+2, 1-Square Splash )"; "Flechette Launcher +9 (3d8+2, 1-Square Splash )"; "Flechette Launcher +14 (4d6+8, 2-Square Splash )"; "Flechette Launcher +7 (3d8+2, 1-Square Splash )"; "Flechette Launcher +9 (3d8+2, 1-Square Splash )"
- **Stun Grenade (4)** (`stun grenade 4`) — 5 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Spacetrooper, Calo Nord, Bonnie Reed, Boba Fett, Avenger
  - sample raw rows: "Stun Grenade (4) +9 (4d6+2 ( Stun ), 2-Square Burst )"; "Stun Grenade (4) +14 (4d6+6 ( Stun ), 2-Square Burst )"; "Stun Grenade (4) +14 (4d6+7 ( Stun ), 2-Square Burst )"; "Stun Grenade (4) +10 (4d6+3 ( Stun ), 2-Square Burst )"; "Stun Grenade (4) +9 (4d6+2 ( Stun ), 2-Square Burst )"
- **Concussion Grenade (2)** (`concussion grenade 2`) — 4 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: First Order Specialist, Mandalorian Commando
  - sample raw rows: "Concussion Grenade (2) +2 (8d6+1, 2-Square Burst )"; "Concussion Grenade (2) +8 (8d6+4, 2-Square Burst )"; "Concussion Grenade (2) +2 (8d6+1, 2-Square Burst )"; "Concussion Grenade (2) +8 (8d6+4, 2-Square Burst )"
- **ESPO 500 Riot Gun** (`espo 500 riot gun`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Espo Trooper, Elite Espo Trooper
  - sample raw rows: "ESPO 500 Riot Gun +2 (3d8, 2-Square Autofire )"; "ESPO 500 Riot Gun +7 (3d8+2, 2-Square Autofire )"; "ESPO 500 Riot Gun +2 (3d8, 2-Square Autofire )"; "ESPO 500 Riot Gun +7 (3d8+2, 2-Square Autofire )"
- **Heavy Blaster Pistol** (`heavy blaster pistol`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Trandoshan Elite Mercenary Squad, Trandoshan Mercenary Squad
  - sample raw rows: "Heavy Blaster Pistol +19 (3d8+5, 1-Square Splash )"; "Heavy Blaster Pistol +18 (3d8+4, 1-Square Splash )"; "Heavy Blaster Pistol +19 (3d8+5, 1-Square Splash )"; "Heavy Blaster Pistol +18 (3d8+4, 1-Square Splash )"
- **E-Web Repeating Blaster ( Braced )** (`e web repeating blaster braced`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Byss Elite Stormtrooper Gunner
  - sample raw rows: "E-Web Repeating Blaster ( Braced ) +16 (3d12+9, 2-Square Autofire )"; "E-Web Repeating Blaster ( Braced ) +16 (5d12+9) with Burst Fire"; "E-Web Repeating Blaster ( Braced ) +16 (3d12+9, 2-Square Autofire )"; "E-Web Repeating Blaster ( Braced ) +16 (5d12+9) with Burst Fire"
- **Thermal Detonator (4)** (`thermal detonator 4`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Trandoshan Raider, Zardra, Vril Vrakth
  - sample raw rows: "Thermal Detonator (4) +14 (8d6+6, 4-Square Burst )"; "Thermal Detonator (4) +8 (8d6+4, 4-Square Burst )"; "Thermal Detonator (4) +14 (8d6+6, 4-Square Burst )"; "Thermal Detonator (4) +12 (8d6+5, 4-Square Burst )"
- **Rotary Blaster Cannon** (`rotary blaster cannon`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Clone Trooper with Repeating Blaster
  - sample raw rows: "Rotary Blaster Cannon +5 (3d8+1, 2-Square Autofire )"; "Rotary Blaster Cannon +0 (3d8+1, 2-Square Autofire ) with Burst Fire"; "Rotary Blaster Cannon +5 (3d8+1, 2-Square Autofire )"; "Rotary Blaster Cannon +0 (3d8+1, 2-Square Autofire ) with Burst Fire"
- **Rotary Blaster Cannon ( Braced )** (`rotary blaster cannon braced`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Clone Trooper with Repeating Blaster
  - sample raw rows: "Rotary Blaster Cannon ( Braced ) +8 (3d8+1, 2-Square Autofire )"; "Rotary Blaster Cannon ( Braced ) +3 (5d8+1, 2-Square Autofire ) with Burst Fire"; "Rotary Blaster Cannon ( Braced ) +8 (3d8+1, 2-Square Autofire )"; "Rotary Blaster Cannon ( Braced ) +3 (5d8+1, 2-Square Autofire ) with Burst Fire"
- **Blaster Cannon** (`blaster cannon`) — 4 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Spacetrooper, IG-88
  - sample raw rows: "Blaster Cannon +9 (3d12+2, 1-Square Splash )"; "Blaster Cannon +15 (3d12+7, 1-Square Splash )"; "Blaster Cannon +13 (4d12+7, 1-Square Splash ) with Rapid Shot"; "Blaster Cannon +9 (3d12+2, 1-Square Splash )"
- **Burning Assault** (`burning assault`) — 3 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Mandalorian Crusader, Rohlan Dyre
  - sample raw rows: "Burning Assault +3 (3d6+1 ( Fire ), 6-Square Cone )"; "Burning Assault +3 (3d6+1 ( Fire ), 6-Square Cone )"; "Burning Assault +15 (6d6+7 ( Fire ), 6-Square Cone )"
- **Ion Grenade (1)** (`ion grenade 1`) — 3 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Clone Commander, Clone Commander Cody
  - sample raw rows: "Ion Grenade (1) +7 (4d6+1 ( Ion ), 2-Square Burst )"; "Ion Grenade (1) +16 (4d6+6 ( Ion ), 2-Square Burst )"; "Ion Grenade (1) +7 (4d6+1 ( Ion ), 2-Square Burst )"
- **Missile Launcher ( Mandalorian Jet Pack )** (`missile launcher mandalorian jet pack`) — 3 rows — packs: npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Bo-Katan Kryze, Liberator, Jango Fett, Bo-Katan Kryze
  - sample raw rows: "Missile Launcher ( Mandalorian Jet Pack ) +14 (6d6+8, 2-Square Splash )"; "Missile Launcher ( Mandalorian Jet Pack ) +17 (6d6+7, 2-Square Splash )"; "Missile Launcher ( Mandalorian Jet Pack ) +8 (6d6+5, 2-Square Splash )"
- **Thermal Detonator (2)** (`thermal detonator 2`) — 3 rows — packs: npc — action: `area-autofire-profile-needed`
  - sample actors: Calo Nord, Zerik, Boushh
  - sample raw rows: "Thermal Detonator (2) +14 (8d6+6, 4-Square Burst )"; "Thermal Detonator (2) +10 (8d6+4, 4-Square Burst )"; "Thermal Detonator (2) +12 (8d6+5, 4-Square Burst )"
- **Subrepeating Blaster** (`subrepeating blaster`) — 2 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: First Order Specialist
  - sample raw rows: "Subrepeating Blaster +3 (3d6+1, 2-Square Autofire )"; "Subrepeating Blaster +3 (3d6+1, 2-Square Autofire )"
- **Double-Barreled Blaster Carbine** (`double barreled blaster carbine`) — 2 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: First Order Jet Trooper
  - sample raw rows: "Double-Barreled Blaster Carbine +6 (3d8+1, 2-Square Area Attack ) with Double Shot"; "Double-Barreled Blaster Carbine +6 (3d8+1, 2-Square Area Attack ) with Double Shot"
- **Blast Cannon** (`blast cannon`) — 2 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Imperial Gunner
  - sample raw rows: "Blast Cannon +6 (3d8*, 1-Square Splash **)"; "Blast Cannon +6 (3d8*, 1-Square Splash **)"
- **Knife** (`knife`) — 2 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Trandoshan Elite Mercenary Squad
  - sample raw rows: "Knife +19 (1d4+7, Area Attack )"; "Knife +19 (1d4+7, Area Attack )"
- **Frag Grenade** (`frag grenade`) — 2 rows — packs: nonheroic, npc — action: `grenade-or-explosive-profile-needed`
  - sample actors: Shoretrooper
  - sample raw rows: "Frag Grenade +5 (4d6, 2-Square Burst )"; "Frag Grenade +5 (4d6, 2-Square Burst )"
- **Stun Baton** (`stun baton`) — 2 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Military Guard Squad
  - sample raw rows: "Stun Baton +24 (2d6+8 ( Stun ), Area Attack )"; "Stun Baton +24 (2d6+8 ( Stun ), Area Attack )"
- **Heavy Blaster Cannon** (`heavy blaster cannon`) — 2 rows — packs: nonheroic, npc — action: `area-autofire-profile-needed`
  - sample actors: Joker Squad Heavy Weapons Specialist
  - sample raw rows: "Heavy Blaster Cannon +8 (4d12, 1-Square Splash )"; "Heavy Blaster Cannon +8 (4d12, 1-Square Splash )"
- _(18 more groups omitted from this Markdown sample; see the JSON report.)_

## 4. Rider/condition rows (9)

- **Amphistaff (Spear Form)** (`amphistaff spear form`) — 2 rows — packs: nonheroic, npc — action: `rider-profile-needed`
  - sample actors: Yuuzhan Vong Advance Agent
  - sample raw rows: "Amphistaff (Spear Form) +5 (1d8 ( Amphistaff Poison))"; "Amphistaff (Spear Form) +5 (1d8 ( Amphistaff Poison))"
- **Amphistaff (Whip Form)** (`amphistaff whip form`) — 2 rows — packs: nonheroic, npc — action: `rider-profile-needed`
  - sample actors: Yuuzhan Vong Advance Agent
  - sample raw rows: "Amphistaff (Whip Form) +5* (1d4 ( Amphistaff Poison))"; "Amphistaff (Whip Form) +5* (1d4 ( Amphistaff Poison))"
- **Saberdart Launcher** (`saberdart launcher`) — 1 rows — packs: npc — action: `rider-profile-needed`
  - sample actors: Jango Fett
  - sample raw rows: "Saberdart Launcher +17 (1d4+7 ( Saberdart Poison ))"
- **S-5 Heavy Blaster Pistol** (`s 5 heavy blaster pistol`) — 1 rows — packs: npc — action: `rider-profile-needed`
  - sample actors: Captain Panaka
  - sample raw rows: "S-5 Heavy Blaster Pistol +17 (1d2+5) plus Paralytic Poison"
- **Sceptre of Power** (`sceptre of power`) — 1 rows — packs: npc — action: `rider-profile-needed`
  - sample actors: Shimrra Jamaane, Supreme Overlord
  - sample raw rows: "Sceptre of Power +30 (2d10+28 ( Amphistaff Poison)) with Mighty Swing"
- **Sceptre of Power (Whip Form)** (`sceptre of power whip form`) — 1 rows — packs: npc — action: `rider-profile-needed`
  - sample actors: Shimrra Jamaane, Supreme Overlord
  - sample raw rows: "Sceptre of Power (Whip Form) +28 (1d8+21 ( Amphistaff Poison))"
- **Tentacle** (`tentacle`) — 1 rows — packs: beasts — action: `rider-profile-needed`
  - sample actors: Brintak
  - sample raw rows: "Tentacle +19 (1d8+7) plus Poison"

## 5. Natural/unarmed rows (1138)

- **Unarmed** (`unarmed`) — 946 rows — packs: nonheroic, npc — action: `natural-or-unarmed-profile-needed`
  - sample actors: Theelin Bodyguard, EduCorps Worker, Elite Stormtrooper, Notorious Outlaw, Imperial Informant, Star Destroyer Officer
  - sample raw rows: "Unarmed +5 (1d4+3)"; "Unarmed +4 (1d4-1)"; "Unarmed +12 (1d4+2)"; "Unarmed +9 (1d4+6)"; "Unarmed +2 (1d4+1)"; "Unarmed +6 (1d4+2)"
- **Bite** (`bite`) — 85 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Nexu, Nek, Dathomiri Rancor, Devourer, Hssiss, Kath Hound
  - sample raw rows: "Bite +8 (1d6+7)"; "Bite +6* (1d6+10)"; "Bite +17 (2d6+15)"; "Bite +12 (1d8+10)"; "Bite +6* (1d8+11) with Improved Grab"; "Bite +5 (1d3+4)"
- **Claws (2)** (`claws 2`) — 53 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Avka Young, Nexu, Nek, Dathomiri Rancor, Devourer, Hssiss
  - sample raw rows: "Claws (2) +7 (1d4+2)"; "Claws (2) +8 (1d4+7)"; "Claws (2) +6* (1d4+10)"; "Claws (2) +17 (1d8+15)"; "Claws (2) +12 (1d6+10)"; "Claws (2) +6* (1d6+11)"
- **Gore** (`gore`) — 14 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Devourer, Iriaz, Horax, Saber Cat, Sith Warbird, Reek
  - sample raw rows: "Gore +12* (1d8+17) with Powerful Charge"; "Gore +5 (1d6+4)"; "Gore +7 (1d6+6) with Powerful Charge"; "Gore +16 (2d6+10)"; "Gore +11* (2d6+15)"; "Gore +8 (1d6+5)"
- **Slam** (`slam`) — 11 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Bergruutfa, Viper Kinrath, Aiwha, Gelagrub, Living Nightmare, Pherin
  - sample raw rows: "Slam +9* (1d8+14)"; "Slam +10 (1d6+8)"; "Slam +10 (2d6+9)"; "Slam +9 (1d6+8)"; "Slam +9 (2d6+2) with Attack the Mind"; "Slam +4* (1d4+8)"
- **Tail Slam** (`tail slam`) — 6 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Ycaqt, Felucian Ripper, Maru, Roggwart, Ukian Torbull, Rockhopper
  - sample raw rows: "Tail Slam +5 (1d6+5)"; "Tail Slam +6 (1d4+5)"; "Tail Slam +3 (1d6+3)"; "Tail Slam +9* (1d8+10)"; "Tail Slam +4 (1d8+4)"; "Tail Slam +3 (1d6+2)"
- **Tail** (`tail`) — 4 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Bull Rancor, Tra'cor, Vornskr
  - sample raw rows: "Tail +17* (1d8+26)"; "Tail +9* (1d6+11)"; "Tail +8 (1d4+6 plus Poison)"; "Tail +6 (2d4+6 plus Poison) with Rapid Strike"
- **Sting** (`sting`) — 3 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Energy Spider, Knobby White Spider
  - sample raw rows: "Sting +6 (1d4+2) with Life Drain"; "Sting +14 (1d8+12) plus Poison"; "Sting +12 (2d8+12) plus Poison with Rapid Strike"
- **Slam (4)** (`slam 4`) — 2 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Gundark, Shaped Gundark
  - sample raw rows: "Slam (4) +15 (1d4+13)"; "Slam (4) +17 (2d4+13)"
- **Claw** (`claw`) — 2 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Mantellian Savrip
  - sample raw rows: "Claw +8 (1d6+7)"; "Claw +8 (2d6+7) with Mighty Swing"
- **Barbed Tail** (`barbed tail`) — 2 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Nashtah
  - sample raw rows: "Barbed Tail +10 (1d3+8)"; "Barbed Tail +8 (2d3+8) with Rapid Strike"
- **Claw (2)** (`claw 2`) — 2 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Dragonsnake, Kintan Strider
  - sample raw rows: "Claw (2) +16 (1d6+13)"; "Claw (2) +10 (1d6+9)"
- **Unarmed ( Energy-Binding Prosthesis )** (`unarmed energy binding prosthesis`) — 1 rows — packs: npc — action: `natural-or-unarmed-profile-needed`
  - sample actors: Bao-Dur
  - sample raw rows: "Unarmed ( Energy-Binding Prosthesis ) +8 (1d6+6)"
- **Spider Claw** (`spider claw`) — 1 rows — packs: npc — action: `natural-or-unarmed-profile-needed`
  - sample actors: Kazdan Paratus
  - sample raw rows: "Spider Claw +15 (1d6+8)"
- **Wing Slam** (`wing slam`) — 1 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Comet Mynock
  - sample raw rows: "Wing Slam +0 (1d4)"
- **Bite (2)** (`bite 2`) — 1 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Battle Hydra
  - sample raw rows: "Bite (2) +12 (1d8+7)"
- **Tail Lash** (`tail lash`) — 1 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Varactyl
  - sample raw rows: "Tail Lash +11 (1d6+10) (Trip, See Below)"
- **Slam (3)** (`slam 3`) — 1 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Greethka
  - sample raw rows: "Slam (3) +23 (1d8+19)"
- **Tail Attack** (`tail attack`) — 1 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Raquor'daan
  - sample raw rows: "Tail Attack +7 (1d3+6) plus Poison"
- **Tail Slap** (`tail slap`) — 1 rows — packs: beasts — action: `natural-or-unarmed-profile-needed`
  - sample actors: Krayt Dragon
  - sample raw rows: "Tail Slap +24* (3d6+40)"

## 6. Formula-unclear rows (283)

- **Blaster Rifle** (`blaster rifle`) — 179 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Theelin Bodyguard, Elite Stormtrooper, Soldier Commander, Veteran Stormtrooper, Clone Trooper Veteran, SpecForce Elite Soldier
  - sample raw rows: "Blaster Rifle +6 (3d8+1)"; "Blaster Rifle +13 (3d8+3)"; "Blaster Rifle +10 (3d8+2)"; "Blaster Rifle +11 (3d8)"; "Blaster Rifle +8 (3d8)"; "Blaster Rifle +16 (3d8+8)"
- **Heavy Blaster Rifle** (`heavy blaster rifle`) — 55 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Chiss Mercenary, Trandoshan Mercenary, Elite Senate Guard, Enforcer, Trandoshan Bounty Hunter, Trandoshan Sergeant
  - sample raw rows: "Heavy Blaster Rifle +9 (3d10+2)"; "Heavy Blaster Rifle +4 (3d10)"; "Heavy Blaster Rifle +13 (3d10+3)"; "Heavy Blaster Rifle +12 (4d10+3) with Deadeye"; "Heavy Blaster Rifle +8 (3d10+2)"; "Heavy Blaster Rifle +5 (3d10+2)"
- **Sporting Blaster Pistol** (`sporting blaster pistol`) — 15 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Royal Handmaiden, Riga Lanchenzoor, Virec Xan, Jekk Seejo, Bossk, Haydel Goravvus
  - sample raw rows: "Sporting Blaster Pistol +6 (3d4+3)"; "Sporting Blaster Pistol +13 (3d4+7)"; "Sporting Blaster Pistol +9 (3d4+7)"; "Sporting Blaster Pistol +7 (3d4+1)"; "Sporting Blaster Pistol +6 (3d4+3)"; "Sporting Blaster Pistol +13 (3d4+6)"
- **Electrostaff** (`electrostaff`) — 6 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Believer Cultist Leader
  - sample raw rows: "Electrostaff +5 (2d8+4)"; "Electrostaff -5 (2d8+4)"; "Electrostaff -5 (2d8+4)"; "Electrostaff +5 (2d8+4)"; "Electrostaff -5 (2d8+4)"; "Electrostaff -5 (2d8+4)"
- **Blaster Pistol** (`blaster pistol`) — 4 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Pirate Captain, Bith Black Sun Vigo
  - sample raw rows: "Blaster Pistol +8 (3d8+3)"; "Blaster Pistol +13 (3d8+8)"; "Blaster Pistol +8 (3d8+3)"; "Blaster Pistol +13 (3d8+8)"
- **Heavy Blaster Pistol** (`heavy blaster pistol`) — 3 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Republic Recon Commando, Moxin Tark
  - sample raw rows: "Heavy Blaster Pistol +9 (3d6+3)"; "Heavy Blaster Pistol +11 (3d6+5)"; "Heavy Blaster Pistol +9 (3d6+3)"
- **Lightfoil** (`lightfoil`) — 3 rows — packs: npc — action: `formula-override-review-needed`
  - sample actors: High Lady Brezwalt III
  - sample raw rows: "Lightfoil +15 (2d8+9)"; "Lightfoil +17 (2d8+9) with Flurry"; "Lightfoil +10 (2d8+9)"
- **Guard Shoto** (`guard shoto`) — 3 rows — packs: npc — action: `formula-override-review-needed`
  - sample actors: Maris Brood
  - sample raw rows: "Guard Shoto +10 (2d6+3)"; "Guard Shoto +8 (2d6+3)"; "Guard Shoto +8 (2d6+3)"
- **Stun Baton** (`stun baton`) — 2 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Engineer
  - sample raw rows: "Stun Baton +2 (1d6 (2d6 Stun ))"; "Stun Baton +2 (1d6 (2d6 Stun ))"
- **Sith Sword** (`sith sword`) — 2 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Sith Mage
  - sample raw rows: "Sith Sword +5 (1d8+3)"; "Sith Sword +5 (1d8+3)"
- **Hold-Out Blaster Pistol** (`hold out blaster pistol`) — 2 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Pirate Captain
  - sample raw rows: "Hold-Out Blaster Pistol +8 (3d6+5)"; "Hold-Out Blaster Pistol +8 (3d6+5)"
- **Massassi Lanvarok** (`massassi lanvarok`) — 2 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Massassi Abomination
  - sample raw rows: "Massassi Lanvarok +11* (1d8+23)"; "Massassi Lanvarok +11* (1d8+23)"
- **SG-4 Blaster Rifle** (`sg 4 blaster rifle`) — 2 rows — packs: nonheroic, npc — action: `formula-override-review-needed`
  - sample actors: Seatrooper
  - sample raw rows: "SG-4 Blaster Rifle +5 (3d8)"; "SG-4 Blaster Rifle +5 (3d8)"
- **Concealed Dart Launcher** (`concealed dart launcher`) — 2 rows — packs: npc — action: `formula-override-review-needed`
  - sample actors: Deliah Blue, Nyna Calixte
  - sample raw rows: "Concealed Dart Launcher +8 (3d8+4 ( Stun ))"; "Concealed Dart Launcher +13 (3d8+7 ( Stun ))"
- **Snare Rifle** (`snare rifle`) — 1 rows — packs: npc — action: `formula-override-review-needed`
  - sample actors: Zuckuss
  - sample raw rows: "Snare Rifle +10 (1d6+5 ( Stun ))"
- **S-5 Heavy Blaster Pistol** (`s 5 heavy blaster pistol`) — 1 rows — packs: npc — action: `formula-override-review-needed`
  - sample actors: Captain Panaka
  - sample raw rows: "S-5 Heavy Blaster Pistol +17 (3d8+5)"
- **Long-Handle Lightsaber** (`long handle lightsaber`) — 1 rows — packs: npc — action: `formula-override-review-needed`
  - sample actors: Darth Nihl
  - sample raw rows: "Long-Handle Lightsaber +21 (2d10+10)"

## 7. No-compendium-match ordinary weapon candidates (79)

- **Knife** (`knife`) — 73 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Goon, Ewok Scout, Soldier Commander, Con Artist, Medic, Black Sun Lieutenant
  - sample raw rows: "Knife +2 (1d4)"; "Knife +4 (1d4+3)"; "Knife -1 (1d4+3)"; "Knife +8 (1d4+2)"; "Knife +2 (1d4)"; "Knife +5 (1d4)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Knife 1d4+10 on Bo-Katan Kryze, Liberator; Knife 1d4 on Winter; Knife 1d4+4 on Garm Bel Iblis; Knife 1d4+5 on Haden Vazzar; Knife 1d4+5 on Solvek; Knife 1d4+4 on Silas Draver
  - related-but-distinct compendium items: Monomolecular Knife (weapons-simple, 1d4); Monomolecular Knife (weapons, 1d4)
- **Combat Gloves** (`combat gloves`) — 53 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: SpecForce Heavy Weapons Specialist, Noghri Infiltrator, Mandalorian Scout, Mandalorian Crusader, Mandalorian Commando, Black Sun Agent
  - sample raw rows: "Combat Gloves +9 (1d4+4)"; "Combat Gloves +11 (1d6+9)"; "Combat Gloves +11 (2d6+9 ( Stun )) with Unarmed Stun"; "Combat Gloves +6 (1d6+9)"; "Combat Gloves +6 (1d6+9) with Double Attack"; "Combat Gloves +6 (2d6+9 ( Stun ))"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Combat Gloves 1d6+11 on Bo-Katan Kryze, Liberator; Combat Gloves 2d10+9 on Mynock Man; Combat Gloves 1d6+10 on Jango Fett; Combat Gloves 1d8+9 on Demagol; Combat Gloves 1d4+7 on Sugi; Combat Gloves 1d6+8 on Bo-Katan Kryze
- **Vibro-Axe / Vibro-Axe *** (`vibro axe`) — 39 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Trandoshan Marauder, Pirate, Force Adept, Thug, Black Sun Pirate, Gamorrean Guard
  - sample raw rows: "Vibro-Axe +12* (2d10+31)"; "Vibro-Axe +14* (2d10+31) with Flurry"; "Vibro-Axe +14* (2d10+37) with Powerful Charge"; "Vibro-Axe +8 (2d10+4)"; "Vibro-Axe * +7** (3d10+12)"; "Vibro-Axe +2 (2d10+2)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Vibro-Axe 2d10+3 on Darok-Tho; Vibro-Axe 2d10+9 on The Karg Brothers; Vibro-Axe (*) 2d10+15 on The Karg Brothers; Vibro-Axe 2d10+10 on Snoova; Vibro-Axe (*) 2d10+10 on Snoova; Vibro-Axe 2d10+11 on Resh
- **Spear** (`spear`) — 30 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Believer Zealot, Krath Warrior, Believer Cultist, Amani Scout, Sith Descendant, Dathomiri Witch
  - sample raw rows: "Spear +13 (1d8+8)"; "Spear +13* (1d8+20) with Powerful Charge"; "Spear +12 (1d8+1)"; "Spear +7 (1d8+6)"; "Spear +9 (1d8+8) with Powerful Charge"; "Spear +9 (1d8+6)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Spear 1d8+3 on Wicket; Spear 1d8+2 on Wicket; Spear 1d8+15 on Mandalore the Indomitable; Spear 1d8+11 on Mandalore the Indomitable; Spear 1d8+8 on Believer Zealot; Spear 1d8+1 on Believer Zealot
- **Quarterstaff** (`quarterstaff`) — 28 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Mystic, Echani Handmaiden, Human Force Adept, Force Sage, Vodo-Siosk Baas, Brianna, The Last Handmaiden
  - sample raw rows: "Quarterstaff +5 (1d6)"; "Quarterstaff +7 (1d6+5)"; "Quarterstaff +2 (1d6+5)"; "Quarterstaff +2 (1d6+5)"; "Quarterstaff +4 (1d6+3)"; "Quarterstaff -1 (1d6+3)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Quarterstaff 1d6+7 on Vodo-Siosk Baas; Quarterstaff 1d6+7 on Vodo-Siosk Baas; Quarterstaff 1d6+7 on Vodo-Siosk Baas; Quarterstaff 2d6+7 on Vodo-Siosk Baas; Quarterstaff 1d6+12 on Brianna, The Last Handmaiden; Quarterstaff (*) 1d6+17 on Brianna, The Last Handmaiden
- **Force Pike** (`force pike`) — 23 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Imperial Royal Guard, Primitive Dark Side Adept, Mandalorian Supercommando, Mine Guard, Martial Artist, Sith Assassin
  - sample raw rows: "Force Pike +14* (2d8+7)"; "Force Pike +5 (2d8+3)"; "Force Pike +21 (2d8+15)"; "Force Pike +16 (2d8+15)"; "Force Pike +16 (2d8+15) with Double Attack"; "Force Pike +8 (2d8+2)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Force Pike 2d8+4 on Boushh; Force Pike 2d8+7 on Moxin Tark; Force Pike 2d8+10 on Zardra; Force Pike 2d8+9 on Vril Vrakth; Force Pike (*) 2d8+7 on Imperial Royal Guard; Force Pike 2d8+3 on Primitive Dark Side Adept
- **Bayonet** (`bayonet`) — 21 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Militia Soldier, Elite Republic Trooper, Enforcer, Trandoshan Bounty Hunter, Militia Saboteur, Republic Trooper
  - sample raw rows: "Bayonet +7 (1d8+1)"; "Bayonet +7 (1d8+1)"; "Bayonet +3 (1d6+5)"; "Bayonet +7 (1d8+4)"; "Bayonet +9 (1d8+3)"; "Bayonet +3 (1d8+1)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Bayonet 1d8+2 on Harno; Bayonet 1d8+1 on Militia Soldier; Bayonet 1d8+1 on Elite Republic Trooper; Bayonet 1d6+5 on Enforcer; Bayonet 1d8+4 on Trandoshan Bounty Hunter; Bayonet 1d8+3 on Militia Saboteur
- **Gun Club** (`gun club`) — 14 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Rodian Black Sun Vigo, Army Soldier, Enforcer, Republic Brigadier, Elite Espo Trooper, Elite Warrior
  - sample raw rows: "Gun Club +11 (1d6+7)"; "Gun Club +6 (1d6+3)"; "Gun Club +8 (1d6+5)"; "Gun Club +3 (1d6+5)"; "Gun Club +15 (1d6+6)"; "Gun Club +11 (1d6+4)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Gun Club 1d6+7 on Rodian Black Sun Vigo; Gun Club 1d6+3 on Army Soldier; Gun Club 1d6+5 on Enforcer; Gun Club 1d6+5 on Enforcer; Gun Club 1d6+6 on Republic Brigadier; Gun Club 1d6+4 on Elite Espo Trooper
- **Vibrobayonet** (`vibrobayonet`) — 14 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Mandalorian Supercommando, Trandoshan Captain, Elite Commando, Bounty Hunter
  - sample raw rows: "Vibrobayonet +21 (2d6+15)"; "Vibrobayonet +16 (2d6+15)"; "Vibrobayonet +16 (2d6+15) with Double Attack"; "Vibrobayonet +12 (2d6+7)"; "Vibrobayonet +16 (2d6+9)"; "Vibrobayonet +10 (2d6+7)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Vibrobayonet 2d6+15 on Mandalorian Supercommando; Vibrobayonet 2d6+15 on Mandalorian Supercommando; Vibrobayonet 2d6+7 on Trandoshan Captain; Vibrobayonet 2d6+9 on Elite Commando; Vibrobayonet 2d6+7 on Bounty Hunter; Vibrobayonet 2d6+15 on Mandalorian Supercommando
- **Baton** (`baton`) — 12 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Imperial Detention Guard, Elite Death Star Trooper, Detention Block Guard, Imperial Navy Trooper, Death Star Trooper, Assassin
  - sample raw rows: "Baton +3 (1d6)"; "Baton +8 (1d6+3)"; "Baton +5 (1d6+1)"; "Baton +2 (1d6)"; "Baton +3 (1d6)"; "Baton +5 (1d6+4)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Baton 1d6 on Imperial Detention Guard; Baton 1d6+3 on Elite Death Star Trooper; Baton 1d6+1 on Detention Block Guard; Baton 1d6 on Imperial Navy Trooper; Baton 1d6 on Death Star Trooper; Baton 1d6+4 on Assassin
  - related-but-distinct compendium items: Snap Baton (weapons-simple, 2d4); Stun Baton (weapons-simple, 1d6); Snap Baton (weapons, 2d4); Stun Baton (weapons, 1d6)
- **Amphistaff (Quarterstaff Form)** (`amphistaff quarterstaff form`) — 12 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Yuuzhan Vong Advance Agent, Choka Skell, Liaan Lah
  - sample raw rows: "Amphistaff (Quarterstaff Form) -5 (1d6)"; "Amphistaff (Quarterstaff Form) -5 (1d6)"; "Amphistaff (Quarterstaff Form) +10 (1d6+7)"; "Amphistaff (Quarterstaff Form) +9 (2d6+7) with Mighty Swing"; "Amphistaff (Quarterstaff Form) +5 (1d6+7)"; "Amphistaff (Quarterstaff Form) +5 (1d6+7)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Amphistaff (Quarterstaff Form) 1d6+7 on Choka Skell; Amphistaff (Quarterstaff Form) 1d6+7 on Choka Skell; Amphistaff (Quarterstaff Form) 1d6+7 on Choka Skell; Amphistaff (Quarterstaff Form) 1d6+7 on Liaan Lah; Amphistaff (Quarterstaff Form) 1d6+7 on Liaan Lah; Amphistaff (Quarterstaff Form) 1d6+7 on Liaan Lah
- **Double Vibroblade** (`double vibroblade`) — 9 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Imperial Sovereign Protector, Carnor Jax
  - sample raw rows: "Double Vibroblade +18* (2d10+14)"; "Double Vibroblade +16* (2d10+11)"; "Double Vibroblade +16* (2d10+11)"; "Double Vibroblade +18* (2d10+14)"; "Double Vibroblade +16* (2d10+11)"; "Double Vibroblade +16* (2d10+11)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Double Vibroblade 2d6+12 on Carnor Jax; Double Vibroblade 2d6+12 on Carnor Jax; Double Vibroblade 2d6+12 on Carnor Jax; Double Vibroblade (*) 2d10+14 on Imperial Sovereign Protector; Double Vibroblade (*) 2d10+11 on Imperial Sovereign Protector; Double Vibroblade (*) 2d10+11 on Imperial Sovereign Protector
  - related-but-distinct compendium items: Vibroblade (weapons-simple, 2d6); Vibroblade (weapons, 2d6)
- **Ceremonial Staff** (`ceremonial staff`) — 9 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Rebel Honor Guard, Elder Ruthic
  - sample raw rows: "Ceremonial Staff +8 (1d6+2)"; "Ceremonial Staff -2 (1d6+2)"; "Ceremonial Staff -2 (1d6+2)"; "Ceremonial Staff +8 (1d6+6)"; "Ceremonial Staff +3 (1d6+6)"; "Ceremonial Staff +3 (1d6+6)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Ceremonial Staff 1d6+6 on Elder Ruthic; Ceremonial Staff 1d6+6 on Elder Ruthic; Ceremonial Staff 1d6+6 on Elder Ruthic; Ceremonial Staff 1d6+2 on Rebel Honor Guard; Ceremonial Staff 1d6+6 on Elder Ruthic; Ceremonial Staff 1d6+6 on Elder Ruthic
- **Riot Shield** (`riot shield`) — 8 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Security Specialist, First Order Riot Trooper, Bo-Katan Kryze, Liberator, Bo-Katan Kryze
  - sample raw rows: "Riot Shield +7 (2d6+5 ( Stun ))"; "Riot Shield +6 (2d6+4 ( Stun ))"; "Riot Shield -4 (2d6+4 ( Stun ))"; "Riot Shield +17 (2d6+10 ( Stun ))"; "Riot Shield +12 (2d6+7 ( Stun ))"; "Riot Shield +7 (2d6+5 ( Stun ))"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Riot Shield 2d6+10(Stun) on Bo-Katan Kryze, Liberator; Riot Shield 2d6+7(Stun) on Bo-Katan Kryze; Riot Shield 2d6+5(Stun) on Security Specialist; Riot Shield 2d6+4(Stun) on First Order Riot Trooper; Riot Shield 2d6+10(Stun) on Bo-Katan Kryze, Liberator; Riot Shield 2d6+7(Stun) on Bo-Katan Kryze
- **Club** (`club`) — 7 rows — packs: npc, beasts — action: `missing-compendium-weapon-investigation`
  - sample actors: Herdr'tui, Gundark, Shaped Gundark
  - sample raw rows: "Club +11 (1d6+6)"; "Club +15 (1d6+16)"; "Club +15 (2d6+16) with Mighty Swing"; "Club +17 (2d6+16)"; "Club +13** (2d6+20)"; "Club +17 (3d6+16) with Mighty Swing"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Club 1d6+6 on Herdr'tui; Club 1d6+6 on Herdr'tui
- **Small Axe** (`small axe`) — 6 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Ewok Scout
  - sample raw rows: "Small Axe +4 (1d6+3)"; "Small Axe -1 (1d6+3)"; "Small Axe +4 (1d6+2)"; "Small Axe +4 (1d6+3)"; "Small Axe -1 (1d6+3)"; "Small Axe +4 (1d6+2)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Small Axe 1d6+3 on Ewok Scout; Small Axe 1d6+2 on Ewok Scout; Small Axe 1d6+3 on Ewok Scout; Small Axe 1d6+2 on Ewok Scout
- **Felucian Skullblade** (`felucian skullblade`) — 6 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Felucian Shaman, Felucian Scout
  - sample raw rows: "Felucian Skullblade +8 (2d6+1)"; "Felucian Skullblade +6 (2d6+2)"; "Felucian Skullblade +6 (3d6+2) with Mighty Swing"; "Felucian Skullblade +8 (2d6+1)"; "Felucian Skullblade +6 (2d6+2)"; "Felucian Skullblade +6 (3d6+2) with Mighty Swing"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Felucian Skullblade 2d6+1 on Felucian Shaman; Felucian Skullblade 2d6+2 on Felucian Scout; Felucian Skullblade 2d6+1 on Felucian Shaman; Felucian Skullblade 2d6+2 on Felucian Scout
- **Mace** (`mace`) — 6 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Mandalorian Crusader, Ugor Forager, Gamorrean Warlord
  - sample raw rows: "Mace +5 (1d8+2)"; "Mace +3 (1d8+2)"; "Mace +6 (1d8+7)"; "Mace +5 (1d8+2)"; "Mace +3 (1d8+2)"; "Mace +6 (1d8+7)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Mace 1d8+2 on Mandalorian Crusader; Mace 1d8+2 on Ugor Forager; Mace 1d8+7 on Gamorrean Warlord; Mace 1d8+2 on Mandalorian Crusader; Mace 1d8+2 on Ugor Forager; Mace 1d8+7 on Gamorrean Warlord
- **Dire Vibroblade** (`dire vibroblade`) — 6 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Mandalorian Marauder, Mandalorian Soldier
  - sample raw rows: "Dire Vibroblade +9 (2d6+8)"; "Dire Vibroblade +7 (3d6+8) with Rapid Strike"; "Dire Vibroblade +7 (2d6+6)"; "Dire Vibroblade +9 (2d6+8)"; "Dire Vibroblade +7 (3d6+8) with Rapid Strike"; "Dire Vibroblade +7 (2d6+6)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Dire Vibroblade 2d6+8 on Mandalorian Marauder; Dire Vibroblade 2d6+6 on Mandalorian Soldier; Dire Vibroblade 2d6+8 on Mandalorian Marauder; Dire Vibroblade 2d6+6 on Mandalorian Soldier
  - related-but-distinct compendium items: Vibroblade (weapons-simple, 2d6); Vibroblade (weapons, 2d6)
- **Fused Blade** (`fused blade`) — 6 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Genetically Modified Felucian, Kargrek and Hagark
  - sample raw rows: "Fused Blade +8 (1d8+4)"; "Fused Blade +8 (2d8+4) with Mighty Swing"; "Fused Blade +8* (1d10+11)"; "Fused Blade +8* (2d10+11) with Mighty Swing"; "Fused Blade +8 (1d8+4)"; "Fused Blade +8 (2d8+4) with Mighty Swing"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Fused Blade (*) 1d10+11 on Kargrek and Hagark; Fused Blade 1d8+4 on Genetically Modified Felucian; Fused Blade (*) 1d10+11 on Kargrek and Hagark; Fused Blade 1d8+4 on Genetically Modified Felucian
- **Ryyk Blade** (`ryyk blade`) — 6 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Salporin
  - sample raw rows: "Ryyk Blade +11 (2d10+8)"; "Ryyk Blade +13 (3d10+8) with Rapid Strike"; "Ryyk Blade +6 (2d10+8)"; "Ryyk Blade +6 (2d10+8)"; "Ryyk Blade +4 (3d10+8)"; "Ryyk Blade +4 (3d10+8)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Ryyk Blade 2d10+8 on Salporin; Ryyk Blade 2d10+8 on Salporin; Ryyk Blade 2d10+8 on Salporin; Ryyk Blade 3d10+8 on Salporin; Ryyk Blade 3d10+8 on Salporin; Ryyk Blade 2d10+8 on Salporin
  - related-but-distinct compendium items: Wookiee Ryyk Blade (weapons-exotic, 2d8); Wookiee Ryyk Blade (weapons, 2d8)
- **Mythosaur Axe** (`mythosaur axe`) — 6 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Mandalore the Indomitable, Mandalore the Ultimate
  - sample raw rows: "Mythosaur Axe +22 (1d12+15)"; "Mythosaur Axe +22 (2d12+15) with Mighty Swing"; "Mythosaur Axe +17 (1d12+15)"; "Mythosaur Axe +17 (1d12+15) with Double Attack"; "Mythosaur Axe +19 (2d12+11)"; "Mythosaur Axe +21 (3d12+11) with Mighty Swing"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Mythosaur Axe 1d12+15 on Mandalore the Indomitable; Mythosaur Axe 1d12+15 on Mandalore the Indomitable; Mythosaur Axe 2d12+11 on Mandalore the Ultimate; Mythosaur Axe 1d12+15 on Mandalore the Indomitable; Mythosaur Axe 1d12+15 on Mandalore the Indomitable; Mythosaur Axe 2d12+11 on Mandalore the Ultimate
- **Trample** (`trample`) — 5 rows — packs: beasts — action: `missing-compendium-weapon-investigation`
  - sample actors: Lluma, Sith Warbird, Ycaqt, Bantha
  - sample raw rows: "Trample +8* (1d6+16)"; "Trample +10* (1d6+20) with Powerful Charge"; "Trample +13 (1d8+10)"; "Trample +5 (1d6+5)"; "Trample +11 (1d8+10)"
- **Short Sword** (`short sword`) — 4 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Krath Adept, Zaalbar
  - sample raw rows: "Short Sword +3 (1d6+2)"; "Short Sword +3 (1d6+2)"; "Short Sword +8 (1d6+12)"; "Short Sword +6 (1d6+14) with Power Attack"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Short Sword 1d6+12 on Zaalbar; Short Sword 1d6+2 on Krath Adept; Short Sword 1d6+2 on Krath Adept; Short Sword 1d6+12 on Zaalbar
- **War Sword** (`war sword`) — 4 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Krath Warrior
  - sample raw rows: "War Sword +7 (1d8+6)"; "War Sword +9 (1d8+8) with Powerful Charge"; "War Sword +7 (1d8+6)"; "War Sword +9 (1d8+8) with Powerful Charge"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): War Sword 1d8+6 on Krath Warrior; War Sword 1d8+6 on Krath Warrior
- **Gaderffii** (`gaderffii`) — 4 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Tusken Raider Scout
  - sample raw rows: "Gaderffii +8 (2d4+3)"; "Gaderffii +5* (2d4+6)"; "Gaderffii +8 (2d4+3)"; "Gaderffii +5* (2d4+6)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Gaderffii 2d4+3 on Tusken Raider Scout; Gaderffii (*) 2d4+6 on Tusken Raider Scout; Gaderffii 2d4+3 on Tusken Raider Scout; Gaderffii (*) 2d4+6 on Tusken Raider Scout
  - related-but-distinct compendium items: Tusken Gaderffii Stick (weapons-simple, 1d6); Tusken Gaderffii Stick (weapons, 1d6)
- **Gamorrean Warmace** (`gamorrean warmace`) — 4 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Gamorrean Basher
  - sample raw rows: "Gamorrean Warmace +8 (1d10+10)"; "Gamorrean Warmace +5* (1d10+16)"; "Gamorrean Warmace +8 (1d10+10)"; "Gamorrean Warmace +5* (1d10+16)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Gamorrean Warmace 1d10+10 on Gamorrean Basher; Gamorrean Warmace (*) 1d10+16 on Gamorrean Basher; Gamorrean Warmace 1d10+10 on Gamorrean Basher; Gamorrean Warmace (*) 1d10+16 on Gamorrean Basher
- **Amphistaff (Spear Form)** (`amphistaff spear form`) — 4 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Choka Skell, Liaan Lah
  - sample raw rows: "Amphistaff (Spear Form) +10 (1d8+7*)"; "Amphistaff (Spear Form) +9 (1d8+5*)"; "Amphistaff (Spear Form) +9 (1d8+7*)"; "Amphistaff (Spear Form) +8 (1d8+5*)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Amphistaff (Spear Form) 1d8+7* on Choka Skell; Amphistaff (Spear Form) 1d8+5* on Choka Skell; Amphistaff (Spear Form) 1d8+7* on Liaan Lah; Amphistaff (Spear Form) 1d8+5* on Liaan Lah; Amphistaff (Spear Form) 1d8(AmphistaffPoison) on Yuuzhan Vong Advance Agent; Amphistaff (Spear Form) 1d8+7* on Choka Skell
- **Survival Knife** (`survival knife`) — 3 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: New Republic Commando, Finvarra
  - sample raw rows: "Survival Knife +5 (1d6+3)"; "Survival Knife +5 (1d6+3)"; "Survival Knife +3 (1d6+2)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Survival Knife 1d6+2 on Finvarra; Survival Knife 1d6+3 on New Republic Commando; Survival Knife 1d6+3 on New Republic Commando; Survival Knife 1d6+2 on Finvarra
- **Lightsaber Throw** (`lightsaber throw`) — 3 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Sith Apprentice, Darth Bane
  - sample raw rows: "Lightsaber Throw +9 (2d8+5)"; "Lightsaber Throw +26 (2d8+12)"; "Lightsaber Throw +9 (2d8+5)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Lightsaber Throw 2d8+4 on Juhani; Lightsaber Throw 2d8+12 on Darth Bane; Lightsaber Throw 2d8+5 on Sith Apprentice; Lightsaber Throw 2d8+4 on Juhani; Lightsaber Throw 2d8+12 on Darth Bane; Lightsaber Throw 2d8+5 on Sith Apprentice
  - related-but-distinct compendium items: Lightsaber (weapons-simple, 2d8); Lightsaber (weapons, 2d8)
- **Vibrorapier** (`vibrorapier`) — 3 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Zan Dane, Reddjak
  - sample raw rows: "Vibrorapier +10 (2d6+10)"; "Vibrorapier +8 (3d6+10) with Rapid Strike"; "Vibrorapier +8 (2d6+7)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Vibrorapier 2d6+10 on Zan Dane; Vibrorapier 2d6+7 on Reddjak; Vibrorapier 2d6+10 on Zan Dane; Vibrorapier 2d6+7 on Reddjak
- **Electroshock Probe** (`electroshock probe`) — 3 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: T3-M4, G0-T0, R2-D2
  - sample raw rows: "Electroshock Probe +4 (1d8+2 ( Ion ))"; "Electroshock Probe +4 (1d8 ( Ion ))"; "Electroshock Probe +9 (1d8+3 ( Ion ))"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Electroshock Probe 1d8+2(Ion) on T3-M4; Electroshock Probe 1d8(Ion) on G0-T0; Electroshock Probe 1d8+3(Ion) on R2-D2; Electroshock Probe 1d8+2(Ion) on T3-M4; Electroshock Probe 1d8(Ion) on G0-T0; Electroshock Probe 1d8+3(Ion) on R2-D2
- **Blaster Gauntlet** (`blaster gauntlet`) — 3 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Mandalore the Preserver
  - sample raw rows: "Blaster Gauntlet +18 (3d6+8)"; "Blaster Gauntlet +13 (3d6+8)"; "Blaster Gauntlet +13 (3d6+8)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Blaster Gauntlet 3d6+8 on Mandalore the Preserver; Blaster Gauntlet 3d6+8 on Mandalore the Preserver; Blaster Gauntlet 3d6+8 on Mandalore the Preserver; Blaster Gauntlet 3d6+8 on Mandalore the Preserver; Blaster Gauntlet 3d6+8 on Mandalore the Preserver; Blaster Gauntlet 3d6+8 on Mandalore the Preserver
- **Power Hammer** (`power hammer`) — 3 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Yissk
  - sample raw rows: "Power Hammer +12 (2d12+9)"; "Power Hammer +12 (3d12+9) with Mighty Swing"; "Power Hammer +10 (3d12+9) with Rapid Strike"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Power Hammer 2d12+9 on Yissk; Power Hammer 2d12+9 on Yissk
- **Shockstaff** (`shockstaff`) — 3 rows — packs: npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Jarael
  - sample raw rows: "Shockstaff +8 (2d6+7)"; "Shockstaff +3 (2d6+7)"; "Shockstaff +3 (2d6+7)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Shockstaff 2d6+7 on Jarael; Shockstaff 2d6+7 on Jarael; Shockstaff 2d6+7 on Jarael; Shockstaff 2d6+7 on Jarael; Shockstaff 2d6+7 on Jarael; Shockstaff 2d6+7 on Jarael
- **Tendril** (`tendril`) — 3 rows — packs: beasts — action: `missing-compendium-weapon-investigation`
  - sample actors: T'salak Spawn, T'salak
  - sample raw rows: "Tendril +7 (1d4+3)"; "Tendril +10 (1d8+4)"; "Tendril +8 (2d8+4) with Rapid Strike"
- **Hydrospanner** (`hydrospanner`) — 2 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Ugnaught Worker
  - sample raw rows: "Hydrospanner +6 (1d6+2)"; "Hydrospanner +6 (1d6+2)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Hydrospanner 1d6+2 on Ugnaught Worker; Hydrospanner 1d6+2 on Ugnaught Worker
- **Neuronic Whip (2-Square Reach )** (`neuronic whip 2 square reach`) — 2 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Imperial Dungeoneer
  - sample raw rows: "Neuronic Whip (2-Square Reach ) +11 (2d8+5 ( Stun ))"; "Neuronic Whip (2-Square Reach ) +11 (2d8+5 ( Stun ))"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Neuronic Whip (2-Square Reach ) 2d8+5(Stun) on Imperial Dungeoneer; Neuronic Whip (2-Square Reach ) 0 on Imperial Dungeoneer; Neuronic Whip (2-Square Reach ) 2d8+5(Stun) on Imperial Dungeoneer; Neuronic Whip (2-Square Reach ) 0 on Imperial Dungeoneer
- **Stun Bayonet** (`stun bayonet`) — 2 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Elite Senate Guard
  - sample raw rows: "Stun Bayonet +12 (2d8+7 ( Stun ))"; "Stun Bayonet +12 (2d8+7 ( Stun ))"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Stun Bayonet 2d8+7(Stun) on Elite Senate Guard; Stun Bayonet 2d8+7(Stun) on Elite Senate Guard
- **Trident** (`trident`) — 2 rows — packs: nonheroic, npc — action: `missing-compendium-weapon-investigation`
  - sample actors: Quarren Isolationist
  - sample raw rows: "Trident +6 (1d8+4)"; "Trident +6 (1d8+4)"
  - embedded actor.items evidence (not used as candidate source, cross-reference only): Trident 1d8+4 on Quarren Isolationist; Trident 1d8+4 on Quarren Isolationist

## 8. Likely special actions misread as weapons (0)


## 9. Candidate-generator bugs or normalization issues (0)

_None found. All no-compendium-match names, including the special-investigation list below, were confirmed absent from every packs/weapons*.db item (and absent from every other pack scanned as a top-level weapon document) rather than being masked by a normalization bug._

## Special investigation: ordinary weapons that appear missing

Checked directly against every `packs/weapons*.db` item and against
every embedded `actor.items` weapon-type entry across all `packs/*.db`
files (not just the generator's three source packs), since a name could
in principle exist as a compendium item under a pack this tool's glob
missed, or as an owned item that never made it into a top-level
compendium doc.

### sporting blaster pistol

- **Exact compendium match exists**: Sporting Blaster Pistol (weapons-pistols, 2d6 energy); Sporting Blaster Pistol (weapons, 2d6 energy).
- Remaining Lane B rows for this name: 3, bucket `ordinary-weapon-special-mode`, action `special-mode-variant-profile-needed` -- this is not a missing-weapon case, it's a different Lane B category (see that bucket above for detail).
- Remaining Lane B rows for this name: 1, bucket `area-autofire-grenade-special`, action `area-autofire-profile-needed` -- this is not a missing-weapon case, it's a different Lane B category (see that bucket above for detail).
- Remaining Lane B rows for this name: 15, bucket `formula-unclear`, action `formula-override-review-needed` -- this is not a missing-weapon case, it's a different Lane B category (see that bucket above for detail).

### knife

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Related-but-distinct compendium items exist (likely a different, more specific weapon, not an alias): Monomolecular Knife (weapons-simple, 1d4 kinetic); Monomolecular Knife (weapons, 1d4 kinetic).
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Knife 1d4+10 kinetic on Bo-Katan Kryze, Liberator (heroic); Knife 1d4 kinetic on Winter (heroic); Knife 1d4+4 kinetic on Garm Bel Iblis (heroic); Knife 1d4+5 kinetic on Haden Vazzar (heroic); Knife 1d4+5 kinetic on Solvek (heroic); Knife 1d4+4 kinetic on Silas Draver (heroic); Knife 1d4+5 kinetic on Zerik (heroic); Knife 1d4+2 kinetic on Kessra (heroic).
- Remaining Lane B rows in the raw-statblock candidate universe: 2, bucket `area-autofire-grenade-special`, action `area-autofire-profile-needed`.
- Remaining Lane B rows in the raw-statblock candidate universe: 73, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### spear

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Spear 1d8+3 kinetic on Wicket (heroic); Spear 1d8+2 kinetic on Wicket (heroic); Spear 1d8+15 kinetic on Mandalore the Indomitable (heroic); Spear 1d8+11 kinetic on Mandalore the Indomitable (heroic); Spear 1d8+8 kinetic on Believer Zealot (nonheroic); Spear 1d8+1 kinetic on Believer Zealot (nonheroic); Spear 1d8+6 kinetic on Krath Warrior (nonheroic); Spear 1d8+6 kinetic on Believer Cultist (nonheroic).
- Remaining Lane B rows in the raw-statblock candidate universe: 30, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### quarterstaff

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Quarterstaff 1d6+7 kinetic on Vodo-Siosk Baas (heroic); Quarterstaff 1d6+7 kinetic on Vodo-Siosk Baas (heroic); Quarterstaff 1d6+7 kinetic on Vodo-Siosk Baas (heroic); Quarterstaff 2d6+7 kinetic on Vodo-Siosk Baas (heroic); Quarterstaff 1d6+12 kinetic on Brianna, The Last Handmaiden (heroic); Quarterstaff (*) 1d6+17 kinetic on Brianna, The Last Handmaiden (heroic); Quarterstaff 1d6+12 kinetic on Brianna, The Last Handmaiden (heroic); Quarterstaff 1d6+12 kinetic on Brianna, The Last Handmaiden (heroic).
- Remaining Lane B rows in the raw-statblock candidate universe: 28, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### combat gloves

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Combat Gloves 1d6+11 kinetic on Bo-Katan Kryze, Liberator (heroic); Combat Gloves 2d10+9 kinetic on Mynock Man (heroic); Combat Gloves 1d6+10 kinetic on Jango Fett (heroic); Combat Gloves 1d8+9 kinetic on Demagol (heroic); Combat Gloves 1d4+7 kinetic on Sugi (heroic); Combat Gloves 1d6+8 kinetic on Bo-Katan Kryze (heroic); Combat Gloves 1d6+11 kinetic on Rohlan Dyre (heroic); Combat Gloves 1d8+7 kinetic on Tyrnia Masak (heroic).
- Remaining Lane B rows in the raw-statblock candidate universe: 53, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### force pike

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Force Pike 2d8+4 kinetic on Boushh (heroic); Force Pike 2d8+7 kinetic on Moxin Tark (heroic); Force Pike 2d8+10 kinetic on Zardra (heroic); Force Pike 2d8+9 kinetic on Vril Vrakth (heroic); Force Pike (*) 2d8+7 kinetic on Imperial Royal Guard (nonheroic); Force Pike 2d8+3 kinetic on Primitive Dark Side Adept (nonheroic); Force Pike 2d8+15 kinetic on Mandalorian Supercommando (nonheroic); Force Pike 2d8+15 kinetic on Mandalorian Supercommando (nonheroic).
- Remaining Lane B rows in the raw-statblock candidate universe: 23, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### bayonet

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Bayonet 1d8+2 kinetic on Harno (heroic); Bayonet 1d8+1 kinetic on Militia Soldier (nonheroic); Bayonet 1d8+1 kinetic on Elite Republic Trooper (nonheroic); Bayonet 1d6+5 kinetic on Enforcer (nonheroic); Bayonet 1d8+4 kinetic on Trandoshan Bounty Hunter (nonheroic); Bayonet 1d8+3 kinetic on Militia Saboteur (nonheroic); Bayonet 1d8+1 kinetic on Republic Trooper (nonheroic); Bayonet 1d8+12 kinetic on Citadel Guardsman (nonheroic).
- Remaining Lane B rows in the raw-statblock candidate universe: 21, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### baton

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Related-but-distinct compendium items exist (likely a different, more specific weapon, not an alias): Snap Baton (weapons-simple, 2d4 kinetic); Stun Baton (weapons-simple, 1d6 stun); Snap Baton (weapons, 2d4 kinetic); Stun Baton (weapons, 1d6 stun).
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Baton 1d6 kinetic on Imperial Detention Guard (nonheroic); Baton 1d6+3 kinetic on Elite Death Star Trooper (nonheroic); Baton 1d6+1 kinetic on Detention Block Guard (nonheroic); Baton 1d6 kinetic on Imperial Navy Trooper (nonheroic); Baton 1d6 kinetic on Death Star Trooper (nonheroic); Baton 1d6+4 kinetic on Assassin (nonheroic); Baton 1d6 kinetic on Imperial Detention Guard (npc); Baton 1d6+3 kinetic on Elite Death Star Trooper (npc).
- Remaining Lane B rows in the raw-statblock candidate universe: 12, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### mace

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Mace 1d8+2 kinetic on Mandalorian Crusader (nonheroic); Mace 1d8+2 kinetic on Ugor Forager (nonheroic); Mace 1d8+7 kinetic on Gamorrean Warlord (nonheroic); Mace 1d8+2 kinetic on Mandalorian Crusader (npc); Mace 1d8+2 kinetic on Ugor Forager (npc); Mace 1d8+7 kinetic on Gamorrean Warlord (npc).
- Remaining Lane B rows in the raw-statblock candidate universe: 6, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

### club

- **No exact or related-alias compendium item found under this name in any `packs/weapons*.db` file, and no other pack contains a top-level weapon document under this name either.** Confirmed genuinely absent from the compendium, not a matcher/normalization bug.
- Embedded `actor.items` evidence found on other actors (not used as candidate source, cross-reference only, suggests a plausible base formula for a future compendium item): Club 1d6+6 kinetic on Herdr'tui (heroic); Club 1d6+6 kinetic on Herdr'tui (npc).
- Remaining Lane B rows in the raw-statblock candidate universe: 7, bucket `no-compendium-match`, action `missing-compendium-weapon-investigation`.

## 10. Recommended implementation order

1. **candidate-generator-bug** (0 groups) — Fix candidate-generator bugs / matcher aliases, if any (singular/plural normalization mismatches found by this audit).
2. **missing-compendium-weapon-investigation** (79 groups) — Create missing ordinary weapon compendium items only where truly missing (confirmed absent from all packs/weapons*.db, not just alias/normalization gaps).
3. **formula-override-review-needed** (17 groups) — Handle formula-unclear/printed-override ordinary weapons (compendium match exists, printed dice do not cleanly derive from base).
4. **special-mode-variant-profile-needed** (21 groups) — Handle ordinary-weapon-special-mode variants (Rapid Strike, Double Attack, Trigger Work, etc.).
5. **area-autofire-profile-needed / grenade-or-explosive-profile-needed** (58 groups) — Handle area/autofire/grenade/explosive rows.
6. **rider-profile-needed** (7 groups) — Handle rider/condition rows.
7. **natural-or-unarmed-profile-needed** (20 groups) — Handle natural/unarmed rows.
