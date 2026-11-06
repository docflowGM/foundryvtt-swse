> **Historical checkpoint: superseded by v0.5 nullable-field policy.** These pass counts describe earlier schema versions. Current policy and tests are documented in [the v0.5 report](swse-phase0b-v05-nullable-schema-report.md).

# SWSE Phase 0-B — Conditional Rules, Batteries, and Scale Stress Test

**Status:** PASS for draft structural regressions; **STRICT CERTIFICATION GATE FAILS** as intended.
**Schema status:** Vehicle draft v0.4; vehicle-weapon draft v0.4; neither frozen nor canon-certified.
**Authority:** SWSE sourcebook TXT and visual inspection of Core Rulebook printed pp.170–171; no legacy compendium used.
**Repository changes:** None.

## Summary

- **31/31** new v0.4 structural/semantic regression checks pass; the earlier 40/40 v0.3 stress checks remain documented separately, but are not automatically equivalent to this schema version.
- **12** illustrative vehicles across ground, starfighter, capital ship, station, biological craft, droid-vehicle and cross-book variants validate structurally.
- **11** intrinsic-weapon / launcher / payload source-sample definitions validate structurally.
- **8** global-rule entries are tracked as source-informed design probes; none are promoted as a complete rules registry.
- **2124** null or empty-array locations lack a source status, so `phase0b_certification_gate.py --strict` exits with code 2. These do **not** represent 2,124 known source errors. They mean these illustrative records have not undergone certification-grade deep status transcription.

## A. Typed conditional mechanics

Every vehicle now has the common `rules` object (`conditionalMechanics`, `globalRuleReferences`, `reviewStatus`). Every intrinsic vehicle-weapon definition has `conditionalMechanics`; attack profiles and special effects have a typed `conditionAst` slot.

The shared condition grammar has five node forms: `atom`, `all`, `any`, `not` and `unresolved`. Atomic expressions constrain subject, attribute, operator and comparison value. This grammar is intentionally closed: arbitrary new subject and predicate keywords fail schema validation.

A condition that cannot be expressed safely is stored as `unresolved` with a printed-condition paraphrase and an explicit reason. The `unresolved` node is never treated as true, automatically executable, or as evidence that a rule has been implemented. Typed effects specify target semantic path, operation, timing, unit and consumer status. They do not include Foundry field paths.

Example used in the dry run: Golan VIII moving sets shields unavailable and prevents attacks. The conditions and candidate effects are structured but **not fully source-certified**; associated consumer statuses remain `schema-only` / `needs-ontology`.

## B. Core weapon battery formula: primary PDF check

The *Core Rulebook* p.170 **Weapon Batteries** sidebar establishes:

1. A battery consists of up to **six identical weapons**.
2. A gunner aiding another gunner in that same battery automatically gives **+2 to the attack roll**, without an aiding attack roll.
3. For each **three points of attack margin above Reflex Defense**, another weapon in that battery hits; add **one extra damage die** per additional hit, capped by the remaining weapons in that battery.
4. The bonus dice are added **before** the weapon damage multiplier.
5. The printed battery attack bonus in a statblock **already reflects typical coordinated fire**; the runtime must not apply it again when using the printed aggregate attack value.
6. When one battery aids another battery, one gunner in the aiding battery rolls against **Reflex 10**. On success, the target battery gains **+2 per weapon in the aiding battery** to its attack, without extra damage dice from that aiding relationship.

Illustrative arithmetic for a **four-weapon battery**, assuming a valid hit and all necessary participants exist:

| Attack margin above Reflex | Additional hits | Added dice |
|---:|---:|---:|
| 0 | 0 | 0 |
| 2 | 0 | 0 |
| 3 | 1 | 1 |
| 9 | 3 | 3 |
| 12 | 3 | 3 (capped) |

This is a model for **data contract validation**, not a Foundry damage executor. A printed count of battery groups is **not** proof of a number of physical weapons in each group. The schema now has separate nullable `weaponsPerBattery`, `supportingGunners` and `batteryMembershipStatus` fields on each firing group; an unresolved count blocks derived calculation.

## C. Other cross-cutting rules kept out of vehicle records

| Rule | Current basis | Modeling decision |
|---|---|---|
| Capital weapons vs smaller targets | Core Rulebook p.171, visual PDF check | Global −20 attack rule with point-defense exemption; never stamped as a permanent intrinsic weapon modifier |
| Narrow salvo | Core Rulebook p.170, visual PDF check | Global margin-based battery calculation |
| Proximity spread | Starships of the Galaxy, Handling Large Battles | Global alternate battery attack mode, −5 attack, one starship-scale square |
| Fire-linked missile/torpedo consumption | Starships of the Galaxy, Fire-Linked Weapons | Global ammunition rule, one consumed per firing linked launcher; not a battery mechanic |
| Character vs starship squares | Core Rulebook, Scale section | Character square = 1.5m; starship square is abstract; no universal conversion |
| Area attacks at starship scale | Core Rulebook, Area Attacks | Default resolved as single target unless explicitly starship-scale area |
| Vehicle damage multiplier | Core Rulebook, Damage | Keep the dice and multiplier distinct, preserving before-multiplier additions |

See `swse-phase0b-global-rules-registry.json` for the bounded claims and each claim’s verification status. Rules lacking verified pages or complete mechanics are intentionally not promoted.

## D. Deep field-state audit (strict gate)

The gate recursively inspects all fields, including entries inside nested arrays. Every `null` and every empty array must have an explicit JSON Pointer state before a source entry can be certified. The status must be chosen during transcription; automatic filling would falsify what the book says.

| Unclassified paths by schema section | Count |
|---|---:|
| `armament` | 570 |
| `abilities` | 164 |
| `capacity` | 162 |
| `defenses` | 143 |
| `systems` | 143 |
| `combat` | 136 |
| `movement` | 110 |
| `geometry` | 88 |
| `economics` | 83 |
| `modifications` | 78 |
| `exceptions` | 71 |
| `classification` | 61 |
| `crew` | 60 |
| `identity` | 59 |
| `durability` | 58 |
| `hyperspace` | 47 |
| `publication` | 28 |
| `rules` | 25 |
| `text` | 25 |
| `challenge` | 13 |

**Total:** 2124 unclassified paths in 12 illustrative vehicles. This conservative check includes ordinary empty lists, not only unknown printed values.

A few records also annotate non-null values such as `passengerCount: 0` with `explicitly-none`; such annotations are legitimate evidence statements, not necessarily stale metadata.

## E. Regression boundaries

- Missing common `rules` group → rejected by JSON Schema.
- Unrecognized conditional attribute → rejected by JSON Schema.
- Arbitrary ammunition owner → rejected by JSON Schema.
- Undeclared nested effect field → rejected by JSON Schema.
- Y-wing variants retain source-specific SR values of 25 and 10.
- Global-rule keys remain unique; no sample is marked fully certified.
- An unresolved rule must not be represented as an executed gameplay mechanic.

## Remaining release gates

- Certification-grade source transcription, including assigning correct statuses to nested nulls and empty arrays.
- Complete rules vocabulary and source-page mapping for uncommon effects and extraordinary vehicles.
- Confirm exact attack bonus components versus printed aggregate crew bonuses for every installation.
- Full vehicle-weapon identity reconciliation, ammunition ownership and attack-profile linking.
- Connect a future conditional-rule evaluator to existing Foundry V2 authorities and verify in live Foundry v13.
- Broader systematic sampling across all 14 books, not just the illustrative outliers.

## Local files

- `swse-phase0b-vehicle.schema.json` / `swse-phase0b-vehicle-weapon.schema.json` — v0.4 machine-checkable schemas.
- `swse-phase0b-global-rules-registry.json` — cross-cutting rules stored once, with source verification statuses.
- `swse-phase0b-semantic-contract-report.json` — 31 individual regression results and full deep-status audit.
- `swse-phase0b-dryrun-fixtures.json`, `swse-phase0b-additional-vehicle-fixtures.json`, `swse-phase0b-variant-fixtures.json`, `swse-phase0b-weapon-stress-fixtures.json` — updated illustrative fixture sets.
- `swse-phase0b-vehicle.blank.json` — new blank v0.4 shape with common rules group.
- `phase0b_finalize_semantic_contract.py` — reproducible local schema/fixture upgrade and targeted regression.
- `phase0b_certification_gate.py` — read-only structural check and `--strict` fail-closed field-status gate.

**Conclusion:** The v0.4 schema can represent the new tested rule families. Phase 0-B stays **OPEN**. Structural validation is not source certification, and the strict null/array status gate is deliberately red.
