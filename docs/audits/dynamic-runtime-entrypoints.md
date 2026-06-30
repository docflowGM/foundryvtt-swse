# Dynamic Runtime Entrypoints Audit

Date: 2026-06-30

## Purpose

Static import-graph analysis (as used in PR 9) cannot see these entrypoints. Any dead-code
scan that deletes a file based solely on zero static import references **must** cross-reference
this document before deleting.

---

## 1. Dynamic `await import(...)` Entrypoints

### 1.1 Shell Surface Registry (lazy-loaded UI panels)

`scripts/ui/shell/ShellSurfaceRegistry.js` lazy-loads all surface services on first
activation. **All 15 targets confirmed present.**

| Exported symbol | Target file |
|---|---|
| `HomeSurfaceService` | `scripts/ui/shell/HomeSurfaceService.js` |
| `SettingsSurfaceService` | `scripts/ui/shell/SettingsSurfaceService.js` |
| `MessengerSurfaceService` | `scripts/ui/shell/MessengerSurfaceService.js` |
| `GamesSurfaceService` | `scripts/ui/shell/GamesSurfaceService.js` |
| `AlliesSurfaceService` | `scripts/ui/shell/AlliesSurfaceService.js` |
| `AtlasSurfaceService` | `scripts/ui/shell/AtlasSurfaceService.js` |
| `TransmissionDecryptionSurfaceService` | `scripts/ui/shell/TransmissionDecryptionSurfaceService.js` |
| `MentorSurfaceService` | `scripts/ui/shell/MentorSurfaceService.js` |
| `StoreSurfaceService` | `scripts/ui/shell/StoreSurfaceService.js` |
| `AssetBaySurfaceService` | `scripts/ui/shell/AssetBaySurfaceService.js` |
| `WorkbenchSurfaceAdapter` | `scripts/ui/shell/WorkbenchSurfaceAdapter.js` |
| `CustomizationSurfaceAdapter` | `scripts/ui/shell/CustomizationSurfaceAdapter.js` |
| `ProgressionSurfaceAdapter` | `scripts/ui/shell/ProgressionSurfaceAdapter.js` |
| `UpgradeService` | `scripts/engine/upgrades/UpgradeService.js` |
| `HolonetNoticeCenterService` | `scripts/holonet/subsystems/holonet-notice-center-service.js` |

### 1.2 ShellHost.js — Vehicle Shipyard entry point

`scripts/ui/shell/ShellHost.js:789` — `_openShipyardForAsset()`:

```js
const { VehicleCustomizationRouter } = await import(
  '/systems/foundryvtt-swse/scripts/applications/vehicle/vehicle-customization-router.js'
);
```

**Status: present and confirmed live.** This is the pattern that caused a false-positive
deletion of `droid-customization-router.js` in PR 9 — it had no equivalent dynamic import.

### 1.3 Shell service sub-imports

| Source file | Exported symbol | Target |
|---|---|---|
| `HomeSurfaceService.js` | `AlliesSurfaceService` | `scripts/ui/shell/AlliesSurfaceService.js` |
| `StoreSurfaceService.js` | `SWSEStore` | `store/store.js` |
| `CustomizationSurfaceAdapter.js` | `CustomizationBayApp` | `scripts/apps/customization/customization-bay-app.js` |
| `CustomizationSurfaceAdapter.js` | `ItemCustomizationWorkbench` | `scripts/apps/customization/item-customization-workbench.js` |
| `ProgressionSurfaceAdapter.js` | `ChargenShell` | `scripts/apps/progression-framework/chargen-shell.js` |
| `ProgressionSurfaceAdapter.js` | `LevelupShell` | `scripts/apps/progression-framework/levelup-shell.js` |
| `ProgressionSurfaceAdapter.js` | `FollowerShell` | `scripts/apps/progression-framework/follower-shell.js` |

### 1.4 Actor class lazy imports

These files use `await import(...)` inside methods to avoid circular dependencies.
All targets confirmed present.

| Source | Symbol | Target |
|---|---|---|
| `scripts/actors/v2/base-actor.js` | `FeatActionsMapper` | `scripts/utils/feat-actions-mapper.js` |
| `scripts/actors/v2/base-actor.js` | `CombatEngine` | `scripts/engine/combat/CombatEngine.js` |
| `scripts/actors/base/swse-actor-base.js` (×5) | `ActorEngine` | `scripts/governance/actor-engine/actor-engine.js` |
| `scripts/actors/vehicle/swse-vehicle-core.js` | `ActorEngine` | `scripts/governance/actor-engine/actor-engine.js` |

### 1.5 Debug / audit tool lazy imports

| Source | Symbol | Target |
|---|---|---|
| `scripts/debug/phase-9-runtime-matrix.js` | `inspectActorContract` | `scripts/debug/actor-contract-inspector.js` |
| `scripts/ui/combat/action-economy-integration.js` | `ActionEconomyPersistence` | `scripts/engine/combat/action/action-economy-persistence.js` |
| `scripts/ui/combat/action-economy-integration.js` | `ActionEngine` | `scripts/engine/combat/action/action-engine-v2.js` |

### 1.6 Stale dynamic imports — FIXED (this audit)

Two test/audit files had wrong root-level paths. Canonical files exist at `scripts/` paths.

| File | Stale path | Correct path |
|---|---|---|
| `scripts/governance/sentinel/integration-tests.js:64` | `/systems/foundryvtt-swse/feat-state.js` | `/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-state.js` |
| `scripts/engine/combat/damage-engine-test.js:189` | `/systems/foundryvtt-swse/mutation-integrity-layer.js` | `/systems/foundryvtt-swse/scripts/governance/sentinel/mutation-integrity-layer.js` |

---

## 2. `game.swse` Namespace (Console / Macro Accessible)

Set in `Hooks.on('init')` in `index.js`. Extended by multiple subsystems during `ready`.
**Anything under `game.swse.*` is reachable from the Foundry console, macros, and GM
diagnostic commands — static import graphs cannot see callers.**

| Key | Value | Source |
|---|---|---|
| `game.swse.data` | `SWSEData` | `index.js` |
| `game.swse.ActorEngine` | `ActorEngine` | `index.js` |
| `game.swse.RollEngine` | `RollEngine` | `index.js` |
| `game.swse.EntityCreateBrowser` | `EntityCreateBrowser` | `index.js` |
| `game.swse.openForceAlchemyWorkbench` | function | `index.js` |
| `game.swse.openStore` | function | `index.js` |
| `game.swse.repairForcePowerAbilityMeta` | async function | `index.js` |
| `game.swse.ActiveEffectsManager` | `SWSEActiveEffectsManager` | `scripts/combat/active-effects-manager.js` |
| `game.swse.CombatStatusResolver` | `CombatStatusResolver` | `scripts/combat/combat-status.js` |
| `game.swse.recurringDamageEngine` | instance | `scripts/engine/combat/recurring-damage-engine.js` |
| `game.swse.poisonEngine` | instance | `scripts/engine/poison/poison-engine.js` |
| `game.swse.suggestions` | `{ engine, coordinator, ... }` | `scripts/engine/suggestion/SuggestionEngineCoordinator.js` |
| `game.swse.ui.mobileMode` | `MobileMode` | `scripts/ui/mobile-mode-manager.js` |
| `game.swse.layoutDebug` | instance | `scripts/debug/layout-debug.js` |
| `game.swse.toggleLayoutDebug` | function | `scripts/debug/layout-debug.js` |

Additional keys set by init subsystems (not exhaustive): `game.swse.holonet`,
`game.swse.hardening`, `game.swse.debug`, `game.swse.inspector`, `game.swse.rolls`,
`game.swse.utils`, `game.swse.rollSkill`, `game.swse.showStatus`, `game.swse.games`.

---

## 3. `window.*` / `globalThis.*` Globals

These classes are pinned to the browser window for emergency console access, diagnostic
tooling, and cross-frame interop. Files that only appear as globals here will have zero
static import references but are NOT dead.

### window.*

| Global | Class | Source |
|---|---|---|
| `window.SWSEDamage` | `DamageSystem` | `scripts/combat/damage-system.js` |
| `window.SWSECombat` | `SWSECombat` | `scripts/combat/systems/enhanced-combat-system.js` |
| `window.SWSERoll` | `SWSERoll` | `scripts/combat/rolls/enhanced-rolls.js` |
| `window.SWSEVehicleWeapons` | `SWSEVehicleWeapons` | `scripts/combat/systems/vehicle/vehicle-weapons.js` |
| `window.CombatActionsMapper` | `CombatActionsMapper` | `scripts/combat/utils/combat-actions-mapper.js` |
| `window.SWSEHooks` | `HooksRegistry` | `scripts/infrastructure/hooks/hooks-registry.js` |
| `window.RepairPanel` | `RepairPanel` | `scripts/ui/repair/repair-panel.js` |
| `window.GovernanceSystem` | `GovernanceSystem` | `scripts/governance/governance-system.js` |
| `window.GovernanceIntegration` | `GovernanceIntegration` | `scripts/governance/governance-integration.js` |
| `window.IntegrityDashboard` | `IntegrityDashboard` | `scripts/governance/ui/integrity-dashboard.js` |
| `window.AuditTrail` | `AuditTrail` | `scripts/governance/audit/audit-trail.js` |
| `window.DriftDetector` | `DriftDetector` | `scripts/engine/integrity/drift-detector.js` |
| `window.WorldIntegritySweep` | `WorldIntegritySweep` | `scripts/engine/integrity/world-integrity-sweep.js` |
| `window.SWSE_AppV2_Audit` | `AppV2AuditRunner` | `scripts/governance/sentinel/appv2-audit-runner.js` |
| `window.PreflightValidator` | `PreflightValidator` | `scripts/governance/enforcement/preflight-validator.js` |
| `window.EnforcementPolicy` | `EnforcementPolicy` | `scripts/governance/enforcement/enforcement-policy.js` |
| `window.ActorEngineEnforcementGates` | `ActorEngineEnforcementGates` | `scripts/governance/enforcement/actor-engine-enforcement-gates.js` |
| `window.SentinelSovereigntyEnforcement` | `SentinelSovereigntyEnforcement` | `scripts/governance/sentinel/sovereignty-enforcement.js` |
| `window.Batch1Validation` | `Batch1Validation` | `scripts/governance/mutation/batch-1-validation.js` |
| `window.ExportMarking` | `ExportMarking` | `scripts/governance/export/export-marking.js` |
| `window.PrerequisiteIntegrityTests` | `PrerequisiteIntegrityTests` | `scripts/governance/integrity/prerequisite-integrity-tests.js` |
| `window.SeverityClassifier` | `SeverityClassifier` | `scripts/governance/integrity/severity-classifier.js` |
| `window.DamageEngineTest` | `DamageEngineTest` | `scripts/engine/combat/damage-engine-test.js` |
| `window._SWSE_Enforcement` | sentinel object | `scripts/governance/sentinel/enforcement-core.js` |
| `window.__SWSE_COMBAT_SENTINEL__` | sentinel object | `scripts/governance/sentinel/layers/combat-layer.js` |
| `window.PHASE_9_RESULTS` / `window.runPhase9Matrix` | test results | `scripts/debug/phase-9-runtime-matrix.js` |

### globalThis.*

| Global | Class | Source |
|---|---|---|
| `globalThis.SWSE` | namespace | `index.js`, multiple files |
| `globalThis.SWSE.ActorEngine` | `ActorEngine` | `index.js` |
| `globalThis.SWSE.RollEngine` | `RollEngine` | `index.js` |
| `globalThis.SWSEDiscovery` | discovery namespace | `scripts/ui/discovery/index.js` |
| `globalThis.SWSEChatEventBridge` | `ChatEventBridge` | `scripts/ui/chat/chat-event-bridge.js` |
| `globalThis.SWSELocationRegistryService` | `LocationRegistryService` | `scripts/locations/location-registry-service.js` |
| `globalThis.SWSEFactionJobBridgeService` | `FactionJobBridgeService` | `scripts/ui/shell/gm/FactionJobBridgeService.js` |
| `globalThis.SWSEGrappling` | `SWSEGrappling` | `scripts/combat/systems/grappling-system.js` |
| `globalThis.SWSETalentNormalizer` | `TalentNormalizerEngine` | `scripts/engine/talent/TalentNormalizerEngine.js` |
| `globalThis.SentinelTabDiagnostics` | `SentinelTabDiagnostics` | `scripts/governance/sentinel/tab-diagnostics.js` |
| `globalThis.SentinelAppV2Auditor` | `SentinelAppV2Auditor` | `scripts/governance/sentinel/appv2-auditor.js` |
| `globalThis.__swseCombatWorkflowRegistry` | `CombatWorkflowRegistry` | `scripts/engine/combat/workflow/combat-workflow-registry.js` |
| `globalThis.SWSE_UPKEEP` | `Upkeep` | `scripts/automation/upkeep.js` |

---

## 4. Sheet Registration

Registered in `index.js` `Hooks.on('init')`. The v2 actor shell (`SWSEV2CharacterSheet`)
is the single registered sheet for all four actor types.

| Actor type | Sheet class |
|---|---|
| `character` | `SWSEV2CharacterSheet` |
| `droid` | `SWSEV2CharacterSheet` (droid differences rendered inside) |
| `npc` | `SWSEV2CharacterSheet` (NPC differences rendered inside) |
| `vehicle` | `SWSEV2CharacterSheet` (vehicle differences rendered inside) |
| all item types | `SWSEItemSheet` |

---

## 5. `Hooks.on` / `Hooks.once` — Most Common Events

From ~350 hook registrations across `scripts/` and `index.js`:

| Event | Approx. count |
|---|---|
| `ready` | 67 |
| `init` | 24 |
| `updateActor` | 15 |
| `preUpdateActor` | 9 |
| `createActor` / `createItem` | 8 each |
| `deleteCombat` | 8 |
| `combatTurn` | 6 |
| `renderApplicationV2` | 11 |
| `renderSidebar` | 5 |
| `swse.destinyPointSpent` | 7 |
| `swse:suggestion-report-ready` | 4 |
| `swse:progression:completed` | 4 |

Files that register hooks on `init` or `ready` are **always active** — they load because
`index.js` imports them directly or through the static import graph.

---

## 6. `CONFIG.SWSE` Assignments

| Key | Set by | Purpose |
|---|---|---|
| `CONFIG.SWSE` | `index.js` | Main system config namespace |
| `CONFIG.SWSE.debug.layoutDebug` | `scripts/debug/layout-debug.js` | Debug flag |
| `CONFIG.SWSE.debug.contractObservability` | `scripts/debug/phase-9-runtime-matrix.js` | Debug flag |
| `CONFIG.SWSE.openItemCustomization` | `scripts/apps/customization/item-customization-router.js` | Entry point function |
| `CONFIG.SWSE.openCustomizationWorkbench` | `scripts/apps/customization/item-customization-router.js` | Entry point function |
| `CONFIG.SWSE.diagonalMovement` | `scripts/houserules/houserule-mechanics.js` | Houserule setting |

---

## 7. Future Orphan-Scan Protocol

Before deleting any file flagged as having zero static import references:

1. **Check this document** — is the file a dynamic import target, a `game.swse.*` provider,
   or a `window.*`/`globalThis.*` global?

2. **Search for await import paths** targeting the file:
   ```bash
   grep -r "await import" scripts/ index.js --include="*.js" | grep "filename-or-path"
   ```

3. **Search for the exported symbol names** across the whole codebase:
   ```bash
   grep -r "ExportedClassName" scripts/ index.js --include="*.js"
   ```

4. **Check for `game.swse.*` registration** inside the file:
   ```bash
   grep "game\.swse\." the-file.js
   ```

5. **For shell/customization/progression/droid/vehicle files**: additionally search
   `ShellHost.js`, `ShellSurfaceRegistry.js`, and all `*SurfaceAdapter.js` / `*SurfaceService.js`
   files for dynamic imports targeting the file or its exported symbols.

6. **Only delete** after all five checks return empty.

---

## 8. Validation Commands

```bash
# Re-run dynamic import scan
grep -rn "await import(" scripts/ index.js --include="*.js" | \
  grep -oP "(?<=['\"])/systems/foundryvtt-swse/[^'\"]+(?=['\"])" | sort -u

# Syntax check edited files
node --check scripts/governance/sentinel/integration-tests.js
node --check scripts/engine/combat/damage-engine-test.js
```
