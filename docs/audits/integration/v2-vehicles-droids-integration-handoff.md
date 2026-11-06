# SWSE V2 - Vehicle + Droid Integration Handoff (2026-11-06)

**Branch:** `integration/v2-vehicles-droids-2026-11` (draft PR for review only; never merged to `main` without owner authorization).

## Pinned inputs

| Input | SHA |
|---|---|
| `main` at integration start | `c367552d8815d9ef6b1157076c31cfc4923b7716` |
| Vehicle V2 (PR #1092) | `e844aba1bbbb9b2a66f860bf579cf476d43c40f7` (QA + Rolling green, exact head) |
| Droid V2 Gate A (PR #1106, frozen) | `1f46371555210c3b3c7e7492e98d4af51468c9ae` (Gate A targeted + Rolling green, exact head) |
| Droid handoff document | `0e4d102e59de8bbe875cefd00bfaa9e767225a50` (document only, copied separately) |

Merge bases: vehicle/main `16a76b7`, droid/main `9275da6`, vehicle/droid `16a76b7`. Vehicle merged first, then Droid, both as regular merge commits (history preserved).

## Conflicts and resolutions

Vehicle into main (12): `actor-engine.js` (both imports kept); `store-constants.js`, `cost-registry.js` (main's markup + discount pricing and vehicle's null-preserving new/used pricing and legacy cache key); `combat-roll-math.js` (main's infiltrator dice + vehicle battery entry + one weapon-multiplier entry); `GMApprovalOperationsService.js` (main's id-addressed identity rule kept; Party Fund requests routed to their governed service after the id check, denial resolves by id before main's `decideDenial`); `tools/release/*` (vehicle's compiler is a strict superset); `swse-rules-decisions-pending.md` (append-only union); phase-5c classification and weapon closure census (regenerated from the combined tree).

Droid into integration (2, both generated): phase-5c classification JSON/Markdown, regenerated from the combined tree (654 files). The shared rules file merged cleanly and keeps the Droid-only source-book rule beside the existing rules.

Post-merge fixture alignment (tests only; no production code, no assertion about behaviour weakened): main's TI-2 recovery check requires a retrievable snapshot, its attack-readiness gate requires the weapon to be an Item in a Foundry-style collection, and vehicle packs have no `packs/*.db` source (generated from the 429-record SSOT).

## Authorities preserved

Vehicle: 429 identities, 846 stock groups (530 executable / 316 blocked), 63 aftermarket rows (30 installable), ammunition, logistics, Party Fund. Droid: 122 identities (99 PASS / 23 HOLD), Gate A quote/prerequisite authority, `system.installedSystems` ledger. No HOLD promoted, no Gate C, no Droid Store finance, no new installation or transaction engine.

## Inherited issues (not introduced by the merge)

- `tools/check-droid-calculation-mode-authority.mjs --strict` and `check-droid-reconciliation-authority.mjs --strict` already fail on `main` (not in CI).
- `tools/check-droid-authority-ssot.mjs --strict` passes on `main` but fails on the frozen Droid checkpoint: `droid-component-source-review.js` is flagged as a competing rule table (reviewed identity aliases). Droid session to resolve (allowlist with justification or consume the registry).
- Five documented rolling-runner exclusions unchanged (Force power tests).
- `tools/audit-droid-source-field-ownership.mjs --certify` remains a future hard gate (16 fields without a proven consumer).
- No Foundry V13 runtime verification of either domain.
