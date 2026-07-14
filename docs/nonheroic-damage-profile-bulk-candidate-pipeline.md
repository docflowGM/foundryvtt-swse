# Nonheroic Damage Profile Bulk Candidate Pipeline

`tools/generate-nonheroic-damage-profile-candidates.mjs` is the bulk-generation
counterpart to the hand-authored NH-1/NH-3/NH-4/NH-5 sourcebook batches. It
exists because the broad PR #903 coverage audit (which scans actor packs and
embedded item data indiscriminately) produces thousands of noisy rows and
made the remaining gap look far larger and messier than it actually is. This
tool instead extracts only from clean, structured printed-attack-row fields
and mechanically sorts the result into a "safe to bulk-generate" lane and a
"needs a human" lane.

## Two-lane model

**Lane A — ordinary weapons, bulk generated.** Rows where the printed weapon
name has exactly one compendium match, the printed damage formula cleanly
derives from the compendium base (`base`, `base-plus-delta`, or
`base-plus-dice`), and the row carries no special attack-mode/feat/
attack-count/variant suffix. These are the `safe-ordinary-weapon-candidate`
and `safe-ordinary-weapon-with-delta` buckets in the report, and the only
statuses ever written into `data/nonheroic/generated/`.

**Lane B — exceptions, reviewed manually.** Everything else: natural/unarmed
attacks, area/autofire/grenade/rapid-shot/special-mode rows, ordinary
weapons whose row expresses a special attack mode/feat/attack-count/variant
(`ordinary-weapon-special-mode` — e.g. "with Rapid Strike", "with Double
Attack", "with Trigger Work", "with Power Attack"; the weapon itself matches
a compendium base item, but the row needs human review or explicit variant
modeling rather than bulk promotion), poison/disease/condition-track riders,
rows with no compendium match, rows with an ambiguous multi-item compendium
match, and rows where the compendium exists but the printed dice don't
obviously derive from it (`formula-unclear` — this also catches source text
with more than one dice expression, e.g. garbled/duplicated import data).

## Inputs (source authority)

Only two kinds of input are treated as authoritative:

- `packs/nonheroic.db` and `packs/npc.db`: `flags.swse.import.raw["Melee
  Weapons"]` / `["Ranged Weapons"]`, semicolon/comma-joined printed attack
  rows like `"Blaster Pistol +5 (3d6), Vibroblade +7 (2d6+3)"`.
- `packs/beasts.db`: `flags.swse.beastData.melee` / `.ranged`.

Embedded `actor.items`, possessions text, and free-form prose statblocks
(e.g. the wiki-mirrored "Protocol Format" droid text in
`data/nonheroic/nonheroic_units.json`, which NH-5 hand-curated) are
deliberately **not** used as source authority here — those are exactly the
noisy sources responsible for the PR #903 audit's inflated row counts and
"parenthetical count mistaken for damage" problems. Rows without both a
printed attack bonus and a dice damage expression (e.g. `"By Weapon +5"`,
`"Weapon System +9"` with no parenthetical, a maneuver row like `"(
Trip )"` with no dice) are silently excluded, not miscounted as candidates.

No book/page attribution exists anywhere in this actor-pack data (confirmed
by inspection — the same gap the PR #903 audit already documented), so
every candidate row carries `source.book: "Unknown / missing source"` and
`confidence: "manualRequired"`. This is not a rejection gate; gating
generation on source attribution would discard essentially all rows in this
dataset and defeat the purpose of the tool.

## Usage

```bash
# Report-only: writes docs/audits/generated/nonheroic-damage-profile-candidates.{json,md}
node tools/generate-nonheroic-damage-profile-candidates.mjs

# Also stages Lane A candidates for review/promotion:
node tools/generate-nonheroic-damage-profile-candidates.mjs --write-candidates
```

`--write-candidates` writes one file per source pack under
`data/nonheroic/generated/` (currently `nonheroic-weapon-damage-candidates.
nonheroic.json` and `...npc.json`; `beasts.db` produces zero Lane A rows
since beast attacks are natural/unarmed by nature — see Results below).
These files are **not** canonical profile data: they are not schema-shaped
NH-2 records (they're a superset staging shape with a `status` field and
provenance metadata), they are not wired into
`scripts/engine/import/nonheroic-damage-profile-hydrator.js`, and nothing
in this repository reads them at runtime. They exist purely so a human can
review a batch and promote reviewed rows into a canonical
`data/nonheroic/nonheroic-weapon-damage-profiles.nh<N>-*.json` file by hand,
the same way NH-1 through NH-5 were built.

The tool never mutates actor packs, compendium packs, canonical profile
files, or runtime code.

## Results (current run)

- 4,352 candidate rows extracted from `nonheroic.db` + `npc.db` + `beasts.db`.
- 10 already match an existing NH-1/NH-3/NH-4/NH-5 profile record
  (`already-profiled`).
- **1,556 rows (154 + 1,402) are Lane A: an exact single compendium match
  with an obviously-derived printed formula and no special attack-mode
  suffix.** This is the number that matters for "how much can be
  bulk-generated" — compare against the PR #903 audit's `covered: 4`, which
  was measuring something else entirely (broad actor-pack/possessions
  scanning without this tool's clean-field restriction,
  weapon-name-vs-dice-count validation, or ambiguous-dice detection).
- 292 rows matched a compendium item exactly, and the printed formula would
  otherwise classify as base/base+delta/base+dice, but the row text carries
  a special attack-mode/feat/attack-count/variant suffix (e.g. "with Rapid
  Strike", "with Double Attack", "with Trigger Work", "with Power Attack")
  (`ordinary-weapon-special-mode`). These are intentionally excluded from
  Lane A and routed to manual/variant review instead of bulk promotion.
- 514 rows have no compendium match at all — this is a real content gap in
  `packs/weapons*.db` (common items like plain "Knife", "Spear",
  "Quarterstaff", "Combat Gloves", "Force Pike", "Bayonet", "Baton", "Mace"
  don't exist as compendium weapon items yet), not a tool limitation. Out of
  scope for this tool to fix (`packs/weapons*.db` is not touched here).
- 1,138 rows are natural/unarmed.
- 549 rows are area/autofire/grenade/rapid-shot/burst/splash/cone rows.
- 9 rows are poison/disease/condition-track riders.
- 284 rows matched a compendium item by name but the printed dice don't
  obviously derive from the compendium base — the most common pattern is
  "Blaster Rifle"/"Heavy Blaster Rifle" printed with a different die size
  than the current compendium base (e.g. printed `3d8+N` against a
  compendium base of `3d10`), the same mismatch already documented and
  preserved as `printed-override` in NH-5's Blaster Rifle rows.

## Known false-positive traps this tool specifically guards against

- **Substring collisions in weapon-family keywords** (e.g. "blast" matching
  inside "Blaster"): the special-mode/rider keyword lists use `\b`
  word-boundaries and deliberately omit bare "blast" as a keyword (the same
  bug class fixed in the PR #903 coverage-audit script).
- **"Stun" as a damage type vs. a rider**: `(2d6+3 (Stun))` is an ordinary
  damage-type annotation (matches existing `typeOverride: "stun"` precedent
  from NH-4's Stun Baton rows), not a status-effect rider — "stun" is
  excluded from the rider keyword list for that reason.
- **Ambiguous/garbled dice**: if a second dice expression shows up inside an
  annotation (observed in the source data as e.g. `"1d6 (2d6 Stun)"`), the
  row is routed to `formula-unclear` instead of trusting whichever dice
  pattern happened to be extracted first.
- **Catch-all pack duplication**: `packs/weapons.db` mirrors every item
  already present in the category-specific packs (`weapons-pistols`,
  `weapons-rifles`, etc.) under the same item id. Matches are deduplicated
  to the category-specific pack (same logic as
  `tools/audit-nonheroic-profile-weapon-uuids.mjs`), so this never shows up
  as a false `ambiguous-compendium-match`.
