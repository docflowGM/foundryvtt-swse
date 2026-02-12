/**
 * ============================================================
 * SWSE Template Loader - Optimized Handlebars Preloading
 * ============================================================
 *
 * This module implements a two-tier template loading strategy:
 *
 * 1. CRITICAL TEMPLATES (preloadHandlebarsTemplates)
 *    - Loaded immediately on system ready
 *    - Required for character/NPC/vehicle/droid sheet rendering
 *    - Includes main sheet templates and all character tabs
 *    - ~19 template files loaded synchronously
 *
 * 2. LAZY TEMPLATES (registered on demand)
 *    - Loaded in background with 1s delay to avoid UI blocking
 *    - Requested for dialogs, applications, item sheets, etc.
 *    - ~9 template files loaded asynchronously
 *    - Improves initial system load performance
 *
 * OVERVIEW OF ALL TEMPLATES:
 * - Character sheet tabs (9): summary, abilities, skills, combat,
 *   force, talents, inventory, biography, import-export, starship-maneuvers
 * - Actor sheets (4): character, droid, NPC, vehicle
 * - Critical partials (5): persistent-header, condition-track, skill-row,
 *   feat-actions-panel, talent-abilities-panel
 * - Lazy partials (8): ability-block, ability-scores, defenses,
 *   ship-combat-actions, tab-navigation, item-controls, etc.
 * - Item sheets (1): base item sheet for all item types
 * - Canvas UI (1): toolbar
 * - NPC/Droid/Vehicle blocks (24): dynamically loaded via
 *   preloadHandlebarsTemplates() utility function
 *
 * NOTE ON "ORPHANED" TEMPLATES:
 * 24 template files appear orphaned because they're not explicitly
 * imported in JavaScript files. They are actually loaded via this
 * preloadHandlebarsTemplates() function using Foundry's template
 * registry system. This is intentional dynamic loading.
 *
 * References in code:
 * - called from: scripts/core/init-system.js (Hooks.once('ready'))
 * - uses: foundry.applications.handlebars.loadTemplates()
 * - cached by: Foundry core template registry
 *
 * Performance characteristics:
 * - Critical templates: ~100ms load time (blocking)
 * - Lazy templates: ~200ms load time (background, non-blocking)
 * - Total UI impact: <1 second additional load time
 */
import { SWSELogger } from '../utils/logger.js';

/**
 * Safe accessor for devMode setting
 * Safely checks if core.devMode is registered before accessing
 */
function getDevMode() {
  try {
    return game.settings.get('core', 'devMode');
  } catch {
    return false;
  }
}

// ============================================
// EXPLICIT PARTIAL REGISTRATION
// ============================================
// All partials must be explicitly listed here.
// This creates a single audit surface for partial updates.
// Never reference a partial that isn't in this list.
export const SWSE_PARTIALS = [
  // Actor sheet partials
  'systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs',

  // UI partials
  'systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs',

  // Skill system partials
  'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-action-card.hbs',

  // Action panels
  'systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs',

  // Ability blocks
  'systems/foundryvtt-swse/templates/partials/ability-block.hbs',
  'systems/foundryvtt-swse/templates/partials/ability-scores.hbs',

  // Combat partials
  'systems/foundryvtt-swse/templates/partials/defenses.hbs',
  'systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs',

  // Vehicle partials
  'systems/foundryvtt-swse/templates/partials/crew-action-cards.hbs',

  // Navigation and controls
  'systems/foundryvtt-swse/templates/partials/tab-navigation.hbs',
  'systems/foundryvtt-swse/templates/partials/item-controls.hbs',

  // Asset panels
  'systems/foundryvtt-swse/templates/partials/assets-panel.hbs',

  // Droid diagnostic
  'systems/foundryvtt-swse/templates/actors/droid/droid-diagnostic.hbs',

  // Droid v1 partials
  'systems/foundryvtt-swse/templates/actors/droid/droid-image-operational.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/droid-callouts-operational.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/droid-image-blueprint.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/droid-callouts-blueprint.hbs',

  // Vehicle partials
  'systems/foundryvtt-swse/templates/actors/vehicle/vehicle-image.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/vehicle-callouts.hbs',

  // NPC partials
  'systems/foundryvtt-swse/templates/actors/npc/npc-image.hbs',
  'systems/foundryvtt-swse/templates/actors/npc/npc-core-stats.hbs',
  'systems/foundryvtt-swse/templates/actors/npc/npc-weapon-block.hbs',
  'systems/foundryvtt-swse/templates/actors/npc/npc-talent-block.hbs',
  'systems/foundryvtt-swse/templates/actors/npc/npc-specials-block.hbs',
  'systems/foundryvtt-swse/templates/actors/npc/npc-diagnostics-block.hbs',

  // Character v2 partials
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs',

  // NPC v2 sheet
  'systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs',

  // Droid v2 partials
  'systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs',

  // Vehicle v2 partials
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/attacks-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/actions-panel.hbs',

  // Character v2 sheet
  'systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs',

  // Starship maneuvers
  'systems/foundryvtt-swse/templates/partials/starship-maneuvers-panel.hbs',

  // Suggestion card (recursive partial)
  'systems/foundryvtt-swse/templates/partials/suggestion-card.hbs'
];

// Track background template loading
let _backgroundTemplatePromise = null;

export async function preloadHandlebarsTemplates() {
  // ============================================
  // CRITICAL TEMPLATES - Load Immediately
  // These are needed for initial sheet render
  // ============================================
  const criticalTemplates = [
    // V1 Main sheet templates
    'systems/foundryvtt-swse/templates/actors/character/character-sheet.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/npc-sheet.hbs',
    'systems/foundryvtt-swse/templates/actors/vehicle/vehicle-sheet.hbs',

    // V2 Main sheet templates
    'systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs',
    'systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs',

    // Character tabs (all included in main template, must load immediately)
    'systems/foundryvtt-swse/templates/actors/character/tabs/summary-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/abilities-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/skills-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/combat-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/force-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/talents-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/inventory-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/biography-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/import-export-tab.hbs',
    'systems/foundryvtt-swse/templates/actors/character/tabs/starship-maneuvers-tab.hbs',

    // V2 Character partials (used by v2 sheets)
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs',

    // V2 Droid partials (used by v2 droid sheet)
    'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs',

    // V2 Vehicle partials (used by v2 vehicle sheet)
    'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/attacks-panel.hbs',
    'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/actions-panel.hbs',

    // Critical partials (used by critical templates above)
    'systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs',
    'systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs',
    'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
    'systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs',
    'systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs',

    // Droid-specific partials
    'systems/foundryvtt-swse/templates/actors/droid/droid-diagnostic.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/droid-image-operational.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/droid-callouts-operational.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/droid-image-blueprint.hbs',
    'systems/foundryvtt-swse/templates/actors/droid/droid-callouts-blueprint.hbs',

    // Vehicle-specific partials
    'systems/foundryvtt-swse/templates/actors/vehicle/vehicle-image.hbs',
    'systems/foundryvtt-swse/templates/actors/vehicle/vehicle-callouts.hbs',
    'systems/foundryvtt-swse/templates/partials/crew-action-cards.hbs',

    // NPC-specific partials
    'systems/foundryvtt-swse/templates/actors/npc/npc-image.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/npc-core-stats.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/npc-weapon-block.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/npc-talent-block.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/npc-specials-block.hbs',
    'systems/foundryvtt-swse/templates/actors/npc/npc-diagnostics-block.hbs',

    // Additional partials used by actor sheets
    'systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs',
    'systems/foundryvtt-swse/templates/partials/skill-action-card.hbs',
    'systems/foundryvtt-swse/templates/partials/assets-panel.hbs',
    'systems/foundryvtt-swse/templates/partials/suggestion-card.hbs',
    'systems/foundryvtt-swse/templates/partials/starship-maneuvers-panel.hbs'
  ];

  // ============================================
  // LAZY TEMPLATES - Load on Demand
  // These load when needed (dialogs, apps, etc.)
  // ============================================
  const lazyTemplates = [
    // Item sheets
    'systems/foundryvtt-swse/templates/items/base/item-sheet.hbs',

    // Apps / dialogs
    'systems/foundryvtt-swse/templates/apps/npc-levelup-entry.hbs',

    // Less common partials
    'systems/foundryvtt-swse/templates/partials/ability-block.hbs',
    'systems/foundryvtt-swse/templates/partials/ability-scores.hbs',
    'systems/foundryvtt-swse/templates/partials/defenses.hbs',
    'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
    'systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs',
    'systems/foundryvtt-swse/templates/partials/tab-navigation.hbs',
    'systems/foundryvtt-swse/templates/partials/item-controls.hbs',

    // Canvas UI
    'systems/foundryvtt-swse/templates/canvas-ui/toolbar.hbs',

    // UI Applications
    'systems/foundryvtt-swse/templates/ui/action-palette.hbs'
  ];

  SWSELogger.log(`SWSE | Preloading ${criticalTemplates.length} critical templates...`);

  try {
    // Load critical templates immediately
    await foundry.applications.handlebars.loadTemplates(criticalTemplates);
    SWSELogger.log(`SWSE | Critical templates loaded (${criticalTemplates.length})`);

    // Register lazy templates with lazy loader if available
    if (window.SWSE?.lazyLoader) {
      for (const path of lazyTemplates) {
        const name = path.split('/').pop().replace('.hbs', '');
        window.SWSE.lazyLoader.registerTemplate(name, path);
      }
      SWSELogger.log(`SWSE | Registered ${lazyTemplates.length} templates for lazy loading`);
    } else {
      // Fallback: load all templates in background with promise tracking
      _backgroundTemplatePromise = new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await foundry.applications.handlebars.loadTemplates(lazyTemplates);
            SWSELogger.log(`SWSE | Background templates loaded (${lazyTemplates.length})`);
            resolve();
          } catch (error) {
            SWSELogger.error('SWSE | Error loading background templates:', error);
            resolve(); // Resolve anyway to prevent hanging
          }
        }, 1000);
      });
    }

    return true;
  } catch (err) {
    SWSELogger.error('SWSE | Error loading templates:', err);
    return false;
  }
}

/**
 * Wait for background templates to finish loading
 * @returns {Promise<void>}
 */
export async function waitForBackgroundTemplates() {
  if (_backgroundTemplatePromise) {
    await _backgroundTemplatePromise;
  }
}

/**
 * Get all template paths for reference
 * @returns {Object} Object with critical and lazy template arrays
 */
export function getTemplatePaths() {
  return {
    critical: [
      // V1 sheets
      'systems/foundryvtt-swse/templates/actors/character/character-sheet.hbs',
      'systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs',
      'systems/foundryvtt-swse/templates/actors/npc/npc-sheet.hbs',
      'systems/foundryvtt-swse/templates/actors/vehicle/vehicle-sheet.hbs',
      // V2 sheets
      'systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs',
      'systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs',
      'systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs',
      'systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs',
      // Character tabs
      'systems/foundryvtt-swse/templates/actors/character/tabs/summary-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/abilities-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/skills-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/combat-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/force-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/talents-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/inventory-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/biography-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/import-export-tab.hbs',
      'systems/foundryvtt-swse/templates/actors/character/tabs/starship-maneuvers-tab.hbs',
      // V2 partials
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs',
      'systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs',
      // Other critical partials
      'systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs',
      'systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs',
      'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
      'systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs',
      'systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs'
    ],
    lazy: [
      'systems/foundryvtt-swse/templates/items/base/item-sheet.hbs',
      'systems/foundryvtt-swse/templates/partials/ability-block.hbs',
      'systems/foundryvtt-swse/templates/partials/ability-scores.hbs',
      'systems/foundryvtt-swse/templates/partials/defenses.hbs',
      'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
      'systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs',
      'systems/foundryvtt-swse/templates/partials/tab-navigation.hbs',
      'systems/foundryvtt-swse/templates/partials/item-controls.hbs',
      'systems/foundryvtt-swse/templates/canvas-ui/toolbar.hbs'
    ]
  };
}

/**
 * Validate that all registered partials loaded successfully (dev-only).
 * Catches missing or typo'd partials early instead of silent rendering failures.
 * @returns {void}
 */
export function assertPartialsResolved() {
  if (!getDevMode()) {return;}

  const missingPartials = [];
  for (const path of SWSE_PARTIALS) {
    if (!Handlebars.partials[path]) {
      missingPartials.push(path);
      console.error(`[SWSE] Partial failed to register: ${path}`);
    }
  }

  if (missingPartials.length > 0) {
    console.warn(`[SWSE] ${missingPartials.length} partial(s) failed to load. This will cause blank sections.`);
  }
}
