# Nonheroic Weapon Damage: Bulk Lane A Promotion, Pass 2

## What this is

The second controlled promotion pass using
`tools/promote-nonheroic-damage-profile-candidates.mjs` (introduced in pass
1, `docs/audits/nonheroic-weapon-damage-bulk-lane-a-pass-1.md`). Pass 1
proved the mechanism (allowlist-only, dry-run default, fail-loud dedupe) on
10 boring base-formula rows. This pass scales that up modestly to 25 rows
and, for the first time, deliberately includes `safe-ordinary-weapon-with-
delta` rows (`base-plus-delta` / `base-plus-dice`) alongside plain `base`
matches, not just the single easiest case.

Promoted records live in a new file,
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json`,
driven by a new allowlist,
`data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-2.json`.
Pass 1's allowlist and output file are untouched.

## Tool changes: CLI flags, not a rewrite

Pass 1's promotion tool hardcoded pass-1's filenames as constants. Rather
than fork the tool for every pass, it now accepts four optional path flags
plus a cap override, each defaulting to the exact pass-1 path/value so a
no-flags invocation is byte-for-byte the same as before:

```text
--allowlist <path>    (default: .../nonheroic-profile-promotion-allowlist.pass-1.json)
--output <path>       (default: .../nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json)
--report-json <path>  (default: .../nonheroic-profile-promotion-pass-1.json)
--report-md <path>    (default: .../nonheroic-profile-promotion-pass-1.md)
--max <n>             (default: 10)
```

`--max` was not in the original ask but was necessary: the per-run
promotion cap was a hardcoded `10`, and pass-2 is a 25-row pass. Rather than
raise the constant globally (which would silently let every future
invocation promote up to 25 rows with no cap of its own), it's now a flag
that still defaults to 10 -- pass-1's original ceiling -- and each pass's
own command line states its intended cap explicitly (this pass uses
`--max 25`). All other tool logic (allowlist matching, ALLOWED_STATUSES
filter, already-covered skip, duplicate-slug/marker abort, dry-run default,
report generation) is completely unchanged from pass 1.

Diff against the pass-1 version of the tool is five small, additive edits:
a `argValue()` helper, the four path constants switched from string
literals to `argValue('--flag', 'pass-1-default')`, and `MAX_PROMOTIONS`
switched from a literal `10` to `argValue`-derived with the same fallback.
Nothing else in the file changed.

## Selection rules applied

Only `safe-ordinary-weapon-candidate` and `safe-ordinary-weapon-with-delta`
candidates were considered, sourced only from `packs/nonheroic.db` (via
`data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json`)
per the task's preference for reducing actor-pack overlap with `npc.db`.

Weapon families considered: Blaster Pistol, Heavy Blaster Pistol, Hold-Out
Blaster Pistol, Blaster Carbine, Vibroblade, Vibrodagger, Bowcaster, Sonic
Rifle. Blaster Rifle and Sporting Blaster Pistol were in the candidate list
to prefer but had zero exact-match Lane A candidates in `nonheroic.db` at
selection time, so neither appears in this pass. Lightsabers were
deliberately avoided, matching pass 1.

Before finalizing the allowlist, every candidate was checked against:

- **Duplicate actor+weapon rows in the source data.** A few actors (e.g.
  Black Sun Lieutenant) have two printed rows for the same weapon (a base
  row and a separate higher-bonus/higher-dice row). Since a promoted
  record's slug is `actorSlug-weaponNameSlug` only, promoting both would
  collide on slug and trip the tool's own duplicate-slug abort. Exactly one
  row per (actor, weapon) pair was kept, preferring the `base`-mode row
  when both existed.
- **Already covered by pass 1.** All 10 pass-1 actors were excluded up
  front from the pass-2 pool.
- **Already covered by any existing canonical profile file.** Checked
  programmatically against all `nonheroic-weapon-damage-profiles.*.json`
  files (nh1/nh3/nh4/nh5 + the pass-1 bulk file) before writing the
  allowlist -- zero conflicts found. The promotion tool's own
  already-covered check confirmed this again at run time (0 skipped, all
  25 promoted as new).

## The 25 promoted records

| Slug | Actor | Weapon | Mode |
|---|---|---|---|
| `imperial-army-trooper-blaster-pistol` | Imperial Army Trooper | Blaster Pistol +3 (3d6) | base |
| `clone-naval-officer-blaster-pistol` | Clone Naval Officer | Blaster Pistol +6 (3d6) | base |
| `elite-republic-trooper-blaster-pistol` | Elite Republic Trooper | Blaster Pistol +8 (3d6) | base |
| `krath-commander-blaster-pistol` | Krath Commander | Blaster Pistol +7 (3d6+3) | base-plus-delta |
| `notorious-outlaw-blaster-pistol` | Notorious Outlaw | Blaster Pistol +9 (3d6+4) | base-plus-delta |
| `imperial-detention-guard-blaster-pistol` | Imperial Detention Guard | Blaster Pistol +5 (3d6+2) | base-plus-delta |
| `compforce-trooper-heavy-blaster-pistol` | CompForce Trooper | Heavy Blaster Pistol +6 (3d8) | base |
| `ugnaught-rigger-heavy-blaster-pistol` | Ugnaught Rigger | Heavy Blaster Pistol +4 (3d8) | base |
| `black-sun-lieutenant-heavy-blaster-pistol` | Black Sun Lieutenant | Heavy Blaster Pistol +8 (3d8+3) | base-plus-delta |
| `imperial-royal-guard-heavy-blaster-pistol` | Imperial Royal Guard | Heavy Blaster Pistol +12 (3d8+4) | base-plus-delta |
| `devaronian-drifter-hold-out-blaster-pistol` | Devaronian Drifter | Hold-Out Blaster Pistol +4 (3d4) | base |
| `rebel-cell-member-hold-out-blaster-pistol` | Rebel Cell Member | Hold-Out Blaster Pistol +1 (3d4) | base |
| `con-artist-hold-out-blaster-pistol` | Con Artist | Hold-Out Blaster Pistol +4 (3d4+1) | base-plus-delta |
| `brute-blaster-carbine` | Brute | Blaster Carbine +4 (3d8) | base |
| `stormtrooper-recruit-blaster-carbine` | Stormtrooper Recruit | Blaster Carbine +2 (3d8) | base |
| `clone-shadow-trooper-blaster-carbine` | Clone Shadow Trooper | Blaster Carbine +10 (3d8+2) | base-plus-delta |
| `bothan-spy-vibrodagger` | Bothan Spy | Vibrodagger +1 (2d4+5) | base-plus-delta |
| `trandoshan-marauder-vibrodagger` | Trandoshan Marauder | Vibrodagger +18 (2d4+15) | base-plus-delta |
| `commando-vibrodagger` | Commando | Vibrodagger +12 (2d4+4) | base-plus-delta |
| `soldier-vibroblade` | Soldier | Vibroblade +4 (2d6) | base |
| `theelin-bodyguard-vibroblade` | Theelin Bodyguard | Vibroblade +5 (2d6+3) | base-plus-delta |
| `red-fury-pirate-vibroblade` | Red Fury Pirate | Vibroblade +10 (2d6+4) | base-plus-delta |
| `wookiee-warrior-bowcaster` | Wookiee Warrior | Bowcaster +6 (3d10) | base |
| `wookiee-slaver-bowcaster` | Wookiee Slaver | Bowcaster +3 (3d10+1) | base-plus-delta |
| `geonosian-warrior-sonic-rifle` | Geonosian Warrior | Sonic Rifle +2 (2d8) | base |

11 rows are plain `base` (printed formula equals compendium base exactly);
14 are `base-plus-delta` (same dice, higher flat modifier). No
`base-plus-dice` rows were selected this pass (none needed to hit 25 within
the preferred weapon families) -- the tool and generator both support that
mode identically, so a future pass can include them.

`trandoshan-marauder-vibrodagger` (Vibrodagger +18, printed `2d4+15`) has an
unusually large flat delta. It was left in: the generator's delta
classifier only accepts it as `base-plus-delta` because the dice term
(`2d4`) exactly matches the compendium base and only the flat modifier
differs, which is exactly the mechanical, non-interpretive bar Lane A is
built on. No sourcebook was read to sanity-check whether +15 is "correct"
for this actor -- that is exactly why every record here stays
`manualRequired`.

## What was excluded

Same hard-excluded statuses as pass 1 (never reachable through this tool
regardless): `ordinary-weapon-special-mode`, `area-autofire-grenade-
special`, `rider-or-condition`, `formula-unclear`, `natural-or-unarmed`,
`no-compendium-match`, `ambiguous-compendium-match`, `already-profiled`.
`printed-override` remains unreachable through the candidate pipeline
entirely (the generator never classifies a row that way; see pass-1 docs).

Lightsabers, Rapid Shot/Strike, Double/Triple Attack, Trigger Work, Power
Attack, Mighty Swing, Charge, autofire, burst, grenades, splash, missiles,
poison, disease, and condition-track riders were all avoided by construction
(sourcing only from the two Lane A safe statuses, which PR #906 already
strips special-mode suffixes out of, plus manual weapon-family selection).

## Confidence and runtime hydration

Identical policy to pass 1: every record keeps `confidence:
"manualRequired"`, which is outside the hydrator's `WIREABLE_CONFIDENCE`
set (`verified` / `sourcebookVerified`). `data/nonheroic/nonheroic-weapon-
damage-profiles.bulk-lane-a-pass-2.json` is **not** added to
`scripts/engine/import/nonheroic-damage-profile-hydrator.js`'s
`PROFILE_FILES` list. No runtime hydration occurs from this pass either.

## Known limitations / drift (carried over from pass 1, not fixed here)

- `match.rawIncludes` is still weapon-name-only (see pass-1 docs) -- not
  re-litigated in this pass, just inherited.
- `tools/validate-nonheroic-damage-profiles.mjs` is still stale
  (records-based files vs. its expected legacy `profiles` array) and still
  errors "contains no profiles" against every nonheroic profile file,
  including nh1-nh5 and both bulk pass files. Confirmed still present,
  still not touched.
- `nonheroic-weapon-damage-profiles.schema.json`'s `confidence` enum still
  doesn't list `sourcebookVerified` even though the hydrator checks for it.
  Still pre-existing drift, still not touched.

## Validation performed

```bash
node --check tools/promote-nonheroic-damage-profile-candidates.mjs

node tools/promote-nonheroic-damage-profile-candidates.mjs \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-2.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-2.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-2.md \
  --max 25
# dry run: 25 promoted, 0 skipped, 0 errors, target file NOT created

node tools/promote-nonheroic-damage-profile-candidates.mjs --write \
  --allowlist data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-2.json \
  --output data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json \
  --report-json docs/audits/generated/nonheroic-profile-promotion-pass-2.json \
  --report-md docs/audits/generated/nonheroic-profile-promotion-pass-2.md \
  --max 25
# created target file, 25 records

# re-run with --write again (idempotency): 0 promoted, 25 skipped-already-covered, 0 errors, record count still 25

node tools/audit-nonheroic-profile-weapon-uuids.mjs
# all 25 new records report "already-valid" (uuid resolves, base metadata matches)

node tools/validate-nonheroic-damage-profiles.mjs
# same pre-existing stale-validator drift as pass 1, confirmed unchanged, not fixed here
```

Also re-ran the pass-1 default invocation (`node tools/promote-nonheroic-
damage-profile-candidates.mjs --write`, no flags) before and after adding
the CLI flags, to confirm the flag addition caused zero behavior change for
pass-1: still 0 promoted / 10 skipped-already-covered / 0 errors both times.

All touched/generated JSON files were parsed with `JSON.parse`, and all
five pre-existing canonical profile files plus the pass-1 bulk file were
re-parsed to confirm this PR didn't disturb them. All 25 new records were
manually checked field-by-field against `nonheroic-weapon-damage-profiles.
schema.json` (required fields, enum values, `additionalProperties: false`
key sets, and no duplicate slugs within the file) -- no violations found.
As in pass 1, this was a manual structural check rather than a full
JSON-Schema (`ajv`) run, since `ajv` is not available in this environment.

## Boundaries respected

- No actor pack, compendium pack, or existing canonical profile file
  (including the pass-1 bulk file) was modified.
- No runtime combat code was touched.
- Exactly 25 rows promoted (this pass's stated cap, passed explicitly via
  `--max 25`).
- No record's `confidence` was set to `verified`.
- Source authority was the Lane A candidate staging files only.
- No `ordinary-weapon-special-mode` row was promoted.
