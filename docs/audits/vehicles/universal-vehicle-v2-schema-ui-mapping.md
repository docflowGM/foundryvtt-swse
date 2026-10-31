# Universal Vehicles — V2 Sheet / Asset Bay Schema-to-UI Mapping

Model: `scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js` (pure, read-only; shared by the Vehicle sheet
panel `vehicle-schema-panel.hbs` and the Asset Bay). Classification: PRESENT / MISSING (was) / LEGACY_SOURCE (was) /
INCORRECT (was) / INTENTIONALLY_HIDDEN. "Was" = state before this change; "Now" = after.

| Schema field | Was | Now |
|---|---|---|
| Published identity, book/page, call sign vs printed model (`getVehicleRuntimeProjection`) | PRESENT (publication panel) | PRESENT, unchanged; schema panel adds the origin badge only (no duplicate fields) |
| Published vs custom-built vs unrecorded vs invalid origin | MISSING | PRESENT (`origin`, badge) |
| `flags.swse.vehicleConstruction` (frame, authorship, approval, Crew Quality, costs, design time/DC) | MISSING (custom ships fell to the legacy path) | PRESENT in Construction panel; unresolved shown as "Unresolved" |
| Record `designStatus` / `design` (time, Mechanics DC, unresolved reasons) | not stored | stored (additive fields in the sealed record) and shown |
| `CREW_QUALITY` | MISSING | PRESENT (attack/check/CL label) |
| Unused EP (published table) / consumed / remaining / shortfall / nonstandard count | MISSING | PRESENT; unknown table or unruled ship = `UNKNOWN`, ground vehicle = `UNSUPPORTED`, new design uses the owner-ruled pool of 1 |
| Frame printed EP allocation | n/a | INTENTIONALLY_HIDDEN from the EP budget (it is not spendable); only the frame id is shown |
| `flags.swse.vehicleInstallations` sealed entries | MISSING | PRESENT read-only (name, category, certification, EP, cost, standard/nonstandard, effect status, mount, weapon authorization); rejected entries counted |
| Operational/disabled state of an install | not in schema | `NOT_TRACKED` (not fabricated) |
| Installation job state (`vehicle-installation-job.js`) | not wired to any service/UI | MISSING — still unwired; no UI representation is possible yet |
| Effective statistics (base / modification / effective / current) | MISSING | PRESENT; modification column states "No automated modification effects" (no effect is implemented); baseline never overwritten |
| Printed attack groups | PRESENT (reference panel) | PRESENT, kept separate from installed systems |
| `system.hull` as vehicle HP (Asset Bay `statusLine`, Home surface) | INCORRECT (hull preferred over `hp`) | FIXED: `system.hp` first (AssetBaySurfaceService, HomeSurfaceService); Asset Bay reads HP via the runtime model |
| `system.model/frame/size` as Asset Bay detail | LEGACY_SOURCE | replaced by schema origin/source label |
| `system.installedSystems`, `system.weapons` | LEGACY_SOURCE | never read as evidence (test) |
| Ledger, construction record, source digest, authorization, source identity as inputs | none | INTENTIONALLY_HIDDEN: panel has no form controls (test) |
| Ownership/permission in Asset Bay | partial | adds "You own this sheet"/"View only"; Open Sheet / Modify preserved |
| Starship Maneuver Suite | character ability interface | unchanged |

## Remaining / not done
- Installation job state is not represented (the job state machine is not yet wired to a service or UI).
- Design time / Mechanics DC exist only for records created after this change; older records show "Unresolved".
- The character sheet continues to reach vehicles through the Asset Bay; no separate character-sheet vehicle block was added.
- `HomeSurfaceService` still falls back to `hull` when `hp` is absent (non-canonical legacy actors only).
- `LIVE_RUNTIME_PENDING`: template rendering in Foundry V13 (no Handlebars runtime in the offline harness).
