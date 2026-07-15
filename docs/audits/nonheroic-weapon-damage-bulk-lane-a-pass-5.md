# Nonheroic Weapon Damage: Bulk Lane A Promotion, Pass 5

## What this is

The fifth promotion pass, and a two-stage one. It started as a 200-row batch
(double pass 4's 100), following the same doubling pattern as passes 2-4. No
tool changes were needed to reach 200 -- `--max 200` on the existing CLI is
all that changed.

After the 200-row batch was fully validated, the requested scope for this
pass grew to 500. At that point the remaining Lane A pool was measured
directly: after excluding everything already claimed by passes 1-4, the
5 canonical files, and this pass's own 200 rows, only **128 clean
non-lightsaber `(actor, weapon)` pairs** remained anywhere in the two Lane A
candidate files. Lightsabers had been deliberately (but not mechanically)
excluded from every prior pass. Including them added **75 more** clean
pairs, for a firm ceiling of **203 additional rows** -- nowhere near enough
to reach 500 no matter what was included.

This tradeoff was surfaced directly rather than guessed at: cap at 328
(no lightsabers), extend to ~403 by including lightsabers for the first
time, or leave the pass at 200 and treat the rest as a future pass. The
choice was to include lightsabers and take every remaining clean row, which
landed the pass at **402 total records** (200 original + 202 newly promoted;
one of the 203 candidate additions collided with an already-covered marker
and was safely skipped by the tool's own dedupe, not an error).

Promoted records live in
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json`
(402 records), driven by
`data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-5.json`
(403 entries). Passes 1-4 (10 + 25 + 50 + 100 = 185 records across four
prior files) were re-verified idempotent after this pass ran -- none of
their allowlists or output files were touched.

## Selection rules applied

Same base rules as passes 1-4: only `safe-ordinary-weapon-candidate` and
`safe-ordinary-weapon-with-delta` candidates, no rows already covered by any
prior pass or any of the 5 canonical `nh1`-`nh5` files, and duplicate
raw-source rows (the same actor+weapon+formula appearing more than once in
a source pack) filtered out of the pool entirely before selection.

**One rule changed for this pass only: lightsabers were included.**
Every prior pass avoided the lightsaber family by choice, not by a hard
exclusion in the tool -- pass 1's doc noted this explicitly. With
non-lightsaber Lane A supply exhausted at 128 remaining pairs, extending
toward the requested 500-row target required lifting that self-imposed
restriction. All lightsaber variants present in the remaining pool were
taken: `Lightsaber` (68), `Double-Bladed Lightsaber` (4), `Short Lightsaber`
(1), `Dueling Lightsaber` (1), and one row literally printed as
`Lightsaber *` (an asterisk-suffixed printed name, same convention as
`quarren-goon-vibroblade`'s `+7*` attack bonus in pass 4 -- preserved as
literal display text, not interpreted).

Every other exclusion still stands: `ordinary-weapon-special-mode`,
`area-autofire-grenade-special`, `rider-or-condition`, `formula-unclear`,
`natural-or-unarmed`, `no-compendium-match`, `ambiguous-compendium-match`,
and `already-profiled` remain unreachable through this tool by construction.

## Notable / worth flagging

- **This pass draws overwhelmingly from `packs/npc.db` (337 of 402 rows,
  84%)**, a reversal from passes 1-4 which leaned on `packs/nonheroic.db`.
  This happened because `nonheroic.db`'s clean non-lightsaber supply was
  nearly gone; `npc.db` still had unclaimed rows, but a large share of
  `npc.db`'s statblocks are **named, canon characters** rather than generic
  archetypes -- notably more, and more prominent, than the single Chewbacca
  row flagged in pass 4.
- **Named canon characters appearing in this pass** (mechanically identical
  treatment to every other row: exact compendium match, mechanically-derived
  delta, `manualRequired` confidence -- flagged for visibility, not because
  anything was handled differently): Han Solo (four separate statblock
  variants: base, Galactic Hero, Smuggler, Stormtrooper Armor), Luke
  Skywalker (three variants: base, Hoth Pilot, Grand Master), Anakin
  Skywalker, Anakin Solo, Jacen Solo, Ania Solo, Kol Skywalker, Cade
  Skywalker (two variants: base, Bounty Hunter), Darth Vader, Ahsoka Tano
  (The Hand of Vader variant), Chewbacca (Claatuvac Scout variant),
  Thrawn, Admiral Ackbar, Admiral Wullf Yularen, Hondo Ohnaka, Finn, Mira,
  Mirax Terrik Horn, and several others. None of these rows required any
  special handling -- they matched the compendium exactly like any generic
  mook -- but this pass is clearly not "generic archetypes only" the way
  passes 1-4 mostly were.
- **`Lightsaber` is now the single largest non-Blaster-Pistol family in the
  cumulative bulk-lane-a output** (75 rows this pass alone). Lightsabers
  ignore DR by default per this system's SWSE rules, which is a
  combat-resolution detail -- nothing in this pipeline touches that rule;
  these records are damage-formula metadata only, `printedAttack.
  hydratePolicy: "metadata-only"`, never wired into the hydrator, and carry
  no DR-interaction logic of their own.
- **Known cosmetic drift carried forward:** every record's `tags` array
  still includes the literal string `"bulk-lane-a-pass-1"` regardless of
  which pass produced it -- a hardcoded value inside `toCanonicalRecord()`
  in the promotion tool, first noted (but not fixed, per "smallest safe
  change") in earlier passes. All 402 new records in this pass carry that
  same stale tag string; flagging again since the drift has now propagated
  across all five passes.

## What was excluded

Same hard-excluded statuses as passes 1-4, still all unreachable through
this tool by construction (see list above). `printed-override` remains
unreachable through the candidate pipeline entirely.

After this pass, Lane A supply for this pipeline is **effectively
exhausted**: 0 unclaimed non-lightsaber pairs remain (128 available before
this pass, all 128 taken... plus 202 including lightsabers actually
promoted; one row skipped as already-covered), and 0 further lightsaber
rows remain unclaimed either. Any further promotion pass would need to
either revisit the `formula-unclear` / other Lane B buckets (out of scope
for this tool by design) or wait on new source data.

## Confidence and runtime hydration

Identical policy to passes 1-4: every record keeps `confidence:
"manualRequired"`, outside the hydrator's `WIREABLE_CONFIDENCE` set.
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json` is
**not** added to `scripts/engine/import/nonheroic-damage-profile-hydrator.
js`'s `PROFILE_FILES` list (re-checked directly -- still only the original
5 nh1-nh5 files). No runtime hydration occurs from this pass.

## Known limitations / drift (carried over, not fixed here)

Unchanged from passes 3-4: `match.rawIncludes` weapon-name-only limitation,
`tools/validate-nonheroic-damage-profiles.mjs` staleness, the `schema.json`
`confidence` enum omitting `sourcebookVerified`, the duplicate-raw-row issue
in source packs (filtered programmatically during selection), and the
hardcoded `"bulk-lane-a-pass-1"` tag string noted above.

## Validation performed

```bash
node --check tools/promote-nonheroic-damage-profile-candidates.mjs

# stage 1: 200-row batch
node tools/promote-nonheroic-damage-profile-candidates.mjs \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-5.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-5.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-5.md \
  --max 200
# dry run then --write: 200 promoted, 0 skipped, 0 errors; idempotency re-run: 0 promoted, 200 skipped

# stage 2: expanded to 403-entry allowlist (200 original + 203 new, incl. lightsabers)
node tools/promote-nonheroic-damage-profile-candidates.mjs \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-5.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-5.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-5.md \
  --max 403
# dry run: 202 promoted, 201 skipped-already-covered, 0 errors, target file untouched

node tools/promote-nonheroic-damage-profile-candidates.mjs --write \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-5.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-5.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-5.md \
  --max 403
# writeOutcome: "appended"; target file now holds 402 records total

# re-run --write again with the same 403-entry allowlist: 0 promoted, 403 skipped-already-covered,
# 0 errors (idempotency)

# regression: default pass-1 invocation, and explicit-flag pass-2/pass-3/pass-4 invocations,
# all re-run after pass-5 existed -- all four still fully idempotent (10/25/50/100 respectively),
# confirming pass-5's expansion didn't disturb them

node tools/audit-nonheroic-profile-weapon-uuids.mjs
# all 402 pass-5 records report "already-valid"; profileFileCount 10, recordCount 644
# (57 nh1-5 + 10 pass-1 + 25 pass-2 + 50 pass-3 + 100 pass-4 + 402 pass-5)
```

All touched/generated JSON files were parsed with `JSON.parse`, and all 5
canonical files plus all 5 bulk pass files were re-parsed to confirm nothing
was disturbed. All 402 new records were manually checked field-by-field
against `nonheroic-weapon-damage-profiles.schema.json` (required fields,
enum values -- `rowKind`, `formula.mode`, `confidence`, `delivery`,
`attackShape` -- slug pattern, no duplicate slugs) -- no violations found.
A global duplicate-slug check across all 587 records in all 5 bulk pass
files together also found zero collisions.
`docs/audits/generated/nonheroic-profile-weapon-uuid-audit.{json,md}` were
re-checked for reintroduced git conflict markers (0 found in either file),
given the earlier self-inflicted regression on this exact pair of files in
an earlier pass.

## Boundaries respected

- No actor pack, compendium pack, or existing canonical profile file
  (including pass-1/2/3/4 bulk files) was modified.
- No runtime combat code was touched.
- 402 rows promoted this pass -- short of the requested 500, because the
  Lane A candidate pool (1,556 rows total) could not supply more after
  passes 1-4's exclusions, even after including lightsabers for the first
  time. This ceiling was measured and reported before writing anything,
  not discovered after the fact.
- No record's `confidence` was set to `verified`.
- No `ordinary-weapon-special-mode` row was promoted.
- Lightsaber inclusion was an explicit, reported scope change for this pass
  only, not a silent policy shift.

## Running total across all passes

| Pass | Rows | File |
|---|---|---|
| 1 | 10 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` |
| 2 | 25 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json` |
| 3 | 50 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json` |
| 4 | 100 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json` |
| 5 | 402 | `nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json` |
| **Total** | **587** | of 1,556 Lane A candidates (~37.7%) |

Lane A supply for this tool is now effectively exhausted (0 unclaimed
non-lightsaber pairs, 0 unclaimed lightsaber pairs remaining). Any further
expansion would require revisiting Lane B statuses, which this tool
deliberately cannot reach.
