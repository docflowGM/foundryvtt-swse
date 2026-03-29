import { SWSE_CONSTANTS } from "/systems/foundryvtt-swse/scripts/core/constants.js";

// ============================================
// FILE: module/core/config.js
// ============================================
export const SWSE = {};

SWSE.actorTypes = ['character', 'droid', 'vehicle', 'npc'];
SWSE.constants = SWSE_CONSTANTS;

SWSE.itemTypes = ['armor', 'attribute', 'class', 'combat-action', 'equipment', 'extra-skill-use', 'feat', 'forcepower', 'skill', 'species', 'talent', 'talenttree', 'weapon'];

/**
 * Debug and Development Configuration
 * ===================================
 * Control debugging features and development utilities
 */
SWSE.debug = {
  /**
   * Enable SVG layout debug mode
   * Shows grid overlays, safe area indicators, and positioned element boundaries
   * Usage: CONFIG.SWSE.debug.layoutDebug = true (or use game.swse.toggleLayoutDebug())
   */
  layoutDebug: false
};
