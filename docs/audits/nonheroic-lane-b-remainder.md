# Nonheroic Weapon Damage: Lane B Remainder Audit

## What this is

Lane A bulk promotion is done for now: 587 records across 5 passes, all
`manualRequired`, none wired into the hydrator. This is a **read-only audit**
of everything that's left -- not an implementation PR. It adds
`tools/audit-nonheroic-lane-b-remainder.mjs`, which classifies every
remaining candidate row from
`docs/audits/generated/nonheroic-damage-profile-candidates.json` into the
Lane B buckets the generator already assigned, excludes anything already
covered by a current profile record (canonical files + all 5 bulk pass
files), and groups what's left by normalized weapon/action name so the next
PR can pick a workstream with real numbers instead of guessing.

No profile was promoted, no weapon item was created, and no actor pack,
compendium pack, or runtime file was touched in producing this report.

## How "already covered" was computed

Same convention as every prior pass: an actor-slug + `rawIncludes`-marker
(weapon name substring) match against any current profile record. This is
deliberately coarse and inherited, not reinvented -- if an actor has both a
plain weapon row (Lane-A-promoted) and a separate special-mode/variant row
for the *same weapon name*, the variant row's raw text still contains that
weapon name as a substring, so it can get swept into "already covered" even
though it represents genuinely different behavior. This is a known,
pre-existing limitation of the marker convention (flagged since pass 1's
docs), not something this audit fixes.

## Remaining rows by bucket (after exclusion)

| Bucket | Rows | Groups | Primary recommended action |
|---|---|---|---|
| `natural-or-unarmed` | 1,138 | 20 | `natural-or-unarmed-profile-needed` |
| `no-compendium-match` | 509 | 79 | `missing-compendium-weapon-investigation` (mostly) |
| `area-autofire-grenade-special` | 480 | 58 | `area-autofire-profile-needed` / `grenade-or-explosive-profile-needed` |
| `formula-unclear` | 283 | 17 | `formula-override-review-needed` |
| `ordinary-weapon-special-mode` | 198 | 21 | `special-mode-variant-profile-needed` |
| `rider-or-condition` | 9 | 7 | `rider-profile-needed` |
| `ambiguous-compendium-match` | 0 | 0 | -- |
| `safe-lane-a-still-uncovered` | 617 | 29 | see below -- not really "Lane B" |

1,108 rows total were excluded as already covered (across every bucket, not
just Lane A) -- more than the 587 promoted records, because promoted records
cover raw rows by weapon-name marker regardless of which specific duplicate
raw row they were derived from (see next section).

## A note on "safe-lane-a-still-uncovered" (617 rows)

Pass 5's doc said Lane A supply was "effectively exhausted." That was true
for **unique `(actor, weapon)` pairs**, but it understates the raw-row
picture. These 617 rows are concentrated in just 29 weapon-name groups --
overwhelmingly `Lightsaber` (246), `Blaster Pistol` (98), `Heavy Blaster
Pistol` (44), `Vibroblade` (36), `Stun Baton` (26) -- the same high-volume
families every pass drew from. They exist because of the duplicate-raw-row
issue documented since pass 3: several actors have the *same* weapon listed
more than once in the source pack (sometimes with identical formulas,
sometimes with genuinely different ones, e.g. a one-handed vs. braced/
two-handed variant). Every promotion pass's selection step explicitly
filtered out any `(actor, weapon, formula)` combination with more than one
raw occurrence (`dupKeyCount > 1`) to avoid the promotion tool's fail-loud
ambiguous-match abort -- and once filtered out, those rows were never
revisited. They are still classified `safe-ordinary-weapon-candidate` /
`safe-ordinary-weapon-with-delta` by the generator (mechanically clean,
exact compendium match, clean delta math), they are just **unsafe to
promote through the current allowlist-by-name matching approach** without
either tightening `match.rawIncludes` to the full raw clause (not just the
weapon name -- the limitation flagged since pass 1) or promoting a specific
one of the duplicates by some other disambiguator. This is genuine
remaining Lane A-shaped supply, not Lane B -- flagged here because this
audit surfaces it, but it needs a matcher fix before another promotion pass
could safely touch it, not new rules modeling.

## Special investigation: ordinary weapons that appear missing

Checked directly against every `packs/weapons*.db` item (372 items scanned)
and against every embedded `actor.items` weapon-type entry across all
`packs/*.db` files -- not just the generator's three source packs -- in case
a name existed under a pack this tool's glob missed, or only as an owned
item that never became a top-level compendium document.

- **Sporting Blaster Pistol** -- **not missing.** Exact compendium match
  exists (`weapons-pistols.db`, base `2d6` energy). The 19 raw rows split
  three ways: 15 `formula-unclear`, 3 `ordinary-weapon-special-mode`, 1
  `area-autofire-grenade-special`. The `formula-unclear` rows print damage
  like `3d4+7`/`3d4+6`/`3d4+1` -- a completely different die expression (3d4
  vs. the compendium's 2d6), not a same-die delta or extra-dice relationship
  `classifyDelta()` can recognize. This is a genuine printed-vs-base
  mismatch needing manual review (`formula-override-review-needed`), not a
  missing weapon or a matcher bug.
- **Knife, Spear, Quarterstaff, Combat Gloves, Force Pike, Bayonet, Baton,
  Mace, Club** -- **all confirmed genuinely absent** from every weapon
  compendium pack (no exact match, and no top-level `type: "weapon"`
  document under any of these names in *any* `packs/*.db` file, weapon pack
  or not). None of these are matcher/normalization bugs. Every one of them
  does have **embedded `actor.items` evidence** on named actors elsewhere in
  the data (owned weapon items with real damage formulas, e.g. `Knife` shows
  up as an owned item with damage `1d4`, `1d4+4`, `1d4+5`, `1d4+10` on
  several actors; `Spear` as `1d8+2`, `1d8+3`, `1d8+11`, `1d8+15`;
  `Quarterstaff` as `1d6+7`, `1d6+12`, `2d6+7`; `Force Pike` as `2d8+4`,
  `2d8+7`, `2d8+10`). This is not used as candidate-source evidence (by
  design, per the generator's own doc comment), but it's a strong signal for
  a future PR that creating these as proper compendium items would have a
  plausible, evidence-backed base formula to start from -- `Knife` at `1d4`,
  `Spear`/`Force Pike` built around `1d8`/`2d8`, `Quarterstaff` around `1d6`.
  `Combat Gloves`, `Bayonet`, `Baton`, `Mace`, and `Club` also have embedded
  evidence but with more scatter (`Combat Gloves` ranges from `1d4+7` to
  `2d10+9` across different actors), so their base die is less obvious from
  evidence alone. No weapon item was created in this PR -- see "no weapon
  items were created" below.
- **Note:** `Knife` also has an unrelated existing compendium item,
  `Monomolecular Knife`, and `Baton` has `Snap Baton`/`Stun Baton`. These are
  reported as related-but-distinct items, not aliases -- a sci-fi upgraded
  blade and a stun-specific baton are almost certainly different weapons
  from a plain mundane knife/baton, not the same item under another name.
  Treated as design candidates for a future PR to weigh in on, not resolved
  here.

## Candidate-generator bugs or normalization issues

**None found.** The audit specifically checked for singular/plural
normalization mismatches (the one class of true matcher bug this pass could
verify mechanically) across every `no-compendium-match` and
`formula-unclear` group, and found zero. Every apparently-missing name was
confirmed absent by a full scan of all `packs/*.db` weapon-type documents,
not masked by a normalization quirk.

## Likely special actions misread as weapons

**None found in the current no-compendium-match pool.** The four named
examples from the task brief (Support Fire, Blaster Barrage, Salvo, Twin
Blaster Burst, Dastardly Blast) do not currently appear as distinct
`no-compendium-match` printed names in this dataset -- rows using those
kinds of phrases are already being caught upstream by the generator's
existing `SPECIAL_MODE_WORDS`/`SPECIAL_ATTACK_MODE_WORDS` checks (landing in
`area-autofire-grenade-special` or `ordinary-weapon-special-mode` instead,
which is the correct bucket for them). The `special-action-not-weapon`
classification and its detection regex are still implemented and will catch
rows if the underlying data changes, but there's nothing in this bucket to
report right now.

## Top groups by count (see full top-25 in the generated report)

`Unarmed` (946 rows, `natural-or-unarmed`) dwarfs everything else -- more
than a third of all Lane B rows. `Blaster Rifle`'s autofire/formula-unclear
split (179 + 63), `Lightsaber` special-mode rows (115), and `Knife`'s
missing-weapon rows (73) round out the next tier. Full group-by-group detail
with sample actors and raw rows is in
`docs/audits/generated/nonheroic-lane-b-remainder.{json,md}`.

## Recommended implementation order

The task brief's proposed order holds up against the actual numbers, with
one adjustment: step 1 (generator bugs) has zero groups to act on, so it's a
no-op check, not a real workstream.

1. **Candidate-generator bugs / matcher aliases** -- 0 groups. Nothing to
   fix; confirmed clean.
2. **Missing ordinary weapon compendium items** -- 79 groups (mostly the
   509 `no-compendium-match` rows). Highest group count of any bucket, but
   each item-creation decision needs its own review (base die, cost,
   category) -- not a bulk-mechanical task like Lane A was. `Knife`, `Spear`,
   `Quarterstaff`, `Force Pike` are the best-evidenced candidates to start
   with, given the embedded-item damage precedent above.
3. **Formula-unclear / printed-override ordinary weapons** -- 17 groups,
   283 rows, dominated by `Blaster Rifle` (179) and `Heavy Blaster Rifle`
   (55). These already have exact compendium matches; the work is deciding
   how to model the printed-vs-base mismatch (likely a `printed-override`
   formula mode, which exists in the schema's `formula.mode` enum but has
   never been used by this pipeline yet).
4. **Ordinary-weapon-special-mode variants** -- 21 groups, 198 rows,
   dominated by `Lightsaber` (115). This is the exact bucket PR #905/#906
   carved out of Lane A in the first place; a variant/profile-modeling PR
   here has a clear, well-scoped target.
5. **Area/autofire/grenade/explosive rows** -- 58 groups, 480 rows. Second
   largest bucket. `Blaster Rifle` autofire (63) and the two `Frag Grenade`
   groups (56 + 48) are the biggest single targets.
6. **Rider/condition rows** -- 7 groups, only 9 rows total. Smallest
   actionable bucket; low effort, low coverage impact, but cheap to clear
   once picked up.
7. **Natural/unarmed rows** -- 20 groups, 1,138 rows, by far the largest
   bucket (`Unarmed` alone is 946 of it). Also probably the most
   rules-sensitive: natural/unarmed damage in SWSE scales with size and
   often doesn't cleanly map to a single compendium weapon item the way
   ordinary gear does, so this is likely the most design-work-heavy stream
   despite having the most rows.

## What was NOT done in this PR

- No profile was promoted. No file under
  `data/nonheroic/nonheroic-weapon-damage-profiles.*.json` was modified.
- No weapon compendium item was created. `packs/weapons*.db` was read-only
  input for the fuzzy/alias check; nothing in `packs/` was written.
- No actor pack was modified.
- No runtime combat code was touched.
- `scripts/engine/import/nonheroic-damage-profile-hydrator.js`'s
  `PROFILE_FILES` list was not touched -- still only the 5 original
  canonical files, re-confirmed as part of this session's earlier
  main-realignment check.

## Validation performed

```bash
node --check tools/audit-nonheroic-lane-b-remainder.mjs
node tools/audit-nonheroic-lane-b-remainder.mjs
# excludedAlreadyCovered: 1108; counts as tabulated above

node -e "JSON.parse(require('fs').readFileSync('docs/audits/generated/nonheroic-lane-b-remainder.json','utf8'))"
# parses cleanly
```

`git status --short` after this work is scoped to exactly: the new tool
(`tools/audit-nonheroic-lane-b-remainder.mjs`), its two generated reports
(`docs/audits/generated/nonheroic-lane-b-remainder.{json,md}`), this doc,
plus the pre-existing unrelated local files already known from earlier in
this session (the uuid-audit regeneration and the progression-framework/
mentor WIP files, neither touched by this task).
