# Vehicle Phase 2C — Checkpoint 4 — Runtime Evidence Guardrails

**Status: PARTIAL PRODUCTION ADAPTER INTEGRATION; NOT WHOLE-PIPELINE CERTIFICATION.**

## Starting authority

- Previous pushed HEAD: `f71f8726462d46ce60d1fbb3ba934f4044cb04ea`.
- Decision IDs **P2C-D01, P2C-D02, P2C-D03** approved by user and recorded in CP3. No re-approval is needed.
- Historical 316 publication identities remain immutable. The 318 overlay (Deep-X and Hornet) is unchanged.
- All reviewed ships remain separate from strict full-mount/arc operational certifications.

## Implemented code boundaries

| Responsibility | Implementation / status |
|---|---|
| Single evidence authority | `scripts/domain/vehicles/vehicle-evidence-authority.js` owns the approved CP3 pure policy; the former `tools/audits/vehicles/phase2c-authority-policy.mjs` is a **re-export only**, not a second implementation. |
| Source-safe weapon attack import | `scripts/domain/vehicles/vehicle-evidence-import.js` retains printed negative/zero attack values and treats missing/unparseable numeric bonuses as unresolved. Live `vehicle-weapon-import-normalizer.js` delegates attack parsing to it; missing `attackBonus` and `bonus` are not fabricated as `0`/`'+0'` during imported item creation. |
| Shield rating source semantics | Pure `resolvePrintedShieldEvidence()` returns distinct printed 0, explicit none, source silence, conflict and conditional states. **Not yet wired to legacy VehicleFactory shield math.** |
| Geometry for *approved* firing arcs | Pure `isTargetWithinVehicleArc()` rejects unknown/no arc, missing tokens, bad coordinates, and coincident centers. The legacy `SWSEVehicleWeapons.inFireArc()` delegates, never defaults to forward and no longer returns true on unknown labels. |
| GM adjudication adapter | `vehicle-evidence-runtime-gate.js` obtains the actual `game.user`, instance ID from combat/scene and a Foundry receipt ID. It requires explicit GM confirmation. It persists a GM-whispered ChatMessage containing a scoped noncanonical receipt **before** returning permission for unknown-arc or published-conflict adjudications. Failure of message creation blocks the exception. |

## Explicit non-claims

1. **The new adapter is not inserted into the live `SWSERoll.rollAttack` / vehicle attack-domain router.** Callers must first resolve a trusted canonical source record, weapon-group identity, crew station, target, and source-evidence state. It would be unsafe to treat caller-supplied `sourceComplete:true` as independently proven authority. Thus no claim that every active attack now consults the Phase 2C gate.
2. `SWSEVehicleWeapons` was described in an earlier audit as an unused legacy/prototype module. Hardening its geometry helper prevents unsafe behavior if called, but does not establish active combat-path protection.
3. Live `VehicleFactory` still uses legacy `numberOrZero` and shield fallback behavior. The pure shield-evidence contract is ready, but replacing existing mutable shield math requires separating published SR, installed module max SR, and current shield charge.
4. GM-only ChatMessage receipts are persisted through normal Foundry create-document semantics; they are not a tamper-evident or server-authenticated append-only ledger. A further runtime integration gate needs authoritative record loading, verified permissions and rollback-aware receipt transaction handling.
5. `vehicle-weapon-import-normalizer.js` still has historical damage, range and attack-attribute defaults. These remain an explicit follow-on scope, not silently source-certified.
6. No sourcebook packs, vehicle Actors, schema-frozen release, or Phase 3 mass hydration were modified here. Runtime UI and live Foundry simulation tests were unavailable.

## Test coverage

- The existing CP3 policy suite: **19/19 passing**, via the re-exported single authority implementation.
- New pure implementation tests: **12/12 passing** (attack signed values, unknown preservation, shield evidence, GM role, receipt persistence, missing scene/crew, conflict alternatives, geometrical arc).
- New repo-source wiring guards: **2 tests** inspect the actual importer and legacy geometry delegate for forbidden fallback and required wiring. These should be run in the full repository checkout (not against an invented fixture).
- `node --check` on all new runtime and audit modules passes.

## Remaining release blockers

1. Trace the real attack-domain router, resolve published evidence from compendium SSOT, then gate **before** any attack roll, with real geometry check and no GM UI bypass.
2. Provide a concrete GM adjudication prompt with scoped attack, target, group, chosen alternative, and reason. Have the adapter create and verify receipts.
3. Make the source-vs-modification-vs-current distinction in shields before replacing factory fallbacks.
4. Replace remaining fictional default weapon damage/range/attribute values with provenance-aware, fail-closed import/consumer contracts.
5. Run full node regression suite and Foundry v13 V2 runtime checks before Phase 3 vehicle hydration or schema freeze.