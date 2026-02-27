/**
 * ============================================================
 * SWSE Template Loader (v13 / AppV2 Deterministic)
 * ============================================================
 *
 * - Single authoritative template registry
 * - No lazy loading
 * - No duplicate arrays
 * - No v1 sheets
 * - No basename registration
 * - Full path keys only
 * - Must be called during Hooks.once('init')
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * All templates used by the system.
 * These paths MUST match exactly how they are referenced in {{> }} calls.
 */
export const SWSE_TEMPLATES = [

  // ==============================
  // V2 Actor Sheets
  // ==============================
  'systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs',
  'systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs',

  // ==============================
  // Character v2 Partials
  // ==============================
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs',

  // ==============================
  // Droid v2 Partials
  // ==============================
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs',

  // ==============================
  // Vehicle v2 Partials
  // ==============================
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/attacks-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/actions-panel.hbs',

  // ==============================
  // Shared Partials
  // ==============================
  'systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs',
  'systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-action-card.hbs',
  'systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/ability-block.hbs',
  'systems/foundryvtt-swse/templates/partials/ability-scores.hbs',
  'systems/foundryvtt-swse/templates/partials/defenses.hbs',
  'systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/crew-action-cards.hbs',
  'systems/foundryvtt-swse/templates/partials/tab-navigation.hbs',
  'systems/foundryvtt-swse/templates/partials/item-controls.hbs',
  'systems/foundryvtt-swse/templates/partials/assets-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/suggestion-card.hbs',
  'systems/foundryvtt-swse/templates/partials/starship-maneuvers-panel.hbs',

  // ==============================
  // Item Sheets
  // ==============================
  'systems/foundryvtt-swse/templates/items/base/item-sheet.hbs',

  // ==============================
  // Applications
  // ==============================
  'systems/foundryvtt-swse/templates/apps/npc-levelup-entry.hbs',

];


/**
 * Preload all templates.
 * Must be called during Hooks.once('init').
 */
export async function preloadHandlebarsTemplates() {
  try {
    SWSELogger.log(`SWSE | Preloading ${SWSE_TEMPLATES.length} templates...`);

    await foundry.applications.handlebars.loadTemplates(SWSE_TEMPLATES);

    SWSELogger.log(`SWSE | Template preload complete.`);

    return true;
  } catch (err) {
    SWSELogger.error('SWSE | Template preload failed:', err);
    return false;
  }
}


/**
 * Dev-only sanity check to ensure all templates are registered.
 */
export function assertTemplatesResolved() {
  if (!(game.modules.get('_dev-mode')?.active ?? false)) return;

  const missing = [];

  for (const path of SWSE_TEMPLATES) {
    if (!Handlebars.partials[path]) {
      missing.push(path);
      console.error(`[SWSE] Missing partial registration: ${path}`);
    }
  }

  if (missing.length) {
    console.warn(`[SWSE] ${missing.length} template(s) failed to register.`);
  }
}

// Export alias for backwards compatibility
export const assertPartialsResolved = assertTemplatesResolved;
