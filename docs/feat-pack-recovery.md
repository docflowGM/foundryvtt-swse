# Feats Compendium Recovery

> **2026-08-06 update:** `data/feat-catalog.json` / `packs/feats.db` are now at **413** documents, not 401 — 12 legitimate core feats (Weapon Specialization, Greater Weapon Focus, Greater Weapon Specialization, Educated, Force Focus, Indomitable Will, Lucky Shot, Stunning Strike, Recall, Harm's Way, Forceful Warrior, Noble Fencing Style) were found missing from the catalog and restored from the orphaned `packs/feat-catalog.db`. `tools/verify-feats-pack-source.mjs` now hard-fails on an empty pack and on any ID/content drift between the catalog and the pack. See `docs/audits/generated/feat-inventory-report.md` (regenerate with `node tools/generate-feat-inventory-report.mjs`) for the full reconciliation, the current per-feat status list, and `data/feat-validity-registry.json` for the single source-validity authority.

## What failed

`system.json` correctly declares the native pack at `packs/feats`, but the repository did not contain a readable LevelDB pack at that path. The legacy migration source `packs/feats.db` was empty, so Foundry had no feat documents to migrate. `FeatRegistry` masked the problem by loading `data/feat-catalog.json` as a read-only fallback.

## What this recovery contains

- `packs/feats.db`: rebuilt as NeDB-compatible JSONL from `data/feat-catalog.json`.
- `tools/rebuild-feats-pack-source.mjs`: deterministic rebuild command.
- `tools/verify-feats-pack-source.mjs`: validates JSONL, document types, IDs, and names.

The supplied catalog produced **401 unique feat documents** with no missing IDs, duplicate IDs, duplicate names, or non-feat document types.

## Recovery procedure

1. Stop Foundry completely.
2. Copy these changed files into the repository.
3. Delete `packs/feats/` if it exists locally. This removes the skipped, empty, or corrupt LevelDB output so migration can run again.
4. Keep `system.json` pointed at `packs/feats`—do not change the manifest back to `.db`.
5. Run:

   ```bash
   node tools/verify-feats-pack-source.mjs
   ```

6. Start Foundry and open a world using the SWSE system. Foundry should detect `packs/feats.db` and create `packs/feats/` as the migrated LevelDB pack.
7. Close the world and shut down Foundry so LevelDB can compact and release its files.
8. Confirm that `packs/feats/CURRENT` now exists.
9. Restart Foundry and verify in the console:

   ```js
   const pack = game.packs.get('foundryvtt-swse.feats');
   console.log(pack);
   console.log((await pack.getIndex()).size);
   ```

   Expected index size: **401**.

10. Once verified, commit the generated `packs/feats/` directory. After the LevelDB directory is safely committed and tested from a clean checkout, remove `packs/feats.db` to finish the LevelDB-only migration.

## Regression check

The following startup error should disappear:

```text
canonical compendium packs not registered: feats
```

Chargen should also report the native compendium as its source instead of `data/feat-catalog.json`.
