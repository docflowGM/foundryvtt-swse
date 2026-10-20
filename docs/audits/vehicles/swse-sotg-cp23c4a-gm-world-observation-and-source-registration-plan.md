# SotG CP23-C4A — Active GM world observation ledger and controlled registration plan

**Implemented, not yet authenticated source installation.** This checkpoint adds a real world-scoped, GM-owned observation ledger for **legacy** pack imports and a versioned registration proposal for the 15 staged canonical source actors. None of these observations is a trusted receipt, physical mount certificate, or authority to run stock attacks.

## Current status

| Gate | Status |
|---|---:|
| CP21 owner-approved effective source entries | 15/15 |
| CP23-C3 independently pinned non-deployed source JSON documents | 15/15 |
| Proposed GM-only canonical source compendium | Defined, not registered |
| Runtime canonical source compendium registered in system.json | No |
| Native source pack identity authenticated after real world installation | No |
| Active-GM owned world settings observation facility | Implemented |
| Issuable VERIFIED source installation receipts | 0 |
| Verified source-to-world Actor installations | 0 |
| Physical weapon mount certifications | 0 |
| Trusted Foundry stock attacks | 0 |

## Implemented components

- `scripts/domain/vehicles/vehicle-cp23c4-gm-observation-ledger.js`: a hidden (`config:false`), world-scoped Foundry setting `foundryvtt-swse.vehicleImportObservationsCP23C4`, with an **unverified-only** record schema and a bounded history of 200 observations. It is registered at init, outside all Actors and editable actor flags.
- `index.js`: registers the setting at startup. Registration does not write records.
- `scripts/apps/vehicle-import-wizard.js`: after a **completed** existing import, optionally logs an observation if the selected legacy pack/document identity matches the immutable CP22 candidate table. The logging helper requires the active GM, exact native pack object readback, currently registered world Actor reference and rechecked GM identity; the result remains `UNVERIFIED_LEGACY_NATIVE_IMPORT` even when those checks pass. GM audit logging failure does not claim provenance and cannot promote a weapon.
- `scripts/domain/vehicles/vehicle-evidence-authority.js`: exports only the untrusted ledger reader, schema and validator; no receipt writer or attack permission.
- `data/audits/vehicles/swse-sotg-cp23c4-registration-and-observation-plan.json`: pinned 15-document C3 stage manifest, *proposed* GM-only Actor source-pack registration metadata, and hard predeployment gates. No actual `system.json` source pack entry is introduced.
- `tests/phase2c_cp23c4_gm_observation_ledger.test.mjs`: GM-active/secondary-GM/player separation, exact pack document identity, post-write world setting readback, forged status rejection, non-atomic settings failure, two concurrent local observations, legacy source-key spoofing and stock weapon denial.
- SotG CI: regression tests for CP19–CP23-C3 still run; C4 observation tests added at the end.

## Trust boundary

An **observation** records that an active GM client inspected an exact legacy native pack document after an import operation. It does NOT claim that the pack contains correct CP21 published values, that the Actor has a mechanically trusted configuration or weapon groups, or that a world import has been cryptographically or transactionally authenticated.

The world setting schema contains only `UNVERIFIED_LEGACY_NATIVE_IMPORT` records. The reader rejects forged trusted statuses. All methods return `authenticatedSourceInstallation:false`, `durableVerifiedSourceReceipt:false`, `physicalMountCertified:false`, `productionHydrationPermitted:false`, and `foundryStockAttackTrusted:false`.

The repository's existing **legacy** vehicle packs still lack canonical SotG source identity bindings. Accordingly, observations are candidate source hints, not bindings. CP23-C3 canonical source JSON records remain staged outside `system.json` and outside production release packages.

## Concurrency and persistence limitations

- A single active GM can write observations. In-process operations are serialized to avoid local lost updates.
- Each write checks the full prior revision, writes a new revision, and verifies a settings readback. A Failed readback or changed revision yields a denied result.
- Foundry world settings do NOT provide an atomic compare-and-swap across multiple concurrent browser sessions. This is therefore not a multi-GM transactional provenance certificate, even if a local readback succeeds.
- Stored observations are bounded to 200 records to constrain world settings growth. Historical authority is never inferred from observations, including in a future system version.

## Independent gates before enabling canonical source registration or issuing verified receipts

1. Audit native actor-schema compatibility and real Foundry V13 hydration of the staged unarmed Actor documents, with no production world migration.
2. Pin the **actual** native LevelDB bytes, version, compendium ID and readback identities, rather than mistaking staged JSON SHA values for verified deployed pack identity.
3. Independently approve registration and migration of a clearly labeled, GM-only source pack without merging the 15 records into existing legacy packs.
4. Introduce a governed ActorEngine import transaction, post-recalc world readback and unique transaction/Actor/source/version identity; keep GM receipt storage outside writable Actor state.
5. Define an event-safe receipt invalidation protocol for ActorEngine, embedded Item/weapon mutations, source upgrades and Pure/Modified changes, including non-ActorEngine writes. Independently verify each receipt at **read time**, not only through hooks.
6. Run true Foundry V13 world, GM/client and concurrency E2E tests. Only after separate weapon hardware, arc, crew and battery group certificates should any trusted stock attack be considered.

**No production pack, source attack authority registry, or Pure/Modified implementation is altered by this checkpoint.**
