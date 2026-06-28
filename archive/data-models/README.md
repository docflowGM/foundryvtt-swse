# Archived: Unregistered TypeDataModels

These four files (`actor-data-model.js`, `character-data-model.js`,
`item-data-models.js`, `vehicle-data-model.js`) were never wired into the
runtime: no `CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels` registration
exists. Actor/item schema is defined by `template.json` and prepared by
`SWSEV2BaseActor` + the v2 derived builders.

They were moved here (Phase 3 cleanup) so they no longer appear active. If you
decide to adopt TypeDataModels as part of the v2 migration, register them in
`index.js` and move them back under `scripts/`.
