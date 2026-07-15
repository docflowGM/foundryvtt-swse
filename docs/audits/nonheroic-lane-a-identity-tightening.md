# Nonheroic Lane A Candidate Identity Tightening

Branch: `claude/nonheroic-lane-a-identity-tightening`

## Context

The Lane B remainder audit (`docs/audits/nonheroic-lane-b-remainder.md`) found
617 rows that were still mechanically clean, safe Lane A candidates
(`safe-ordinary-weapon-candidate` / `safe-ordinary-weapon-with-delta`) but had
never been promoted. That was not a rules-complexity problem — it was a
tooling precision problem: the candidate identity scheme used to detect
"already covered" rows and to build promotion allowlists could not
distinguish two different printed attack rows for the same actor and the
same weapon name.

Two fields carried all of a candidate's identity, and neither is unique when
an actor has more than one row for the same weapon name:

- `match.rawIncludes`: the bare weapon name only (e.g. `"lightsaber"`).
- `slug`: `${actorSlug}-${slugify(printedName)}` (e.g. `plo-koon-lightsaber`).

An actor with a full-attack sequence ("Lightsaber +20 (2d8+11), Lightsaber
+15 (2d8+11)") produces two candidate rows that are identical on both of
those fields. The promotion tool's fail-loud duplicate-marker and
duplicate-slug guards then correctly, but overly bluntly, refused to
promote both rows together — and refused to let a second pass promote the
row a first pass had skipped, since it looked identical to whatever was
already covered. Every prior pass worked around this by hand-picking only
one row per actor+weapon pair, leaving the rest sitting in the candidate
pool indefinitely.

## What changed

### `tools/generate-nonheroic-damage-profile-candidates.mjs`

- Every candidate record now carries `match.rawClause`: the full printed
  clause text (name + attack bonus + damage + annotations), in addition to
  the existing bare-name `match.rawIncludes`. `rawIncludes` is left
  untouched for backward compatibility with every existing consumer of that
  field's shape.
- Every candidate record's `slug` is disambiguated when it has siblings
  sharing the same actor+weapon-name pair: `duplicateGroupSize > 1` appends
  the printed attack-bonus text, the printed damage formula, and (if
  present) the printed suffix to the base slug. Singleton rows (the vast
  majority of the pool once duplicates are set aside) keep their original,
  unmodified slug.
- The generated report now also carries a `duplicateRawRowGroups` summary
  stat and a per-row `duplicateGroupSize`, for visibility into how much of
  the raw dataset is affected.
- Row *classification* (which bucket a row lands in, and the existing
  generation-time `already-profiled` check) is **unchanged**. An earlier
  version of this change also tried to replace that check with an
  exact-identity comparison; it was reverted because it reshaped which rows
  appear in the regenerated candidate pool relative to the currently
  committed one, for reasons unrelated to duplicate-row identity (the
  committed candidate pool is simply stale relative to the current, larger
  set of existing profile records). That is a separate, pre-existing
  staleness issue, not a duplicate-identity bug, and is out of scope here.

### `tools/promote-nonheroic-damage-profile-candidates.mjs`

- `loadExistingProfileMatchers()` now also captures `formula.printed`,
  `printedAttack.text`, and the record's top-level `name` from every
  existing profile record (hand-authored or bulk-promoted; both populate
  these fields).
- `findAlreadyProfiled()` is now a two-tier check:
  - **Tier 1 (exact):** actor slug + weapon name + printed formula +
    printed attack-bonus text, compared against every existing profile
    record. This uniquely identifies a specific printed row regardless of
    which marker convention produced the existing record, and correctly
    recognizes the literal-cross-pack-duplicate case (the same actor
    document appearing in both `packs/nonheroic.db` and `packs/npc.db`).
  - **Tier 2 (legacy fallback):** the original bidirectional bare-marker
    substring check, retained for records that predate `formula.printed` /
    `printedAttack.text` capture. It is only trusted when this
    actor+weapon-name pair has exactly one candidate row in the current
    pool (`duplicateGroupSize === 1`) — with more than one raw row, a bare
    marker cannot safely say which duplicate it covers, so falling back to
    it would risk silently skipping a row that was never actually promoted.
- `toCanonicalRecord()` now prefers the candidate's fuller `match.rawClause`
  marker over the legacy bare-name marker when staging a **new** promoted
  record's `match.rawIncludes`. The fuller marker is strictly more specific
  (a superset constraint), so it is always at least as safe, and it is the
  only granularity that can tell two duplicate rows apart. This does not
  touch any already-promoted record; passes 1–5's existing
  `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-*.json`
  files are untouched and keep their original bare-name markers.
- The in-batch duplicate-slug and duplicate-marker guards themselves are
  unchanged — they are exactly what protects against silently promoting a
  true duplicate twice. What changed is that genuinely distinct rows no
  longer *look* like duplicates to those guards.

### New: `tools/audit-nonheroic-lane-a-identity.mjs`

A read-only audit tool that groups the current staged "safe" candidate pool
by actor+weapon-name pair and classifies every duplicate group as:

- **identical** — every member has the exact same printed clause text.
  Almost always the same actor document duplicated across
  `packs/nonheroic.db` and `packs/npc.db`; not a distinct-row case and not a
  target of this fix (see "Known remaining limitation" below).
- **distinct** — every member has different printed content (different
  attack bonus and/or formula, e.g. a full-attack sequence). These are
  exactly the rows this fix unblocks.
- **mixed** — a combination of both within one actor+weapon-name group.

It also runs an identity-integrity check confirming that no two rows with
genuinely different printed content ended up with the same slug.

## Findings (current data, `data/nonheroic/generated/nonheroic-weapon-damage-candidates.*.json`)

- Safe Lane A candidate pool: **617 rows** (26 `safe-ordinary-weapon-candidate`
  + 591 `safe-ordinary-weapon-with-delta`) — this matches the Lane B
  remainder audit's "safe-lane-a-still-uncovered" figure exactly.
- 228 distinct actor+weapon-name groups; only **1** is a true singleton.
  **227 groups (616 of the 617 rows) share an actor+weapon-name pair with at
  least one other row** — i.e. essentially the entire remaining pool was
  affected by the identity ambiguity this PR fixes.
- Breakdown of those 227 duplicate groups:
  - **129 groups / 262 rows** are literal cross-pack/document duplicates
    (identical printed clause text; 124 of the 129 groups span both
    `packs/nonheroic.db` and `packs/npc.db`).
  - **43 groups / 90 rows** are genuinely distinct printed rows (different
    attack bonus and/or formula) — these are now independently promotable
    for the first time.
  - **55 groups / 264 rows** are mixed.
- Identity integrity check: **0 residual slug collisions** among rows with
  genuinely different printed content — confirmed by
  `tools/audit-nonheroic-lane-a-identity.mjs`.
- Live proof: a scratch allowlist promoting both of Plo Koon's duplicate
  `Lightsaber +20 (2d8+11)` / `Lightsaber +15 (2d8+11)` rows together
  (previously impossible — identical bare marker and identical slug)
  succeeded in a single `--write` run, producing two records with distinct
  slugs (`plo-koon-lightsaber-p20-2d8-11`,
  `plo-koon-lightsaber-p15-2d8-11`) and distinct markers. This was a scratch
  test against a throwaway output file; it did not touch any
  `bulk-lane-a-pass-*.json` file.

## Known remaining limitation

The 129 "identical" groups (262 rows) cannot be resolved by any
marker/slug scheme keyed on actor name + weapon name + printed content,
because their printed content really is identical — most commonly the same
underlying actor document (same Foundry `_id`) present in both
`packs/nonheroic.db` and `packs/npc.db`. Promoting more than one
representative from such a group is already correctly refused by the
promotion tool's existing duplicate-slug guard. A future pass could resolve
this properly by threading the source document's `_id` (or an explicit
pack-precedence rule, e.g. "prefer `npc.db` over `nonheroic.db` when an
identical actor appears in both") into candidate identity, but that changes
what "the same row" means at a more fundamental level and was left out of
this pass deliberately, per the instruction to fix the marker/matcher
identity problem, not to redesign actor identity.

A further, separate limitation: `docs/audits/generated/nonheroic-lane-b-remainder.json`
and `docs/audits/generated/nonheroic-damage-profile-candidates.json` are
snapshots frozen at whatever commit last regenerated them. Re-running
`tools/generate-nonheroic-damage-profile-candidates.mjs` today (even fully
unmodified) already produces different totals for `already-profiled` and
the safe-candidate buckets, because the number of existing profile records
(currently 644) has grown since those docs were last regenerated. That
staleness is real but is not a duplicate-identity bug — it will resolve
itself the next time `nonheroic-lane-b-remainder.md` is regenerated, which
this PR deliberately does not do (out of scope; see "Not changed" below).

## Not changed

- No profile was promoted. No `bulk-lane-a-pass-*.json` file was modified
  (verified: `git status` shows no changes under
  `data/nonheroic/nonheroic-weapon-damage-profiles.*`).
- No weapon compendium item was created.
- No actor pack, compendium pack, hydrator, or runtime code was touched.
- Row classification logic (which bucket a row lands in) is unchanged.
- `docs/audits/generated/nonheroic-lane-b-remainder.json`/`.md` were not
  regenerated in this pass (see staleness note above) — they remain a
  snapshot from an earlier commit and should be refreshed in whichever
  future pass actually consumes them.

## Validation

- `node --check tools/generate-nonheroic-damage-profile-candidates.mjs`
- `node --check tools/promote-nonheroic-damage-profile-candidates.mjs`
- `node --check tools/audit-nonheroic-lane-a-identity.mjs`
- `node tools/generate-nonheroic-damage-profile-candidates.mjs --write-candidates`
  (regenerates the staged candidate pool with the new identity fields; safe
  Lane A totals unchanged at 617)
- `node tools/audit-nonheroic-lane-a-identity.mjs` (identity integrity check:
  0 residual slug collisions)
- Passes 1–5 re-run in dry-run mode against the original candidate pool
  each pass actually operated against (restored from `git show HEAD:...`):
  all five report `ok: true`, `promoted: 0`, `errors: 0`, with every
  allowlist entry resolving to `skipped-already-covered` — confirming this
  change does not regress or re-promote anything already staged.
- `git status` confirms zero changes under
  `data/nonheroic/nonheroic-weapon-damage-profiles.*` throughout all of the
  above.
- JSON parse validation on every generated report
  (`docs/audits/generated/nonheroic-damage-profile-candidates.json`,
  `docs/audits/generated/nonheroic-lane-a-identity-audit.json`, and the
  regenerated candidate staging files) via `JSON.parse`/`require` round-trip.

## Recommended next steps

1. Lane A remainder pass 6, using an allowlist that covers the 43 "distinct"
   duplicate groups (90 rows) plus the still-untouched non-duplicate portion
   of the 617-row pool, now that they can be promoted without marker/slug
   collisions.
2. Decide a pack-precedence rule for the 129 "identical" cross-pack-duplicate
   groups (e.g. prefer `npc.db`) before promoting any of them, to avoid
   promoting the same actor+weapon twice under two different slugs.
3. Regenerate `docs/audits/generated/nonheroic-lane-b-remainder.json`/`.md`
   against current data once a pass actually consumes it, so it stops
   reporting stale totals.
4. Formula-override review pass (including Sporting Blaster Pistol,
   `formula.mode: "printed-override"`), as previously scoped.
5. Missing weapon compendium audit (Knife, Spear, Quarterstaff, Combat
   Gloves, Force Pike, Bayonet, Baton, Mace, Club) as its own PR.
6. Special-mode, area/autofire/grenade, rider, and natural/unarmed passes,
   in that order, as previously scoped.
