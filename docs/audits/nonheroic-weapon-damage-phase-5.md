# NH-5 Scavenger's Guide to Droids Battle/Security Droid Damage Profiles

## Purpose

NH-5 adds a new sourcebook-backed batch of nonheroic statblock weapon/action damage profiles for *Scavenger's Guide to Droids* 4th-degree (battle/security) droid models, using the existing canonical NH-2 profile schema.

This batch was started as a deliberate correction of direction: the repository also has a broad, mechanical coverage audit (`tools/audit-nonheroic-profile-coverage.mjs`, PR #903) that inventories ~7,500 weapon-like rows across actor packs and statblock JSON. That audit is useful only as a noisy inventory signal (it is inflated by duplicates, missing source attribution, possessions-only rows, and parenthetical counts mistaken for damage) — it is **not** used as the source of truth or as an implementation worklist for this batch. NH-5 instead follows the same sourcebook-batch workflow as NH-1/NH-3/NH-4: pick one source family, extract only rows where a printed attack row and damage expression are directly visible, and add/repair profiles for that batch alone.

## Files changed

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json
scripts/engine/import/nonheroic-damage-profile-hydrator.js
docs/audits/nonheroic-weapon-damage-phase-5.md
```

No actor packs, compendium packs, source JSON, or runtime combat code were changed. No existing profile file (`nh1`/`nh3`/`nh4`/`nh4-beasts`) was modified.

## Source material and its format

Repository statblock text for *Scavenger's Guide to Droids* droid models is present as a wiki-mirrored JSON dataset (`data/nonheroic/nonheroic_units.json`), the same kind of repo-local statblock text that NH-1's Scavenger's Guide to Droids rows (KM1 Mining Droid, Colicoid T4 Turret Droid, Viper-Series Probe Droid) were already drawn from. Unlike the classic inline "Melee X +N (dice)" statblock line format used by earlier NH batches, most of this dataset's droid entries use a wiki "Protocol Format" presentation: each droid lists discrete "System Actions," each with its own action-economy cost (Swift Action, Reaction, etc.), attack bonus, and damage expression, e.g.:

> Blaster Rifle Attack (1 Swift Action, 1/Turn) — The GX1-Series Battle Droid makes a ranged attack at +11. If successful, the attack deals 3d10+4 points of damage.

Each row added in this batch was transcribed directly from one such System Action line. As with NH-1's prior use of this same dataset, `source.status` is set to `"repo-statblock-text-labelled-sourcebook; page review still required"` and `confidence` is set to `"manualRequired"` (never `"verified"`) for every row in this batch — page-level confirmation against the physical/PDF sourcebook has not been performed.

## Droid models covered

16 *Scavenger's Guide to Droids* 4th-degree battle/security droid models, 29 records total:

| Actor | CL | Rows added |
|---|---|---|
| GX1-Series Battle Droid | 6 | Blaster Rifle Attack (+ Rapid Shot variant) |
| FLTCH-Series Battle Droid | 5 | Claw Attack, Heavy Blaster Rifle Attack, Missile Launcher Attack |
| DT-16 "Destructor" Battle Droid | 2 | Rapid Shot |
| Droideka Mk II Destroyer Droid | 8 | Blaster Barrage, Rapid Shot, Twin Blaster Burst |
| HK-77 Assassin Droid | 4 | Blaster Surge, Salvo, Support Fire |
| V2-Series Commando Droid | 1 | Support Fire |
| Scorpenek Annihilator Droid | 12 | Blaster Barrage, Rapid Shot, Twin Blaster Burst |
| HKB-3 Hunter-Killer Droid | 6 | Blaster Rifle Attack |
| E522 Assassin Droid | 7 | Rapid Shot (+ Ion Rifle variant) |
| SD-9 Battle Droid | 16 | Heavy Repeating Blaster Attack, Twin Blaster Burst |
| SD-X Stealth Battle Droid | 9 | Blaster Rifle Attack, Concealed Vibrodaggers |
| TC-SC Infiltration Droid | 1 | Dastardly Blade, Dastardly Blast |
| Infiltrator-Series Droid | 4 | Penetrate Hull, Rapid Shot |
| DE Training Droid | 1 | Rapier Thrust |
| YVH Battle Droid | 9 | Blaster Cannon Attack, Maximum Firepower, Vibroblade Attack |

None of these actor slugs overlap with existing NH-1/NH-3/NH-4 records (verified by set comparison across all `actor.slugs`).

## Compendium UUID matching notes

UUID/base metadata was applied only where a row names an ordinary weapon and the compendium has an exact-name match in `packs/weapons*.db`, following the same identity-matching approach as the NH-4/PR #902 audit tooling (`tools/audit-nonheroic-profile-weapon-uuids.mjs`). All catalog matches use the category-specific pack (`weapons-rifles`, `weapons-heavy`, `weapons-simple`), not the catch-all `weapons` pack, matching prior precedent.

- **Clean base or base-plus-delta/dice matches** (compendium dice line up with the printed formula): GX1 Blaster Rifle Attack, FLTCH Missile Launcher Attack, E522 Rapid Shot (Heavy Repeating Blaster base row + Ion Rifle variant), SD-9 Heavy Repeating Blaster Attack, SD-X Concealed Vibrodaggers, YVH Blaster Cannon Attack, YVH Maximum Firepower, YVH Vibroblade Attack.
- **Exact-name match with a dice-count mismatch** (`formula.mode: "printed-override"`): FLTCH Heavy Blaster Rifle Attack (compendium Heavy Blaster Rifle base is `3d12`; printed row is `3d10+2`), HKB-3 Blaster Rifle Attack and SD-X Blaster Rifle Attack (compendium Blaster Rifle base is `3d10`; printed rows are `3d8+4`). In each case `weapon.uuid` is kept as an exact-name identity reference only — `formula.printed` remains sole authority and no delta relationship between the printed and base dice is claimed, since the mismatch is not mechanically obvious and this batch does not interpret why it exists.
- **No compendium match, ordinary weapon** (`weapon.uuid: null`, `baseFormulaPolicy: "none"`): rows named only by System Action label with no identifiable weapon model or damage type printed (DT-16 Rapid Shot, V2-Series Support Fire, Infiltrator-Series Rapid Shot, TC-SC Dastardly Blade/Dastardly Blast, DE Training Droid Rapier Thrust — no compendium item named "Rapier" exists), and integrated built-in twin-blaster weapons whose action names (Blaster Barrage, Rapid Shot, Twin Blaster Burst, Blaster Surge, Salvo, Support Fire) don't correspond to any single catalog item (Droideka Mk II, HK-77, Scorpenek Annihilator, SD-9 Twin Blaster Burst).
- **No auto-applied UUIDs were guessed.** Every row above either has an exact single-candidate compendium match or explicitly none; no ambiguous or multi-candidate matches occurred in this batch (cross-checked by running `tools/audit-nonheroic-profile-weapon-uuids.mjs` in report-only mode after adding this file — see Validation below).

## Custom/natural/special handling notes

- **Natural attacks** (`rowKind: "natural"`, `weapon.uuid: null`, `baseFormulaPolicy: "custom"`): FLTCH-Series Battle Droid Claw Attack, Infiltrator-Series Droid Penetrate Hull. Neither row's source text prints a damage type; `slashing` (claw) and `piercing` (hull-penetrating strike) were used consistent with existing claw/strike typing conventions already applied elsewhere in this dataset (e.g. `vindinax-claw`), and this is called out explicitly in each record's `formula.notes`.
- **Riders**: TC-SC Infiltration Droid's Dastardly Blade/Dastardly Blast both carry a `condition-track` rider (`-1` step if the target is denied its Dexterity bonus to Reflex Defense on a hit) as metadata, not an executable runtime effect.
- **Area/burst/autofire/splash rows**: FLTCH Missile Launcher Attack (2-square radius burst), SD-9 Heavy Repeating Blaster Attack (autofire, 2x2 area, half damage on miss), SD-9 Twin Blaster Burst (1-square splash), YVH Blaster Cannon Attack / Maximum Firepower (area attack that can also hit an adjacent enemy, half damage on target on a miss). These use the schema's existing `attack.isArea` / `isAutofire` / `isSplash` / `halfDamageOnMiss` and `area` fields; none of this required inventing new mechanics.
- **Multi-attack rows**: Droideka Mk II Blaster Barrage, HK-77 Salvo, and Scorpenek Annihilator Blaster Barrage each make two separate attacks per the printed text. The schema does not currently have an explicit attack-count field, so each is recorded as a single damage component with the two-attacks behavior called out in `printedAttack.text` (e.g. `"+10 (x2)"`) and in the row's notes, rather than inventing a new schema field in a data-only batch.
- **Alternate weapon options modeled as variants**: GX1-Series Battle Droid's "Rapid Shot" (same weapon, reduced bonus/extra die, matching the existing T4 Turret Droid Rapid Shot variant precedent from NH-1) and E522 Assassin Droid's "Rapid Shot" (explicitly "either its Heavy Repeating Blaster or its Ion Rifle" in the source text — modeled as base row + Ion Rifle variant).

## Intentionally skipped rows

- **Shadow Droid** — its only offensive System Action is "Ramming Speed," a starship-vs-starship ramming maneuver (`4d6+10` to both participants on a Pilot check), which is a vehicle/starship-scale maneuver rather than a character-scale weapon attack. Skipped entirely; out of scope for this batch.
- **FLTCH-Series Battle Droid "Zero-Range Attack"** — a compound Grab/Grapple-then-immediate-second-attack action using a different weapon (arm-mounted Blaster Rifle) at a different bonus than its own Claw Attack. Skipped as a multi-step combo action rather than force-fitting it into a single weapon row.
- **FLTCH-Series Battle Droid "Nightmare"**, **SD-9 Battle Droid "Defense Mode"/"Delay Damage"**, **YVH Battle Droid "Yuuzhan Vong Scan"/"Yuuzhan Vong Taunt"**, and similar non-damage utility/tactical System Actions — skipped because they print no damage expression.
- **E522 Assassin Droid "Needler"** — mentioned only as the weapon used by the "Paralyze Opponent" System Action; the source text describes the paralysis effect but prints no damage formula for the Needler itself, so no row was added for it.
- **Infiltrator-Series Droid "Penetrate Hull" alternate vehicle-hull damage** — the source text also prints a flat "16 points of damage against the hull of a Vehicle or against solid walls and doors" alternative. That object/vehicle-hull interaction is out of scope for a character-scale weapon-damage batch and is preserved only as a note on the row, not modeled as a mechanic.
- All the other 4th-degree *Scavenger's Guide to Droids* battle/security droid models not listed above (e.g. any remaining models in the sourcebook's full battle/security droid roster not covered by this pass) are left for a future NH-5b/NH-6 batch rather than folded into this one.

## Hydrator update

`nonheroic-damage-profile-hydrator.js` now loads:

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json
```

Hydration still requires `confidence: "verified"` (or `"sourcebookVerified"`), an actor/template slug match, and a raw attack-row text match. Every row added in this batch is `confidence: "manualRequired"`, so **none of these rows wire into hydration yet** — they are reference/audit data only until a page-verification pass upgrades their confidence, exactly like NH-1's existing Scavenger's Guide to Droids rows.

## Non-goals

NH-5 does not:

- use the PR #903 coverage audit as source authority or an implementation worklist,
- hydrate printed attack totals into item attack math,
- reverse-engineer why a printed dice-count mismatch exists between a compendium base weapon and a printed row (see `printed-override` rows above),
- create new compendium items,
- mutate actor packs, compendium packs, or source JSON,
- rewrite existing NH-1/NH-3/NH-4 profile files,
- change runtime combat math or damage packet behavior,
- model multi-attack actions, vehicle-hull-only damage, or compound grapple-then-attack actions as new schema mechanics,
- claim page-level sourcebook verification (`confidence` stays `manualRequired` throughout).

## Validation performed

- `python3 -c "json.load(...)"` — all 5 non-schema profile files (`nh1`, `nh3`, `nh4`, `nh4-beasts`, `nh5`) parse as valid JSON.
- `jsonschema.Draft202012Validator` against `nonheroic-weapon-damage-profiles.schema.json` — the new `nh5` file has exactly one schema violation: a top-level `"$schema"` property that the schema's own `additionalProperties: false` root definition does not declare. **This is pre-existing schema drift, not new drift introduced by this batch** — running the same validator against `nh1`, `nh3`, `nh4`, and `nh4-beasts` produces the identical single `"$schema"` violation on every one of them. It is documented here rather than silently worked around; fixing it would mean editing the schema or all five profile files, which is out of scope for a single sourcebook batch.
- `node --check scripts/engine/import/nonheroic-damage-profile-hydrator.js` — passes.
- `node tools/validate-nonheroic-damage-profiles.mjs` — this script predates the `records`-based v2 schema (it only reads a legacy `profiles` array) and reports `"contains no profiles"` for all five files, including the four pre-existing ones. This is a known, pre-existing tooling/schema-version mismatch, not something introduced by NH-5; it is called out here rather than hidden, and was not "fixed" because doing so is outside a single sourcebook-batch PR's scope.
- `node tools/audit-nonheroic-profile-weapon-uuids.mjs` (report-only, from PR #902) run after adding `nh5` as a cross-check on the UUID/base-metadata work in this batch: 11 rows resolve `already-valid` against the compendium, 16 report `missing-match` (all intentional — unnamed/integrated weapons with no compendium counterpart, as documented above), 2 report `skipped-custom` (the two natural rows), and — critically — **0 stale-uuid, 0 formula-mismatch, 0 ambiguous, and 0 inconsistent-custom-row** across the new batch. The generated audit report itself was not committed as part of this PR (out of scope; it belongs to the #902 tooling lineage).
- Cross-checked all 16 new `actor.slugs` against every existing NH-1/NH-3/NH-4/NH-4-beasts record's `actor.slugs` — zero overlap.
- Manually re-derived each `formula.mode`/`delta` classification (`base`, `base-plus-delta`, `base-plus-dice`, `printed-override`, `custom`) against the compendium base dice and the printed statblock dice for every matched row.

## Suggested smoke tests

Once page-level verification upgrades any of these rows to `confidence: "verified"`:

- Import a GX1-Series Battle Droid (if present in importer source data) and verify the Blaster Rifle Attack row hydrates with `sourceWeaponUuid` pointing at `weapons-rifles.weapon-blaster-rifle`, `statblockPrintedFormula: "3d10+4"`, and the Rapid Shot variant selectable with `statblockPrintedFormula: "4d10+4"`.
- Verify FLTCH-Series Battle Droid's Heavy Blaster Rifle Attack hydrates with `statblockPrintedFormula: "3d10+2"` even though its `sourceWeaponBaseFormula` metadata reads `"3d12"` — printed damage must win, not the compendium base.
- Verify SD-9 Battle Droid's Heavy Repeating Blaster Attack hydrates with `item.system.attack.isAutofire: true`, `area.shape: "2x2"`, and `halfDamageOnMiss: true`.
- Verify none of the `manualRequired` rows in this batch are selected by the hydrator's matcher (it only wires `verified`/`sourcebookVerified` confidence).
- Verify printed attack totals (e.g. YVH Battle Droid Blaster Cannon Attack `+10`) are never written to `item.system.attackBonus`.
