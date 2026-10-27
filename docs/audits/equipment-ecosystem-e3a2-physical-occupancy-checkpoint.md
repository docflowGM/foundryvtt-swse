# Equipment Ecosystem — E3-A2 Checkpoint: Read-Only Physical Occupancy Foundation

**Phase:** E3-A2 only. E3-A3 (weapon grip through the weapon-runtime authorities), equipment-state persistence, transitions, action economy, Near-Human, encumbrance and the droid refactor are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `fcbe2d65c04a963bc15f02ea78ee64eab79537d5` (clean tree; E3-A1 CI run 39049278776 green).
**Statuses:** `IMPLEMENTED`, `OFFLINE_TESTED` for the pure physical-occupancy resolver. Not `FOUNDRY_TESTED`. No rules decision was needed or made; nothing here is a weapon grip or readiness verdict.

## 1. API and result shape — `scripts/engine/equipment/equipment-capability-resolver.js`
`resolvePhysicalOccupancy({ anatomy, speciesPermissions, assignments })`
- `anatomy`: a `resolveEffectiveAnatomy()` result. `speciesPermissions`: a `resolveSpeciesEquipmentPermissions()` result, optional. `assignments`: `[{ itemId, purpose: 'hold'|'wield', appendageIds: [...] }]` — hypothetical, caller-supplied; no grip requirement field is accepted.
- Result (deterministic, independently owned, deeply frozen): `status`, `anatomyStatus`, `occupancy[]` (`{appendageId, slot, itemId, purpose}` for assignments established as physically compatible), `assignments[]` (per assignment: `status`, per-appendage facts `{kind, slot, functionalState, capabilities, status, issues}`, `pendingConstraints`, `issues`), `conflicts[]` (`{appendageId, slot, itemIds:[first, second]}`), `pendingConstraints[]` (`{appendageId, itemId, constraint, evaluation:'unevaluated'}`), `issues[]`, and `speciesPermissions` (`null` or `{status, supporting:[{id, provenance}]}`).

## 2. Semantics
- **Overall status (physical only):** `physically-blocked` (an established incompatibility, even if unrelated facts are unknown) > `indeterminate` (incomplete evidence, an unevaluated constraint, an anatomy that is not `resolved`, or recognized-but-incomplete species-permission evidence) > `physically-compatible`.
- **Per appendage:**
  - An unknown id is blocked when the topology is established (`topologyStatus: complete`, or a resolved droid anatomy), otherwise indeterminate. No appendage is ever invented, selected or inferred.
  - `disabled`/`missing` blocks; `unresolved` is indeterminate.
  - A null `identity.slot` is indeterminate (`appendage-slot-unconfirmed`).
  - `hold` needs `canHold`; `wield` needs `canHold` and `canWield`. `false` blocks and `null` is indeterminate, so unknown is never permission. `canManipulate` is reported but not required, so a known holding fact survives unknown manipulation.
- **Collisions:** one appendage or slot serves one item. A second claimant is reported as a conflict naming both items and the appendage; nothing is dropped, stowed or moved, and conflicted assignments establish no occupancy.
- **Conditional constraints:** typed constraints on a named appendage (Ryn/Trianii `held-item-load-floor`) are copied into `pendingConstraints` as `unevaluated`. The assignment becomes indeterminate (not blocked, not a prohibition); no size comparison, load calculation or `EncumbranceEngine` call is made.
- **Species permissions** are reported as supporting evidence only. They are neither required for, nor a prohibition of, ordinary occupancy; the Codru-Ji limits are not restated as a capacity rule, and a recognized-incomplete result keeps the whole configuration indeterminate.
- **Partial or unresolved anatomy** can never yield an overall `physically-compatible`; individually established facts remain in the per-assignment diagnostics. Zero assignments invent no state.
- **Input errors** throw `EquipmentOccupancyInputError` with stable codes: `INVALID_INPUT`, `INVALID_ANATOMY`, `INVALID_SPECIES_PERMISSIONS`, `INVALID_ASSIGNMENTS`, `INVALID_ASSIGNMENT`, `INVALID_ITEM_ID`, `INVALID_PURPOSE`, `INVALID_APPENDAGE_IDS`, `DUPLICATE_APPENDAGE_IN_ASSIGNMENT`, `DUPLICATE_ITEM_ASSIGNMENT`. Incomplete-but-valid evidence never throws.

## 3. Representative outcomes (real certified profiles)
| Scenario | Overall status |
|---|---|
| Two-arm anatomy, two single-arm holds | compatible |
| Two items on one arm | blocked (conflict) |
| Codru-Ji, four single-arm holds | compatible; permission reported as `verified-permission-present` supporting evidence |
| Killik, four single-arm holds | compatible; `no-matching-entitlement` |
| Ryn/Trianii tail hold | indeterminate (typed constraint pending); tail wield: blocked |
| Ryn arm holds | arm assignments compatible, overall indeterminate (anatomy partial) |
| Dug lower limb hold / wield | hold compatible at assignment level, wield indeterminate |
| Lugubraa grasping hold | holding preserved, wield indeterminate |
| Real legacy droid evidence | indeterminate, no occupancy (no allocatable hand) |
| Synthetic injected droid with confirmed identities | compatible |

## 4. Tests (Node 22, in-repo shim; offline only)
- New `tests/equipment-e3a2-physical-occupancy.test.mjs`: 34 checks, all 34 directive scenarios, exit 0. Reverting the null-capability rule makes it fail.
- Exit 0: E3-A1 (18), E2B-I3B (26), E2B-I3A (13), E2A resolver (21) and droid projection (14), schema v1 (11), profile certification (13), variant-atomic, snapshot-consumers, multi-publication, publication-selection, profile-invariants.
- All 394 `tests/*.test.mjs` files: 389 exit 0; 5 exit 1 — the documented pre-existing force-power failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`), not repaired. `node --check` passes on the new module and test.

## 5. Unchanged
No compendium, species/anatomy/permission authority, `resolveEffectiveAnatomy()`, `resolveSpeciesEquipmentPermissions()`, wielding or weapon-size resolver, `InventoryEngine`/`ActorEngine`, equipment posture, legacy `system.equipped` field, FireStateStore/action economy, combat or attack code, `EncumbranceEngine`, chargen, droid/vehicle system, sheet/UI or modification registry changed. OA-1 (mapping legacy `equipped: true` to posture) remains undecided and untouched. The module reads no Foundry document and is not wired into any live consumer.

## 6. Remaining dependencies
E3-A3: connect physical occupancy to the existing weapon-runtime grip and size authorities (`resolveWielding()`, `resolveEffectiveWieldingSize()`) for actual one-/two-handed verdicts, including whether a Codru-Ji can operate two two-handed weapons, and readiness distinct from holding. Later: Ryn/Trianii constraint evaluation with item-size data and the encumbrance authority; Near-Human Additional Arms; certification of `krevaaki-jatm-2j-04`; durable equipment state, transitions and rollback tests; OA-1; Foundry runtime certification; the droid refactor (DR-001…DR-010 remain `DEFERRED_DROID_REFACTOR`).
