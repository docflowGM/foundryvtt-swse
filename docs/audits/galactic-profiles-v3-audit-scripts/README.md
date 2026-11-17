# Galactic Profiles v3 audit scripts (reference evidence)

Scripts that produced the evidence in `../SWSE_Galactic_Profiles_v3_Unification_Audit.md`.
Paths assume a detached worktree of `origin/feature/chargen-splash-prewarm` @ `9de84a4` at `./wt`
and (for the schema scripts) `ajv@8` installed beside them. They must be adapted before reuse.

- `schema-validate.mjs`, `droid-schema-errors.mjs` — Draft 2020-12 validation of both packages, cross-rejection, the 32 droid errors.
- `catalog-and-arithmetic.mjs` — catalog-vs-record diffs; droid standard-array and degree/size arithmetic.
- `pack-resolution-probe.mjs` — resolves every authored ref against `packs/*.db` (pack-level only; V2 registries not bootstrapped).
- `droid-install-projection.mjs` — runs the real `buildInitialDroidInstallation` (copy into `tests/` of the worktree; uses the repo's own `foundry-shim` path loader). Pass `patch` to add `type:'hand'`.
- `attrbasis.mjs`, `attrmd.mjs` — attribute-basis test against V2 point-buy and species `abilityMods`.
- `genmatrix.mjs` — generates the 41-row legality matrix.
- `ev.mjs`, `ev2.mjs` — repo evidence for the ruling entries (talent docs, sources, pages, class tree lists).

The scripts are read-only with respect to repository data. Four of them write small derived files (`attrbasis.json`, `attrmatrix.md`, `matrix.md`, `badrefs.json`) into `./audit-output/` under the current directory; nothing else is written. No network, environment variables, or credentials are used. `attrmd.mjs` reads `audit-output/attrbasis.json`, so run `attrbasis.mjs` before `attrmd.mjs` from the same folder.

> Note: `schema-validate.mjs`, `droid-schema-errors.mjs`, `catalog-and-arithmetic.mjs` read the pre-unification schema/catalog files, which were removed from the working tree in P0; run them against a checkout of `cdd5d33`.
