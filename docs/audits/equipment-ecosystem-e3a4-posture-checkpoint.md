# Equipment Ecosystem — E3-A4 Checkpoint: Clean-Break Equipment Posture Foundation

**Phase:** E3-A4 only. E3-A5, the persistence/consumer cutover, durable equipment state, action economy, E4+, encumbrance, Near-Human, the droid refactor and live testing are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `36d6efb55e99ff78a50b49aba44bb7c153d74000` (clean tree; E3-A3-C1 CI run 39053779906 green).
**Owner decision recorded:** *OA-1: SUPERSEDED — CLEAN-BREAK POSTURE MODEL APPROVED* (2026-10-17). The earlier "Option A" compatibility directive (legacy `equipped: true` ⇒ `READIED`) was replaced before any implementation and is not adopted. Full contract: `docs/architecture/equipment-ecosystem-e3a4-clean-break-posture-contract.md`.
**Statuses:** `IMPLEMENTED` and `OFFLINE_TESTED` for the posture vocabulary/validation module only. Everything else below is contract, not code, and all runtime behavior is `RUNTIME_UNVERIFIED` (no Foundry testing before the full implementation is merged; offline tests and GitHub Actions gate each phase).

## 1. What exists after this checkpoint
| Item | State |
|---|---|
| `scripts/engine/equipment/equipment-posture.js` — `STOWED / EQUIPPED / READIED` vocabulary and `projectEquipmentPosture({ posture })` | implemented, pure, no imports, deeply frozen output |
| A declared posture is not verified readiness (`verification` always `unverified`) | implemented |
| Legacy fields never establish posture (reported as ignored) | implemented |
| Persisted weapon-posture field (`system.weaponPosture`, default `STOWED`) | recommended only (OA-2 needs owner approval); not in `template.json` |
| Single equipment coordinator and consumer cutover | planned only |
| Read-only effective-posture adapter | specified only (proposed E3-A5) |

## 2. Evidence-backed legacy field classification
See contract §4. In short: `system.equipped`, `isEquipped`, `readied`, `equippable.equipped`, `flags.swse.equipped` are legacy posture evidence; `system.active` is **ambiguous** (an equip alias in `isItemEquipped` and an activation read in `isItemActivated`); `system.activated` is activation (an equip alias only in `CombatEngine.isEquippedWeaponItem`); `equippable.active`, `activation.active`, `equipStatus`, `status`, `state` are ambiguous; `FS.*` is operating state; `dualWielded`/`wieldedTwoHanded`/`twoHanded` are unsupported legacy grip booleans. Counts at this HEAD: `system.equipped` appears in 32 script files; `isItemEquipped`/`isAlwaysReadiedWeapon` in 10; the E0 consumer matrix (72 rows) was re-verified — all 137 `file:line` citations still resolve in range.

## 3. Known conflicts and ambiguity (documented migration hazards)
1. `isItemEquipped` treats `system.active`, `equippable.active` and `activation.active` as "equipped", so an activated weapon reads as drawn (pinned by the test as a labeled hazard).
2. `system.active` counts as equipped but `system.activated` does not in `isItemEquipped`; `CombatEngine.isEquippedWeaponItem` counts both plus `status`, `state`, `equipStatus`.
3. `character-actor.js` accepts only `system.equipped === true`; `weapon-control-effects.js` and `passive-state.js` treat `equipped !== false` (so undefined) as wielded; `WeaponVisualProfileResolver` also counts `carried`.
4. `InventoryEngine` fans one stow/draw out to six fields and clears `active` on stow; raw writers (`SWSEActorBase`, `inventory-handlers.js`, item sheet) bypass it.
5. The sheet render signature (E6) omits fire state; derived caches (F2, F3) hash the alias set. Adding `weaponPosture` to those signatures is a cutover requirement.
None is resolved here; the cutover removes the alias set rather than reconciling it.

## 4. Tests (Node 22, in-repo shim; offline only)
- New `tests/equipment-e3a4-posture-foundation.test.mjs`: 15 checks covering all 16 directive scenarios (1–3 are one check), exit 0. It asserts the three declarations, invalid and missing posture, that `system.equipped` and activation booleans establish nothing, EQUIPPED ≠ READIED, declared ≠ verified, that occupancy alone and a legal grip alone grant no readiness or posture, that a readied weapon gains no attack data, that no state is persisted (no imports, writers or schema field), input immutability, frozen output and determinism. One check pins the *current* `isItemEquipped` behavior as a labeled hazard.
- Regression: E3-A3 (38), E3-A2 (34), E3-A1 (18), E2B-I3B (26), E2B-I3A (13), E2A resolver (21) and droid projection (14), schema, certification, and the existing weapon readiness/activation/wielding suites all exit 0 (results in the PR description). The 5 documented force-power failures are unchanged and not repaired.
- Static check: the sweep ran with every new file tracked (`git add` before running), so `weapon-runtime-builder-negative.test.mjs` and other `git ls-files` guards saw them.

## 5. Acceptance limitations
Offline only. The posture module is not wired into any reader, writer, sheet or combat path, and `system.equipped` and its aliases still drive all current behavior. No schema, actor, Item, action-economy or combat code changed. A passing posture projection says nothing about physical occupancy, grip legality, attack eligibility or activation.

## 6. Open decisions
OA-2 (persistence home; recommendation `system.weaponPosture`), OA-3 (superseded in effect by the clean break — owner to confirm no transition period), OA-11 (EQUIPPED weapons in attack lists, reactions, Full Attack — proposed: excluded unless READIED), OA-12 (per-reader predicates), OA-13 (legacy writers and macro helpers), plus the new questions in contract §7 (default posture, mounted/worn weapons, render-signature change).

## 7. Proposed E3-A5 scope (not authorized)
Implement the read-only `resolveEffectiveEquipmentPosture` adapter per contract §6: consume an explicit posture declaration, the always-readied rule, separate activation evidence and the E3-A2/E3-A3 results for the same `itemId`; output effective posture, `readinessVerified`, passthrough statuses and contradiction diagnostics. No persistence, no reader changes, no schema edits; new offline test file; checkpoint doc. Then, with OA-2/OA-11–13 approved, a separate coordinated persistence-and-cutover phase.
