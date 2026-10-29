# Universal Vehicles — Phase 4E P0 Engineering Checkpoint and Claude P1 Handoff

**Date:** 2026-10-29  
**Repository:** `docflowGM/foundryvtt-swse`  
**Shared development branch for P0 and Claude's P1–P4 work:** `audit/universal-vehicles-phase1`  
**P0 implementation code checkpoint (before this documentation commit):** `56c5f1ec7c808a93a3bfbdad5d486609d5afd987`  
**Review PR:** #1092, draft, against `audit/universal-vehicles-phase4d-review-base` (not `main`).

## Owner workflow decision: same branch, sequential handoff

ChatGPT owns completion and verification of **P0**. **Claude is the implementer for P1 Character/Vehicle Sheet, P2 Shipyard, P3 Store, P4 Engines**, working **on the same `audit/universal-vehicles-phase1` branch**. Do not create a parallel P1 branch or alternative runtime authority. Do not start parallel edits while the P0 checkpoint is still being finalized. At takeover, Claude must fetch the actual branch HEAD and review the final P0 CI outcome. Continue committing to this branch after each verified milestone and leave PR #1092 draft and unmerged unless the owner says otherwise.

The owner prioritizes strict single-source authority, correctness over compatibility, and no fallback to the obsolete ship catalogs. There are no existing players or world vehicles to migrate. Do not reopen the 429-source vehicle certification or earlier sourcebook audits.

## P0 code delivered

- `scripts/domain/vehicles/vehicle-runtime-contract.js` (new): pure, Node-testable classifier and read-only consumer projection. Distinguishes canonical source-backed, deliberately blank scratch, custom, and malformed canonical claims. Reads both initialized Document and creation payload for conflicting claims/embedded Items. Does not equate a publication `sourceEntryKey` with a new world Actor `_id`.
- `scripts/actors/vehicle/vehicle-precreate-hooks.js`: one synchronous `preCreateActor` gate with duplicate-registration protection. Canonical-looking invalid input returns `false` with a diagnostic. Removed unconditional legacy `normalizeVehicleImportData`, name-driven source mutation, and `createActor` weapon parsing/Item creation. Vehicle category helpers now derive from `universal-vehicle-pack-registry.js` instead of an incomplete hard-coded list.
- `tests/vehicle-universal-phase4e-p0-lifecycle.test.mjs` (new): validates all 429 generated source Actors, source-specific Vultures, hybrid/droid modes, two world IDs with the same publication identity, callsign/model separation, unknown/explicit zero/positive shields, signed numeric Initiative, tampered provenance and mounts, blank scratch creation, no implicit create-item hook, and two Actor.create consumer payload forms. Additional tests prove neither initialized-Document Items nor unsourced modification claims can become authorized hardware.
- Source-only projection exposes `source`, `published`, `current`, `installed` and separately `unverifiedModificationClaims`. `published.attackGroups` are readable only; `published.attackGroupsExecutable === false`. `installed.mounts` and `installed.modifications` currently remain empty and `installed.certification === 'NONE'`. The full printed source stays in `flags.swse.universalVehicleSource.source`, not a new second book database.
- Updated four older source/import guard tests to assert the intended **new** no-normalizer, no-attack-promotion contract instead of the abandoned legacy path: `phase2c_cp9a_vehicle_import_boundaries.test.mjs`, `phase2c_cp23_pack_reconciliation.test.mjs`, `phase2c_cp9c_actor_provenance_probe.test.mjs`, `phase2c-vehicle-source-integrity-guards.test.mjs`. No Phase 0–3 source records were modified.

**Explicit custom mounting path is not implemented in P0.** A future P2/P4 installation must go through an independently evidenced modification/mount transaction. Never infer physical mounts or permissions from printed firing groups, actor-provided weapon rows, `sourceEntryKey`, or copied flags.

## Verification and open acceptance

The dedicated 11-pack/429-Actor native LevelDB workflow **passed** for the preceding code checkpoint `7fea7cf6`: [successful workflow](https://github.com/docflowGM/foundryvtt-swse/actions/runs/40966899497). The latest code checkpoint `56c5f1ec` only added Store/Shipyard-shaped hook regression coverage and must have its own exact-head result verified (see GitHub Actions).

The earlier P0 code checkpoint `61e31d81` also passed the dedicated native suite ([workflow 40927991622](https://github.com/docflowGM/foundryvtt-swse/actions/runs/40927991622)). These tests and native readbacks are not a live Foundry V13 world certification.

The broader Rolling System Validation at `61e31d81` failed in **nine** files, including one obsolete vehicle import guard added to the prior eight. Subsequent static-test corrections were pushed; review their **latest CI result**, not the obsolete count. Initial classification:

| Original failed test file | P0 disposition |
| --- | --- |
| `phase2c_cp9a_vehicle_import_boundaries.test.mjs` | Obsolete assertion that preCreate still invokes legacy normalizer; replaced with explicit source-only hook/no-weapon check. Check exact-head result. |
| `phase2c_cp23_pack_reconciliation.test.mjs` | Obsolete expected placement relative to deleted normalizer; replaced with order assertion against source-only import gate. Check exact-head result. |
| `phase2c_cp9c_actor_provenance_probe.test.mjs` | Obsolete requirement for legacy normalized overlay; replaced with preservation-of-source-and-weapons-empty contract. Check exact-head result. |
| `phase2c-vehicle-source-integrity-guards.test.mjs` | Stale parser regex predating `printedAttackTotal` priority; replaced with assertions that preserve published attack total without enhancement. Check exact-head result. |
| `phase6-vehicle-crew-assignment.test.mjs` | Old static check expects direct `system.crewPositions` access inside `crew-skill-router.js`. Router now delegates to `vehicle-crew-actor-authority.js`, which reads `system.crewPositions?.[stationKey]`; evaluate the genuine invariant under P4 rather than adding a second resolver. |
| `vehicle-crew-assignment-guard-check.test.mjs` | Same static crew-operator routing assumption; guard script should inspect the shared actor authority and also examine historical `ownedActors` fallback under P4. |
| `vehicle-universal-phase1a.test.mjs` | Older Phase 1A enumeration test still depends on the retired `ships.json` ledger/source boundaries. Investigate the exact failing subtest as a **historical test** without reopening source certification or rewriting canonical source. |
| `phase-5c-canonical-production-negative.test.mjs` | Repository-wide authority-classification registry reports ~100 stale/unclassified `data/audits/vehicles/...` entries. Separate classification-maintenance issue; do not silence the classification guard or delete evidence to turn CI green. |
| `talent-membership-and-pack-completion.test.mjs` | Non-vehicle system manifest check exited 1 (line 287). Requires separate manifest diagnosis; no P0 gameplay change justified by this symptom. |

**Acceptance still requiring a real Foundry test world:** confirm a source-backed `Actor.create` with its own `_id`, unchanged book/page/model/Initiative/HP/defenses, unknown-vs-zero SR, `system.weapons=[]`, zero Items, and the intended blank scratch creation/import/delete workflow. Do not claim full live certification before observing this.

In a disposable Foundry V13 world, as GM:
```js
await SWSE.debug.vehicles.audit();
await SWSE.debug.vehicles.openSampleSheet('core-vulture-class-droid-starfighter');
await SWSE.debug.vehicles.scratchImport({
  sourceKey: 'core-vulture-class-droid-starfighter',
  allowWrite: true
});
```
The scratch result must show `deleted:true`. If it says `MANUAL_CLEANUP_REQUIRED`, delete the reported scratch Actor manually. P0 does not authorize a world migration.

## Claude P1 implementation directive (same branch)

1. Fetch `audit/universal-vehicles-phase1` and verify the exact latest HEAD. Read this checkpoint and `universal-vehicle-phase4e-consumer-convergence-plan.md`. Work on the **same** branch, with no separate P1 branch or concurrent P0 edits.
2. Use `getVehicleRuntimeProjection(actor)` from `scripts/domain/vehicles/vehicle-runtime-contract.js` as the shared source/current-state selection seam. Do **not** copy the 429 publication facts into another JSON catalog or reconstruct them from legacy `system.hull`, `type`, names, `stock-ships.json`, or parsed attack descriptions.
3. Integrate the V2 Character/Vehicle Sheet first, including owned-asset access. Correct live HP to `system.hp`, avoid invented 500 cargo / 6 crew defaults, expose published book/page, movement modes, crew/passengers/cargo, cost status, and unknown/explicit-zero/positive SR. Printed attack groups are **reference-only**, visually separate from installed certified mounts and Fire actions.
4. Inspect `scripts/sheets/v2/vehicle-actor-sheet.js`, `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js`, `scripts/actors/v2/vehicle-derived-builder.js`, `scripts/sheets/v2/vehicle-sheet/crew-resolver.js`, `templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs`, and `scripts/ui/shell/AssetBaySurfaceService.js`.
5. Preserve P0's fail-closed provenance and zero-stock-mount gates. Add tests to prove display data cannot silently become executable attacks. Validate representative X-wing, Vultures from distinct books, stock transport, station, capital ship, walker, and hybrid vehicle/droid. Commit and push completed P1 checkpoints to the **same** branch.
6. Defer Shipyard/Store/Engines to their ordered P2/P3/P4 lanes; do not retarget or merge the draft PR into `main`. Do not declare in-world runtime acceptance without Foundry V13 evidence.

**Handoff gate:** P0 repository engineering can be considered code-complete only after its exact-head focused tests pass and broader CI failures are explicitly classified. Live Foundry verification remains a separate required acceptance item; if not available, say `LIVE_RUNTIME_PENDING` rather than claiming full certification.
