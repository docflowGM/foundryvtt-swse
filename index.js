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
   JQUERY RUNTIME GUARD (v13 compliance)
   ========================= */

if (typeof $ !== 'undefined' || typeof jQuery !== 'undefined') {
  const jq = globalThis.$ || globalThis.jQuery;
  if (jq) {
    const originalFind = jq.fn?.find;
    const originalOn = jq.fn?.on;

    // Override jQuery methods to prevent v1 slippage
    if (jq.fn) {
      jq.fn.find = function() {
        const stack = new Error().stack;
        console.error('🔥 SWSE | jQuery.find() detected at runtime (v1 pattern). Use element.querySelector() instead.\n', stack);
        throw new Error('SWSE: jQuery methods are not permitted in AppV2. Use DOM APIs instead.');
      };

      jq.fn.on = function() {
        const stack = new Error().stack;
        console.error('🔥 SWSE | jQuery.on() detected at runtime (v1 pattern). Use addEventListener() instead.\n', stack);
        throw new Error('SWSE: jQuery event binding is not permitted in AppV2. Use addEventListener instead.');
      };
    }
  }
}

/* =========================
   IMPORTS
   ========================= */

// ---- core / config ----
import { SWSE } from './scripts/core/config.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { initializeUtils } from './scripts/core/utils-init.js';
import { initializeRolls } from './scripts/core/rolls-init.js';

// ---- v13 hardening ----
import { initializeHardeningSystem, validateSystemReady, registerHardeningHooks } from './scripts/core/hardening-init.js';

// ---- logging / perf ----
import { swseLogger } from './scripts/utils/logger.js';
import { perfMonitor, debounce, throttle } from './scripts/utils/performance-utils.js';
import { errorHandler, errorCommands, logError } from './scripts/core/error-handler.js';

// ---- data / preload ----
import { dataPreloader } from './scripts/core/data-preloader.js';
import { runJsonBackedIdsMigration } from './scripts/migrations/json-backed-ids-migration.js';
import { CompendiumVerification } from './scripts/core/compendium-verification.js';

// ---- actors / items ----
import { SWSEV2BaseActor } from './scripts/actors/v2/base-actor.js';
import { SWSEItemBase } from './scripts/items/base/swse-item-base.js';
import { ActorEngine } from './scripts/actors/engine/actor-engine.js';

// ---- sheets ----
import { SWSEV2CharacterSheet } from './scripts/sheets/v2/character-sheet.js';
import { SWSEV2NpcSheet } from './scripts/sheets/v2/npc-sheet.js';
import { SWSEV2DroidSheet } from './scripts/sheets/v2/droid-sheet.js';
import { SWSEV2VehicleSheet } from './scripts/sheets/v2/vehicle-sheet.js';
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

// ---- handlebars ----
import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { registerSWSEPartials } from './helpers/handlebars/partials-auto.js';
import { preloadHandlebarsTemplates, assertPartialsResolved } from './scripts/core/load-templates.js';

// ---- engines ----
import { RulesEngine } from './scripts/rules/rules-engine.js';
import { SWSEProgressionEngine, initializeProgressionHooks } from './scripts/engine/progression.js';
import { FeatSystem } from './scripts/engine/FeatSystem.js';
import { SkillSystem } from './scripts/engine/SkillSystem.js';
import { TalentAbilitiesEngine } from './scripts/engine/TalentAbilitiesEngine.js';
import TalentActionLinker from './scripts/engine/talent-action-linker.js';
import { SWSELanguageModule } from './scripts/progression/modules/language-module.js';

// ---- hooks ----
import { registerInitHooks, registerDestinyHooks } from './scripts/hooks/index.js';
import { initializeForcePowerHooks } from './scripts/hooks/force-power-hooks.js';
import { initializeFollowerHooks } from './scripts/hooks/follower-hooks.js';
import { registerKeybindings } from './scripts/core/keybindings.js';

// ---- UI systems (registered in init, initialized in ready) ----
import { ThemeLoader } from './scripts/theme-loader.js';
import { initializeSceneControls } from './scripts/scene-controls/init.js';
import { initializeActionPalette } from './scripts/ui/action-palette/init.js';
import { initializeGMSuggestions } from './scripts/gm-suggestions/init.js';
import { MentorTranslationSettings } from './scripts/ui/dialogue/mentor-translation-settings.js';

// ---- suggestions / discovery ----
import { SuggestionService } from './scripts/engine/SuggestionService.js';
import { registerSuggestionHooks } from './scripts/hooks/suggestion-hooks.js';
import { registerCombatSuggestionHooks, requestCombatEvaluation } from './scripts/suggestion-engine/combat-hooks.js';
import { CombatSuggestionEngine } from './scripts/suggestion-engine/combat-engine.js';
import { testHarness } from './scripts/suggestion-engine/test-harness.js';
import { initializeDiscoverySystem, onDiscoveryReady } from './scripts/ui/discovery/index.js';

// ---- misc ----
import { SystemInitHooks } from './scripts/progression/hooks/system-init-hooks.js';
import { Upkeep } from './scripts/automation/upkeep.js';

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

Hooks.once('init', async () => {
  if (globalThis.__SWSE_INIT__) return;
  globalThis.__SWSE_INIT__ = true;

  swseLogger.log('SWSE | Init start');

  /* ---------- PHASE -1: v13 hardening (must be first) ---------- */
  await initializeHardeningSystem();
  registerHardeningHooks();

  /* ---------- PHASE 0: invariants ---------- */
  registerHandlebarsHelpers();
  Handlebars.registerHelper('let', (ctx, opts) => opts.fn({ ...this, ...ctx }));

  /* ---------- PHASE 1: settings & hooks ---------- */
  registerSystemSettings();
  MentorTranslationSettings.registerSettings();
  initializeDiscoverySystem();

  registerInitHooks();
  registerDestinyHooks();
  registerKeybindings();

  /* ---------- PHASE 2: UI infrastructure ---------- */
  ThemeLoader.init();
  await bootstrapTemplates();

  /* ---------- PHASE 3: documents & sheets ---------- */
  CONFIG.SWSE = SWSE;
  CONFIG.Actor.documentClass = SWSEV2BaseActor;
  CONFIG.Item.documentClass = SWSEItemBase;

  foundry.documents.collections.Actors.registerSheet('swse', SWSEV2CharacterSheet, { types: ['character'], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet('swse', SWSEV2NpcSheet, { types: ['npc'], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet('swse', SWSEV2DroidSheet, { types: ['droid'], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet('swse', SWSEV2VehicleSheet, { types: ['vehicle'], makeDefault: true });
  foundry.documents.collections.Items.registerSheet('swse', SWSEItemSheet, { makeDefault: true });

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

  /* ---------- v13 hardening validation ---------- */
  await validateSystemReady();

  errorHandler.initialize();
  initializeRolls();

  /* ---------- data & progression ---------- */
  // Verify compendium integrity first (fail-fast if missing)
  await CompendiumVerification.verifyCompendiums();

  await Promise.all([
    dataPreloader.preload({
      priority: ['classes', 'skills'],
      background: ['feats', 'talents', 'species']
    }),
    runJsonBackedIdsMigration()
  ]);

  await SystemInitHooks.onSystemReady();

  initializeForcePowerHooks();
  initializeFollowerHooks();
  initializeProgressionHooks();
  SWSELanguageModule.init();

  /* ---------- suggestions ---------- */
  await bootstrapSuggestionSystem();

  /* ---------- UI (DOM-safe) ---------- */
  initializeSceneControls();
  initializeActionPalette();
  MentorTranslationSettings.loadSettings();

  /* ---------- engines ---------- */
  RulesEngine.init();
  Upkeep.init();
  initializeUtils();

  /* ---------- global API ---------- */
  const publicAPI = {
    ActorEngine,
    FeatSystem,
    SkillSystem,
    TalentAbilitiesEngine,
    TalentActionLinker,
    CombatSuggestionEngine,
    requestCombatEvaluation
  };

  const debugAPI = {
    testHarness,
    debounce,
    throttle,
    logError,
    errors: errorCommands
  };

  window.SWSE = {
    api: publicAPI,
    debug: debugAPI
  };

  if (!game.settings.get('core', 'devMode')) {
    Object.freeze(window.SWSE);
  }

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
