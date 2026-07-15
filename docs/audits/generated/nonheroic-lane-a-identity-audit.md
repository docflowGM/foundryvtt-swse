# Nonheroic Lane A Candidate Identity Audit (generated)

Generated: 2026-07-15T21:26:05.540Z

Read-only audit of the current staged Lane A "safe" candidate pool
(`data/nonheroic/generated/nonheroic-weapon-damage-candidates.*.json`),
generated after the match.rawClause / disambiguated-slug identity fix in
`tools/generate-nonheroic-damage-profile-candidates.mjs`. No profile was
promoted, no weapon item was created, and no pack/runtime file was
modified in producing this report.

## Summary

- Candidate pool files: data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json, data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- Candidate pool size (safe Lane A rows): 617
- Distinct actor+weapon-name groups: 228
- Singleton groups (1 row, no identity ambiguity): 1
- Duplicate groups (>1 row sharing actor+weapon-name): 227
- Rows inside duplicate groups: 616

### Duplicate group breakdown

- **Identical** (same printed clause repeated, almost always a cross-pack document duplicate): 129 groups / 262 rows (124 of those groups span both nonheroic.db and npc.db). Every member shares the exact printed clause text. Not a distinct-row case; almost always the same actor document duplicated across more than one source pack (packs/nonheroic.db and packs/npc.db both carry it). No available field distinguishes these from each other, so only one representative per group should be promoted; the promotion tool's duplicate-slug guard already refuses to promote more than one from the same batch.
- **Distinct** (genuinely different attack rows, e.g. a full-attack sequence): 43 groups / 90 rows. Every member has a distinct printed clause (different attack bonus and/or formula, e.g. a full-attack sequence). Every member of these groups is now independently promotable: match.rawClause gives each a unique marker and the disambiguated slug (bonus + formula suffix) gives each a unique candidate slug.
- **Mixed** (both patterns within the same group): 55 groups / 264 rows. Some members are identical-clause duplicates of each other and some are genuinely distinct rows, within the same actor+weapon-name group.

## Identity integrity check

- Rows with genuinely different printed content (different rawClause) sharing the same candidate slug: 0
- Overall: OK -- every genuinely distinct printed row now has its own unique slug and marker.

> `identical` groups are expected and out of scope for this check: no
> available field distinguishes two literally-identical printed rows from
> each other, so their shared marker/slug is correct, not a bug. The
> promotion tool's existing duplicate-slug guard already prevents
> promoting more than one representative from the same batch.

## Sample: identical (cross-pack/document duplicate) groups (showing up to 10 of 129)

- **Medic / Blaster Pistol** (`medic::blaster pistol`) — 2 rows, cross-pack: true
  - `medic-blaster-pistol-p5-3d6` — "blaster pistol +5 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `medic-blaster-pistol-p5-3d6` — "blaster pistol +5 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Peace Brigade Thug / Blaster Pistol** (`peace-brigade-thug::blaster pistol`) — 2 rows, cross-pack: true
  - `peace-brigade-thug-blaster-pistol-p2-3d6` — "blaster pistol +2 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `peace-brigade-thug-blaster-pistol-p2-3d6` — "blaster pistol +2 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **CSA Security Guard / Blaster Pistol** (`csa-security-guard::blaster pistol`) — 2 rows, cross-pack: true
  - `csa-security-guard-blaster-pistol-p6-3d6` — "blaster pistol +6 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `csa-security-guard-blaster-pistol-p6-3d6` — "blaster pistol +6 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Espo Trooper / ESPO 500 Riot Gun** (`espo-trooper::espo 500 riot gun`) — 2 rows, cross-pack: true
  - `espo-trooper-espo-500-riot-gun-p4-3d8` — "espo 500 riot gun +4 (3d8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `espo-trooper-espo-500-riot-gun-p4-3d8` — "espo 500 riot gun +4 (3d8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Swoop Gang Member / Blaster Pistol** (`swoop-gang-member::blaster pistol`) — 2 rows, cross-pack: true
  - `swoop-gang-member-blaster-pistol-p4-3d6` — "blaster pistol +4 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `swoop-gang-member-blaster-pistol-p4-3d6` — "blaster pistol +4 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Sith Spy / Blaster Pistol** (`sith-spy::blaster pistol`) — 2 rows, cross-pack: true
  - `sith-spy-blaster-pistol-p8-3d6` — "blaster pistol +8 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `sith-spy-blaster-pistol-p8-3d6` — "blaster pistol +8 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Joker Squad Heavy Weapons Specialist / ARC-9965 Blaster** (`joker-squad-heavy-weapons-specialist::arc 9965 blaster`) — 2 rows, cross-pack: true
  - `joker-squad-heavy-weapons-specialist-arc-9965-blaster-p7-3d8` — "arc-9965 blaster +7 (3d8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `joker-squad-heavy-weapons-specialist-arc-9965-blaster-p7-3d8` — "arc-9965 blaster +7 (3d8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Sith Descendant / Pulse-Wave Pistol** (`sith-descendant::pulse wave pistol`) — 2 rows, cross-pack: true
  - `sith-descendant-pulse-wave-pistol-p4-2d6` — "pulse-wave pistol +4 (2d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `sith-descendant-pulse-wave-pistol-p4-2d6` — "pulse-wave pistol +4 (2d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Viper Swoop Gang Member / Blaster Pistol** (`viper-swoop-gang-member::blaster pistol`) — 2 rows, cross-pack: true
  - `viper-swoop-gang-member-blaster-pistol-p4-3d6` — "blaster pistol +4 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `viper-swoop-gang-member-blaster-pistol-p4-3d6` — "blaster pistol +4 (3d6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Joker Squad Stormtrooper / ARC-9965 Blaster** (`joker-squad-stormtrooper::arc 9965 blaster`) — 2 rows, cross-pack: true
  - `joker-squad-stormtrooper-arc-9965-blaster-p8-3d8` — "arc-9965 blaster +8 (3d8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `joker-squad-stormtrooper-arc-9965-blaster-p8-3d8` — "arc-9965 blaster +8 (3d8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json

## Sample: distinct (genuine multi-row) groups (showing up to 10 of 43)

- **Plo Koon / Lightsaber** (`plo-koon::lightsaber`) — 2 rows, cross-pack: false
  - `plo-koon-lightsaber-p20-2d8-11` — "lightsaber +20 (2d8+11)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `plo-koon-lightsaber-p15-2d8-11` — "lightsaber +15 (2d8+11)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Ulic Qel-Droma / Lightsaber** (`ulic-qel-droma::lightsaber`) — 2 rows, cross-pack: false
  - `ulic-qel-droma-lightsaber-p22-2d8-13` — "lightsaber +22 (2d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `ulic-qel-droma-lightsaber-p19-2d8-13` — "lightsaber +19 (2d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Bo-Katan Kryze, Liberator / Blaster Pistol** (`bo-katan-kryze-liberator::blaster pistol`) — 3 rows, cross-pack: false
  - `bo-katan-kryze-liberator-blaster-pistol-p20-4d6-12-with-twin-shot` — "blaster pistol +20 (4d6+12) with twin shot" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `bo-katan-kryze-liberator-blaster-pistol-p18-4d6-12` — "blaster pistol +18 (4d6+12)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `bo-katan-kryze-liberator-blaster-pistol-p18-4d6-12-with-twin-shot` — "blaster pistol +18 (4d6+12) with twin shot" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Mara Jade, Jedi / Lightsaber** (`mara-jade-jedi::lightsaber`) — 2 rows, cross-pack: false
  - `mara-jade-jedi-lightsaber-p16-2d8-9` — "lightsaber +16 (2d8+9)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `mara-jade-jedi-lightsaber-p11-2d8-9` — "lightsaber +11 (2d8+9)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Darth Nihilus / Lightsaber** (`darth-nihilus::lightsaber`) — 5 rows, cross-pack: false
  - `darth-nihilus-lightsaber-p25-2d8-13` — "lightsaber +25 (2d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `darth-nihilus-lightsaber-p22-2d8-13` — "lightsaber +22 (2d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `darth-nihilus-lightsaber-p20-3d8-13` — "lightsaber +20 (3d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `darth-nihilus-lightsaber-p17-2d8-13` — "lightsaber +17 (2d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `darth-nihilus-lightsaber-p15-3d8-13` — "lightsaber +15 (3d8+13)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Brakiss / Lightsaber** (`brakiss::lightsaber`) — 2 rows, cross-pack: false
  - `brakiss-lightsaber-p12-2d8-6` — "lightsaber +12 (2d8+6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `brakiss-lightsaber-p7-2d8-6` — "lightsaber +7 (2d8+6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Luke Skywalker / Lightsaber** (`luke-skywalker::lightsaber`) — 2 rows, cross-pack: false
  - `luke-skywalker-lightsaber-p14-2d8-11` — "lightsaber +14 (2d8+11)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `luke-skywalker-lightsaber-p9-2d8-11` — "lightsaber +9 (2d8+11)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Emperor Roan Fel / Lightsaber** (`emperor-roan-fel::lightsaber`) — 2 rows, cross-pack: false
  - `emperor-roan-fel-lightsaber-p22-2d8-12` — "lightsaber +22 (2d8+12)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `emperor-roan-fel-lightsaber-p17-2d8-12` — "lightsaber +17 (2d8+12)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **An'ya Kuro / Lightsaber** (`anya-kuro::lightsaber`) — 2 rows, cross-pack: false
  - `anya-kuro-lightsaber-p20-2d8-10` — "lightsaber +20 (2d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `anya-kuro-lightsaber-p17-2d8-10` — "lightsaber +17 (2d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Liash Keane / Blaster Carbine** (`liash-keane::blaster carbine`) — 2 rows, cross-pack: false
  - `liash-keane-blaster-carbine-p10-3d8-5` — "blaster carbine +10 (3d8+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `liash-keane-blaster-carbine-p5-3d8-5` — "blaster carbine +5 (3d8+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json

## Sample: mixed groups (showing up to 10 of 55)

- **Rodian Black Sun Vigo / Heavy Blaster Pistol** (`rodian-black-sun-vigo::heavy blaster pistol`) — 4 rows, cross-pack: true
  - `rodian-black-sun-vigo-heavy-blaster-pistol-p15-3d8-9` — "heavy blaster pistol +15 (3d8+9)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `rodian-black-sun-vigo-heavy-blaster-pistol-p10-3d8-9` — "heavy blaster pistol +10 (3d8+9)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `rodian-black-sun-vigo-heavy-blaster-pistol-p15-3d8-9` — "heavy blaster pistol +15 (3d8+9)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `rodian-black-sun-vigo-heavy-blaster-pistol-p10-3d8-9` — "heavy blaster pistol +10 (3d8+9)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Storm Commando / Blaster Carbine** (`storm-commando::blaster carbine`) — 4 rows, cross-pack: true
  - `storm-commando-blaster-carbine-p12-3d8-3` — "blaster carbine +12 (3d8+3)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `storm-commando-blaster-carbine-p7-3d8-3` — "blaster carbine +7 (3d8+3)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `storm-commando-blaster-carbine-p12-3d8-3` — "blaster carbine +12 (3d8+3)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `storm-commando-blaster-carbine-p7-3d8-3` — "blaster carbine +7 (3d8+3)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Sith Lord / Lightsaber** (`sith-lord::lightsaber`) — 8 rows, cross-pack: true
  - `sith-lord-lightsaber-p19-2d8-10` — "lightsaber +19 (2d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `sith-lord-lightsaber-p16-2d8-10` — "lightsaber +16 (2d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `sith-lord-lightsaber-p11-3d8-10` — "lightsaber +11 (3d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `sith-lord-lightsaber-p11-3d8-10` — "lightsaber +11 (3d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `sith-lord-lightsaber-p19-2d8-10` — "lightsaber +19 (2d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `sith-lord-lightsaber-p16-2d8-10` — "lightsaber +16 (2d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `sith-lord-lightsaber-p11-3d8-10` — "lightsaber +11 (3d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `sith-lord-lightsaber-p11-3d8-10` — "lightsaber +11 (3d8+10)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Pirate Captain / Vibroblade** (`pirate-captain::vibroblade`) — 4 rows, cross-pack: true
  - `pirate-captain-vibroblade-p9-2d6-5` — "vibroblade +9 (2d6+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `pirate-captain-vibroblade-p4-2d6-5` — "vibroblade +4 (2d6+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `pirate-captain-vibroblade-p9-2d6-5` — "vibroblade +9 (2d6+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `pirate-captain-vibroblade-p4-2d6-5` — "vibroblade +4 (2d6+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Core Craft Sentry / Sporting Blaster Rifle** (`core-craft-sentry::sporting blaster rifle`) — 4 rows, cross-pack: true
  - `core-craft-sentry-sporting-blaster-rifle-p8-3d6-4` — "sporting blaster rifle +8 (3d6+4)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `core-craft-sentry-sporting-blaster-rifle-p9-4d6-4-with-deadeye` — "sporting blaster rifle +9 (4d6+4) with deadeye" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `core-craft-sentry-sporting-blaster-rifle-p8-3d6-4` — "sporting blaster rifle +8 (3d6+4)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `core-craft-sentry-sporting-blaster-rifle-p9-4d6-4-with-deadeye` — "sporting blaster rifle +9 (4d6+4) with deadeye" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Mandalorian Scout / Blaster Carbine** (`mandalorian-scout::blaster carbine`) — 4 rows, cross-pack: true
  - `mandalorian-scout-blaster-carbine-p7-3d8-2` — "blaster carbine +7 (3d8+2)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `mandalorian-scout-blaster-carbine-p7-4d8-2-with-deadeye` — "blaster carbine +7 (4d8+2) with deadeye" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `mandalorian-scout-blaster-carbine-p7-3d8-2` — "blaster carbine +7 (3d8+2)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `mandalorian-scout-blaster-carbine-p7-4d8-2-with-deadeye` — "blaster carbine +7 (4d8+2) with deadeye" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Elite Shadow Guard / Lightsaber Pike *** (`elite-shadow-guard::lightsaber pike`) — 12 rows, cross-pack: true
  - `elite-shadow-guard-lightsaber-pike-p23-3d8-14` — "lightsaber pike * +23 (3d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `elite-shadow-guard-lightsaber-pike-p25-3d8-14-with-flurry` — "lightsaber pike * +25 (3d8+14; 2-square reach ) with flurry" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `elite-shadow-guard-lightsaber-pike-p23-4d8-14-with-flurry` — "lightsaber pike * +23 (4d8+14; 2-square reach ) with flurry" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `elite-shadow-guard-lightsaber-pike-p20-3d8-14` — "lightsaber pike * +20 (3d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `elite-shadow-guard-lightsaber-pike-p17-3d8-14` — "lightsaber pike * +17 (3d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `elite-shadow-guard-lightsaber-pike-p17-4d8-14` — "lightsaber pike * +17 (4d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `elite-shadow-guard-lightsaber-pike-p23-3d8-14` — "lightsaber pike * +23 (3d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `elite-shadow-guard-lightsaber-pike-p25-3d8-14-with-flurry` — "lightsaber pike * +25 (3d8+14; 2-square reach ) with flurry" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `elite-shadow-guard-lightsaber-pike-p23-4d8-14-with-flurry` — "lightsaber pike * +23 (4d8+14; 2-square reach ) with flurry" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `elite-shadow-guard-lightsaber-pike-p20-3d8-14` — "lightsaber pike * +20 (3d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `elite-shadow-guard-lightsaber-pike-p17-3d8-14` — "lightsaber pike * +17 (3d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `elite-shadow-guard-lightsaber-pike-p17-4d8-14` — "lightsaber pike * +17 (4d8+14; 2-square reach )" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Imperial Knight / Lightsaber** (`imperial-knight::lightsaber`) — 4 rows, cross-pack: true
  - `imperial-knight-lightsaber-p15-2d8-8` — "lightsaber +15 (2d8+8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `imperial-knight-lightsaber-p11-2d8-16` — "lightsaber +11* (2d8+16)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `imperial-knight-lightsaber-p15-2d8-8` — "lightsaber +15 (2d8+8)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `imperial-knight-lightsaber-p11-2d8-16` — "lightsaber +11* (2d8+16)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Ship Gunner / Blaster Cannon** (`ship-gunner::blaster cannon`) — 4 rows, cross-pack: true
  - `ship-gunner-blaster-cannon-p11-3d12-5` — "blaster cannon +11 (3d12+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `ship-gunner-blaster-cannon-p6-3d12-5` — "blaster cannon +6 (3d12+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `ship-gunner-blaster-cannon-p11-3d12-5` — "blaster cannon +11 (3d12+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `ship-gunner-blaster-cannon-p6-3d12-5` — "blaster cannon +6 (3d12+5)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
- **Ship Captain / Vibrodagger** (`ship-captain::vibrodagger`) — 4 rows, cross-pack: true
  - `ship-captain-vibrodagger-p13-2d4-6` — "vibrodagger +13 (2d4+6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `ship-captain-vibrodagger-p8-2d4-6` — "vibrodagger +8 (2d4+6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json
  - `ship-captain-vibrodagger-p13-2d4-6` — "vibrodagger +13 (2d4+6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
  - `ship-captain-vibrodagger-p8-2d4-6` — "vibrodagger +8 (2d4+6)" — data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json
