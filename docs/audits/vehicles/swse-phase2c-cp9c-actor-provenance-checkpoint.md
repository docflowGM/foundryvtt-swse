# SWSE Vehicle Phase 2C — CP9C Actor Provenance Checkpoint

## Status

**Source-to-Actor inspection implemented and committed; runtime authority remains DENIED.** The CP9B compiled LevelDB packs passed native CLI round-trip tests, but no actual running Foundry V13 world has been used to authenticate and persist a world Actor clone or its installed weapon. No stock attack group is trusted: `TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0` remains unchanged.

## The CP9C import finding and correction

The Vehicle Import Wizard can `replace` or `merge` source data onto an existing Actor. This path does **not** produce an automatically authenticated new world Actor. More seriously, `VehicleImportEngine.buildImportPlan()` previously used only `normalizeVehicleImportData()` output as its new system object. That projection omits published source fields and attack provenance, so directly replacing the full system with it could silently discard printed attributes, certified keys and other known child data.

The corrected import plan now preserves the complete source system record and overlays the necessary runtime projections:

```js
const rawSystem = duplicate(sourceActor.system);
const normalized = normalizeVehicleImportData(rawSystem, { sourceName: sourceActor.name }) ?? {};
const normalizedSystem = { ...rawSystem, ...normalized };
```

This is a field-retention correction, **not** authorization to infer or overwrite unavailable values. Where the normalizer explicitly reprojects a field, source-to-runtime reconciliation is still required.

## Inspection-only controlled source provenance

`scripts/domain/vehicles/vehicle-cp9c-actor-provenance-probe.js` exports `probeControlledVehicleImport()`.

For only the four strictly certified source identities, the probe:
- Requires `replace` (never assumes merge is a clone).
- Requires a real world vehicle Actor whose ID resolves to that exact Actor instance in `game.actors`.
- Requires the actual installed `game.packs` entry and exact matching retrieved compendium Actor document object, not only actor flags, `sourceEntryKey`, source name or an imported UUID string.
- Verifies source metadata, printed weapon-group count and individual persisted physical mount ID, gunner station, fixed-forward arc and printed attack totals.
- Refuses extra owned weapon Items and source-row substitution even if the copied weapon has the same visible name.
- Preserves the explicit `carried_craft: "None"` vs genuine unknown `null` distinction.
- Returns `stockAttackAuthorityGranted:false` and `operationalCertification:false` **even when all inspection fields match**.

`scripts/apps/vehicle-import-wizard.js` invokes the probe after applying the import and logs its result for diagnostic use. No new editable trust flags are written and the existing stock attack registry remains empty.

## Tests and remaining limits

`tests/phase2c_cp9c_actor_provenance_probe.test.mjs` covers a matching controlled import, three unarmed pilot ships, disallowed merge, faked compendium document, tampered physical mount/station/arc/printed totals, extra duplicate Item, missing native pack, explicit null semantics and strict stock-gate persistence. `.github/workflows/vehicle-phase2c-cp9.yml` runs this suite alongside the previous CP8/CP9 tests and native LevelDB pack parity.

**What CP9C does not prove:** The existing Actor was initially created from a canonical compendium source, or has remained unchanged since an import. JavaScript identity of a fetched compendium document checks the current read path; it does not establish durable, tamper-proof history, especially across a Foundry reload. A GM could modify actor data later and the old diagnostic result would become stale. The probe is thus an independent guardrail/observability layer only.

## Next gating requirements

1. In a real Foundry V13 world, install/read the two native packs; run CP9B's `verifyPilotVehiclePacksAtRuntime(game)` and CP9C's `probeControlledVehicleImport()`.
2. Establish the durable, authoritative world-Actor import transaction through the system's approved ActorEngine governance. Authenticate a real successful import and the observed source at import-time using a separate trusted authority. Do **not** elevate editable Actor flags, a published source key, the pack ID alone, or a copied source name to certification.
3. Track installation provenance per individual mount with verified update invalidation. A changed or added weapon or reordered virtual-row index must lose old source trust. Disallow unverified embedded Item duplicates and reconcile shipyard items individually.
4. Integrate the trusted authority with `resolveTrustedStockAttackGroup` only after real V13 live import/clone and mutation tests; verify real fixed-forward geometry, named and abstract gunner assignments, BAB + vehicle INT, +1 published total and −4 autofire, and pre-cost refusal/rollback.
5. Keep `D01`–`D03` approved, `D04` staged enforcement **DENIED**, strict stock blocking unchanged and the separate D-005 Pure/Modified architecture unimplemented.

**No full release pack installation or modification-system refactor was performed.**
