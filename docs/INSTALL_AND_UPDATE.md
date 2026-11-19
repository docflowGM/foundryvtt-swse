# Installing and updating the SWSE system (Foundry VTT v13)

**A plain `git clone` / `git checkout` is NOT a runnable install.** `system.json` declares 68 compendiums as V13 LevelDB
directories (`packs/<name>`), but git only contains their NeDB *sources* (`packs/<name>.db`). Until those are compiled,
packs such as `foundryvtt-swse.feats` are absent from `game.packs`, startup reports `Initialization DEGRADED`, and
progression / level-up can be non-functional.

## Option A (recommended): the packaged release zip
```bash
npm ci --prefix tools/release
node scripts/build/package-system.js        # writes foundryvtt-swse-<version>.zip (system files at the archive root)
```
Unzip it into `<FoundryData>/Data/systems/foundryvtt-swse/` (replace the folder; back it up first).

## Option B: a git checkout that you compile in place
With **Foundry closed** (LevelDB stores are locked while it runs):
```bash
cd <FoundryData>/Data/systems/foundryvtt-swse
git fetch origin && git checkout <commit-or-branch>
npm ci --prefix tools/release
node tools/release/build-packs.mjs --out .   # compiles + read-back-verifies all 68 packs next to their .db sources
node tools/release/verify-installed-packs.mjs .
```
Re-run the build (Foundry closed) **every time a `packs/*.db` source changes** (after any `git checkout`/`pull`).
The built `packs/<name>/` directories are git-ignored and never committed. The `.db` sources are not modified.

## Verify
```bash
node tools/release/verify-installed-packs.mjs <system folder>   # exit 0 only if every declared pack store exists
```
In Foundry's console: `game.packs.get('foundryvtt-swse.feats')?.index.size` should be > 0, and the startup log must not
say `Initialization DEGRADED`.

## Back up and roll back
Before changing anything copy `Data/systems/foundryvtt-swse` and `Data/worlds/<world>`. To roll back, close Foundry, restore
those two folders (or `git checkout <previous commit>` and rebuild with Option B).
