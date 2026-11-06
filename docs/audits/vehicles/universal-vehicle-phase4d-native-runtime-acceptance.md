# SWSE Universal Vehicles — Phase 4D native/runtime acceptance

**Status: IMPLEMENTATION COMMITTED; LIVE FOUNDRY ACCEPTANCE STILL OPEN.**
Branch: `audit/universal-vehicles-phase1`. Owner-authorized clean-break cutover; no player/world vehicle migration. Do not reopen Phase 0–3 sourcebook audits.

## Purpose and separation of authority

Phase 4C switched development-branch `system.json` to eleven canonical Actor packs, with 429 unique source claims, and wired the browser, store, importer and V2 sheet. Phase 4D must demonstrate **native V13 LevelDB readback and actual loaded-Foundry behavior**; generated documents and Node mocks alone do not prove that.

The new modules are intentionally non-invasive:
- `scripts/domain/vehicles/vehicle-phase4d-runtime-audit.js`: GM-only native pack index + complete document readback of all 429, validates identity, canonical flags, published Initiative/HP/defenses, unknown vs zero SR, no installed weapons, and typed-model reflection.
- `scripts/domain/vehicles/vehicle-phase4d-scratch-import.js`: explicitly opted-in *test-world* scratch Actor creation, governed import, persisted readback and best-effort deletion; reports manual cleanup if deletion fails.
- `index.js` exposes `SWSE.debug.vehicles.audit`, `openSampleSheet` and `scratchImport` from system initialization. **No automatic scan, world write or default Actor creation**.
- `tests/vehicle-universal-phase4d-runtime-audit.test.mjs` and `tests/vehicle-universal-phase4d-scratch-import.test.mjs` exercise the guards with mocked Foundry collections, generated publication data and scratch lifecycle. Mock success is explicitly not a release certificate.

## 1. Build prerequisites (CI / Node 22)

```sh
node tools/build-universal-vehicle-canonical.mjs --check
node tools/build-universal-vehicle-pack-sources.mjs --check
node --test tests/vehicle-universal-phase*.test.mjs
node --test tests/phase2c_cp23c4c_import_boundary.test.mjs
npm ci --prefix tools/release
node tools/build-universal-vehicle-native-packs.mjs --out build/vehicle-phase4b/native
node tools/release/build-packs.mjs --out build/vehicle-phase4c/release --only vehicles-hybrids
```

Require the native receipt: **11 LevelDB directories, 429 exact native document readbacks, 429 unique source keys, 0 certified weapon mounts**. The GitHub Actions workflow builds and uploads those artifacts when successful. A textual generated `.db` JSONL stream is only a compiler input, **not** a V13 native pack.

**Packaging must use the compiled output** at `packs/<canonical-pack-name>`, never stale `packs/<canonical-pack-name>.db`. Old Actor packs `vehicles`, `vehicles-canonical-ships` and `vehicles-weapon-emplacements` must not appear in the installed manifest or active browser. Non-Actor Item packs remain separate.

## 2. Runtime smoke — fresh Foundry V13 test world

Install the branch's V13 system build with all eleven native Actor pack directories; launch a disposable world as GM. In the browser developer console:

```js
const audit = await SWSE.debug.vehicles.audit();
console.table(audit.categories);
console.log(audit.status, audit.counts, audit.failures);
```

Acceptance requires `status === "RUNTIME_DATA_VERIFIED"`, `counts.packs === 11`, `indexed === 429`, `hydrated === 429`, `verified === 429`, and zero failures. `exactReleaseCertified` remains deliberately false even after this pass: sheets and actual writes are separate gates. `SWSE.debug.vehicles.audit({inspectAllDocuments:false})` is *index-only* and returns `INCOMPLETE_INDEX_ONLY`, not a pass.

Specific sample sheet checks:

```js
await SWSE.debug.vehicles.openSampleSheet('core-vulture-class-droid-starfighter');
await SWSE.debug.vehicles.openSampleSheet('sotg-baktoid-armor-workshop-vulture-class-starfighter');
await SWSE.debug.vehicles.openSampleSheet('sgtd-dp-2-probe-droid');
```

Each command requires the *actual* `SWSEV2VehicleSheet` to render (otherwise fails); inspect type, movement, source/page, SR provenance, attack-group notice and no executable stock weapon controls. These are **compendium** sheets; no world Actor is created. Visual QA must be recorded by operator.

## 3. Actual ActorEngine write/readback — test world only

In the same disposable world, execute the **explicit write opt-in**:

```js
const scratch = await SWSE.debug.vehicles.scratchImport({
  sourceKey: 'core-vulture-class-droid-starfighter',
  allowWrite: true
});
console.log(scratch);
```

This creates a temporary Actor, uses `VehicleImportEngine.apply` via `ActorEngine.updateActor`, reads the resulting Actor's Initiative, HP, Reflex, Fortitude, source flags, shield provenance and weapons, and deletes the temporary Actor in `finally`. A result of `ACTOR_ENGINE_SCRATCH_PASSED` and `deleted === true` is required. If `status === 'MANUAL_CLEANUP_REQUIRED'`, immediately manually delete `actorId` in that test world and investigate the deletion error.

Repeat for a source with an unknown shield and a source with explicit SR 0 or positive SR, plus at least one starfighter, transport, walker and hybrid. Use distinct publication source keys, not names alone.

## 4. Hard blocking conditions

- Native LevelDB compilation or readback mismatch; missing pack or actor; fewer/more than 429; duplicate source identity.
- Missing/incorrect typed-model value for published numeric Initiative/HP/defenses.
- Unknown SR silently promoted to a positive shield or falsely certified as printed SR 0.
- Nonempty stock `system.weapons` or automatically created embedded installed mounts; source attack groups are reference data only.
- Source-only flags changed to stock-attack-trusted or physical-mount-certified.
- V2 sheet fails to render, or ActorEngine write/readback fails.
- Scratch Actor remains after smoke or cleanup failure is ignored.

**No automatic fixing on runtime audit.** Route observed failures back into the V2 Actor projection / schema / readback boundary, keeping the 429-source SSOT untouched. Full weapon mounting, crew stations and attacks are subsequent mechanical certification work; never claim those are complete in Phase 4D.

## 5. Integration and CI caveat

The audit branch is currently **diverged from main** (measured during Phase 4D development: 279 commits ahead, 208 behind, 300+ changed files reported). Do not open/merge an enormous unreviewed release PR merely to run checks. This work is committed to its existing audit branch; mainline reconciliation needs an independently scoped integration plan.

Current GitHub connector exposes PR-associated workflow runs but has not supplied a verified success for the branch's push-triggered workflow. Node source-mock exercises were done in the assistant environment, but **official complete CI, native LevelDB pack execution and a real Foundry V13 world run have not been observed**. Phase 4D therefore remains *implementation ready, acceptance pending*, not certified.
