# B-VEH — Vehicles, starships, crew, Shipyard (domain contract, Level B with embedded Level C)

**Audited commit:** `f734b4d` (census at HEAD `2beb7cb`, which adds only census artefacts). **Domain id:** `vehicles`. **Census size:** 119 runtime modules / 19,968 SLOC (103 static-reachable, 6 dynamic, 6 orphan, 4 test-only). Sidecar: `data/audits/architecture-census/contracts/domains/vehicles.json`.
Level A invariants are referenced by ID (`A-global-invariants.md`). OSI = owner standing instructions (approved, not committed; `A-OPEN-01`). Nothing here is `FOUNDRY_TESTED` (A-13).

## 1. Purpose and boundaries

Owns: the canonical published vehicle catalog (429 source claims) and its 11 Actor packs; the vehicle runtime projection (published vs mutable state); the sealed Shipyard installation ledger (EP, installs, jobs, design projects); vehicle-specific weapon authority (stock groups / certified installs), launcher ammunition ledgers, fire mode, battery, logistics (fuel/consumables), interdiction/mines scene state; crew stations and crew assignment; the vehicle actor sheet's vehicle-specific context.

Must NOT own (OBSERVED adapters, APPROVED by `docs/architecture/combat-authority-map.md:1` "vehicles are adapters, not a second combat system"): the attack pipeline (`scripts/combat/rolls/attacks.js`), damage mitigation/application (`ActorEngine.applyDamage`, `DamageResolutionEngine`), range penalties (`RangeEngine`), grapple state, credit movement (A-10 → TransactionEngine), actor mutation (A-02 → ActorEngine), chat (A-05), Force-point spending (force domain), maneuver activation rules (force domain `StarshipManeuverSuite`).

Census note: `scripts/engine/crew/{ally-assignment-service,follower-slot-service,follower-talent-config}.js` are classified `vehicles` by directory but implement follower slots; they are treated in **B-NPC** (`npc-followers`), not here.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-VEH-01 | Canonical vehicle catalog → 11 Actor packs (generated at release build, never from committed `packs/*.db`) | `tools/build-universal-vehicle-pack-sources.mjs` · `buildUniversalVehiclePackSources`; registry `scripts/domain/vehicles/universal-vehicle-pack-registry.js` · `UNIVERSAL_VEHICLE_PACKS` | OBSERVED · APPROVED (phase4c checkpoint) | behavior-code-verified; test-verified (`tests/vehicle-universal-phase4c-runtime-consumers.test.mjs`, 6/6 pass offline) | `tools/release/build-packs.mjs:68`, `tools/release/build-packs.mjs:80`, `docs/audits/vehicles/universal-vehicle-phase4c-runtime-cutover-checkpoint.md:13` |
| R-VEH-02 | Runtime compendium index/document loading (fail-closed, 429 expected) | `scripts/core/vehicle-pack-data-loader.js` · `VehiclePackDataLoader` | OBSERVED | source-inspected | `scripts/core/vehicle-pack-data-loader.js:4`, `scripts/core/vehicle-pack-data-loader.js:97` |
| R-VEH-03 | Vehicle runtime projection / source classification | `scripts/domain/vehicles/vehicle-runtime-contract.js` · `classifyVehicleActorRuntime`, `getVehicleRuntimeProjection` | OBSERVED | source-inspected | `scripts/domain/vehicles/vehicle-runtime-contract.js:268` |
| R-VEH-04 | Sealed installation ledger (plan, seal, guarded flag writes) | `scripts/domain/vehicles/vehicle-installation-ledger.js` · `planVehicleInstallation`, `authorizeLedgerWrite` | OBSERVED | behavior-code-verified | `scripts/domain/vehicles/vehicle-installation-ledger.js:178`, `scripts/domain/vehicles/vehicle-installation-ledger.js:300` |
| R-VEH-05 | Installation/uninstall/job orchestration and persistence | `scripts/engine/vehicles/vehicle-installation-service.js` · `VehicleInstallationService` (ActorEngine-routed) | OBSERVED | behavior-code-verified | `scripts/engine/vehicles/vehicle-installation-service.js:179` |
| R-VEH-06 | Modification effects catalog (MECHANIC_SPECIFIED rows only) | `scripts/domain/vehicles/vehicle-modification-effects.js` · `EFFECTS` | OBSERVED | source-inspected | `scripts/domain/vehicles/vehicle-modification-effects.js:162` |
| R-VEH-07 | Vehicle weapon damage spec (published group / certified install → formula) feeding the shared damage pipeline | `scripts/domain/vehicles/vehicle-weapon-damage.js` · `resolveVehicleWeaponDamage` | OBSERVED (adapter, not duplicate) | behavior-code-verified | `scripts/domain/vehicles/vehicle-weapon-damage.js:179` |
| R-VEH-08 | Battery attack total (published / assigned / independent crews) | `scripts/domain/vehicles/vehicle-weapon-battery.js` · `resolveBatteryAttackTotal` | OBSERVED (vehicle-specific) | source-inspected | `scripts/domain/vehicles/vehicle-weapon-battery.js:100` |
| R-VEH-09 | Launcher ammunition ledger and purchases | `vehicle-ammunition-service.js`, `vehicle-ammunition-purchase-service.js` | OBSERVED · CONFLICT (Party Fund debit, see F-VEH-006) | behavior-code-verified | `scripts/engine/vehicles/vehicle-ammunition-purchase-service.js:257` |
| R-VEH-10 | Logistics (fuel/supplies) — personal credits via TransactionEngine | `scripts/engine/vehicles/vehicle-logistics-service.js` | OBSERVED | behavior-code-verified | `scripts/engine/vehicles/vehicle-logistics-service.js:134` |
| R-VEH-11 | Scene state (mines, interdiction fields) — only Scene writer | `scripts/engine/vehicles/vehicle-scene-state.js` | OBSERVED (A-02 world-document exception) | source-inspected | `scripts/engine/vehicles/vehicle-scene-state.js:23` |
| R-VEH-12 | Crew stations, crew assignment | `scripts/engine/crew/vehicle-crew-assignment-service.js` · `VehicleCrewAssignmentService` | OBSERVED · CONFLICT (A-07, F-VEH-004) | behavior-code-verified | `scripts/engine/crew/vehicle-crew-assignment-service.js:456` |
| R-VEH-13 | Prepared starship maneuver list on vehicle sheet; mark spent | `scripts/engine/StarshipManeuversEngine.js` · `StarshipManeuversEngine` | OBSERVED · CONFLICT (second spend path, F-VEH-003) | behavior-code-verified | `scripts/engine/StarshipManeuversEngine.js:143` |
| R-VEH-14 | Starship Tactics maneuver grant on feat creation | `scripts/infrastructure/hooks/starship-maneuver-hooks.js` → `scripts/utils/starship-maneuver-manager.js` | OBSERVED · CONFLICT (A-15, F-VEH-002) | behavior-code-verified | `scripts/infrastructure/hooks/starship-maneuver-hooks.js:17` |
| R-VEH-15 | Vehicle actor sheet (vehicle-only context and wiring) | `scripts/sheets/v2/vehicle-actor-sheet.js` · `SWSEV2VehicleSheet` (see B-UIS for shell) | OBSERVED | dependency-traced | `scripts/sheets/v2/vehicle-actor-sheet.js:281` |
| R-VEH-16 | Vehicle import from canonical source Actor (replace statblock) | `scripts/engine/import/vehicle-import-engine.js` · `VehicleImportEngine` | OBSERVED · UNIMPLEMENTED (no UI entry; F-VEH-001) | dependency-traced | `scripts/engine/import/vehicle-import-engine.js:90` |

## 3. Authorities

- **Canonical data:** `data/canonical/vehicles/vehicles.json` (429 NDJSON claims) — OBSERVED/APPROVED (phase4c checkpoint). `data/canonical/vehicles/ships.json` (316) is the retired `vehicles-canonical-ships` source — OBSERVED legacy (F-VEH-007).
- **Rules:** vehicle rules are certified per row in `docs/audits/swse-rules-decisions-pending.md` (`V-P2-*`…`V-P6C-21`); open rows stay `DEFERRED_RULES_REVIEW`. This audit adjudicates none.
- **Calculation:** vehicle-specific resolvers in `scripts/domain/vehicles/**` (pure). Shared mechanics delegated per combat-authority-map — OBSERVED (see §10 agreements).
- **Mutation/persistence:** ActorEngine for actor/owned items; guarded ledger flags pre-authorised by `authorizeLedgerWrite`; Scene flags via `vehicle-scene-state.js`; world settings for the CP23-C4 GM observation ledger (`scripts/domain/vehicles/vehicle-cp23c4-gm-observation-ledger.js:168`) — OBSERVED.
- **Credits:** TransactionEngine for personal credits (OBSERVED); Party Fund via `PartyFundAccess` (OBSERVED · CONFLICT with A-10 vs owner workflow `V-P6C-19`).

## 4. Public interfaces (registry consumer counts)

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `readCertifiedInstallations` & ledger API | `scripts/domain/vehicles/vehicle-installation-ledger.js:101` | 41 (module) | pure read of sealed ledger |
| `resolveVehicleWeaponDamage` | `scripts/domain/vehicles/vehicle-weapon-damage.js:179` | 41 (module) | spec → `{ok, formula, multiplier, damageType}` or refusal |
| `EFFECTS` / `hasEffect` | `scripts/domain/vehicles/vehicle-modification-effects.js:162` | 28 | implemented effects only |
| `VehicleInstallationService` | `scripts/engine/vehicles/vehicle-installation-service.js:37` | 26 | install/uninstall/jobs; serialised per vehicle |
| `classifyVehicleActorRuntime` | `scripts/domain/vehicles/vehicle-runtime-contract.js:268` | 25 (module) | read-only selector |
| `UNIVERSAL_VEHICLE_PACKS` | `scripts/domain/vehicles/universal-vehicle-pack-registry.js:18` | 15 | 11 packs, 31 categories |
| `VehicleAmmunitionService` | `scripts/engine/vehicles/vehicle-ammunition-service.js:37` | 16 | spend/refund idempotent per attack id |
| `StarshipManeuversEngine` | `scripts/engine/StarshipManeuversEngine.js:115` | 1 (vehicle sheet) | list / mark spent / regain |
| `SWSE.debug.vehicles.{audit,openSampleSheet,scratchImport}` | `index.js:117` | global (macro) | GM-only debug |

## 5. Dependencies

- **Allowed (PROPOSED, consistent with A-P1):** infrastructure, data-registries, actor-core (ActorEngine), combat (shared pipeline), rolls, store-economy (TransactionEngine), houserules (HouseRuleService), force (maneuver suite).
- **Prohibited:** engine → UI (A-07); vehicle-owned credit ledgers (A-10); vehicle-specific damage application.
- **Observed violations:** `scripts/engine/crew/vehicle-crew-assignment-service.js:2` → `apps/dialogs/swse-dialog-v2.js` (real UI prompt at :456); `scripts/engine/crew/ally-assignment-service.js:793` → `apps/follower-creator.js` (dynamic; see B-NPC); `scripts/engine/crew/vehicle-crew-assignment-service.js:4` → `sheets/v2/vehicle-sheet/crew-resolver.js`, `scripts/engine/crew/vehicle-weapon-station-service.js:11` → `sheets/v2/vehicle-sheet/weapon-station-mapping.js`, `scripts/engine/vehicles/vehicle-interdiction-service.js:14` → `dialogs/entity-dialog/effect-intent-engine.js` (these three targets are pure, DOM-free modules mis-located under UI directories — layering, not behavior). Static cycle `vehicle-installation-ledger.js ↔ vehicle-modification-effects.js ↔ vehicle-runtime-contract.js` (F-VEH-005).

## 6. Integration points and lifecycle

- `index.js:25-26`, `index.js:117-120`: debug globals. `index.js` registers vehicle pre-create guards and errata migration (combat-authority-map:38).
- Hooks: `scripts/core/vehicle-pack-data-loader.js:104` (`ready` → cache clear); `scripts/engine/vehicles/vehicle-errata-migration-service.js:183` (`ready`); `scripts/infrastructure/hooks/starship-maneuver-hooks.js:17` (`createItem`), `:45` (`preUpdateActor`), `:56` (`updateActor`), registered from `scripts/infrastructure/hooks/actor-hooks.js:174`.
- Release: `tools/release/build-packs.mjs` (all 11 vehicle packs from canonical source); CI `.github/workflows/vehicle-universal-phase1.yml:86` probes `--only vehicles-hybrids`.

## 7. Failure behavior and domain invariants

- Fail-closed source identity (`VehiclePackDataLoader`, import engine refuses unmarked documents) — OBSERVED.
- Installation writes are pre-authorised then verified (`isLedgerUpdateAllowed`) — OBSERVED; A-02 satisfied (ActorEngine).
- Party Fund settlement: claim → debit → deliver → compensating restore; unprovable restore → `indeterminate` (no GM tool, P6B-D-074) — OBSERVED; A-10 CONFLICT (F-VEH-006).
- Domain invariants: VEH-I1 no published statistic synthesized from fallbacks (APPROVED phase4c); VEH-I2 vehicle weapons fire only through `attacks.js` (APPROVED combat-authority-map:35); VEH-I3 one spend path per maneuver (PROPOSED — currently violated, F-VEH-003).

## 8. Level C subsystem contracts

- **C-VEH-1 Shipyard ledger** — boundary: `vehicle-installation-ledger.js` (pure plan/seal) ↔ `VehicleInstallationService` (persistence). Interface: `planVehicleInstallation / planVehicleUninstall / authorizeLedgerWrite / readCertifiedInstallations`. OBSERVED; the three-file cycle (F-VEH-005) is internal to this boundary.
- **C-VEH-2 Canonical catalog → packs → runtime** — `data/canonical/vehicles/vehicles.json` → `buildUniversalVehiclePackSources` → LevelDB packs → `VehiclePackDataLoader` → `VehicleImportEngine`. OBSERVED; import UI missing (U-VEH-01).
- **C-VEH-3 Combat adapter** — vehicle resolvers return specs/totals; shared pipeline rolls and applies. OBSERVED (agreement with combat-authority-map).

## 9. Tests and certification

148 `tests/*vehicle*|*crew*|*starship*|*maneuver*` files. Run offline in this audit: `tests/architecture-combat-authority.test.mjs` 14/14 pass; `tests/vehicle-universal-phase4c-runtime-consumers.test.mjs` 6/6 pass. No test exercises `StarshipManeuversEngine` (ciTests 0), `starship-maneuver-hooks.js` (0), `vehicle-crew-assignment-service.js` (0) or `vehicle-actor-sheet.js` (0) directly. Foundry acceptance: none (`docs/audits/vehicles/universal-vehicle-phase4d-native-runtime-acceptance.md` lists live checks; not executed here) — FOUNDRY_ACCEPTANCE_REQUIRED.

## 10. Reconciliation with existing contracts

Agreements: combat-authority-map rows for attacks, damage, range, ammo, fire mode, grapple — confirmed by reading `scripts/domain/vehicles/vehicle-weapon-damage.js:179` (spec only, no application) and `scripts/domain/vehicles/vehicle-weapon-battery.js:100` (totals only). Retired duplicates `vehicle-weapons.js` / `swse-vehicle-core.js` are absent at HEAD.

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-VEH-01 | `docs/audits/vehicles/universal-vehicle-phase4c-runtime-cutover-checkpoint.md:21` | `VehicleImportWizard` is the browse/import wizard | Wizard has zero importers; the sheet's `import-vehicle` button is force-disabled with comment "no implementation exists anywhere" (`scripts/sheets/v2/vehicle-actor-sheet.js:700-707`), contradicting both the wizard's existence and the doc |
| CR-VEH-02 | global `CR-12` (`contradiction-register.md`) | ground-armor/hybrids have no tracked source | Clarification: all 11 declared vehicle packs (not just two) are generated from `data/canonical/vehicles/vehicles.json` by `tools/release/build-packs.mjs:71`, `tools/release/build-packs.mjs:80`; committed `packs/vehicles-*.db` are retired historical input for every vehicle pack; preview NeDB copies are tracked under `build/vehicle-phase4b/sources/` |
| CR-VEH-03 | `docs/audits/vehicles/canonical-compendium.md:22` | `system.json` registers `vehicles-canonical-ships` | Not declared; test pins its absence (`tests/vehicle-universal-phase4c-runtime-consumers.test.mjs:12`) |
| CR-VEH-04 | OSI A-10 vs `V-P6C-19` (`docs/audits/swse-rules-decisions-pending.md:2099`) | TransactionEngine single credit authority vs owner-approved Party Fund workflow | Party Fund debit bypasses TransactionEngine (`scripts/engine/vehicles/vehicle-ammunition-purchase-service.js:257`) |
| CR-VEH-05 | `scripts/sheets/v2/vehicle-actor-sheet.js:44` comment | helpers "duplicated verbatim from character-sheet.js" | Source is now `character-like-sheet.js` (stale reference) |

## 11. Phase 2 conformance summary (detail in sidecar)

| ID | Sev | Title |
|---|---|---|
| F-VEH-001 | high | Vehicle import wizard + engine exist but are unwired; sheet button disabled claiming no implementation |
| F-VEH-002 | high | `createItem` hook grants Starship Tactics maneuvers outside the progression shell (dialog + grant), guard key never set |
| F-VEH-003 | medium | Two spend paths for starship maneuvers (vehicle sheet marks spent without activation check) |
| F-VEH-004 | medium | Engine → UI: crew assignment service opens a dialog; three pure modules live under UI dirs |
| F-VEH-005 | low | 3-file static import cycle in Shipyard ledger; one pure function seam breaks it |
| F-VEH-006 | medium | Party Fund debit outside TransactionEngine (owner-approved workflow vs A-10) + whisper via raw ChatMessage |
| F-VEH-007 | low | Undeclared tracked vehicle pack artefacts + stale `canonical-ship-pack.yml` workflow |
| F-VEH-008 | low | Orphan vehicle modules (legacy normalizers, modification factory, category registry, crew interaction engine) |
| F-VEH-009 | low | Deprecated `VehicleInstallationService.install` wrapper with no callers |
| F-VEH-010 | medium | Ability-modifier fallback recomputed from raw `wis.base` in maneuver manager |
| F-VEH-011 | low | Verbatim clones of sheet helpers (shared with B-UIS F-UIS-002) |
| F-VEH-012 | info | Probe hits classified as legitimate/false positive (scratch import, A-10 text hits, scene writes) |

## 12. Unimplemented, deferred and acceptance-required

- U-VEH-01 Vehicle import UI entry (wizard unwired) — UNIMPLEMENTED; owner decision whether to wire or retire.
- U-VEH-02 GM tool to resolve `indeterminate` Party Fund requests (P6B-D-074) — UNIMPLEMENTED.
- DEFERRED_RULES_REVIEW: `V-P6C-21` (stock launcher payload pool), `V-P5-03` (non-starship vehicles), `V-P5-04` (crew-quality derived stats), `EQ-004`, `CF-RD-006`; this audit adds no new rules question. Whether a manual "mark maneuver spent" without the activation check is permitted is an owner/rules question for F-VEH-003 (not decided here).
- FOUNDRY_ACCEPTANCE_REQUIRED: vehicle import/materialization; Party Fund settlement; maneuver grant on Starship Tactics during chargen finalization (double prompt/grant suspected); crew assignment drop stack.
