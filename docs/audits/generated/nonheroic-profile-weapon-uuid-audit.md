# Nonheroic Profile Weapon UUID Audit

Generated: 2026-07-14T11:30:02.075Z
Mode: report-only

This is a mechanical compendium identity audit only. It does not interpret
sourcebooks, does not change `formula.printed`, and does not hydrate attack
bonuses. See docs/nonheroic-weapon-uuid-metadata.md for the policy note.

## Summary

- Pack weapon items scanned: 372
- Profile files scanned: 4
- Records scanned: 28
- Files written: 0
- Records written: 0

- safe-match: 0
- safe-match-formula-unclear: 2
- already-valid: 13
- ambiguous: 0
- missing-match: 6
- stale-uuid: 0
- formula-mismatch: 0
- skipped-custom: 7
- inconsistent-custom-row: 0

## Applied / Applicable Safe Matches (0)

_None._

## Safe UUID Matches with Unclear Formula Delta (metadata only, formula untouched) (2)

- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: t4-turret-droid-grenade-launcher (Grenade Launcher) — exact name match to "Grenade Launcher" (weapons-heavy); printed formula "5d6" vs base "Special" is not a simple/obvious delta and formula.mode is left untouched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: deluge-facility-guard-blaster-rifle (Blaster Rifle) — exact name match to "Blaster Rifle" (weapons-rifles); printed formula "3d8" vs base "3d10" is not a simple/obvious delta and formula.mode is left untouched.

## Already-Valid UUIDs (13)

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

## Ambiguous Candidates (0)

_None._

## Missing Compendium Items (6)

- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: 11-17-series-mining-droid-heavy-plasma-jet (Heavy Plasma Jet) — no compendium weapon item found with normalized name "heavy plasma jet".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: kmi-mining-droid-unarmed (Unarmed) — no compendium weapon item found with normalized name "unarmed".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: kmi-mining-droid-laser-cutter (Laser Cutter) — no compendium weapon item found with normalized name "laser cutter".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: viper-series-probe-droid-pacify-hostile (Pacify Hostile) — no compendium weapon item found with normalized name "pacify hostile".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: deluge-facility-technician-unarmed (Unarmed) — no compendium weapon item found with normalized name "unarmed".
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` :: corporate-sector-miner-club (Club) — no compendium weapon item found with normalized name "club".

## Stale / Invalid UUIDs (0)

_None._

## Formula/Type Mismatches on Existing UUIDs (0)

_None._

## Custom / Natural / Unarmed / Special Rows (Intentionally Skipped) (7)

- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: viper-series-probe-droid-self-destruct (Self-Destruct) — rowKind "special" is intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` :: t4-turret-droid-cutting-laser (Cutting Laser) — rowKind "special" is intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` :: reyko-gore (Gore) — rowKind "natural" is intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` :: vindinax-claw (Claw) — rowKind "natural" is intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` :: vindinax-bite (Bite) — rowKind "natural" is intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: wanderer-scout-surveyor-droid-claw (Claw) — rowKind "natural" is intentionally left unmatched.
- `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` :: sandos-hired-blasters-unarmed (Unarmed) — rowKind "unarmed" is intentionally left unmatched.

## Inconsistent Custom Rows (Needs Review) (0)

_None._
