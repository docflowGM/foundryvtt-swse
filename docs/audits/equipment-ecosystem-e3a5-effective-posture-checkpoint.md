# Equipment Ecosystem — E3-A5 Checkpoint: Canonical Effective Weapon Posture Resolver

**Phase:** E3-A5 only. Persistence, schema/template changes, the consumer cutover, transitions, action spending, encumbrance, Near-Human, the droid refactor and live testing are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `27af398c548b106d5b43b64155f9af8a0c756d99` (clean tree; E3-A4 CI run 39060336187 green, completed 19:03:34Z).
**Statuses:** `IMPLEMENTED`, `OFFLINE_TESTED` for the read-only effective-posture resolver. All runtime behavior is `RUNTIME_UNVERIFIED` (no live Foundry testing before the full implementation is merged).
**Rulings recorded:** OA-2, OA-3, OA-11, OA-12, OA-13 — architecture contract §9 (appended; §§1–8 unchanged).

## 1. API — `scripts/engine/equipment/effective-equipment-posture.js`
`resolveEffectiveEquipmentPosture({ itemId, declaration?, occupancy, grip, activation?, exception?, speciesProfile? })`
- `declaration` is projected through the real E3-A4 `projectEquipmentPosture` (the only import). `occupancy` and `grip` are the unmodified E3-A2 / E3-A3 outputs. Unknown input fields are rejected (`UNKNOWN_FIELD`): no Item documents, legacy flags or `alwaysReadied` booleans.
- Result (deterministic, independently owned, deeply frozen): `itemId`, `status` (`established | blocked | indeterminate | contradictory | undeclared`), `declaredPosture`, `declarationStatus`, `effectivePosture` (or `null`), `verification { physicalHolding, grip, readiness }`, `activation { state, source, independentOfPosture }`, `exception`, `evidence` (this item's occupancy assignment, grip assessment, pending constraints, aggregate statuses, species-permission status), `issues`.
- Errors: `EffectivePostureInputError` — `INVALID_INPUT`, `UNKNOWN_FIELD`, `INVALID_ITEM_ID`, `INVALID_OCCUPANCY`, `INVALID_GRIP`, `INVALID_ACTIVATION`, `INVALID_EXCEPTION_CLAIM`, `INVALID_SPECIES_PROFILE`.

## 2. Verdict rules
- **STOWED:** established only if neither resolver assigns the item to any appendage; otherwise `contradictory` (evidence retained, declaration unchanged).
- **EQUIPPED:** established when this item's own assignment (hold or wield) is physically compatible and carries no unevaluated constraint. It never advances to READIED and grants no combat permission.
- **READIED** is verified only when all of these hold for the exact `itemId`: a `wield` occupancy assignment; that assignment physically compatible; the overall occupancy `physically-compatible`; a `wield` E3-A3 assessment with status `grip-supported`, an established `requiredHands` (1 or 2) equal to the distinct assigned appendages; no unresolved constraint; and occupancy and grip agreeing on purpose, appendages and occupancy status. Failures give `blocked` (e.g. blocked occupancy/grip, count mismatch, disabled or missing appendage) or `indeterminate` (hold-only, unknown evidence, missing assessment, mismatched pair), each with the original diagnostics and `effectivePosture: null`.
- **E3-A3 trap closed:** an aggregate `grip-supported` with `wieldAssignmentCount: 0` (hold-only) never certifies a weapon; the item's own wield assessment is required. An empty assessment list, another item's verdict, or a grip result from a different configuration cannot certify it.
- **Undeclared:** missing or invalid declaration → `undeclared`, never STOWED or READIED, regardless of physical evidence, legacy booleans or activation.
- **Activation** is carried through untouched, never establishes or repairs posture, and READIED never implies it.

## 3. Natural and integrated exceptions (conservative)
- *natural-weapon:* established only if the effective species publication (complete snapshot) lists a natural weapon with the claimed id and `alwaysArmed: true`; effective posture READIED with no appendage invented (`physicalHolding`/`grip` `not-applicable`). An ordinary appendage assignment for such an item is `contradictory`. Uncorroborated claims are `indeterminate`.
- *integrated-droid-weapon:* always `indeterminate`; droid installation identity is uncertified.
- **Trust boundary for live integration:** the species record is certified, but the binding of a particular Item to that record is caller-asserted (`exception.binding: caller-asserted`). The live consumer must materialize natural-weapon Items with a stable species-record reference and verify it; integrated weapons need certified installed-component identity (droid refactor).

## 4. Tests (Node 22, in-repo shim; offline only)
- New `tests/equipment-e3a5-effective-posture.test.mjs`: 33 checks (all 33 directive scenarios), exit 0, using the real E3-A4/E3-A2/E3-A3 implementations and real canonical weapon shapes, real Codru-Ji/Killik/Ryn/Dug/Barabel publications. Disabling the wield-assignment rule makes it fail.
- Regression with every new file tracked: E3-A4 (15), E3-A3 (38), E3-A2 (34), E3-A1 (18), I3B (26), I3A (13), E2A (21 and 14), weapon readiness/wielding and `weapon-runtime-builder-negative` suites exit 0 (full results in the PR description). The 5 documented force-power failures are unchanged. The new module imports no weapon-runtime module, so the consumer allowlist guard needed no change.

## 5. Not changed
`template.json`, Item/actor schemas, compendiums, the E3-A1 to E3-A4 modules, weapon-runtime authority, InventoryEngine, ActorEngine, FireStateStore, combat/multiattack, action economy, EncumbranceEngine, Near-Human, droid/vehicle code, sheets/UI, modification registries. `system.weaponPosture` is not persisted; `system.equipped` and its aliases still drive all current behavior. No gameplay consumer is wired to the resolver.

## 6. Limitations
Offline only. The resolver evaluates one item at a time from caller-supplied results; it cannot detect that a caller built the occupancy and grip from different actors (it detects configuration mismatch via purposes, appendages and occupancy status, not actor identity). A READIED verdict here is not combat eligibility, attack authorization, activation or an action spend. Mounted/worn weapon posture and the natural-weapon Item binding remain uncertified.

## 7. Recommended coordinated cutover scope (next, not authorized)
One convergence operation: add `system.weaponPosture` (default `STOWED`) to the weapon template and creation defaults; introduce the single equipment coordinator (rerouting `InventoryEngine.setWeaponReadied` and removing raw weapon writers: A8–A11, A13–A15, plus the hook watching equip fields A16); migrate every §5 reader (attack availability, Full Attack/dual-wield, reactions, Lightsaber Defense, control effects, passive/condition readers, sheets and row builders, droid sheet) to `resolveEffectiveEquipmentPosture` plus activation; retire `isItemEquipped` and the weapon `equipped` / `dualWielded` / `wieldedTwoHanded` booleans; add posture and fire state to the render/derived/modifier cache signatures; materialize natural-weapon Items with a species-record reference; keep armor/shield worn state. Reviewable in several commits but accepted as one convergence, with offline mocked-integration tests and GitHub Actions as the gate and a `RUNTIME_UNVERIFIED` list for post-merge certification.
