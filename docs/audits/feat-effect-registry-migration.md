# Feat Effect Registry Migration

**Goal:** Make `foundryvtt-swse.feats` register and hydrate normally, while moving feat mechanical effects out of fragile embedded ActiveEffects and into a stable registry.
**Architectural contract:** *FeatRegistry owns feat identity; FeatEffectRegistry owns mechanical definitions.*
**Date:** 2026-06-10
**Type:** Migration (registry split). Audit-only pass for the underlying cause is in `feat-pack-registration-audit.md`.

---

## Summary of what was wrong

The feats compendium failed to register because **15 of 86 embedded ActiveEffects inside `packs/feats.db` had no `_id`**. Foundry v12/v13 stores embedded documents in a pack under per-effect LevelDB keys derived from each effect's `_id`; a null id aborts the pack's NeDB→LevelDB migration/compile (reproduced directly with `@foundryvtt/foundryvtt-cli` → `LEVEL_INVALID_KEY`). The whole feats pack then fails to register while packs without malformed embedded effects migrate fine.

Rather than make feats the only LevelDB pack, this migration removes embedded ActiveEffects from the feat documents entirely. With no embedded effects, `packs/feats.db` migrates cleanly as a normal NeDB pack — identical in format to every other pack in the system. The mechanical effects are preserved in a dedicated `FeatEffectRegistry` and re-applied at runtime by a small reconciler that mirrors the existing talent-effects pattern.

This **supersedes the earlier tactical fix** (compiling feats to a standalone LevelDB pack); that change has been reverted (manifest path restored to `packs/feats.db`).

---

## What was migrated

All embedded `effects` arrays were extracted from the feat documents into `data/feat-effects.json`, keyed by a stable feat slug, with full provenance (feat `_id`, feat name, slug, original embedded effect id, and a `generatedId` flag). The feat documents now carry `effects: []`.

| Metric | Value |
|---|---|
| Feat documents | 414 |
| Feats with effects (now extracted) | 83 |
| Embedded effects extracted | 86 |
| Effect `_id`s generated (were missing) | 15 |
| Effects with `transfer: true` (applied to actors before migration) | 15 |
| Effects `transfer:false`/dormant (stored, not auto-applied) | 71 |

### Behavior preservation
Before migration, Foundry only applied embedded effects with `transfer: true` to an owning actor (15 effects). The other 71 — including 6 with `changes` (e.g. Armor Proficiency, Weapon Specialization) — were `transfer:false` and never reached the actor via the AE pipeline; their mechanics are handled by `ModifierEngine`, not these effects. To avoid changing meaning, **the applier only generates actor effects for `transfer:true` definitions.** All 86 definitions remain in the registry for provenance and future use.

---

## Changed / new files

**New**
- `data/feat-effects.json` — extracted mechanical effect definitions (SSOT for feat mechanics).
- `scripts/engine/features/feat-effect-registry.js` — `FeatEffectRegistry`: loads definitions via static JSON import; lookup by feat id / slug / name; `initialize()`, `getForFeat()`, `getEffects()`, `getAll()`, `has()`, `effectCount()`. Cross-references `FeatRegistry` to canonicalize but never enumerates feat identity.
- `scripts/engine/features/feat-effect-applier.js` — `FeatEffectApplier` (apply/remove/reconcile via `ActorEngine`, generated-effect provenance flags) + `initializeFeatEffectsHooks()` wiring `createItem`/`deleteItem` for `type === 'feat'`.

**Modified**
- `packs/feats.db` — embedded `effects` arrays emptied (`[]`). Still 414 `type:"feat"` docs; descriptions/prerequisites/summaries/system metadata untouched.
- `system.json` — feats `path` restored to `packs/feats.db` (reverting the tactical LevelDB pack); phantom `feats-restored` entry removed (59 packs).
- `scripts/registries/feat-registry.js` — removed dead `feats-restored` candidate keys; resolver still targets `foundryvtt-swse.feats`; disabled browser-fetch no-op left inert.
- `index.js` — imports + init-hook wiring: `FeatEffectRegistry.initialize()`, `initializeFeatEffectsHooks()`, and `globalThis.SWSE.{FeatRegistry,FeatEffectRegistry,FeatEffectApplier}` exposure for validation.

**Reverted to original**
- `.gitattributes` — the LevelDB `binary` rules added by the tactical fix were removed (no LevelDB pack remains).

---

## Provenance / flag convention

Generated runtime effects are marked under the project's canonical flag scope (`foundryvtt-swse`, consistent with `talent-effects-hooks` and `getSwseFlag`), not the `flags.swse` shown in the original plan sketch:

```
flags['foundryvtt-swse'].featEffect = {
  source: 'feat-effect-registry',
  generated: true,
  featItemId, featId, featKey, featName, sourceEffectId
}
```

Only effects carrying this provenance are removed/reconciled. Manually-created ActiveEffects are never touched.

---

## Validation results (static)

All passed:
- `system.json` parses; feats `path` = `packs/feats.db`; no `feats-restored`; 59 packs, no duplicate names.
- `packs/feats.db` parses as JSONL; 414 docs; all `type:"feat"`; **no document has embedded effects**; all retain `_id`/`name`/`system`.
- `data/feat-effects.json` parses; 83 definitions; **86 effects (== original embedded count)**; all effects have stable `_id`; 15 generated; 15 `transfer:true`.
- Every `definition.featId` exists in `packs/feats.db`.
- `node --check` passes on `index.js`, `feat-registry.js`, `feat-effect-registry.js`, `feat-effect-applier.js`.
- Registry lookup smoke test (no Foundry): resolves by name and id; "Toughness" → 1 `transfer:true` effect (`system.hitPoints.bonusPerLevel +5`); 15 `transfer:true` total.

Runtime validation in Foundry was **not** performed (no access to launch the user's install from this environment).

---

## Remaining risks

1. **Leftover `packs/feats/` directory.** The earlier tactical fix created a LevelDB directory that the sandbox filesystem would not let me delete (`Operation not permitted` on unlink). It is harmless to runtime because `system.json` no longer references it, but **it should be deleted manually** (`rm -rf packs/feats`) to avoid confusion.
2. **Deployment / install state.** As documented in the prior audit, Foundry serves the system from its user-data directory. If a stale migrated feats store exists there from before this change, do a clean reload (or reinstall the system) so Foundry rebuilds the feats pack from the now-clean `packs/feats.db`.
3. **Applier scope is intentionally narrow.** Only `transfer:true` definitions are auto-applied, to preserve prior behavior exactly. If any of the 71 dormant effects were *intended* to be active, that is a separate content decision — the data is preserved in the registry to enable it later without re-touching the pack.
4. **`initializeTalentEffectsHooks()` appears unwired** in the live system; the feat hooks are wired directly in `index.js` rather than depending on that pattern's call site.
5. **Mount-edit fragility.** Length-changing edits to large files over this environment's mount occasionally truncate tails; all changed files were re-validated (`node --check` / JSON parse) after editing.

---

## Runtime validation steps (run in Foundry F12 console)

```js
game.packs.has("foundryvtt-swse.feats")                                   // expect: true
const idx = await game.packs.get("foundryvtt-swse.feats")?.getIndex()
idx?.size ?? idx?.length                                                  // expect: 414
await SWSE.FeatRegistry?.initialize?.()
SWSE.FeatRegistry?.getAll?.()?.length                                     // expect: 414
SWSE.FeatEffectRegistry?.getAll?.()?.length                              // expect: 83 (definitions)
SWSE.FeatEffectRegistry?.effectCount?.()                                  // expect: 86
```

Optional functional check (apply path): on a character actor, add the "Toughness" feat, then:
```js
const a = game.actors.getName("<your actor>");
a.effects.filter(e => e.getFlag("foundryvtt-swse","featEffect")?.generated).map(e => e.name)
// expect a generated "Toughness" effect; remove the feat -> it should disappear
```
