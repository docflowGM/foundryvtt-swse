# B-EQP — Weapons, armor, equipment, inventory, encumbrance (domain contract + Phase 2 conformance)

**Contract level:** B. **Audited commit:** `f734b4d` (scripts unchanged at HEAD `2beb7cb`). **Sidecar:** `data/audits/architecture-census/contracts/domains/equipment.json`. **Census:** 91 runtime modules / 15.5k SLOC; 85 reachable; 3 orphan, 3 test-only; 47 tests.
**Evidence:** static reading; `tests/equipment-e4c1-wp4-writer-convergence.test.mjs` and `tests/equipment-e4c1-wp3a-coordinator.test.mjs` pass offline. No `FOUNDRY_TESTED` claim.

## 1. Purpose and boundaries

Owns: item data interpretation for weapons/armor/gear (weapon runtime, armor resolver, branch resolver), equipment posture/occupancy and its coordinator, inventory operations, ammunition, encumbrance, item sheet. Does **not** own: attack/damage math (CMB), upgrades/templates/customization (CUS), purchase/credits (STO), actor persistence (ActorEngine).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-EQP-01 | Weapon posture/occupancy (single writer) | `equipment-state-coordinator.js` via `InventoryEngine.requestWeaponPosture` | APPROVED (E4-P1/P2, OA-12/13) · OBSERVED | test-verified (`equipment-e4c1-wp4-writer-convergence`) | `scripts/engine/equipment/equipment-state-coordinator.js:38`, `:45`; `scripts/engine/inventory/InventoryEngine.js:99`, `:246`; `scripts/actors/base/swse-actor-base.js:170` |
| R-EQP-02 | Worn-state (armor/shield) toggle | `InventoryEngine.toggleEquip` → `ActorEngine.updateOwnedItems` | OBSERVED | source-inspected | `scripts/engine/inventory/InventoryEngine.js:94`, `:138` |
| R-EQP-03 | Weapon runtime profile (identity, proficiency, range, damage profile, special mechanics) | `scripts/items/weapon-runtime/**` (`index.js`, 71 consumers) | OBSERVED · CONFLICT (A-07 cycle, F-EQP-002) | dependency-traced | `scripts/items/weapon-runtime/attack-consumer.js:10`, `:19`; `scripts/items/weapon-runtime/talent-identity.js:8` |
| R-EQP-04 | Armor data SSOT | `armor-data-resolver.js` | OBSERVED | source-inspected | `scripts/items/armor-data-resolver.js:1` |
| R-EQP-05 | Encumbrance | `EncumbranceEngine.calculateEncumbrance` | OBSERVED (single live authority; actor-core mirrors, ModifierEngine reads) | behavior-code-verified | `scripts/engine/encumbrance/EncumbranceEngine.js:35`; `scripts/actors/v2/character-actor.js:968`; `scripts/engine/effects/modifiers/ModifierEngine.js:1174` |
| R-EQP-06 | Ammunition | `AmmoSystem` (ActorEngine for owned; documented world-item fallback) | OBSERVED | source-inspected | `scripts/engine/inventory/ammo-system.js:212`, `:277`, `:434` |
| R-EQP-07 | Item sheet presentation | `SWSEItemSheet` | OBSERVED · CONFLICT (A-02/A-04, A-09) | source-inspected | `scripts/items/swse-item-sheet.js:1135`, `:2133`; `scripts/apps/talent-tree-workbench/custom-talent-effect-wizard-integration.js:199` |

## 3. Authorities

Canonical data: Item `system.*` (posture `system.weaponPosture`, `system.weaponOccupancy` per E4-P1). Calculation: weapon-runtime resolvers, EncumbranceEngine, armor resolver. Mutation: ActorEngine owned-item helpers; equipment coordinator is the only weapon-posture writer (OBSERVED; legacy writers A9/A10 removed, A8 now refuses weapons).

## 4. Public interfaces

| Symbol | Path:line | Consumers | Contract |
|---|---|---|---|
| weapon-runtime barrel | `scripts/items/weapon-runtime/index.js:1` | 71 | runtime profile API |
| `resolveWeaponBranch` family | `scripts/items/weapon-branch-resolver.js:1` | 36 | melee/ranged classification |
| combat readiness | `scripts/engine/equipment/combat-readiness.js:1` | 35 | readiness predicate (OA-12) |
| `AmmoSystem` | `scripts/engine/inventory/ammo-system.js:1` | 33 | ammo spend/reload |
| `InventoryEngine` | `scripts/engine/inventory/InventoryEngine.js:88` | 23 | equip toggle, posture request |
| `EncumbranceEngine` | `scripts/engine/encumbrance/EncumbranceEngine.js:35` | 10 | load state |

## 5. Dependencies

Allowed: ActorEngine, data registries, species anatomy (E2). Observed: `attack-consumer.js:20` imports an engine/combat module (items → engine; acceptable direction but couples runtime to a class feature). Cycle: F-EQP-002.

## 6. Integration points and lifecycle

Item sheet registered `index.js:199`; prototype-patched by the custom-talent effect wizard (`custom-talent-effect-wizard-integration.js:199`, A-09). Encumbrance computed during actor prepare and again by ModifierEngine (F-EQP-006).

## 7. Failure behavior and invariants

A-02, A-04, A-09, A-16. Coordinator: GM-local execution, durable journal, field-scoped compensation (`docs/architecture/equipment-ecosystem-e4c0-ssot-persistence-contract.md` E4-P2 amendment). Cross-client player route gated (E4-P4).

## 8. Level C subsystem contracts

- **C-EQP-1 Coordinator ⇄ writers.** Only the coordinator writes `OWNED_PATHS`; `IGNITE_PATHS` only within `ready-ignite`. Status: APPROVED (E4-P2) · OBSERVED for posture; activation has a second writer (F-EQP-005, suspected).

## 9. Tests and certification

`tests/equipment-e4c1-wp4-writer-convergence.test.mjs`, `tests/equipment-e4c1-wp3a-coordinator.test.mjs`, `tests/equipment-e3a4-posture-foundation.test.mjs`, `tests/equipment-g18-request-identity.test.mjs`, `tests/equipment-g36-reconciliation.test.mjs`. Foundry acceptance: required for posture/ignite/ammo (E4-P5 final gate).

## 10. Reconciliation with existing contracts

Agreements: E4-P1/P2 (single coordinator, occupancy with posture) and OA-11/12 — observed. E4-P4 WP3 gated — the player route/transport/lease modules are test-only, consistent.
- **CR-EQP-01** `docs/architecture/equipment-ecosystem-e3a4-clean-break-posture-contract.md:70` lists `inventory-handlers.js (removed)` (A9) and `weapon-config-dialog.js (removed)` (A10) as live legacy writers; both files no longer exist, and A8 (`setItemEquipped`) now refuses weapons (`swse-actor-base.js:172`). OA-13 is effectively satisfied for these; the inventory is stale.
- **CR-EQP-02** `swse-item-sheet.js` header (`:7`) claims no mutation outside ActorEngine-owned APIs; ActiveEffects on items and effect-wizard draft flags are written directly (F-EQP-001).

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-EQP-001 | medium | confirmed | Item sheet writes ActiveEffects and wizard-draft flags directly on (possibly owned) items; other 9 sites are documented world-item / token exceptions |
| F-EQP-002 | low | confirmed | weapon-runtime 5-file static cycle via `canonicalFeatSlug` re-export |
| F-EQP-003 | low | confirmed | Orphan modules: `custom-item-dialog.js` (852 SLOC), `inventory-ui.js`, `item-filters.js` |
| F-EQP-004 | low | confirmed | `GearTemplatesEngine` write methods have no caller; engine lives under `scripts/apps/` |
| F-EQP-005 | low | suspected | Lightsaber activation written outside the coordinator (`activateItem` / item sheet) while coordinator owns `IGNITE_PATHS` for ready-ignite |
| F-EQP-006 | low | suspected | Encumbrance computed twice per prepare (actor mirror + ModifierEngine) |
| F-EQP-007 | medium | confirmed | `swse-item-sheet.js` 2.8k lines mixing effect wizard, lightsaber/shield activation, token lighting and form handling; prototype-patched by talent workbench (A-09) |
| F-EQP-008 | low | confirmed | Dead duplicate carrying-capacity rule in progression `EquipmentEngine.isOverEncumbered` (Str×10, no size) |

Multi-domain leads: **attack-bonus / damage-formula** sites in `attack-consumer.js:115,238` and `proficiency-resolver.js:205` resolve the *canonical weapon profile inputs* consumed by combat-roll-math (no independent total) — not duplicates. **Price computation** (`ammo-system.js:90`, `canonical-resource.js:15`, gear template costs) computes distinct prices — not duplicates. **Encumbrance** — single authority (F-EQP-006 perf only; F-EQP-008 dead copy).

## 12. Unimplemented, deferred and acceptance-required

- U-EQP-01 Player remote mutation route (E4-P4 WP3) — UNIMPLEMENTED, gated by owner.
- DEFERRED_RULES_REVIEW: EQ-001 (drawn-weapon reconfiguration action cost) — already registered (`docs/audits/swse-rules-decisions-pending.md:895`); coordinator correctly refuses.
- FOUNDRY_ACCEPTANCE_REQUIRED: posture/occupancy cutover (E4-P5), ammo spend/reload, lightsaber ignite lighting.
