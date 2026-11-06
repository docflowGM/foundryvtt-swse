# SotG CP23-C2 — State-scoped configuration integrity and installation prerequisites

**Status: read-only preflight complete; authenticated source-to-world installation remains blocked.**

The repository's fifteen CP23-B source-backed draft Actors have been individually checked against CP23-C1 identity anchors and the owner-approved CP21 rules. All fifteen are deliberately outside `system.json`'s registered compendium catalog, have no physical mount certifications, and have no durable GM-controlled installation receipts. This checkpoint does not register or deploy a pack, create Actors, change stock attacks, or alter the Pure/Modified engine.

## What changed

- `scripts/domain/vehicles/vehicle-cp23c2-installation-preflight.js` defines a **pure, actor-shaped configuration comparator**. It requires exact stock identity and complete configuration parity, but distinguishes three explicit transient resource leaves where they already exist: `system.hp.value`, `system.hp.temp`, and `system.shields.value`. The current values must be safe integers within checked bounds. A change to `hp.max`, `shields.max`, initiative, defenses, abilities, mods, crew, installed systems, source IDs, weapon rows, embedded Items, actor name, image, type, or document identity fails closed. It does not infer that missing source fields are zero.
- The same module provides `inspectCP23C2NativeInstallCandidate`: an **observation-only** registered-pack/GM/world Actor identity test. It requires replace mode, a real GM context, an exact native pack identity and document reference, original unarmed draft parity at the source, and no unauthorized world Actor configuration changes. It never produces authentication, persistent receipts, hydration rights, physical mount rights, or stock attack permissions—even if a test supplies a perfectly matching mock pack.
- `scripts/domain/vehicles/vehicle-evidence-authority.js` exposes these two explicitly non-authorizing readers through the existing single source-evidence facade.
- `data/audits/vehicles/swse-sotg-cp23c2-native-install-readiness.json` records all 15 stable source identities, their respective expected uninstalled document IDs and CP23-C1 structural fingerprints, and outstanding blockers.
- `tools/audits/vehicles/build_sotg_cp23c2_readiness.mjs` reproduces that ledger from pinned CP23-B and CP23-C1 Git blobs; it also rejects registering the isolated CP23-B draft pack without another authority review.
- `tests/phase2c_cp23c2_install_readiness.test.mjs` covers all 15 cases, deliberately allowed transient resource changes, every tested configuration/identity mutation, forged native pack references, non-GM calls, changed world membership, merger attempts, and a fabricated perfectly matching mock pack **still receiving no authority**.
- GitHub CI runs these checks alongside CP19–CP23-C1, including the pinned official Foundry CLI native LevelDB round-trip.

## Current evidence

| Measure | State |
|---|---:|
| Approved CP21 source records | 15/15 |
| CP23-B isolated native round-tripped drafts | 15/15 |
| CP23-C1 structural drift anchors | 15/15 |
| CP23-C2 state-scoped integrity cases | 15/15 |
| Registered CP23-B canonical source packs | 0 |
| Authenticated world Actor installations | 0 |
| Durable GM-owned out-of-Actor receipts | 0 |
| Physical weapon mount certificates granted | 0 |
| Trusted stock attack permissions granted | 0 |

## Why this does not yet issue durable receipts

An Actor-shaped snapshot matching an owner-approved draft is not proof of a historical native import. A caller can copy fields, fake source flags or supply a lookalike pack. Therefore the native preflight is a **refusal and diagnostic contract**, not an authorization to issue a receipt. The draft pack is intentionally absent from the system manifest, and creating a GM world-setting receipt from the current evidence would be an invalid elevation of provenance.

## CP23-C3 remaining acceptance gates

1. Independently review and register a true canonical **non-combat-ready** native pack under a migration/deployment plan, rather than silently transforming the existing legacy packs. Verify its pinned LevelDB bytes, exported actor schema, stable source identity, and documented version.
2. Implement the governing install transaction through the existing ActorEngine; verify source/native pack readback, world Actor update result and exact final system shape before any receipt may be considered.
3. Persist a GM-owned provenance record **outside editable actor flags**, pinned to world Actor identity, native source document identity/version, transaction ID, and approved source identity. Treat receipt storage as stateful governance: concurrent writers, rollback, deletions, cloning, pack upgrades and reassignment need explicit tests.
4. Enforce **read-time provenance verification** and invalidation on all configuration-changing paths, including ActorEngine, embedded weapon/Item mutations, Pure/Modified modifications and out-of-band Foundry updates. Hook-only invalidation is insufficient. Preserve ordinary gameplay HP/shield changes without silently authorizing weapons.
5. Perform live Foundry V13 E2E tests. Even after receipts become real, leave the stock attack authority registry at **zero** until strict physical mount, geometry, operator, crew and attack-group certification independently passes.

**Non-authority guarantee:** Every CP23-C2 result keeps `foundryStockAttackTrusted: false`, `physicalMountCertified: false`, `canonicalSourceBindingAuthenticated: false` and `durableGMWorldReceiptIssued: false`. No deployment permission is added.
