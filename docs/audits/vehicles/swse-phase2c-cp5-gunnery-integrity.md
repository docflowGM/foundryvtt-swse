# SWSE Vehicle Phase 2C - CP5 Gunnery Formula and Source Integrity

## Core Rulebook rule and current code

Core Rulebook, vehicle combat ATTACKS section: an attack with a vehicle weapon uses `1d20 + gunner BAB + vehicle Intelligence modifier + range modifier` (with other applicable attack modifiers). The gunner's personal Dexterity is not the vehicle attack ability modifier. *Starships of the Galaxy*, Target Sense maneuver, is a distinct published Charisma-for-vehicle-INT substitution when activated.

`vehicle-attack-math.js` already supplies Vehicle INT for named and abstract gunners. `crew-skill-router.js` calls the common `rollAttack` entry and `attack-domain-router.js` selects the gunnery formula. Do **not** rewrite this existing SSOT or create a competing attack formula.

## Defects corrected in CP5

1. `resolveVehicleAttackBonus` previously returned an NPC flat personal attack total without adding Vehicle INT; it now blocks with `npc-flat-vehicle-attack-unreconciled` until the source/BAB/other components are reconciled. Never replace the flat personal attack total with guessed BAB or silently use an NPC Dexterity bonus.
2. The vehicle weapon importer's embedded Item was stamped `attackAttribute: 'dex'`. That field was misleading for mounted weapons, and a future route might mistake it for canonical authority. The false field has been removed; mount metadata explicitly identifies `vehicle-int`. Personally wielded vehicle-class weapons remain governed by the separate character-attack branch.
3. The statblock pseudo-weapon built by the crew router no longer invents `+0` attack or `1d10` damage for absent inputs. This is not permission to execute incomplete attacks; future eligibility must reject missing mandatory printed data.
4. The vehicle sheet panel/editor no longer inserts false `Forward` arcs, `+0` attacks, `1d10` damage or a physical weapon count of one where no source value exists. Its existing code paths and crew station mapping are retained.

5. The general vehicle import normalizer preserves omitted arcs, attack bonuses, damage, range and count instead of replacing them with arbitrary filler.

## Invariants and tests

The added source-contract regression guard checks Vehicle INT exactly twice (named and abstract crew), the NPC-flat refusal, no imported Dex authority, preserved signed bonuses, no silent statblock defaults, and the unchanged live roll routing. This is an audit/source test, not a substitute for live Foundry V13 end-to-end testing. Two pure policy test groups were previously run at CP4 (31 local tests); CP5 repo-root test execution must run in a complete checkout.

## Remaining integration boundary

The 316 historical + 2 supplemental ship ledgers are in audit files but have **not** been hydrated into trusted, installed weapon-group identities. There is no safe way to treat arbitrary `weapon.system.arc`, `weapon.system.vehicleMount.arcEvidence`, user-added roll options, or an actor-level tag as published source evidence. The CP4 GM receipt adapter is correctly GM-scoped but is not attached to the active `rollAttack` pre-cost path.

Do not turn all existing ships into purportedly certified combatants by defaulting arcs or mount topology. Conversely, enabling a universal evidence gate today without a trusted source-group lookup would block most legacy ship attacks, including ships whose published source is reviewed but not runtime-hydrated. Ask the user for rollout approval before such a broad compatibility-impacting change. The approved *policy* remains fail closed for unknown arcs once a source-bound attack is under its authority.

## No completion claims

- **No production compendium or actor migration** in this checkpoint.
- **No universal runtime evidence gate** or automatic strict mechanical certificates.
- **No live Foundry V13 testing** claimed.
- The printed sourcebook formula is separate from any imported stock-crew weapon attack total and any optional GM temporary adjudication.