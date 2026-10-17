# Equipment Ecosystem — E2B-I3B Checkpoint: Universal Anatomy Integrity Hardening

**Phase:** E2B-I3B only. E3, the Codru-Ji permission projection, Near-Human, encumbrance and the droid refactor are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `36cbe9b974c25d0bcc4b431694249490e7e96af4` (clean tree; CI run 39041958167 green).
**Statuses:** `IMPLEMENTED`, `OFFLINE_TESTED`. Not `FOUNDRY_TESTED`. No rules decision was needed or made: these are resolver-contract corrections.

## 1. Changes (`scripts/engine/equipment/anatomy-resolver.js` only)
1. **Unresolved-record completeness.** On the injected-adapter path, confirmed appendages plus a non-empty `unresolvedRecords` array now yield `partial`, never `resolved`, with a new warning `unresolved-physical-records-present` (`details.count`). Confirmed appendages are kept unchanged; the records stay in `unresolvedRecords` as separate diagnostic evidence and are never promoted to appendages (no count, identity or capability is inferred). With no confirmed appendage the established `partial`/`unresolved` distinction (usable unresolved evidence) is untouched, and no new issue is added there. Capability, identity, functional-state and blocking-issue rules still apply, and `resolved` remains possible once the records are gone.
2. **`DUPLICATE_APPENDAGE_SLOT`.** Two different confirmed adapter appendages with the same non-null `identity.slot` throw `AnatomyInputError`.
3. **`DUPLICATE_INSTALLED_INSTANCE`.** Two different confirmed adapter appendages with the same non-null `identity.instance` throw `AnatomyInputError`.

Both errors carry `details` (`{slot|instance, appendageIds:[first, second]}`) and a message naming the value and both ids. Detection runs in array order, slot before instance, after the existing per-appendage validation, so repeated ids still throw `DUPLICATE_APPENDAGE_ID` first. Collisions are malformed data: they are never converted into `partial`, and the call returns no result.

## 2. Confirmed versus candidate identity
- **Confirmed:** `identity.slot` / `identity.instance` on an entry of the adapter's `appendages` array. Distinct appendages may not share one.
- **Incomplete (not a collision):** null or missing slot/instance. It keeps producing `appendage-identity-incomplete` and `partial`.
- **Not unique by design:** `identity.part` (canonical part definition) — independent instances of one part definition are valid.
- **Candidates:** identifiers inside `unresolvedRecords` (including embedded Item document ids) are diagnostic only; repeated or overlapping candidate ids never trigger the collision errors, and nothing infers identity from array order, names, location text or Garage data.
- **Biological anatomy** is unaffected: schema v1 already guarantees distinct ids, which serve as slot identity, and no installed-instance id is required.

## 3. Tests (Node 22, in-repo shim; offline only)
- New `tests/equipment-e2b-i3b-universal-integrity.test.mjs`: 26 checks (all 26 directive cases), exit 0. With the resolver reverted to the starting commit it fails, so it exercises the change.
- Exit 0: `equipment-e2a-anatomy-resolver` (21), `equipment-e2a-droid-appendage-projection` (14), `equipment-e2b-i3a-biological-integration` (13), `species-anatomy-schema-v1` (11), `species-anatomy-profile-certification` (13), `species-variant-atomic-profile`, `species-multi-publication`, `species-publication-selection`, `species-profile-invariants`, `species-snapshot-consumers`.
- All 392 `tests/*.test.mjs` files: 387 exit 0; 5 exit 1 — the documented pre-existing force-power failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`), unchanged and not repaired. `rolling-ci-support-check` exit 0 (run alone). The earlier E2B-I3A sweep shows the same five failures. `node --check` passes on the changed module and the new test.

## 4. Unchanged
Species packs and data, the species anatomy schema, registry and publication resolver, `droid-appendage-projection.js`, installed-component reconciliation, droid actors/parts/Garage, actors, chargen/Near-Human, inventory and equipment state, weapons, armor, combat, `EncumbranceEngine`, sheets/UI, modification registries and vehicles are untouched. Biological statuses are as in E2B-I3A (Codru-Ji, Krevaaki UR-2B-04, Killik resolved; Ryn, Trianii, Dug, Lugubraa partial; Krevaaki Jedi Academy unresolved). The real legacy droid projection still returns zero confirmed appendages, so this change does not alter its output. DR-001…DR-010 remain `DEFERRED_DROID_REFACTOR`.

## 5. Remaining dependencies
E2 acceptance review (owner-proposed) before E3. Then: Codru-Ji trait-to-permission projection; independent certification of `krevaaki-jatm-2j-04`; replacing the temporary publication-identity guard; Near-Human (`_buildNearHumanContext`, additional arms); encumbrance integration; E3 allocation and occupancy; Foundry runtime certification; the droid refactor that will first supply confirmed slot and installed-instance identities.
