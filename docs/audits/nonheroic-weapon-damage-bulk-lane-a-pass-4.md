# Nonheroic Weapon Damage: Bulk Lane A Promotion, Pass 4

## What this is

The fourth controlled promotion pass, and the largest so far: 100 rows,
double pass 3's 50. Same tool, same allowlist mechanism, same fail-loud
guarantees -- no tool changes were needed for this pass either; `--max 100`
is all that's new on the command line.

Promoted records live in a new file,
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json`,
driven by a new allowlist,
`data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-4.json`.
Passes 1-3 (10 + 25 + 50 = 85 records across three prior files) were
re-verified idempotent after this pass ran -- none of their allowlists or
output files were touched.

## Selection rules applied

Same rules as passes 1-3: only `safe-ordinary-weapon-candidate` and
`safe-ordinary-weapon-with-delta` candidates, no lightsabers, no rows
already covered by any prior pass or any of the 5 canonical `nh1`-`nh5`
files (120 actor slugs excluded up front this time -- pass 1's 10 + pass
2's 25 + pass 3's 50 + the canonical files' distinct actors). Rows with
duplicate raw source entries (the same actor+weapon+formula appearing
twice in a source pack, the issue first caught in pass 3) were filtered out
of the candidate pool entirely before selection this time, rather than
caught by hand afterward.

Weapon families and target counts, chosen based on remaining clean supply
after exclusions (492 unique actor+weapon rows available across both
source files):

| Weapon | Promoted | Remaining supply before selection |
|---|---|---|
| Blaster Pistol | 30 | 241 |
| Heavy Blaster Pistol | 20 | 77 |
| Vibroblade | 15 | 39 |
| Hold-Out Blaster Pistol | 12 | 37 |
| Stun Baton | 10 | 25 |
| Blaster Carbine | 6 | 13 |
| Vibrodagger | 5 | 10 |
| Bowcaster | 2 | 8 |

95 rows came from `packs/nonheroic.db`, 5 from `packs/npc.db` (filling out
variety where `nonheroic.db` alone ran short after three passes' worth of
exclusions, same pragmatic mixing rationale as pass 3's 2 `npc.db` rows).

Mode split: 16 `base`, 74 `base-plus-delta`, 10 `base-plus-dice`. As in pass
3, the smaller/already-more-depleted families (Vibrodagger, Blaster
Carbine, Vibroblade) skew almost entirely toward `base-plus-delta` because
passes 2-3 already claimed most of their exact-`base` rows; Blaster Pistol
and Heavy Blaster Pistol still had enough `base` supply for a healthier mix.

## Two things worth flagging (not blockers, just transparency)

- **`chewbacca-bowcaster`** promotes a row for an actor literally named
  "Chewbacca" in `packs/nonheroic.db` (Bowcaster +8, printed `3d10+5`,
  `base-plus-delta`). This is a named/canon character appearing in the
  nonheroic actor pack, not a generic archetype like the other 99 rows in
  this pass. Mechanically it's treated identically to every other row --
  exact compendium match, mechanically-derived delta, `manualRequired`
  confidence -- but it's worth knowing this pass isn't purely "generic
  mooks."
- **`quarren-goon-vibroblade`** has `printedAttack.text: "+7*"` -- the
  source data's attack bonus carries a trailing asterisk (a convention
  already seen and preserved as-is in prior NH batches, e.g. some NH-4
  rows). Its meaning (two-weapon fighting, a footnote, etc.) isn't
  interpreted here; per `printedAttack.hydratePolicy: "metadata-only"`,
  it's preserved as literal display text and never fed into attack math,
  same as every other printed attack total in this pipeline.

## What was excluded

Same hard-excluded statuses as passes 1-3, still all unreachable through
this tool by construction: `ordinary-weapon-special-mode`, `area-autofire-
grenade-special`, `rider-or-condition`, `formula-unclear`, `natural-or-
unarmed`, `no-compendium-match`, `ambiguous-compendium-match`, `already-
profiled`. `printed-override` remains unreachable through the candidate
pipeline entirely. Lightsabers excluded by name. Exotic single/low-supply
weapon families (ARC-9965 Blaster, Sith Tremor Sword, Massassi Lanvarok,
Ion Pistol, etc.) were not touched -- the 8 targeted ordinary families had
more than enough supply (492 clean rows) to reach 100 without reaching for
them.

## Confidence and runtime hydration

Identical policy to passes 1-3: every record keeps `confidence:
"manualRequired"`, outside the hydrator's `WIREABLE_CONFIDENCE` set. `data/
nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json` is
**not** added to `scripts/engine/import/nonheroic-damage-profile-hydrator.
js`'s `PROFILE_FILES` list (re-checked directly -- still only the original
5 nh1-nh5 files). No runtime hydration occurs from this pass.

## Known limitations / drift (carried over, not fixed here)

Unchanged from pass 3: `match.rawIncludes` weapon-name-only limitation,
`tools/validate-nonheroic-damage-profiles.mjs` staleness, the `schema.json`
`confidence` enum omitting `sourcebookVerified`, and the duplicate-raw-row
issue in `packs/nonheroic.db` for a handful of actors (now filtered out
programmatically during selection rather than caught by hand).

## Validation performed

```bash
node --check tools/promote-nonheroic-damage-profile-candidates.mjs

node tools/promote-nonheroic-damage-profile-candidates.mjs \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-4.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-4.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-4.md \
  --max 100
# dry run: 100 promoted, 0 skipped, 0 errors, target file NOT created

node tools/promote-nonheroic-damage-profile-candidates.mjs --write \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-4.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-4.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-4.md \
  --max 100
# created target file, 100 records

# re-run --write again: 0 promoted, 100 skipped-already-covered, 0 errors (idempotency)

# regression: default pass-1 invocation, and explicit-flag pass-2/pass-3
# invocations, all re-run after pass-4 existed -- all three still fully
# idempotent (10/25/50 respectively), confirming pass-4 didn't disturb them

node tools/audit-nonheroic-profile-weapon-uuids.mjs
# all 100 new records report "already-valid"; profileFileCount 9, recordCount 242
# (57 nh1-5 + 10 pass-1 + 25 pass-2 + 50 pass-3 + 100 pass-4)
```

All touched/generated JSON files were parsed with `JSON.parse`, and all 5
canonical files plus all 4 bulk pass files were re-parsed to confirm
nothing was disturbed. All 100 new records were manually checked
field-by-field against `nonheroic-weapon-damage-profiles.schema.json`
(required fields, enum values, no duplicate slugs) -- no violations found.

## Boundaries respected

- No actor pack, compendium pack, or existing canonical profile file
  (including pass-1/2/3 bulk files) was modified.
- No runtime combat code was touched.
- Exactly 100 rows promoted (`--max 100`, matching this pass's stated cap).
- No record's `confidence` was set to `verified`.
- No `ordinary-weapon-special-mode` row was promoted.

## Running total across all passes

| Pass | Rows | File |
|---|---|---|
| 1 | 10 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` |
| 2 | 25 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json` |
| 3 | 50 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json` |
| 4 | 100 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json` |
| **Total** | **185** | of 1,556 Lane A candidates (~12%) |
