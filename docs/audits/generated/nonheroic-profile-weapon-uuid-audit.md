# Nonheroic Profile Weapon UUID Audit

Generated: 2026-07-14T16:09:13.606Z
Mode: report-only

This is a mechanical compendium identity audit only. It does not interpret
sourcebooks, does not change `formula.printed`, and does not hydrate attack
bonuses. See docs/nonheroic-weapon-uuid-metadata.md for the policy note.

## Summary

- Pack weapon items scanned: 372
- Profile files scanned: 6
- Records scanned: 67
- Files written: 0
- Records written: 0

- safe-match: 0
- safe-match-formula-unclear: 2
- already-valid: 34
- ambiguous: 0
- missing-match: 20
- stale-uuid: 0
- formula-mismatch: 0
- skipped-custom: 11
- inconsistent-custom-row: 0

## Applied / Applicable Safe Matches (0)

_None._

## Safe UUID Matches with Unclear Formula Delta (metadata only, formula untouched) (2)

- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: t4-turret-droid-grenade-launcher (Grenade Launcher) — exact name match to "Grenade Launcher" (weapons-heavy); printed formula "5d6" vs base "Special" is not a simple/obvious delta and formula.mode is left untouched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: deluge-facility-guard-blaster-rifle (Blaster Rifle) — exact name match to "Blaster Rifle" (weapons-rifles); printed formula "3d8" vs base "3d10" is not a simple/obvious delta and formula.mode is left untouched.

## Already-Valid UUIDs (34)

- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: goon-heavy-blaster-pistol (Heavy Blaster Pistol) — uuid resolves to "Heavy Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: imperial-informant-hold-out-blaster-pistol (Hold-Out Blaster Pistol) — uuid resolves to "Hold-Out Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: medic-blaster-carbine (Blaster Carbine) — uuid resolves to "Blaster Carbine" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: scout-trooper-blaster-pistol (Blaster Pistol) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: peace-brigade-thug-vibrodagger (Vibrodagger) — uuid resolves to "Vibrodagger" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: ugnaught-worker-blaster-pistol (Blaster Pistol) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: csa-security-guard-blaster-carbine (Blaster Carbine) — uuid resolves to "Blaster Carbine" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: black-sun-thug-heavy-blaster-pistol (Heavy Blaster Pistol) — uuid resolves to "Heavy Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: swoop-gang-member-vibrodagger (Vibrodagger) — uuid resolves to "Vibrodagger" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` :: sith-spy-hold-out-blaster-pistol (Hold-Out Blaster Pistol) — uuid resolves to "Hold-Out Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: t4-turret-droid-blaster-cannon (Blaster Cannon) — uuid resolves to "Blaster Cannon" (weapons-heavy) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: deluge-facility-guard-stun-baton (Stun Baton) — uuid resolves to "Stun Baton" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: deluge-facility-guard-blaster-pistol (Blaster Pistol) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: corporate-sector-mine-guard-stun-baton (Stun Baton) — uuid resolves to "Stun Baton" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: corporate-sector-mine-guard-blaster-carbine (Blaster Carbine) — uuid resolves to "Blaster Carbine" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: wanderer-scout-surveyor-droid-stun-blaster (Stun Blaster) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: vagaari-infiltrator-stun-baton (Stun Baton) — uuid resolves to "Stun Baton" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: vagaari-infiltrator-blaster-pistol (Blaster Pistol) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: vagaari-infiltrator-hold-out-blaster-pistol (Hold-Out Blaster Pistol) — uuid resolves to "Hold-Out Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: sandos-boys-vibroblade (Vibroblade) — uuid resolves to "Vibroblade" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: sandos-boys-blaster-pistol (Blaster Pistol) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: sandos-hired-blasters-blaster-pistol (Blaster Pistol) — uuid resolves to "Blaster Pistol" (weapons-pistols) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: sandos-hired-blasters-blaster-carbine (Blaster Carbine) — uuid resolves to "Blaster Carbine" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: gx1-series-battle-droid-blaster-rifle (Blaster Rifle Attack) — uuid resolves to "Blaster Rifle" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: fltch-series-battle-droid-heavy-blaster-rifle (Heavy Blaster Rifle Attack) — uuid resolves to "Heavy Blaster Rifle" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: fltch-series-battle-droid-missile-launcher (Missile Launcher Attack) — uuid resolves to "Missile Launcher" (weapons-heavy) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: hkb-3-hunter-killer-droid-blaster-rifle (Blaster Rifle Attack) — uuid resolves to "Blaster Rifle" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: e522-assassin-droid-rapid-shot (Rapid Shot (Heavy Repeating Blaster)) — uuid resolves to "Heavy Repeating Blaster" (weapons-heavy) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: sd-9-battle-droid-heavy-repeating-blaster (Heavy Repeating Blaster Attack) — uuid resolves to "Heavy Repeating Blaster" (weapons-heavy) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: sd-x-stealth-battle-droid-blaster-rifle (Blaster Rifle Attack) — uuid resolves to "Blaster Rifle" (weapons-rifles) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: sd-x-stealth-battle-droid-concealed-vibrodaggers (Concealed Vibrodaggers) — uuid resolves to "Vibrodagger" (weapons-simple) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: yvh-battle-droid-blaster-cannon (Blaster Cannon Attack) — uuid resolves to "Blaster Cannon" (weapons-heavy) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: yvh-battle-droid-maximum-firepower (Maximum Firepower) — uuid resolves to "Blaster Cannon" (weapons-heavy) with matching base metadata.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: yvh-battle-droid-vibroblade (Vibroblade Attack) — uuid resolves to "Vibroblade" (weapons-simple) with matching base metadata.

## Ambiguous Candidates (0)

_None._

## Missing Compendium Items (20)

- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: 11-17-series-mining-droid-heavy-plasma-jet (Heavy Plasma Jet) — no compendium weapon item found with normalized name "heavy plasma jet".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: kmi-mining-droid-laser-cutter (Laser Cutter) — no compendium weapon item found with normalized name "laser cutter".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: viper-series-probe-droid-pacify-hostile (Pacify Hostile) — no compendium weapon item found with normalized name "pacify hostile".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: corporate-sector-miner-club (Club) — no compendium weapon item found with normalized name "club".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: dt-16-destructor-battle-droid-rapid-shot (Rapid Shot) — no compendium weapon item found with normalized name "rapid shot".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: droideka-mk-ii-destroyer-droid-blaster-barrage (Blaster Barrage) — no compendium weapon item found with normalized name "blaster barrage".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: droideka-mk-ii-destroyer-droid-rapid-shot (Rapid Shot) — no compendium weapon item found with normalized name "rapid shot".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: droideka-mk-ii-destroyer-droid-twin-blaster-burst (Twin Blaster Burst) — no compendium weapon item found with normalized name "twin blaster burst".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: hk-77-assassin-droid-blaster-surge (Blaster Surge) — no compendium weapon item found with normalized name "blaster surge".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: hk-77-assassin-droid-salvo (Salvo) — no compendium weapon item found with normalized name "salvo".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: hk-77-assassin-droid-support-fire (Support Fire) — no compendium weapon item found with normalized name "support fire".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: v2-series-commando-droid-support-fire (Support Fire) — no compendium weapon item found with normalized name "support fire".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: scorpenek-annihilator-droid-blaster-barrage (Blaster Barrage) — no compendium weapon item found with normalized name "blaster barrage".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: scorpenek-annihilator-droid-rapid-shot (Rapid Shot) — no compendium weapon item found with normalized name "rapid shot".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: scorpenek-annihilator-droid-twin-blaster-burst (Twin Blaster Burst) — no compendium weapon item found with normalized name "twin blaster burst".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: sd-9-battle-droid-twin-blaster-burst (Twin Blaster Burst) — no compendium weapon item found with normalized name "twin blaster burst".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: tc-sc-infiltration-droid-dastardly-blade (Dastardly Blade) — no compendium weapon item found with normalized name "dastardly blade".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: tc-sc-infiltration-droid-dastardly-blast (Dastardly Blast) — no compendium weapon item found with normalized name "dastardly blast".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: infiltrator-series-droid-rapid-shot (Rapid Shot) — no compendium weapon item found with normalized name "rapid shot".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: de-training-droid-rapier-thrust (Rapier Thrust) — no compendium weapon item found with normalized name "rapier thrust".

## Stale / Invalid UUIDs (0)

_None._

## Formula/Type Mismatches on Existing UUIDs (0)

_None._

## Custom / Natural / Unarmed / Special Rows (Intentionally Skipped) (11)

- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: kmi-mining-droid-unarmed (Unarmed) — delivery "unarmed" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: viper-series-probe-droid-self-destruct (Self-Destruct) — rowKind "special" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: t4-turret-droid-cutting-laser (Cutting Laser) — rowKind "special" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: deluge-facility-technician-unarmed (Unarmed) — delivery "unarmed" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` :: reyko-gore (Gore) — rowKind "natural" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` :: vindinax-claw (Claw) — rowKind "natural" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` :: vindinax-bite (Bite) — rowKind "natural" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: wanderer-scout-surveyor-droid-claw (Claw) — rowKind "natural" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: sandos-hired-blasters-unarmed (Unarmed) — rowKind "unarmed" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: fltch-series-battle-droid-claw-attack (Claw Attack) — rowKind "natural" marks this as intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` :: infiltrator-series-droid-penetrate-hull (Penetrate Hull) — rowKind "natural" marks this as intentionally left unmatched.

## Inconsistent Custom Rows (Needs Review) (0)

_None._
