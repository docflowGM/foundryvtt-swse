# B-MIG — migration (world data migrations and maintenance)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/migration.json`. **Facts:** 31 files; of the 7 runtime migration modules, 1 is reachable (`scripts/migration/dark-side-points-migration.js`), 5 are orphans and 1 is string-referenced only (`scripts/migrations/json-backed-ids-migration.js`, mentioned in a comment). Node-side pack/ndjson migrators under `scripts/migration/*` and `scripts/maintenance/*` are tooling (dev-tooling domain) and not runtime authorities.

## 1. Purpose and boundaries

Owns: idempotent, versioned world-data migrations run by a GM at `ready`. Observed live entries: `migrateDarkSidePoints` (`index.js:314`), plus `repairWorldForcePowerAbilityMeta` (force domain, `index.js:309`) and the GM-triggered vehicle errata migration (`registerVehicleErrataMigration`, `index.js:219`, vehicles domain). Migrations must write through ActorEngine (A-02) and must not change rules (CLAUDE.md §3). OSI marks migrations a runtime-risk area.

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-MIG-01 | Dark Side Points field migration (pure compute + ActorEngine apply, version gate) | `scripts/migration/dark-side-points-migration.js` · `computeDarkSidePointsMigration` / `migrateDarkSidePoints` | OBSERVED | test-verified (`tests/dsp-migration-behavior.test.mjs`, `tests/dsp-migration-consolidation.test.mjs`) | `scripts/migration/dark-side-points-migration.js:24`, `:162`, `:202`, `:222` |
| R-MIG-02 | Startup migration orchestration (GM only, sequential, errors logged) | `index.js` ready block | OBSERVED | source-inspected | `index.js:306`, `:309`, `:314` |
| R-MIG-03 | Migration version records | `HouseRuleService.set(SETTING_KEY, MIGRATION_VERSION)` per migration | OBSERVED | source-inspected | `scripts/migration/dark-side-points-migration.js:222` |

## 3. Authorities

No migration registry exists; each migration owns its own version setting. Persistence via ActorEngine (`dark-side-points-migration.js:202`, OBSERVED). Orphan migrations also route through ActorEngine (`armor-system-migration-v4.js:128`).

## 4. Public interfaces

| Symbol | path:line | Importers |
|---|---|---:|
| `migrateDarkSidePoints` | `scripts/migration/dark-side-points-migration.js:161` | 3 |
| `computeDarkSidePointsMigration` | `scripts/migration/dark-side-points-migration.js` | 3 |
| `MIGRATION_VERSION` | `scripts/migration/dark-side-points-migration.js:24` | 3 (name also exported by `json-backed-ids-migration.js`) |

## 5. Dependencies

Allowed: ActorEngine, HouseRuleService/SettingsHelper, infrastructure. No violations observed in the live module.

## 6. Integration points and lifecycle

`ready` → `if (game.user.isGM)` → `WorldDataLoader.autoLoad` → Force power abilityMeta repair → DSP migration (`index.js:306-317`).

## 7. Failure behavior and invariants

Each migration is try/catch-wrapped and logs; the version is written only after the loop (`:222`), so a partial failure re-runs next load (idempotent compute). Gate is `game.user.isGM`, not "active GM": with two GMs connected at once both clients may run the same migration concurrently (F-MIG-002, suspected). A-13: no live run recorded.

## 8. Level C subsystem contracts

None.

## 9. Tests and certification

`tests/dsp-migration-behavior.test.mjs`, `tests/dsp-migration-consolidation.test.mjs`, `tests/dsp-migration-mutation-pipeline.test.mjs` (GOV). FOUNDRY_ACCEPTANCE_REQUIRED: migration on a real legacy world.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-MIG-01 | `docs/migrations/readme.md` "Completed Migrations" | lists scripts `fix-defense-schema.js`, `fix-actor-size.js`, `actor-validation-migration.js`, `item-validation-migration.js`, `populate-force-compendiums.js` "run automatically on world load" | none of these files exists; the only automatic runtime migration is DSP (+ force abilityMeta repair) |
| CR-MIG-02 | `docs/migrations/readme.md:125` | references `scripts/actors/engine/actor-engine.js` | path does not exist (= CR-01) |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-MIG-001 | low | confirmed | 6 unreachable runtime migrations (armor v4, weapon talents/properties, force powers type, phase5 compendium heal, json-backed ids) |
| F-MIG-002 | medium | suspected | Startup migrations gated on `isGM`, not active GM — concurrent runs with multiple GMs |
| F-MIG-003 | low | confirmed | No migration registry; flag-namespace migration (F-ACT-009) has no home |
| F-MIG-004 | info | confirmed | `docs/migrations/readme.md` describes non-existent migrations |

## 12. Unimplemented, deferred, acceptance-required

U-MIG-01: migration registry / ordered runner (PROPOSED). FOUNDRY_ACCEPTANCE_REQUIRED: DSP migration on legacy world; multi-GM startup.
