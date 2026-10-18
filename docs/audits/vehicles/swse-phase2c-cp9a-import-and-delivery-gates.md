# SWSE Vehicle Phase 2C — CP9A Import/Delivery Gate Checkpoint

## Scope and status

**Completed and pushed:** physical mounted-weapon import safety, source-preserving Actor preCreate normalization, and automated audit-branch Node test coverage.

**NOT completed:** trustworthy published pack -> actual world Actor clone -> still-installed physical group authentication, or live Foundry V13 certification. Keep `TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0`; no stock attack authorization.

The previous CP8 source ledger, strict policies D01-D03, D04 DENY, and null semantics remain authoritative. The separate Pure/Modified droid/vehicle modification refactor remains out of scope.

## Why CP9A preceded attack binding

The legacy post-create weapon importer treated a printed attack total as an *additive* `Item.system.attackBonus` and `Item.system.bonus`. For the Ghtroc's published +1, that can incorrectly increase an attack already calculated from normal crew BAB +0 and vehicle INT modifier +1.

The same importer also materialized a separate embedded Item from an already-present `system.weapons` physical row. The actor's weapon facade resolves rows by `system-weapons-{index}`, so duplicate items can create a misleading second firing option.

Further, `vehicle-precreate-hooks.js` registered vehicle Actor normalization under `preCreateItem`, a mismatched Foundry document lifecycle event.

## Changes

- `scripts/engine/import/vehicle-weapon-import-normalizer.js` now retains source row ID, published source-group key and operator station during parsing; records printed attack values under `printedAttackTotal` rather than additive attack-bonus fields; keeps old legacy totals as evidence; and suppresses duplicate embedded Items for source-bound physical system rows.
- `scripts/actors/vehicle/vehicle-precreate-hooks.js` now normalizes vehicle Actors during `preCreateActor`, persists via `document.updateSource`, and avoids replacing a source-backed ship's existing category with a guessed name mapping.
- `tests/phase2c_cp9a_vehicle_import_boundaries.test.mjs` contains seven importer/provenance regressions.
- `.github/workflows/vehicle-phase2c-cp9.yml` runs the focused CP8/CP9 suite on pushes to this audit branch as well as on manual dispatch.
- `tools/audits/vehicles/audit_phase2c_cp9_pack_delivery.mjs` and `tests/phase2c_cp9a_pack_delivery.test.mjs` inspect deployed-pack preconditions without modifying pack definitions or granting trust.

The importer changes **do not** certify an actor's editable `sourceEntryKey`. Source-bound rows with copied keys may still be skipped for duplicate hydration, but their attacks remain **blocked** by the unchanged trusted-stock authority.

## Actual GitHub Actions result

The initial CP9A CI run [39086869940](https://github.com/docflowGM/foundryvtt-swse/actions/runs/39086869940) completed **successfully** on the real repository checkout, including importer, CP8 certified-fields, station evidence, stock-vs-custom, and pre-existing vehicle operator guard regressions. Later edits are covered by subsequent branch CI runs; only report an updated result once it is completed and read back. **No live Foundry V13 test has been performed.**

## Delivery blocker: .db source vs v13 packs

The `system.json` manifest declares these Actor packs at `packs/vehicles-space-transports` and `packs/vehicles-capital-ships`. The source-controlled corrected datasets are `packs/vehicles-space-transports.db` and `packs/vehicles-capital-ships.db`. Those JSONL files do not alone prove native v13 LevelDB pack directories have been generated.

The existing `scripts/build/package-system.js` explicitly lists system files but **does not include `packs/`** in its ZIP inclusion list. It is unsafe to describe these .db edits as delivered to users without building/installing the actual Foundry packs and verifying document UUIDs there.

**Next dependency gate:** Define/review a deterministic source-JSONL-to-native-v13-compendium builder and release packaging authority, with repeatable checksum/doc-ID equality checks. Avoid modifying release packaging merely to include incompatible .db text files.

## Work remaining for CP9B

1. Independently verify that the Ghtroc stock source claim (Starships of the Galaxy p.88–89) reaches a real installed Foundry V13 pack at the exact compendium document ID. Verify the correct class, crew, weapon and page metadata after import.
2. Establish a trusted immutable source identity *outside the editable world Actor*, linked to a real successful compendium clone/import. An editable flag, caller-supplied key, Ghtroc-like name, or apparent matching weapon list alone must not grant provenance.
3. Verify current physical weapon row and mount identity against that registered source, without marking all weapons on a custom ship exempt.
4. Prove valid named/abstract gunner, fixed-forward target geometry and attack component ledger work with printed +1/−4; keep any unknown source values fail-closed.
5. Demonstrate no unauthorized ammo/action expenditure, no double attack bonus, no duplicate gun and proper refusers on bad target/crew/item/mount.
6. Only after the full integration audit may a genuinely trusted Ghtroc stock group be promoted to the runtime registry. Preserve the 318 claim census and the D04 immediate deny policy.

**Recommended commands:**

```sh
node --test tests/phase2c_cp9a_vehicle_import_boundaries.test.mjs
node --test tests/phase2c_cp9a_pack_delivery.test.mjs
node tools/audits/vehicles/audit_phase2c_cp9_pack_delivery.mjs --repo-root .
node --test tests/phase2c_cp8_post_hydration.test.mjs
```

All production stock attacks remain fail-closed pending the above gates.
