# KOTOR Weapons Phase 2B - Standalone Book Authority

**Book:** Knights of the Old Republic Campaign Guide  
**Status:** `KOTOR_WEAPONS_33_OF_33_SOURCE_CERTIFIED_BOOK_ONLY`  
**Repo files:** `data/audits/item-weapons-phase-2b-kotor-standalone-authority.json` (records), verified by `tools/verify-item-weapons-authority.mjs` against the Phase 1J records (identity, repo mapping, pages) and the Phase 2 weapon contract.  
**Scope:** This file contains only this book's weapon entries. It does **not** authorize a rolling-authority merge or any production mutation.

## Book totals

- **33** canonical weapon claims
- **20** currently repo-present
- **13** currently repo-missing
- Source reconciliation: **12 + 17 + 2 + 2 = 33**

## Source tables verified

- Table 5-1: Melee Weapons - p. 64 - 12 claims
- Table 5-2: Ranged Weapons - p. 68 - 17 claims
- Table 11-2: Ranged Weapons - p. 180 - 2 claims
- Table 12-2: Melee Weapons - p. 202 - 2 claims

## KOTOR-proven schema extensions

1. **Alternate attack profiles:** Massassi Lanvarok is one identity with a 3d4 ranged-disc profile and a separate 1d8 two-handed slashing melee profile.
2. **Special rate of fire:** Sonic Disruptor prints `Special` and can fire only once every other round; this must not be coerced into `S` or `A`.

## Book-entry ledger

| # | Weapon | Group | Size | Damage | Stun | ROF | Cost | Weight | Qualities | Repo |
|---:|---|---|---|---|---|---|---:|---:|---|---|
| 1 | Dire Vibroblade | Advanced Melee Weapon | Medium | 2d6 | - | - | 60 | 2 | - | MISSING |
| 2 | Double Vibroblade | Advanced Melee Weapon | Large | 2d6/2d6 | - | - | 550 | 4 | doubleWeapon | MISSING |
| 3 | Shockstaff | Advanced Melee Weapon | Large | 2d6/2d6 | YES (same as base) | - | 3,500 | 3 | doubleWeapon | MISSING |
| 4 | Shyarn | Exotic Weapon | Tiny | 3d4 | - | - | 40 | 1 | - | MISSING |
| 5 | Fira | Exotic Weapon | Medium | 1d8 | - | - | 100 | 2 | - | MISSING |
| 6 | Arggarok | Exotic Weapon | Large | 2d12 | - | - | 150 | 2 | - | MISSING |
| 7 | Zhaboka | Exotic Weapon | Large | 2d6/2d6 | - | - | 165 | 2 | doubleWeapon | MISSING |
| 8 | Lightfoil | Lightsaber | Medium | 2d8 | - | - | 4,500 | 0.5 | ignoresDR | present |
| 9 | Short Sword | Simple Weapon | Small | 1d6 | - | - | 40 | 1.5 | - | MISSING |
| 10 | War Sword | Simple Weapon | Medium | 1d8 | - | - | 50 | 2 | - | MISSING |
| 11 | Dire Sword | Simple Weapon | Large | 1d10 | - | - | 100 | 4 | - | MISSING |
| 12 | Double-Bladed Sword | Simple Weapon | Large | 1d6/1d6 | - | - | 120 | 2 | doubleWeapon | MISSING |
| 13 | Aurial Blaster | Exotic Weapon | Medium | 3d6 | - | S | 2,500 | 1 | - | present |
| 14 | Sith Lanvarok | Exotic Weapon | Medium | 3d4 | - | S | 4,000 | 5.8 | inaccurate | present |
| 15 | Massassi Lanvarok | Exotic Weapon | Large | 3d4 or 1d8 | - | S | 250 | 9.8 | inaccurate | present |
| 16 | Carbonite Rifle | Heavy Weapon | Large | - | 3d10 | S | 1,200 | 6 | - | present |
| 17 | Needler | Pistol | Small | 2d4 | - | S | 650 | 1 | inaccurate | present |
| 18 | Pulse-Wave Pistol | Pistol | Small | 2d6 | - | S | 200 | 1 | inaccurate | present |
| 19 | Ripper | Pistol | Small | 2d4 | - | S | 750 | 1 | inaccurate | present |
| 20 | Sonic Disruptor | Pistol | Small | 2d6 | - | Special | 1,000 | 1 | - | present |
| 21 | Sonic Pistol | Pistol | Small | 2d6 | - | S | 900 | 1 | - | present |
| 22 | Heavy Sonic Pistol | Pistol | Medium | 2d8 | - | S | 1,250 | 1 | - | present |
| 23 | Ion Carbine | Rifle | Medium | 3d8 | - | S, A | 800 | 3 | inaccurate | present |
| 24 | Pulse-Wave Rifle | Rifle | Medium | 2d8 | - | S, A | 550 | 4 | inaccurate | present |
| 25 | Sonic Rifle | Rifle | Medium | 2d8 | - | S, A | 900 | 5 | - | present |
| 26 | Blaster Rifle, Assault | Rifle | Large | 3d8 | YES (same as base) | S, A | 1,750 | 5 | accurate | present |
| 27 | Blaster Carbine, Repeating | Rifle | Large | 3d10 | YES (same as base) | A | 2,000 | 6 | inaccurate, areaEffect, autofireOnly | present |
| 28 | Adhesive Grenade | Simple Weapon | Tiny | - | - | S | 200 | 0.5 | areaEffect, thrown | present |
| 29 | CryoBan Grenade | Simple Weapon | Tiny | 3d6 | - | S | 500 | 0.5 | areaEffect, thrown | present |
| 30 | Commando Special Rifle | Rifle | Medium | 3d10 | - | S, A | 1,250 | 3.3 | - | present |
| 31 | Remote Grenade | Simple Weapon | Tiny | 4d6 | - | S | 300 | 1 | areaEffect, thrown | present |
| 32 | Stunning Gauntlet | Simple Weapon | two_sizes_smaller_than_wearer | - | +1 | - | 200/300 by wearer size | 0.4/0.5 by wearer size | - | MISSING |
| 33 | Mythosaur Axe | Simple Weapon | Large | 1d12 | - | - | 1,000 | 10 | - | MISSING |

## High-priority corrections found in current repo data

- **Lightfoil:** source is 2d8, 0.5 kg, Lightsaber group, Rare; current repo data materially conflicts with this and contains unsupported properties.
- **CryoBan Grenade:** source is 3d6 Energy; current repo uses 4d6 cold and adds unsupported save/immobilization mechanics.
- **Sith Lanvarok:** source is 3d4, 4,000 credits, 5.8 kg, pistol ranges, Inaccurate, Rare; current repo differs materially.
- **Massassi Lanvarok:** source requires both ranged and melee profiles; current repo represents only the ranged side.
- **Sonic weapons:** sonic is treated as energy but has anti-Deflect behavior; current repo prose must not invent generic armor bypass.
- **Stunning Gauntlet:** this is the same production identity also claimed by Clone Wars; do not create a duplicate.

## Guardrails

- Standalone book authority only.
- No rolling/master authority mutation.
- No production pack mutation.
- No missing-record creation.
- No runtime implementation mutation.
- No feat/talent mutation.

## Repo verification notes (Claude)

- 33 records match the 33 Phase 1J KOTOR records one-to-one (names, repo ids and current names, pending-rename flags, description and table pages). Counts tally: accurate 1, inaccurate 8, arc 0, ignoresDR 1 (Lightfoil, Lightsaber group), area effect 4, double weapon 4, autofire-only 1; source tables 12 + 17 + 2 + 2 = 33.
- Phase 1J's Phase 0 identity keys are preserved (`Arggarok` key, printed Arg’garok in `publishedName`; `Sith Lanvarok` / `Massassi Lanvarok`, printed "Lanvarok, Sith/Massassi").
- Only Massassi Lanvarok carries `attackProfiles` (`disc`, `melee`); other KOTOR records predate schema v2.1 and have none. Sonic Disruptor carries `rateOfFire ["Special"]` with `operation.specialRateOfFire`.
- The 20 present records are all `MATERIAL_MISMATCH` against the repo; the 13 missing are `MISSING_RECORD`. Nothing in packs was changed.
