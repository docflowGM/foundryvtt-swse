# Archived: Unregistered TypeDataModels

These four files (`actor-data-model.js`, `character-data-model.js`,
`item-data-models.js`, `vehicle-data-model.js`) were never wired into the
runtime: no `CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels` registration
exists. Actor/item schema is defined by `template.json` and prepared by
`SWSEV2BaseActor` + the v2 derived builders.

They were moved here (Phase 3 cleanup) so they no longer appear active. If you
decide to adopt TypeDataModels as part of the v2 migration, register them in
`index.js` and move them back under `scripts/`.

## Known stale imports (fixed)

- `character-data-model.js` — previously imported `DefenseSystem` from a
  non-existent `../engine/DefenseSystem.js`. That import was unused and has been
  removed. The canonical defense calculator is
  `scripts/actors/derived/defense-calculator.js` (`DefenseCalculator`).
- `vehicle-data-model.js` — previously imported `actor-data-model.js` via a
  hardcoded absolute archive path. Changed to a relative `./actor-data-model.js`
  import so the file works correctly if moved back to `scripts/`.
