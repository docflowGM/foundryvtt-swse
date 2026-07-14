# Nonheroic Weapon Damage: Bulk Lane A Promotion, Pass 1

## What this is

This is a proof-of-concept run of `tools/promote-nonheroic-damage-profile-candidates.mjs`,
the tool that turns reviewed Lane A candidates (from
`tools/generate-nonheroic-damage-profile-candidates.mjs`, PR #905/#906) into
canonical-shaped `data/nonheroic/nonheroic-weapon-damage-profiles.*.json`
records.

It promotes exactly 10 rows, named individually in an allowlist file
(`data/nonheroic/generated/nonheroic-profile-promotion-allowlist.pass-1.json`),
into a new staged file:
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json`.

## Why allowlisted, not automatic

Lane A currently contains 1,556 candidate rows (154 exact-base +
1,402 base/delta, per PR #906). That is a lot of rows to promote
mechanically in one shot with no human in the loop, even though each row
individually has an exact single compendium weapon match and an
obviously-derived formula. This pass exists to prove the promotion
mechanism itself is safe -- the allowlist, dedupe, and fail-loud checks --
against a tiny, easy-to-eyeball batch before trusting it with hundreds of
rows at once. Scaling to 25-50 rows (or sourcebook-labeled subsets) is the
planned next step, not this PR.

The promotion tool is deliberately conservative:

- **Dry-run by default.** `--write` is required to touch the output file.
- **Allowlist-only.** It never promotes "all of Lane A" -- only the rows an
  allowlist file names explicitly, and only if each entry resolves to
  *exactly one* candidate.
- **Fail loud, write nothing.** An allowlist entry that matches zero or more
  than one candidate, or a duplicate slug/actor-marker (within the batch or
  against the target file's existing content), aborts the entire run before
  anything is written. A promotion report is still produced so the failure
  is visible.
- **Already-covered rows are skipped, not errors.** If a candidate already
  matches an existing profile record (any `nonheroic-weapon-damage-profiles.
  *.json` file, by actor slug + `rawIncludes` marker), it's reported as
  `skipped-already-covered` and left alone. This also makes re-running the
  tool with `--write` on an unchanged allowlist a safe no-op (verified below).

## The 10 promoted records

All ten are `formula.mode: "base"` (printed formula exactly equals the
compendium base -- the most boring possible case), no lightsabers, no
special attack-mode suffixes, no autofire/burst/grenade/rider/natural/
unarmed rows.

| Slug | Actor | Weapon | Printed | Compendium pack |
|---|---|---|---|---|
| `goon-heavy-blaster-pistol` | Goon | Heavy Blaster Pistol +5 (3d8) | base | weapons-pistols |
| `imperial-informant-hold-out-blaster-pistol` | Imperial Informant | Hold-Out Blaster Pistol +1 (3d4) | base | weapons-pistols |
| `medic-blaster-carbine` | Medic | Blaster Carbine +5 (3d8) | base | weapons-rifles |
| `scout-trooper-blaster-pistol` | Scout Trooper | Blaster Pistol +5 (3d6) | base | weapons-pistols |
| `peace-brigade-thug-vibrodagger` | Peace Brigade Thug | Vibrodagger +2 (2d4) | base | weapons-simple |
| `ugnaught-worker-blaster-pistol` | Ugnaught Worker | Blaster Pistol +4 (3d6) | base | weapons-pistols |
| `csa-security-guard-blaster-carbine` | CSA Security Guard | Blaster Carbine +6 (3d8) | base | weapons-rifles |
| `black-sun-thug-heavy-blaster-pistol` | Black Sun Thug | Heavy Blaster Pistol +6 (3d8) | base | weapons-pistols |
| `swoop-gang-member-vibrodagger` | Swoop Gang Member | Vibrodagger +3 (2d4) | base | weapons-simple |
| `sith-spy-hold-out-blaster-pistol` | Sith Spy | Hold-Out Blaster Pistol +8 (3d4) | base | weapons-pistols |

All ten came from `packs/nonheroic.db` (via the Lane A candidate staging
file `data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json`).
None of these actor/weapon pairs previously existed in any
`nonheroic-weapon-damage-profiles.*.json` file (checked before selection and
reconfirmed by the tool's own already-covered check at promotion time).

The tool supports `safe-ordinary-weapon-with-delta` (`base-plus-delta` /
`base-plus-dice`) rows too -- it wasn't restricted to base-only candidates --
this pass just happened to pick base-only rows because they're the most
boring/uncontroversial starting point. A future pass can allowlist delta
rows using the same mechanism.

## What was excluded

Per the task spec, the following statuses are hard-excluded from this tool
(checked explicitly, even though the two source candidate files never
actually contain them in the first place, since
`generate-nonheroic-damage-profile-candidates.mjs --write-candidates` only
ever writes the two Lane A safe statuses into them):

- `ordinary-weapon-special-mode` (Rapid Strike, Double Attack, Trigger Work,
  Power Attack, etc. -- PR #906)
- `area-autofire-grenade-special`
- `rider-or-condition`
- `formula-unclear`
- `natural-or-unarmed`
- `no-compendium-match`
- `ambiguous-compendium-match`
- `already-profiled`

Lightsabers were manually avoided in the pass-1 selection (not mechanically
excluded -- a lightsaber row with an exact match and a clean base formula
would otherwise be eligible; this pass just chose not to touch that weapon
family first).

`printed-override` rows (weapon identity matches but compendium dice don't
line up cleanly) are not reachable through this tool at all: the upstream
generator only ever classifies a matched row as `base` /
`base-plus-delta` / `base-plus-dice` (Lane A) or `formula-unclear`
(Lane B) -- there is no `printed-override` status in the candidate
pipeline, so nothing needed to be added to explicitly block it here.

## Confidence and runtime hydration

Every promoted record keeps `confidence: "manualRequired"`. Checked against
the hydrator directly (`scripts/engine/import/nonheroic-damage-profile-
hydrator.js`):

```js
const WIREABLE_CONFIDENCE = new Set(['verified', 'sourcebookVerified']);
```

`manualRequired` is not in that set, so these records cannot hydrate at
runtime regardless of whether the file is registered. On top of that,
`data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` is
**not** added to the hydrator's `PROFILE_FILES` list, so it isn't even
loaded. Both the schema's `confidence` enum use and the file's own
`canonPolicy`/`notes` fields say this explicitly. No runtime hydration
occurs from this pass.

Page/book attribution is still unresolved for every record (`source.book:
"Unknown / missing source"`) -- this pass promotes formula/identity
correctness only, not sourcebook citation. That remains a follow-up.

## Known limitations / drift (found during validation, not fixed here)

- **`match.rawIncludes` is weapon-name-only, not a full raw-row marker.**
  The upstream candidate generator (`generate-nonheroic-damage-profile-
  candidates.mjs`) only stores `rawIncludes: [printedName.toLowerCase()]`
  on staged candidates -- not the full original clause text (e.g. "Blaster
  Pistol +5 (3d6)"). The promotion tool copies this straight through, so
  promoted records match on weapon name + actor slug rather than a fully
  unique row string. For these 10 rows this is fine (each actor only has
  one row with that weapon name), but it means the already-covered check
  could in principle skip a row that shares a weapon name with an existing
  profile entry for the same actor even if the specific printed numbers
  differ. Not a problem encountered in this batch; worth tightening in the
  generator before scaling to 25-50+ rows per pass.
- **`tools/validate-nonheroic-damage-profiles.mjs` is stale and pre-dates
  the records-based schema.** Running it against the *entire* `data/
  nonheroic/` directory (including all five pre-existing nh1/nh3/nh4/nh5
  files, not just this pass's output) produces `"X contains no profiles"`
  for every single file, because it still looks for a legacy `profiles`
  array instead of `records`. This is confirmed pre-existing repo-wide
  drift, not something introduced by this PR -- it errors identically on
  files that have been canonical since NH-1. Per instructions, this was not
  "fixed" as part of this PR; flagging it here for a separate cleanup task.
- **`nonheroic-weapon-damage-profiles.schema.json`'s `confidence` enum**
  (`verified` / `inferred` / `manualRequired`) does not include
  `sourcebookVerified`, even though the hydrator's `WIREABLE_CONFIDENCE`
  checks for it. Pre-existing drift, not touched here.

## Validation performed

```bash
node --check tools/promote-nonheroic-damage-profile-candidates.mjs
node tools/promote-nonheroic-damage-profile-candidates.mjs            # dry run: 10 promoted, 0 skipped, 0 errors, target file untouched
node tools/promote-nonheroic-damage-profile-candidates.mjs --write    # created target file, 10 records
node tools/promote-nonheroic-damage-profile-candidates.mjs --write    # re-run: 0 promoted, 10 skipped-already-covered, 0 errors, target file unchanged (idempotency)
node tools/audit-nonheroic-profile-weapon-uuids.mjs                   # all 10 new records report "already-valid" (uuid resolves, base metadata matches)
node tools/validate-nonheroic-damage-profiles.mjs                     # pre-existing stale-validator drift observed, see above; not fixed here
```

Also manually exercised the fail-loud paths against temporary allowlist
files (restored afterward, not part of the shipped state):

- An allowlist entry with an actor slug that doesn't exist in the candidate
  pool aborts the run (`matched 0 candidates`), exits non-zero, and leaves
  the target file untouched.
- An allowlist entry under-specified enough to match many candidates (e.g.
  weapon name + formula only, no actor slug) aborts the run (`matched 46
  candidates`) the same way.
- An allowlist file with 11 entries is rejected before any matching happens
  (`capped at 10`).

All generated/touched JSON files were parsed with `JSON.parse` after every
write, and every pre-existing `nonheroic-weapon-damage-profiles.*.json` file
was re-parsed to confirm this PR didn't disturb them.

Every promoted record was also manually checked field-by-field against
`nonheroic-weapon-damage-profiles.schema.json` (required fields, enum
values, and `additionalProperties: false` key sets for `record`, `source`,
`weapon`, `formula`, and `printedAttack`) -- no violations found. `ajv` is
not available in this environment, so this was a manual structural check
rather than a full JSON Schema validator run; noting that as a gap rather
than skipping validation silently.

## Boundaries respected

- No actor pack, compendium pack, or existing canonical profile file was
  modified.
- No runtime combat code was touched.
- Exactly 10 rows promoted (the allowlist cap).
- No record's `confidence` was set to `verified`.
- Source authority was the Lane A candidate staging files only (never PR
  #903's broad/noisy audit).
- No `ordinary-weapon-special-mode` row was promoted.
