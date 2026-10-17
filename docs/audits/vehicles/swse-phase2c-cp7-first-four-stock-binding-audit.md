# Phase 2C CP7 — First Four Certified Ships: Foundry Compendium Binding Parity

**Scope:** read-only source-to-pack parity and blocker certification. No production `.db` edits, no runtime group-authority additions, no published-source mutations, and no vehicle/droid modification refactor.

## Baselines

- Repository branch: `audit/vehicle-phase-0-1-canonical-foundation`, from `f34a1465c5ae70435d8c833900f759e0cbc73c00`.
- Source authority: *Starships of the Galaxy* Phase 2B Checkpoint 16 strict certificate ledger, Git blob `d08ca75b0b30e8b44896588edf3c5ce1cd335557` (four full-field/physical-mount certificates).
- Inspected exact pack blobs: `packs/vehicles-space-transports.db` `ea5e48bc2aaba4369f29cfa4ff35a49f7d998c5d`, and `packs/vehicles-capital-ships.db` `9bd523944a37d86454adc3981b4553b7924ae3f4`.
- The corrected 318-publication-claim census is unaffected. The 4 source certificates do not certify Foundry pack records or runtime weapon bindings.

## Readback: printed source versus current Foundry records

| Certified published ship (page) | Foundry document candidate | Source/compendium discrepancy | Weapon binding |
| --- | --- | --- | --- |
| Action VI Bulk Transport (p.58) | `vehicles-space-transports.db:97c5c070d93b7a0a` | HP **600 / 50**; crew **8 / 1**; Colossal / `large` | Source explicitly unarmed. No stock attack to bind. |
| CR70 Corvette (p.75) | `vehicles-capital-ships.db:18cd29422b66693d` | INT **18 / 10** | Source unarmed. No stock attack to bind. |
| Ghtroc Class 720 Freighter (pp.88–89) | `vehicles-space-transports.db:4d5b3422047f5eb8` | DEX **14 / 4**; INT **13 / 10**; Colossal / `gargantuan`; published one weapon group / pack zero | **Blocker**: printed double laser cannons +1, 4d10×2, single forward emplacement and gunner station. Pack has `system.weapons: []`. |
| Consular-class Cruiser (p.126) | `vehicles-space-transports.db:28f748f51896aa1b` | HP **960 / 50**; crew **8 / 1**; Colossal / `large` | Source unarmed. No stock attack to bind. |

All four pack rows have empty `system.sourcebook` and null `system.page`. They are **candidate compendium identities**, not trusted published-source bindings. Printed crew totals/range must not be replaced by a guess merely because the pack has a crew quality string. Numeric `+1` printed on the Ghtroc weapon line is an **already computed source statblock total**, not a free-standing attack modifier to add to BAB + vehicle INT.

The Ghtroc compendium also labels its weapon-data status as needing source verification and has deliberately removed a prior generic placeholder. Reintroducing a generic category placeholder would repeat the original error; the repair must use the already certified printed attack group with its physical/gunner evidence and an independently validated Foundry identity.

## Why no production binding is issued

The runtime registry introduced in CP6 is intentionally empty. A printed source certificate, a plausible vehicle name, a pack `_id` or `system.vehicleHasWeapons` is **insufficient** to prove the currently installed stock weapon Item or `system.weapons[n]` group is the published one. Here the single published armed ship actually has **no weapon row** in the pack. Minting a trusted group ID anyway would certify a nonexistent installed weapon.

A `pure` ship must use a source-corrected original stock snapshot. A future `modified` ship may replace or add weapons without rewriting that published snapshot; installed modification records must not be treated as proof of stock-source authority. The equipment D-005 and future droid/vehicle modification handoff is recorded separately; it does **not** authorize weapon replacement or upgrade implementation in Phase 2C.

## Audit checker

Run in a full repository checkout:

```sh
node --test tests/phase2c_cp7_stock_binding_audit.test.mjs
node tools/audits/vehicles/audit_phase2c_cp7_stock_bindings.mjs --repo-root . --output /tmp/swse-phase2c-cp7-observed.json
```

The checker verifies the three **exact Git input blobs**, the 4 strict source claims, unique pinned pack IDs, sampled critical fields, armament counts, and source pointer gaps. It **never issues a runtime binding or a full pack-field certificate**. If a pack changes, the blob guard stops the checker until the next audit explicitly reviews that new snapshot. The 13 isolated tests use synthetic fixtures and passed; full-checkout execution and Foundry V13 end-to-end tests remain outstanding in this environment.

## Remediation dependency order

1. Produce a source-backed exact-document-ID remediation manifest for the four pilot pack records; account for all field semantics, not just the sampled mismatches here. Confirm `system.attributes.int` resolves to the correct modifier for canonical gunnery.
2. Rehydrate the certified Ghtroc stock double-laser-cannon **group** only after distinguishing its printed `+1` attack total from gunner/vehicle formula components. Preserve physical singular mount, fixed-forward arc, and gunner station provenance. No invented second cannon Item.
3. Give every stock group a stable, repo-built immutable source-to-pack and pack-to-installed-instance identity mapping; certify fresh actor clones without trusting editable actor-name/flag strings as sole evidence.
4. Re-run producer/consumer tests, unchanged strict source gate, cost-before-roll rollback tests, weapon target/arc/crew station checks, and Foundry V13 live tests; only then issue the first trusted runtime stock attack.

**Current outcome: four plausible Foundry identity candidates, zero trusted runtime stock weapon groups.** D01/D02/D03, immediate strict D04 (staged rollout denied), and the future Pure/Modified boundary remain intact.
