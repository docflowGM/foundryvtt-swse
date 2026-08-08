# Feat Runtime Fallback Policy

Phase 13 of the feat source/pack/prerequisite-integrity task. This documents an architectural policy that was **already correctly implemented** in the repository before this task — no runtime code was changed for this phase. The goal here is to state the policy explicitly and verify it holds, not to build or modify a fallback mechanism.

## The policy

> **Canonical catalog (`data/feat-catalog.json`) / generated pack (`packs/feats.db`, migrated by Foundry into the native `foundryvtt-swse.feats` compendium) is the authority.**
> **Runtime fallback / seeding is recovery only** — it exists to keep chargen/level-up from silently losing the feat catalog if Foundry fails to register the native compendium (a pack-store/migration seam, not a content problem), and must never be treated as evidence that the compendium itself is healthy.

## Where this is implemented

1. **`scripts/registries/feat-registry.js` (`FeatRegistry`)** — `_loadFromCompendium()` (`:95`) tries `_resolveFeatsPack()` (the real, registered Foundry compendium) **first**. Only if that resolves to nothing does it call `_loadServedCatalogFallback()` (`:483`, a `fetch()` of the served `data/feat-catalog.json`) as a fallback, logging a warning that names every pack key it tried. If the fallback also yields nothing, the registry logs an error and runs `diagnosePackRegistration()` — it does not silently pretend to be healthy.
2. **`scripts/registries/feat-pack-seeder.js` (`FeatPackSeeder`)** — its own header comment: "Controlled recovery path for the v13 pack-migration seam where the system compendium key exists but its migrated LevelDB store is empty." It reads the sanitized catalog from `data/feat-catalog.json` and writes it through Foundry's own compendium API so the *native* pack gets populated — i.e. its job is to repair the native pack, not to become a permanent alternate source.
3. **`scripts/registries/feat-stub-pack.js`** — explicitly labeled "FALLBACK ONLY" in its header. It only populates a separate `foundryvtt-swse.feats-stub` compendium "when the native feats pack is ABSENT from `game.packs`. If native feats registers, the stub is left untouched." Every seeded stub document carries a stable back-reference (`flags.swse.featCatalogId`/`featSlug`) so that dropping a stub feat onto an actor re-hydrates it from the real `FeatRegistry` (the SSOT), not from the stub's own possibly-incomplete data.

All three mechanisms independently converge on the same rule: **try the native pack; treat `data/feat-catalog.json` as the single upstream content source in every case (never a second, independently-maintained catalog); only activate a fallback when the native pack is provably absent; and never let a successful fallback be mistaken for "the compendium is fine."**

## What this task verified (and did not change)

- The native pack path is what `packs/feats.db` feeds via Foundry's NeDB→LevelDB migration on world load — this is the same mechanism every other pack in the repository uses (see `docs/audits/feat-integrity-current-state.md` §1). This task's hardening of `tools/verify-feats-pack-source.mjs` and the new `tools/audit-feat-inventory.mjs --strict` gate (Phases 3/4/12) independently validate the native pack's health (non-empty, exact parity with the catalog) **before** Foundry ever runs — i.e. pack health is now verified by build/test tooling, not inferred from "did chargen manage to show feats" (which could be true even with an empty native pack, purely from the fallback).
- The fallback mechanisms (`FeatPackSeeder`, `feat-stub-pack.js`, and `FeatRegistry`'s own `_loadServedCatalogFallback`) were read and traced but **not modified**. They remain available exactly as before. Per this task's brief ("do not remove useful recovery mechanisms solely because the pack is now hardened"), removing them was explicitly out of scope, and they are not startup-invasive — they only activate on the specific failure condition (native pack absent) they already checked for.
- No new runtime churn was introduced: no new hooks, no new startup-path imports, no changes to `FeatRegistry.initialize()`'s control flow.

## Statement

- Native pack path: verified independent of Foundry, by the hardened `tools/verify-feats-pack-source.mjs` / `tools/audit-feat-inventory.mjs --strict`, both now in CI (`.github/workflows/rolling-system-validation.yml`).
- Fallback path: confirmed present, unmodified, and correctly scoped to "native pack absent" by reading its own source; not independently re-tested end-to-end in a live Foundry instance in this task (that would require a running Foundry v13/v14 world, which is out of scope for this Node-only CI task — see `docs/audits/feat-integrity-current-state.md`'s "What this workflow does NOT verify" equivalent note in the CI workflow file).
- Pack health is no longer something that can only be inferred from live chargen behavior — it is now a build-time-verifiable, CI-gated fact.
