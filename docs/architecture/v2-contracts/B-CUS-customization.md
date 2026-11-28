# B-CUS — Item customization, upgrades, crafting, implants (domain contract + Phase 2 conformance)

**Contract level:** B. **Audited commit:** `f734b4d` (scripts unchanged at HEAD `2beb7cb`). **Sidecar:** `data/audits/architecture-census/contracts/domains/customization.json`. **Census:** 59 runtime modules / 14.1k SLOC; 46 reachable, 13 orphan/importers-only/test-only; 20 tests.
**Evidence:** static reading only for this domain (no test run). No `FOUNDRY_TESTED` claim.

## 1. Purpose and boundaries

Owns (A-17, OSI): item customization UI and rules — `ItemCustomizationWorkbench`, `CustomizationWorkflow`, `UpgradeSlotEngine`, `UpgradeService`, `CustomizationBayApp`, droid/vehicle customization engines, lightsaber workbench/construction, Tech Specialist modifications, modification-v2 runtime, implants rules. Does **not** own: credit movement (pays through TE, A-10), item persistence (ActorEngine), weapon posture (EQP).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-CUS-01 | Item customization surface (single visible UI) | `ItemCustomizationWorkbench` via `openItemCustomization` | APPROVED (OSI, A-17) · OBSERVED | dependency-traced | `scripts/apps/customization/item-customization-workbench.js:3719`; `scripts/items/swse-item-sheet.js:2197` |
| R-CUS-02 | Paid item customization commit | Workbench → `TE.executeMutationTransaction('owned-customization')` | APPROVED (A-10) · OBSERVED | behavior-code-verified | `item-customization-workbench.js:3719` |
| R-CUS-03 | Upgrade install/remove via command bus | `UpgradeService` (CommandBus `APPLY_ITEM_UPGRADE`) | APPROVED (A-17) · OBSERVED · CONFLICT (second representation, F-CUS-002) | behavior-code-verified | `scripts/engine/upgrades/UpgradeService.js:685`, `:757`; `scripts/engine/core/CommandBus.js:106` |
| R-CUS-04 | Customization state/rules read model | `CustomizationWorkflow` (read-only use) | OBSERVED · write methods dormant (F-CUS-003) | dependency-traced | `scripts/engine/customization/customization-workflow.js:194`; `UpgradeService.js:45` |
| R-CUS-05 | Droid / vehicle customization | droid- and vehicle-customization engines → `TE.executeAssetCustomizationTransaction` | APPROVED · OBSERVED | source-inspected | `scripts/engine/customization/droid-customization-engine.js:725`; `scripts/engine/customization/vehicle-customization-engine.js:305` |
| R-CUS-06 | Lightsaber construction | `LightsaberConstructionEngine` | APPROVED (A-17) · CONFLICT (charges outside TE — F-STO-002; flag writes, F-CUS-004) | behavior-code-verified | `scripts/engine/crafting/lightsaber-construction-engine.js:617`, `:634`, `:652` |
| R-CUS-07 | Tech Specialist modifications | `TechSpecialistModificationService` → TE | OBSERVED | source-inspected | `scripts/engine/customization/tech-specialist-modification-service.js:747` |
| R-CUS-08 | Modification-v2 installation | `modification-install-service.js` → TE | OBSERVED · certification gate TX-14 (`selectable: 0`) | source-inspected | `scripts/engine/customization/modification-v2-runtime/modification-install-service.js:269` |
| R-CUS-09 | Lightsaber token light (visual consumer) | `LightsaberLightSync` hooks | OBSERVED · suspected multi-client writer (F-CUS-005) | source-inspected | `scripts/utils/lightsaber-light-sync.js:186`, `:215` |

## 3. Authorities

Canonical data: `flags.foundryvtt-swse.customization` / `flags.swse.*` (workbench) **and** `system.installedUpgrades` (UpgradeService) — two live representations (F-CUS-002, TX-02 DESIGN_GAP). Prices: customization-cost-engine / modification-price (distinct from store prices; not duplicates). Mutation: TE for paid operations, ActorEngine for free edits.

## 4. Public interfaces

| Symbol | Path:line | Consumers | Contract |
|---|---|---|---|
| `openItemCustomization` | `scripts/apps/customization/item-customization-router.js:1` | 12 | open the single workbench surface |
| `DroidCustomizationEngine` | `scripts/engine/customization/droid-customization-engine.js:1` | 12 | droid systems install/remove via TE |
| `UpgradeService` | `scripts/engine/upgrades/UpgradeService.js:1` | 11 | upgrade install/remove; read state via CustomizationWorkflow |
| `ImplantEffectRules` | `scripts/engine/implants/ImplantEffectRules.js:1` | 9 | implant effects |
| `modification-install-service` | `scripts/engine/customization/modification-v2-runtime/modification-install-service.js:269` | 6 | gated V2 install via TE |

## 5. Dependencies

Allowed: TE, LedgerService (validation/preview only, C-STO-1), ActorEngine, equipment readers. Observed violations: LedgerService plan applied directly by lightsaber construction (F-STO-002); `scripts/apps/gear-templates-engine.js` rules engine under apps/ (F-EQP-004).

## 6. Integration points and lifecycle

Hooks: `preUpdateItem`/`updateItem` light sync (`lightsaber-light-sync.js:186`, `:215`); `swse:level-up-complete` lightsaber prompt (`scripts/applications/lightsaber/lightsaber-router.js:13`). Entry: item sheet `.open-upgrade-app` → workbench overlay, with fallback to `SWSEUpgradeApp` (`swse-item-sheet.js:2208`, `:2213`).

## 7. Failure behavior and invariants

A-02, A-09, A-10, A-17. Paid paths through TE inherit TE guarantees (B-STO §7). Workbench uses `SafetyEngine` in-flight guard (process-local).

## 8. Level C subsystem contracts

- **C-CUS-1 Customization ⇄ TransactionEngine.** Every paid customization commits exactly one TE transaction containing the item change and the charge. Status: APPROVED (A-10) · OBSERVED for workbench, UpgradeService, droid/vehicle, Tech Specialist, modification-v2; CONFLICT for lightsaber construction.

## 9. Tests and certification

`tests/modification-v2-convergence.test.mjs`, `tests/weapon-phase-5d-i-d-b3-upgrades.test.mjs` (exercises dormant InstallRemoveEngine), `tests/ti2-commerce-integrity.test.mjs` (UpgradeService/TE). Foundry acceptance: workbench apply, lightsaber construction, droid garage, shipyard — required.

## 10. Reconciliation with existing contracts

Agreements: TI-0 call-path map §2.1 (InstallRemove/ModificationIntentBuilder INACTIVE; lightsaber via `transactional:true`) — still accurate. TX-14 gate respected.
- **CR-CUS-01** `docs/audits/transaction-integrity/tx-remediation-ledger.md` TX-01 records the UpgradeService **vehicle** branch as "charges nothing" (D3 deferred); it now refuses (`UpgradeService.js:645`, `:744`).
- **CR-CUS-02** `scripts/engine/customization/PHASE-F-INTEGRATION-GUIDE.md` and `PHASES-B-E-GUIDE.md` describe `workflow.applyInstall/applyStrip/applyTemplate` as the integration API; no production caller uses them (the workbench commits its own plan through TE).
- **CR-CUS-03** `scripts/apps/upgrade-app.js` header presents SWSEUpgradeApp as the Upgrade Workshop; OSI retires old per-item modification apps; it survives as the item-sheet fallback (F-CUS-001).

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-CUS-001 | medium | confirmed | Old per-item `SWSEUpgradeApp` revived as item-sheet fallback (unowned item / error) — legacy B |
| F-CUS-002 | medium | confirmed | Two live installed-upgrade representations (workbench flags vs UpgradeService `system.installedUpgrades`); item upgrade removal refunds nothing while droid removal refunds resale |
| F-CUS-003 | low | confirmed | CustomizationWorkflow write path (InstallRemove/Structural/Template engines) dormant; only tests call it; latent options-argument bug |
| F-CUS-004 | low | confirmed | Lightsaber prompt/construction flags written with raw setFlag/unsetFlag (router in a Dialog callback; engine after commit) |
| F-CUS-005 | low | suspected | Light-sync `preUpdateItem` hook registers `Hooks.once('updateItem')` on every client and writes token light without GM/owner gating |
| F-CUS-006 | low | confirmed | 13 unreachable modules: deprecated workbench wrappers, barrels, blaster customization engine, crystal system, intent builder, restriction propagation |
| F-CUS-007 | medium | confirmed | `item-customization-workbench.js` 3.8k lines (lightsaber workbench, store staging, templates, structural edits, preview pricing in one class) |
| F-CUS-008 | low | confirmed | Tech Specialist service posts chat directly |

## 12. Unimplemented, deferred and acceptance-required

- TX-14 CERTIFICATION_GATE: modification-v2 installation `selectable: 0` — not bypassed.
- Owner/rules question (not adjudicated): whether removing an item upgrade should refund credits (droid branch refunds resale via its engine; item branch does not — `UpgradeService.js:757`). Recorded as DEFERRED_RULES_REVIEW candidate; no register ID found.
- FOUNDRY_ACCEPTANCE_REQUIRED: workbench apply/stage, lightsaber construction, light sync with two clients.
