# Universal Vehicles — Phase 4E consumer-convergence execution plan

**Status:** PLANNED / NOT IMPLEMENTED (this file is a directive, not a certification).

**Repository:** `docflowGM/foundryvtt-swse`; branch `audit/universal-vehicles-phase1`; planning baseline `e6da5720f6a1feb2f85d46b82de699fcf6d30ac1` (2026-10-29).

**Owner's order:** Character/V2 vehicle sheet → Shipyard → Store → Engines (combat etc.). **One necessary prerequisite:** protect canonical Actor creation and freeze the runtime source contract *before* all four consumers. Do not reopen Phases 0–3 source audits or create legacy-world migration/compatibility paths; there are no existing players or vehicles to preserve.

## Verified baseline and caveat

- Native 11-pack / 429-Actor LevelDB compiler and exact readback **passed** on PR #1092, workflow 40921945675, head `e6da5720...`. Vehicles-specific provenance/Node tests passed.
- Broader Rolling System Validation, run 40921945695, **failed**: 417 passed and 8 failed out of 425 executed (5 pre-existing excluded). Failed files: `phase-5c-canonical-production-negative`, `phase2c-vehicle-source-integrity-guards`, `phase2c_cp23_pack_reconciliation`, `phase2c_cp9c_actor_provenance_probe`, `phase6-vehicle-crew-assignment`, `talent-membership-and-pack-completion`, `vehicle-crew-assignment-guard-check`, and `vehicle-universal-phase1a`. **Triage each, distinguish outdated assumptions from actual runtime bugs; do not rubber-stamp tests.** Several failures concern old pack boundaries or static guard checks; not all are proven vehicle consumer regressions.
- A live Foundry V13 world, V2 sheet and real ActorEngine write/readback have **not** been verified. Run `SWSE.debug.vehicles.audit()`, sample sheets and the explicit scratch-world import command described in `universal-vehicle-phase4d-native-runtime-acceptance.md` at the earliest available test-world window.
- `data/canonical/vehicles/vehicles.json` is the source-only publication SSOT; unique `sourceEntryKey` is identity. `flags.swse.universalVehicleSource.source` is the original published claim. The initial Actor has no certified physical mounts and `system.weapons=[]`. Printed firing groups are reference-only until separate mounting provenance is certified.
- No duplicate vehicle Actor packs, old 316-ship source fallback, fabricated unknown/zero equivalence, or unverified weapons becoming executable.

## P0 — Canonical Actor lifecycle and consumer contract (must precede each lane)

### Confirmed blockers

1. `scripts/actors/vehicle/vehicle-precreate-hooks.js` calls **legacy** `normalizeVehicleImportData(document.system)` on *every* vehicle `preCreateActor`, even canonical records; its bypass checks `system.stockSourceEntryKey`, but new Actors use `system.vehicleSourceEntryKey`. Its `createActor` hook calls `normalizeVehicleWeaponImportData(...createItems:true)` and can create embedded weapon Items. The import wizard bypass alone therefore does **not** protect Store/Shipyard/other actor creation.
2. `scripts/actors/v2/vehicle-derived-builder.js` still has generic fallback defense/threshold values; `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js` and `vehicle-actor-sheet.js` synthesize labels/capacity. These must be presented separately from printed facts. The Foundry typed model must be measured (not inferred) in the smoke test.
3. Different consumers use divergent fields: `system.hp` vs `system.hull`, numeric `system.cost` vs `system.cost.new` object, `system.vehicleSourcePrimaryCategory` vs `system.type`/`category`, source movement modes vs `speed`, source firing groups vs installed `weapons`.

### Implementation

- Create one **pure, read-only** canonical vehicle *runtime projection/selector* for consumers (source identity, category, published-vs-current, field state: known/explicit-zero/unknown/conditional/conflicting, movement modes, cost status, crew complement, installed modification overlay). Read from the full source flags plus mutable Actor runtime state; do **not** create a second published SSOT.
- Gate canonical `preCreateActor` before legacy normalization, name-based category remapping, and stock-weapon hydration. For canonical Actor creation: validate source flags, preserve numeric Initiative/HP/defenses, preserve publication identity, keep stock mounts untrusted; do not create embedded weapon Items from firing groups. Define a separate **explicitly authorized custom-installation path** for future mounted weapon Items.
- Define exactly one runtime distinction among **printed stock capabilities**, **installed/certified components**, and **current play state**. Initial release has a readable source firing-group display but zero executable stock mounts.
- Preserve publication `sourceEntryKey` when a new world Actor gets its own unique world `_id`. All creation paths, including Store and Shipyard, must use this lifecycle gate.
- Add direct hook tests for both canonical and unsupported/legacy input, source-only no-auto-weapon assertion, initiative/unknown-SR readback, duplicate source identity behavior, and all 11 category owners. No automatic migration tool.
- Require one end-to-end V13 scratch-world Actor to pass before advancing the first consumer lane.

**Acceptance P0:** Every path that creates a canonical vehicle preserves its original facts and cannot auto-install source attack rows; the typed Actor readback agrees with source evidence. No unsupported "success" after failed normalization.

## P1 — Character Sheet / V2 Vehicle Sheet first

**Primary files:** `scripts/sheets/v2/vehicle-actor-sheet.js`, `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js`, `scripts/actors/v2/vehicle-derived-builder.js`, `scripts/actors/v2/vehicle-actor.js`, `scripts/sheets/v2/vehicle-sheet/crew-resolver.js`, `templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs`; also `scripts/ui/shell/AssetBaySurfaceService.js` for owning character's vehicle link and `scripts/apps/vehicle-import-wizard.js`.

**Concrete mismatches to remove:**
- Sheet `buildVehicleEditContext` reads **`system.hull ?? system.hp`**, while combat writes `system.hp`: displayed hull can become stale when damaged. Show live HP from `hp`, not a stale mirror.
- `SWSEV2VehicleSheet` defaults missing `cargo.capacity` to **500**, and the crew panel defaults complement to **6**; neither is published evidence. Do not treat fallback numbers as sourced stats.
- Shield presentation must differentiate published SR 0, unknown/unavailable, actual damaged current SR and conditional capability; avoid auto-showing "shields supported" for every starship merely due to type.
- Header/abilities/type flags still infer from free-text names, size or `system.type`. Prefer the canonical category and movement-domain classification. Display all known modes for hybrids/vehicle-droids without duplicating Actors.
- Show canonical source book/page, printed speed/abilities/defenses/crew/cargo/cost, and a *non-executable* printed attack-group reference panel distinct from certified installed mounts and the Fire action list.
- Resolve owning character's Asset Bay → vehicle actor sheet and import action without assuming the old pack id; preserve call-sign vs printed model identity.

**Acceptance P1:** Representative cross-book Vultures, X-wing, stock transport, capital ship, walker/tank, station and a multimode droid/hybrid open with faithful source badges and V2 sheets; damage updates HP; source-unknown fields read "Unknown" instead of arbitrary zeros; zero trust/executable mounted stock weapons. Automated panel/derived tests plus real Foundry sheet screenshots/QA.

## P2 — Shipyard (consumer of P1 source projection, not a second ship catalog)

**Primary files:** `scripts/apps/vehicle-modification-manager.js`, `scripts/engine/vehicles/vehicle-factory.js`, `scripts/engine/customization/vehicle-customization-engine.js`, `scripts/domain/vehicles/vehicle-system-definitions.js`, `scripts/domain/vehicles/vehicle-modification-factory.js`, `scripts/apps/customization/customization-bay-app.js`, `scripts/applications/vehicle/vehicle-customization-router.js`, `scripts/ui/shell/CustomizationSurfaceAdapter.js`, `scripts/engine/store/transaction-engine.js`.

**Concrete mismatches:**
- `VehicleModificationManager.init()` fetches `data/stock-ships.json` by **name**, independently of the 429 source keys. This cannot be the authoritative stock selector; preserve any useful modification-definition data separately.
- `VehicleFactory._buildStockShipActorData()` recalculates Reflex/Fortitude from armor/Strength, inserts `hp=1` and `SR=0` fallbacks, and `_buildVehicleActorData()` adds `hull=50`, `SR=0`, `speed=12`, `domain='starship'` fallbacks. Those formulas must **never overwrite** canonical published base stats.
- `VehicleFactory.buildExistingModificationMutationPlan()` derives base shields through `??0`, rewrites `system.reflexDefense` as `10+armor`, uses a distinct `cost.new/used` object schema, and derives `system.weapons` rows with forward/+0 defaults. This is not acceptable for source-only stock weapons.
- `VehicleCustomizationEngine.getNormalizedVehicleProfile()` takes `system.type || 'transport'`, `system.speed?.base ?? 0`, and `system.defense?.armor ??0` rather than publication category/modes. Compatibility/pricing needs a certified stock baseline, with a separate installed-modification delta.
- Many published vehicles have no certified available emplacement points or build cost. **Unknown availability is not unlimited and is not free.** Block unsupported modifications with an explicit reason rather than guessing EP/cost.

**Implementation:** use 429 canonical source identities as frame selectors; keep named `data/stock-ships.json` as legacy/reference-only (or deprecate after coverage). Separate **published base Actor** + **installed modification ledger** + **derived current totals**. Allow only known/validated system eligibility; stage a modification before committing through existing TransactionEngine/ActorEngine governance. For weapons, treat installing a known system as a separate certifiable Item/mount transaction, never a promotion of printed firing groups. Preserve owner-wallet separation in existing Customization Bay.

**Acceptance P2:** Open canonical X-wing and a non-starship vehicle, stage compatible/incompatible changes, reject absent EP/cost data, validate shield/armor/HP invariants, commit/rollback a controlled legal modification, and leave original printed source claim unchanged. No unapproved Attack button.

## P3 — Store (catalog, price policy, atomic purchase)

**Primary files:** `scripts/engine/store/store-constants.js`, `scripts/engine/store/loader.js`, `scripts/apps/store/store-shared.js`, `scripts/apps/store/store-main.js`, `scripts/apps/store/store-checkout.js`, `scripts/engine/store/store-engine.js`, `scripts/engine/store/transaction-engine.js`, `scripts/engine/store/acquisition-service.js`, `scripts/engine/store/placement-router.js`, `scripts/engine/vehicles/vehicle-factory.js`.

**Concrete mismatches:**
- `store-checkout.js` still has a hardcoded fallback `game.packs.get('foundryvtt-swse.vehicles')`, a retired pack.
- `getVehicleConditionCost()` searches store overlay fields but does not directly classify printed availability/price states. Canonical book records: **271 priced, 142 not-for-sale, 9 ambiguous, 7 absent** (source-stage counts); do not invent a sale price, an automatic used price, or a purchasable flag for the other 158.
- The store loader can mix world Actors with pack Actors and return missing packs as empty. Shopping should use a validated **429-source catalog view**, not treat owned world vehicle Actors as shop stock. If a required canonical pack is missing, show a blocking catalog error rather than a partial sale list.
- Store checkout calls `VehicleFactory.buildMutationPlan({template})`; the factory may synthesize SR/speed/hull/defenses and carry unverified legacy embedded items. Fix the factory and P0 hook first.
- Cache `STORE_RULES.CACHE_KEY`/metadata must be invalidated when switching store authority so old vehicle rows cannot reappear.

**Implementation:** show all 429 in *browse/reference* mode, but enable checkout only for explicitly priced/available vehicles or an explicit GM-approved price override. Display printed vs GM price separately; do not silently equate `not-for-sale` with "free". Use the new pack key and `sourceEntryKey` on cart lines; resolve the document at checkout, revalidate price + availability and funds; create a fresh canonical world Actor with new world id through governed transaction, attach ownership, ensure no auto-installed weapons, and refund/rollback if creation fails. Keep nonvehicle store behavior unchanged.

**Acceptance P3:** All 429 searchable without duplicates; purchase controls correctly distinguish priced/unavailable/unknown; transaction buys a priced vehicle, records provenance, deducts credits exactly once and links the owned asset; rejection/rollback for price drift, no price, missing pack or failed Actor creation. No legacy pack lookup.

## P4 — Engines after data and creation flows are stable

Work in **safety-first sub-order**, not one all-at-once Combat refactor:

1. **Derived/state and damage:** `scripts/actors/v2/vehicle-derived-builder.js`, `scripts/actors/derived/derived-calculator.js`, `scripts/engine/combat/threshold-engine.js`, `scripts/utils/schema-adapters.js`; verify HP damage, DT/DR, shields, source-known vs unknown defense totals. Avoid published-stat overwrite by generic character-derived math.
2. **Movement/scale and initiative:** `scripts/utils/movement-normalizer.js`, V2 movement panels, starship/character scale handling, dual-mode hybrid rules; preserve numeric Initiative and avoid arbitrary speed defaults.
3. **Crew/stations:** `scripts/engine/crew/vehicle-crew-assignment-service.js`, `scripts/sheets/v2/vehicle-sheet/crew-resolver.js`, `crew-skill-router.js`, `scripts/engine/crew/vehicle-weapon-station-service.js`; printed *crew complement* is not the count of assigned player operators or six default slots; distinguish physical crewing, abstract crew quality, custom/gunner-N stations.
4. **Weapons/mounts then attacks:** `scripts/engine/combat/attack-domain-router.js`, `vehicle-attack-math.js`, `scripts/combat/rolls/attacks.js`, `crew-skill-router.js`, weapon-station services and source attack-group certification. Each installed weapon must have an evidenced Item/mount, arc, role/station, and rules authority before Fire is enabled. Direct generic attack execution must reject source-only firing-group references; keep existing character attack math separate.
5. **Operational systems:** shields/power/subsystems, recharge, pilot maneuvers, StarshipManeuversEngine, damage/conditions, modifications, specials. Add progressively behind capability/eligibility checks and real data; do not fabricate absent equipment.

**Acceptance P4:** Physical mounting state independently audited; no automatic conversion of 429 source attack-group entries into executable Items; a known legal crew/mount attack routes into existing authority and applies damage/CT exactly once; unknown mounts or missing operators fail closed. Vehicle-specific combat suite plus rolling suite green.

## Process / shipping gates

Use small sequential commits/PR checkpoints: **P0 lifecycle → P1 sheet → P2 Shipyard → P3 Store → P4 engines**. Verify each with targeted unit + integration tests and real Foundry V13 smoke, not source-text regex alone. Keep original canonical 429 data immutable unless a new signed provenance correction is explicitly authorized; generated packs are rebuilt deterministically. Do not create a user-world migration track or obsolete dual-catalog compatibility.

**First implementation directive:** fix `vehicle-precreate-hooks.js` canonical source bypass and stock Item creation guard. Test against native pack clone → world Actor and GM import, numeric Initiative / shield unknowns / zero installed mounts. After that, implement the shared pure consumer projection and the P1 V2 vehicle-sheet baseline.

**CI blocker policy:** Classify the eight known rolling failures. Fix code or update obsolete legacy test semantics only with proof, recording unrelated talent/Phase 5C failures separately. Do not certify all-system CI green based only on successful vehicle-native CI.

**Done =** native 11/429 verified, V13 world creation and V2 sheet working, Shipyard modifications preserve published baseline, Store acquisition works transactionally, and combat activates only certified installed mounts. Release/main merge requires a separate reconciliation (audit branch diverged from main).
