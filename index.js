import "./scripts/ui/ui-manager.js";
import "./scripts/ui/cursor-authority.js";
/* ==========================================================================
   SWSE SYSTEM INDEX.JS (OPTIMIZED CANONICAL)
   Foundry V13 / AppV2 compliant
   ========================================================================== */

/* =========================
   GLOBAL SAFETY GUARDS
   ========================= */

if (globalThis.__SWSE_INDEX_LOADED__) {
  console.warn('SWSE | index.js loaded more than once — aborting');
  throw new Error('SWSE double-load detected');
}
globalThis.__SWSE_INDEX_LOADED__ = true;

/* =========================
   GLOBAL ERROR HANDLERS
   ========================= */

window.addEventListener('error', (event) => {
  console.group('%c🔥 SWSE HARD ERROR', 'color:red; font-size:16px;');
  console.error(event.error || event.message);
  console.groupEnd();
});

window.addEventListener('unhandledrejection', (event) => {
  console.group('%c🔥 SWSE UNHANDLED PROMISE', 'color:orange; font-size:16px;');
  console.error(event.reason);
  console.groupEnd();
});

/* =========================
   JQUERY ENFORCEMENT
   ========================= */

// IMPORTANT: jQuery enforcement is now handled via ESLint + pre-commit checks
// (removing global monkeypatching to avoid breaking Foundry core/modules).
//
// ESLint rule disallows: $ | jQuery | .find() | .on()
// Pre-commit grep checks for: $( | jQuery( | .find(
//
// If you need to debug jQuery usage, use:
//   grep -r "\$(\\|jQuery(" scripts/ --include="*.js"
//
// NOTE: We still allow Foundry core/modules to use jQuery without interference.
// SWSE code must pass ESLint and pre-commit static checks.

/* =========================
   PHASE 3: RUNTIME CONTRACT (must be first)
   ========================= */

import './scripts/apps/dialogs/swse-dialog-v2.js';
import { RuntimeContract } from './scripts/contracts/runtime-contract.js';
import { FlagRegistry } from './scripts/core/flag-registry.js';

/* =========================
   IMPORTS
   ========================= */

// ---- core / config ----
import { SWSE } from './scripts/core/config.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { registerHouseruleSettings } from './scripts/houserules/houserule-settings.js';
import { initializeUtils } from './scripts/core/utils-init.js';
import { initializeRolls } from './scripts/core/rolls-init.js';
import { initSidebarIconFallback } from './scripts/core/sidebar-icon-fallback.js';

// ---- core engines (bootstrap attachment) ----
import { RollEngine } from './scripts/engine/roll-engine.js';
import { ModifierEngine } from './scripts/engine/effects/modifiers/ModifierEngine.js';
import { DropService } from './scripts/services/drop-service.js';
import { DroidValidationEngine } from './scripts/engine/droid-validation-engine.js';
import { SentinelEngine } from './scripts/governance/sentinel/sentinel-core.js';
import { initializeSentinelAuditors, auditCSSHealth, generateMigrationReport, SentinelReporter } from './scripts/governance/sentinel/sentinel-auditors.js';
import { AppV2AuditRunner } from './scripts/governance/sentinel/appv2-audit-runner.js';

// ---- v13 hardening ----
import { initializeHardeningSystem, validateSystemReady, registerHardeningHooks } from './scripts/core/hardening-init.js';

// ---- phase 3 contracts ----
import { DiagnosticMode } from './scripts/contracts/diagnostic-mode.js';
import { initializeSentinelGovernance } from './scripts/governance/sentinel/sentinel-init.js';

// ---- logging / perf ----
import { swseLogger } from './scripts/utils/logger.js';
import { perfMonitor, debounce, throttle } from './scripts/utils/performance-utils.js';
import { errorHandler, errorCommands, logError } from './scripts/core/error-handler.js';

// ---- data / preload ----
import { dataPreloader } from './scripts/core/data-preloader.js';
import { runJsonBackedIdsMigration } from './scripts/migrations/json-backed-ids-migration.js';
import { checkRequiredPacks } from './scripts/core/pack-existence-check.js';

// ---- actors / items ----
import { SWSEV2BaseActor } from './scripts/actors/v2/base-actor.js';
import { SWSEItemBase } from './scripts/items/base/swse-item-base.js';
import { ActorEngine } from "./scripts/governance/actor-engine/actor-engine.js";
import { MutationInterceptor } from './scripts/governance/mutation/MutationInterceptor.js';
import { MutationPathGuard } from './scripts/governance/sentinel/mutation-path-guard.js';
import { MutationBoundaryDefense } from './scripts/governance/sentinel/mutation-boundary-defense.js';
import { Batch1Validation } from './scripts/governance/mutation/batch-1-validation.js';

// ---- combat tests (PHASE 3) ----
import { DamageEngineTest } from './scripts/engine/combat/damage-engine-test.js';
import { Batch2ComprehensiveTest } from './tests/archived/batch-2-comprehensive-test.js';

// ---- sheets ----
import { SWSEV2CharacterSheet } from './scripts/sheets/v2/character-sheet.js';
import { SWSEMinimalTestSheet } from './scripts/sheets/v2/minimal-test-sheet.js';
import { SWSEV2NpcSheet } from './scripts/sheets/v2/npc-sheet.js';
import { NPCSheet } from './scripts/sheets/v2/npc/NPCSheet.js'; // Phase 7b: Panelized NPC sheet
import { SWSEV2DroidSheet } from './scripts/sheets/v2/droid-sheet.js';
import { DroidSheet } from './scripts/sheets/v2/droid/DroidSheet.js'; // Phase 7c: Panelized Droid sheet
import { SWSEV2VehicleSheet } from './scripts/sheets/v2/vehicle-sheet.js';
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

// ---- audits (Phase A2 - dev-only diagnostics) ----
import { SWSEV2CharacterSheetAudit } from './scripts/sheets/v2/character-sheet-integration-audit.js';
import { CharacterSheetIntegrationTestHarness } from './scripts/sheets/v2/character-sheet-integration-test-harness.js';
import { SWSEV2SheetDiagnostics } from './scripts/sheets/v2/sheet-diagnostics.js';

// ---- debug system ----
import { SWSEDebugger } from './scripts/debug/swse-debugger.js';
import { SentinelReports } from './scripts/debug/sentinel-reports.js';
import { LayoutDebugManager } from './scripts/debug/layout-debug.js';

// ---- handlebars ----
import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { registerSWSEPartials } from './helpers/handlebars/partials-auto.js';
import { preloadHandlebarsTemplates, assertPartialsResolved } from './scripts/core/load-templates.js';

// ---- engines ----
import { RulesEngine } from './scripts/rules/rules-engine.js';
import { TalentEffectEngine } from './scripts/engine/talent/talent-effect-engine.js';
import TalentActionLinker from './scripts/engine/talent/talent-action-linker.js';
import { SWSELanguageModule } from './scripts/engine/progression/modules/language-module.js';
import { AbilityExecutionCoordinator } from './scripts/engine/abilities/ability-execution-coordinator.js';

// ---- hooks ----
import { registerInitHooks, registerDestinyHooks } from './scripts/infrastructure/hooks/index.js';
import { initializeForcePowerHooks } from './scripts/infrastructure/hooks/force-power-hooks.js';
import { initializeFollowerHooks } from './scripts/infrastructure/hooks/follower-hooks.js';
import { registerActionEconomyHooks } from './scripts/engine/combat/action/action-economy-hooks.js';
import { registerKeybindings } from './scripts/core/keybindings.js';

// ---- UI systems (registered in init, initialized in ready) ----
import { initializeSceneControls } from './scripts/scene-controls/init.js';
import { initializeActionPalette } from './scripts/ui/action-palette/init.js';
import { initializeGMSuggestions } from './scripts/engine/suggestion/gm/init.js';
import { MentorTranslationSettings } from './scripts/mentor/mentor-translation-settings.js';

// ---- suggestions / discovery ----
import { SuggestionService } from './scripts/engine/suggestion/SuggestionService.js';
import { registerSuggestionHooks } from './scripts/infrastructure/hooks/suggestion-hooks.js';
import { registerCombatSuggestionHooks, requestCombatEvaluation } from './scripts/engine/suggestion/equipment/combat-hooks.js';
import { CombatSuggestionEngine } from './scripts/engine/suggestion/equipment/combat-engine.js';
import { testHarness } from './scripts/engine/suggestion/equipment/test-harness.js';
import { initializeDiscoverySystem, onDiscoveryReady } from './scripts/ui/discovery/index.js';

// ---- misc ----
import { SystemInitHooks } from './scripts/engine/progression/hooks/system-init-hooks.js';
import { Upkeep } from './scripts/automation/upkeep.js';

// ---- Phase 5: Observability, Testing, Forward Compatibility ----
import { initializePhase5, getPhaseSummary } from './scripts/core/phase5-init.js';
import { registerCriticalFlowTests } from './scripts/tests/critical-flow-tests.js';

import { SWSECombatDocument } from './scripts/combat/swse-combat.js';
import { SWSECombatant } from './scripts/combat/swse-combatant.js';

/* ==========================================================================
   CONSOLIDATE BOOT MODULES: Import talent/progression modules in order
   (Previously scattered across system.json esmodules; now centralized for
   boot order discipline and window.SWSE freeze safety)
   ========================================================================== */

// Bootstrap holo UI system
import './scripts/bootstrap/holo-init.js';

// Progression / talent tree infrastructure
import './scripts/engine/progression/talents/TalentNode.js';
import './scripts/engine/progression/talents/TalentTreeGraph.js';
import './scripts/engine/progression/utils/PrerequisiteEnricher.js';
import './scripts/engine/progression/RuleEngine.js';
import './scripts/engine/progression/talents/TalentTreeRegistry.js';

// Light Side talents
import './scripts/talents/light-side-init.js';

// Dark Side powers (consolidated module + init)
import DarkSidePowers from './scripts/talents/DarkSidePowers.js';
import './scripts/talents/dark-side-powers-init.js';
import './scripts/talents/squad-actions-init.js';

/* ==========================================================================
   INTERNAL BOOTSTRAP HELPERS
   ========================================================================== */

async function bootstrapTemplates() {
  await preloadHandlebarsTemplates();
  await registerSWSEPartials();
  assertPartialsResolved();
}

async function bootstrapSuggestionSystem() {
  const systemJSON = await fetch('systems/foundryvtt-swse/system.json').then(r => r.json());
  SuggestionService.initialize({ systemJSON });

  registerSuggestionHooks();
  registerCombatSuggestionHooks();
  initializeGMSuggestions();
}

/* ========================================================================== 
   INIT 
   ========================================================================== */

Hooks.once("setup", () => {

  console.log("[SWSE] Registering V2 sheets (v13 compliant)");

  // Ensure all actor documents use the SWSE V2 actor prototype/methods
  CONFIG.Actor.documentClass = SWSEV2BaseActor;

  // Combat SSOT registration: ensure SWSE combat document classes are the
  // live runtime authority for tracker state, initiative, and action economy.
  CONFIG.Combat.documentClass = SWSECombatDocument;
  CONFIG.Combatant.documentClass = SWSECombatant;

  const ActorCollection = foundry.documents.collections.Actors;
  const ItemCollection = foundry.documents.collections.Items;

  ActorCollection.registerSheet("foundryvtt-swse", SWSEV2CharacterSheet, {
    types: ["character"],
    makeDefault: true
  });

  ActorCollection.registerSheet("foundryvtt-swse", SWSEMinimalTestSheet, {
    types: ["character"],
    makeDefault: false,
    label: "SWSE Minimal Test Sheet"
  });

  ActorCollection.registerSheet("foundryvtt-swse", SWSEV2NpcSheet, {
    types: ["npc"],
    makeDefault: true
  });

  ActorCollection.registerSheet("foundryvtt-swse", NPCSheet, {
    types: ["npc"],
    makeDefault: false,
    label: "SWSE V2 NPC Sheet (Panelized - Phase 7b)"
  });

  ActorCollection.registerSheet("foundryvtt-swse", SWSEV2DroidSheet, {
    types: ["droid"],
    makeDefault: true
  });

  ActorCollection.registerSheet("foundryvtt-swse", DroidSheet, {
    types: ["droid"],
    makeDefault: false,
    label: "SWSE V2 Droid Sheet (Panelized - Phase 7c)"
  });

  ActorCollection.registerSheet("foundryvtt-swse", SWSEV2VehicleSheet, {
    types: ["vehicle"],
    makeDefault: true
  });

  ItemCollection.registerSheet("foundryvtt-swse", SWSEItemSheet, {
    makeDefault: true
  });

  console.log("[SWSE] V2 Sheets Registered Cleanly");
});

Hooks.once('init', async () => {
  if (globalThis.__SWSE_INIT__) return;
  globalThis.__SWSE_INIT__ = true;

  swseLogger.log('SWSE | Init start');

  /* ---------- PHASE -1: v13 hardening ---------- */
  await initializeHardeningSystem();
  registerHardeningHooks();

  /* ---------- PHASE 0: invariants ---------- */
  registerHandlebarsHelpers();
  Handlebars.registerHelper('let', (ctx, opts) => opts.fn({ ...this, ...ctx }));

  /* ---------- PHASE 1: settings & hooks ---------- */
  registerSystemSettings();
  registerHouseruleSettings();
  MentorTranslationSettings.registerSettings();
  initializeDiscoverySystem();

  registerInitHooks();
  registerDestinyHooks();
  registerActionEconomyHooks();
  registerKeybindings();

  /* ---------- PHASE 2: UI infrastructure ---------- */
  await bootstrapTemplates();

  /* ---------- PHASE 3: unified sentinel enforcement ---------- */
  initializeSentinelGovernance();
  MutationInterceptor.initialize();

  /* ---------- PERMANENT FIX: Mutation path guard (regression lock) ---------- */
  MutationPathGuard.initialize();

  /* ---------- PHASE 3: Enforcement mode activation ---------- */
  MutationBoundaryDefense.initialize();

  swseLogger.log('SWSE | Init complete');
});
/* ==========================================================================
   READY
   ========================================================================== */

Hooks.once('ready', async () => {
  if (globalThis.__SWSE_READY__) return;
  globalThis.__SWSE_READY__ = true;

  console.time('SWSE Ready');

  swseLogger.log('SWSE | Ready start');

  /* ---------- Initialize debugger (lifecycle + error capture) ---------- */
  SWSEDebugger.patch();
  // Toggle on during debugging
  SWSEDebugger.enable();

  /* ---------- v13 hardening validation ---------- */
  await validateSystemReady();

  errorHandler.initialize();
  initializeRolls();

  /* ---------- Sentinel Auditors (CSS + Migration validation) ---------- */
  initializeSentinelAuditors();

  /* ---------- phase 3: diagnostic mode ---------- */
  await DiagnosticMode.initialize();

  /* ---------- Phase 5: Observability, Testing, Forward Compatibility ---------- */
  initializePhase5();
  registerCriticalFlowTests();

  /* ---------- data & progression ---------- */
  // Check required packs exist
  checkRequiredPacks();

  await Promise.all([
    dataPreloader.preload({
      priority: ['classes', 'skills'],
      background: ['feats', 'talents', 'species']
    }),
    runJsonBackedIdsMigration()
  ]);

  // Initialize registry authorities BEFORE progression framework opens
  const { SpeciesRegistry } = await import('./scripts/engine/registries/species-registry.js');
  await SpeciesRegistry.initialize();
  swseLogger.log('SWSE | SpeciesRegistry initialized at boot');

  /* ---------- Combat Rules System ---------- */
  // Initialize core and talent rules for combat resolution
  const { initializeCoreRules } = await import('./scripts/engine/rules/modules/core/index.js');
  const { default: initializeTalentRules } = await import('./scripts/engine/rules/modules/talents/index.js');
  initializeCoreRules();
  initializeTalentRules();

  await SystemInitHooks.onSystemReady();

  initializeForcePowerHooks();
  initializeFollowerHooks();
  SWSELanguageModule.init();

  /* ---------- suggestions ---------- */
  await bootstrapSuggestionSystem();

  /* ---------- UI (DOM-safe) ---------- */
  initializeSceneControls();
  initializeActionPalette();
  initSidebarIconFallback();
  MentorTranslationSettings.loadSettings();

  /* ---------- engines ---------- */
  RulesEngine.init();
  Upkeep.init();
  initializeUtils();

  /* ---------- global API ---------- */
  const publicAPI = {
    ActorEngine,
    TalentEffectEngine,
    TalentActionLinker,
    CombatSuggestionEngine,
    requestCombatEvaluation,
    AbilityExecutionCoordinator
  };

  const debugAPI = {
    testHarness,
    debounce,
    throttle,
    logError,
    errors: errorCommands,
    phase5: {
      summary: getPhaseSummary
    },
    // PHASE 3: Batch 1 Validation Suite
    batch1: {
      validate: () => Batch1Validation.runFullSuite(),
      healthCheck: () => Batch1Validation.healthCheck()
    },
    // PHASE 3: Batch 2 Combat Tests
    batch2: {
      testDamage: () => DamageEngineTest.runFullSuite(),
      testCombatComplete: () => Batch2ComprehensiveTest.runFullSuite()
    },
    // Sentinel Runtime Kernel API
    sentinel: {
      status: () => SentinelEngine.getStatus(),
      health: () => SentinelEngine.getHealthState(),
      reports: (layer, severity) => SentinelEngine.getReports(layer, severity),
      performance: () => SentinelEngine.getPerformanceMetrics(),
      snapshot: () => SentinelEngine.dumpSnapshot(),
      flushAggregates: () => SentinelEngine.flushAggregates()
    },
    // Auditors (CSS + Migration validation)
    auditors: {
      cssHealth: () => auditCSSHealth(),
      migrationReport: () => generateMigrationReport(),
      appv2Audit: () => AppV2AuditRunner.runAudit(),
      appv2AuditQuick: () => AppV2AuditRunner.quickCheck(),
      appv2AuditExport: () => AppV2AuditRunner.exportReport(),
      // Phase A2: Character Sheet Integration Audit (partials, rolls, fields, position, recalc)
      characterSheetA2: {
        audit: async (actor) => {
          const audit = new SWSEV2CharacterSheetAudit();
          await audit.runFullAudit(actor);
          return audit;
        },
        runOnSelected: async () => {
          const audit = new SWSEV2CharacterSheetAudit();
          await audit.runFullAudit();
          return audit;
        },
        // Phase B: Quick smoke tests after fixes
        test: async (actor) => {
          const harness = new CharacterSheetIntegrationTestHarness(actor);
          return await harness.runAll();
        }
      }
    },
    // Combat regression tests
    combat: {
      testConditionPenalty: async (actor) => {
        const { testConditionPenalty } = await import("/systems/foundryvtt-swse/scripts/debug/condition-penalty-regression-test.js");
        return await testConditionPenalty(actor || canvas?.tokens?.controlled?.[0]?.actor);
      }
    },
    // Reporting: Generate and export comprehensive audit reports
    reporting: {
      getFullReport: () => SentinelReporter.getReportAsString(),
      printReport: () => SentinelReporter.printReport(),
      saveAsLog: (filename) => SentinelReporter.saveReportToDocuments(filename || 'swse-sentinel-audit-' + Date.now())
    }
  };

  window.SWSE = {
    // Core engines (bootstrap attachment)
    RollEngine,
    ModifierEngine,
    DropService,
    DroidValidationEngine,
    // Public APIs
    api: publicAPI,
    debug: {
      ...debugAPI,
      // Lifecycle debugger (observability layer)
      debugger: {
        enable: () => SWSEDebugger.enable(),
        disable: () => SWSEDebugger.disable(),
        export: () => SWSEDebugger.exportJSON(),
        getEvents: () => SWSEDebugger.events,
        getStats: () => SWSEDebugger.getStats(),
        getMetrics: () => SWSEDebugger.metrics
      },
      // Sentinel diagnostics reports
      sentinel: {
        getStatus: () => window.__SWSE_SENTINEL__?.getStatus(),
        getReports: (...args) => window.__SWSE_SENTINEL__?.getReports(...args),
        getHealthDetails: () => window.__SWSE_SENTINEL__?.getHealthDetails?.(),
        getPerformanceMetrics: () => window.__SWSE_SENTINEL__?.getPerformanceMetrics()
      }
    },
    // Structured diagnostic reports
    reports: {
      health: () => SentinelReports.generateHealthReport(),
      crashes: () => SentinelReports.generateCrashReport(),
      performance: () => SentinelReports.generatePerformanceReport(),
      integrity: () => SentinelReports.generateIntegrityReport(),
      mutations: () => SentinelReports.generateMutationReport(),
      classification: () => SentinelReports.generateClassificationReport(),
      full: () => SentinelReports.generateFullReport(),
      export: () => SentinelReports.exportFullReport()
    },
    // Extension points for talent/ability systems (populated by init modules)
    talents: {},
    macros: {},
    // PHASE 10: Public API exposure
    SENTINEL_STATUS: SentinelEngine.getStatus()
  };

  if (!(game.modules.get('_dev-mode')?.active ?? false)) {
    Object.freeze(window.SWSE);
  }

  // Flush aggregates before completion
  SentinelEngine.flushAggregates();

  // Emit boot success banner (only if healthy)
  SentinelEngine.markBootComplete();

  onDiscoveryReady();

  console.timeEnd('SWSE Ready');
  swseLogger.log('SWSE | Fully loaded');
});

/* ==========================================================================
   CANVAS SAFETY
   ========================================================================== */

Hooks.on('canvasReady', () => {
  const board = document.querySelector('#board');
  if (board) {
    board.style.display = 'block';
    board.style.visibility = 'visible';
    board.style.opacity = '1';
  }
});

/* ==========================================================================
   SENTINEL SHUTDOWN
   ========================================================================== */

Hooks.once('canvasDestroyed', () => {
  SentinelEngine.shutdown();
});

import { UIManager } from './scripts/ui/ui-manager.js';
UIManager.init();



// ==========================================================
// HANDLEBARS RANGE HELPER (IMMEDIATE REGISTRATION)
// ==========================================================
if (!Handlebars.helpers.range) {
  Handlebars.registerHelper("range", function(start, end) {
    let arr = [];
    for (let i = start; i < end; i++) {
      arr.push(i);
    }
    return arr;
  });
}
