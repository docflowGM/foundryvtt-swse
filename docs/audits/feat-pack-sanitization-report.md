# Feat Pack Sanitization Report

This pass sanitizes the feats compendium source into a more conservative Foundry v13-friendly JSONL pack.

## Outputs

- `packs/feats.db` — sanitized drop-in replacement.
- `packs/feat-catalog.db` — sanitized cache-busting pack source.
- `system.json` — keeps the pack `name` as `feats`, but points it at `packs/feat-catalog.db`; version bumped from `3.1.0` to `3.1.1`.

The runtime key should remain `foundryvtt-swse.feats` because the manifest pack name remains `feats`.

## Validation

- 414 docs parsed as JSONL.
- 414 docs are `type: "feat"`.
- 0 missing `_id` values.
- 0 duplicate `_id` values.
- 0 embedded effects.
- 0 non-string `system.description` values.
- 0 null `system.costNumeric` values.
- 0 remaining `system.rawImport` blocks.
- 0 missing `system.subType` values.
- 0 missing `system.slug` values.
- 0 duplicate slugs.

## Sanitization performed

- Converted 71 non-string descriptions into strings.
  - Empty `{}` descriptions were filled from benefit/effect/summary text when available.
  - `{ value: "..." }` descriptions were converted to their value text.
- Converted all `system.costNumeric: null` values to `0`.
- Added stable `system.slug` to every feat.
- Added `system.source` from `system.sourcebook`.
- Added `system.prerequisites` from existing prerequisite text.
- Added missing `system.prerequisitesText` where absent.
- Filled 11 missing `system.subType` values as `STATE` for proficiency/training/sensitivity unlock-style feats.
- Added inert template defaults: `grantsActions`, `grantsBonuses`, `toggleable`, `toggled`, `variable`, `variableValue`, `archetype`, `playstyle`, `tier`.
- Removed 68 `system.rawImport` scraper-cache blocks while preserving sourcebook/page/sourceUrl fields.

## Why `system.json` is included

The diagnostic showed the served `system.json` declared the `feats` pack, but Foundry's runtime `game.packs` did not expose `foundryvtt-swse.feats`. This patch changes only the **path**, not the **name**, from `packs/feats.db` to `packs/feat-catalog.db` so Foundry treats it as a fresh source path while preserving the canonical runtime pack key.

## Runtime validation

After applying the changed-files zip, fully stop and restart Foundry, then run:

```js
game.packs.has("foundryvtt-swse.feats")
const idx = await game.packs.get("foundryvtt-swse.feats")?.getIndex()
idx?.size ?? idx?.length
await SWSE.FeatRegistry?.initialize?.()
SWSE.FeatRegistry?.getAll?.()?.length
```

Expected:

```js
true
414
414
```
