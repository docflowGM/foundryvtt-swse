# SotG CP23-C4C — Canonical import-normalization loss blocker

**Status:** fail-closed integration boundary implemented; native canonical source pack remains unregistered and undeployed; installation receipts and stock attacks remain unauthorized.

## New critical finding

The actual `normalizeVehicleImportData` path used by `VehicleImportEngine.buildImportPlan` currently assumes `system.initiative` is a string. The 15 CP23-B source-backed unarmed Actor proposals carry their approved initiative as **integer numbers**, so the legacy code executes:

```js
normalized.initiative = safeString(system.initiative, '+0');
```

and **silently converts all 15 approved Initiative values to `'+0'`**. That is not a harmless display normalization: the effective CP21 rulings, including Advanced V-19 +12 and K-wing +6, would be erased during an attempted production import.

Other generic normalizer defaults also convert **genuinely source-silent fields** into implicit gameplay facts, including `shields: {value:0,max:0}`, empty hyperdrive strings, cargo defaults and default crew data. These may be useful to render legacy Actors, but they do not constitute *certified published ship values*.

This is a **hard blocker** to automatically deploying the 15 CP23-C3 drafts through the legacy Vehicle Import Wizard or any programmatic call to `VehicleImportEngine`. Matching native source data, a GM observation record, or source-to-world identity alone cannot repair these semantic changes.

## Code changes

- `scripts/domain/vehicles/vehicle-cp23c4c-import-boundary.js`:
  - Identifies the 15 CP23-C3 canonical stage document IDs from the single immutable CP23-C4B source anchor catalogue, even if the caller deletes `.pack`.
  - Independently rejects all three reserved source pack names, including the planned canonical pack.
  - Exposes `inspectCP23C4CNormalizationLoss(original, normalized)`, a **read-only** diagnostic reporting changed source fields and new fields synthesized by generic legacy normalization.
  - Every status keeps canonical source binding, receipt, hydration, physical mount and stock attack authorization **false**.
- `scripts/engine/import/vehicle-import-engine.js`: checks this deny-by-default boundary **before** cloning the canonical source or calling the legacy normalizer, for replace **and** merge plans. Therefore `VehicleImportEngine.apply` cannot call ActorEngine for the reserved drafts.
- `scripts/domain/vehicles/vehicle-evidence-authority.js`: re-exports the source diagnosis through the existing authority facade. No parallel rules calculator is introduced.
- `tests/phase2c_cp23c4c_import_boundary.test.mjs`: executes the *real repository normalizer implementation* in a read-only VM and verifies all 15 numeric Initiative values are lost if passed through the legacy pipeline. It tests unknown-source default synthesis, blocks all 15 native IDs before ActorEngine, detects source `id`/`_id` or pack tampering, and verifies ordinary unrelated legacy imports retain their previous path with **zero stock trust**.

The workflow appends the test after all existing CP19–CP23-C4B gates.

## Acceptance state

| Gate | CP23-C4C |
|---|---:|
| Owner-approved CP21 source records protected | 15/15 |
| Actual importer normalization semantic incompatibility | Identified and tested |
| Reserved canonical source documents blocked before legacy normalization | 15/15 |
| Unrelated historical legacy imports | Unchanged |
| Registered native canonical source pack | 0 |
| Authenticated world source installations | 0 |
| Durable verified installation receipts | 0 |
| Physically certified mounts in this source set | 0 |
| Trusted stock attacks | 0 |

## Next required implementation

**CP23-C4D: source-specific translation, not legacy defaulting.** Introduce an audited, deterministic and independently tested source-to-runtime projection that retains the printed-effective CP21 facts while supplying *typed UI-only placeholders* for genuinely unknown data. Preserve source-silent field authority through a separate provenance state, not inferred `0`, `'+0'`, `''` or `false`. Validate against the 15 owners' approved ship records, Foundry's existing vehicle schema and the actual ActorEngine recalculation path.

The source translator must be compatible with the single V2 Pure/Modified vehicle engine and not create new competing calculations. After the translator passes real Foundry V13 native-pack and post-import readback checks, consider a separately reviewed GM-only pack registration and an outside-Actor receipt issuer. Source fidelity does not waive the independent installed mount/geometry/crew attack permissions.

**No canonical production pack registration, ActorEngine write, or receipt authorization is introduced by CP23-C4C.**
