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

const CHARACTER_V2_CONCEPT_TEMPLATES = [
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/character-sheet.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/hud-bar.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/title-strip.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/header-block.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/resource-strip.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/tabs-bar.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/sidebar.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/summary-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/abilities-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/skills-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/combat-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/talents-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/biography-tab.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/relationships-tab.hbs'
];

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
  // Character V2 Concept Sheet
  // ==============================
  ...CHARACTER_V2_CONCEPT_TEMPLATES,

  // ==============================
  // Character v2 Partials
  // ==============================
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/character-record-header.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/portrait-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/bio-profile-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/notes-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/biography-log-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/relationships-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/equipment-ledger-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/armor-summary-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/initiative-control.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/combat-stats-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/summary/shield-rating.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/special-combat-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/xp-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-known-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/force-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/force-powers-known-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/racial-ability-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/resources-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-item-row.hbs',

  // ==============================
  // Droid v2 Partials
  // ==============================
  // Legacy monolithic panels (used by NPC sheet, kept for backward compatibility)
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs',
  // Phase 2: New subsystem partials for droid sheet systems tab
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-summary-strip.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-locomotion-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-processor-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-integrated-systems-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-validation-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history-panel.hbs',
  // Phase 3B: Subsystem detail enrichment partials
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-appendages-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-sensors-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-integrated-weapons-panel.hbs',
  // Phase 4: Armor detail and budget analysis partials
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-armor-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-budget-breakdown-panel.hbs',
  // Other droid partials
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/initiative-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/equipment-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/armor-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/weapons-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/owned-actors-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/droid/v2/partials/stock-droid-provenance-panel.hbs',

  // ==============================
  // Vehicle v2 Partials
  // ==============================
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/identity-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/resource-cartridges.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/hp-condition-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/defenses-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/damage-threshold-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/cargo-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/crew-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/attacks-panel.hbs',
  'systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/actions-panel.hbs',

  // ==============================
  // NPC Partials
  // ==============================
  'systems/foundryvtt-swse/templates/actors/npc/npc-image.hbs',

  // ==============================
  // Shared Partials
  // ==============================
  'systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs',
  'systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs',
  'systems/foundryvtt-swse/templates/partials/ui/combat/action-enforcement-mode-indicator.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-row-static.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/skill-action-card.hbs',
  'systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/talent-abilities-panel.hbs',
  'systems/foundryvtt-swse/templates/partials/ability-block.hbs',
  'systems/foundryvtt-swse/templates/partials/ability-card.hbs',
  'systems/foundryvtt-swse/templates/partials/ability-scores.hbs',
  'systems/foundryvtt-swse/templates/partials/defenses.hbs',
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
  // Progression Applications (Legacy & New Shell)
  // ==============================
  'systems/foundryvtt-swse/templates/apps/chargen.hbs',
  'systems/foundryvtt-swse/templates/apps/levelup.hbs',
  'systems/foundryvtt-swse/templates/apps/npc-levelup-entry.hbs',
  'systems/foundryvtt-swse/templates/apps/levelup-engine-ui.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-background-mentor-suggestion.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-class-required-dialog.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-custom-language.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-droid-import.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-feat-suggestions-dialog.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-skill-focus.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen-template-selection.hbs',
  'systems/foundryvtt-swse/templates/apps/chargen/ability-rolling.hbs',

  // ==============================
  // Progression Framework (New Shell System)
  // ==============================
  'systems/foundryvtt-swse/templates/apps/progression-framework/progression-shell.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/mentor-rail.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/progress-rail.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/utility-bar.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/diagnostic-banner.hbs',

  // Step Work Surfaces
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/attribute-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/background-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/class-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/confirm-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/feat-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-power-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-secret-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-technique-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/language-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/near-human-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/species-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/starship-maneuver-work-surface.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/talent-tree-browser.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/steps/talent-tree-graph.hbs',

  // Details Panels
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/attribute-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/background-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/class-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/confirm-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/feat-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-power-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-secret-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-technique-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/language-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/species-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/starship-maneuver-details.hbs',
  'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/talent-details.hbs',

  // Progression (Legacy)
  'systems/foundryvtt-swse/templates/apps/progression/attribute-method.hbs',
  'systems/foundryvtt-swse/templates/apps/progression/sidebar.hbs',

  // Chat
  'systems/foundryvtt-swse/templates/chat/progression-session-summary.hbs',

  // Chargen Partials
  'systems/foundryvtt-swse/templates/partials/chargen/near-human.hbs',

  // ==============================
  // Upgrade Workshop (Phase 10)
  // ==============================
  'systems/foundryvtt-swse/templates/apps/upgrade/upgrade-app.hbs',
  'systems/foundryvtt-swse/templates/apps/upgrade/partials/upgrade-detail-pane.hbs',
  'systems/foundryvtt-swse/templates/apps/upgrade/partials/lightsaber-detail.hbs',
  'systems/foundryvtt-swse/templates/apps/upgrade/partials/upgrade-footer.hbs',

  // ==============================
  // Shell Surfaces (Phase 12)
  // ==============================
  'systems/foundryvtt-swse/templates/shell/partials/surface-home.hbs',
  'systems/foundryvtt-swse/templates/shell/partials/surface-settings.hbs',
  'systems/foundryvtt-swse/templates/shell/partials/surface-mentor.hbs',

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
