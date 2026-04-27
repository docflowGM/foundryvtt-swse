/**
 * ShellDrawerManager — Drawer container helpers (Phase 11)
 *
 * Provides static helpers for opening shell drawers from anywhere in the system.
 * All callers must go through ShellRouter — this module wraps common drawer patterns.
 *
 * DRAWER container classification (Phase 11 Addendum):
 *   - item-detail:        supporting item detail without leaving main view
 *   - choice-detail:      feat/talent prerequisites & effects inspector
 *   - selection-detail:   species/class/background explanation panel
 *   - modifier-breakdown: ephemeral numeric breakdown inspector
 *   - filter-drawer:      advanced filter/sort panel
 *   - mentor-advice:      expanded mentor guidance
 */

import { ShellRouter } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js';

export class ShellDrawerManager {

  /**
   * Open the item detail drawer.
   *
   * @param {Actor} actor
   * @param {string} entityId
   * @returns {Promise<object|null>}
   */
  static async openItemDetail(actor, entityId) {
    return ShellRouter.openDrawer(actor, 'item-detail', { entityId });
  }

  /**
   * Open the choice detail drawer (feat/talent inspector).
   *
   * @param {Actor} actor
   * @param {string} entityId
   * @param {string} entityType - 'feat' | 'talent' | 'ability'
   * @param {string} [title]
   * @returns {Promise<object|null>}
   */
  static async openChoiceDetail(actor, entityId, entityType, title) {
    return ShellRouter.openDrawer(actor, 'choice-detail', { entityId, entityType, title });
  }

  /**
   * Open the selection detail drawer (species/class/background panel).
   *
   * @param {Actor} actor
   * @param {string} entityId
   * @param {string} entityType - 'species' | 'class' | 'background'
   * @param {string} [title]
   * @returns {Promise<object|null>}
   */
  static async openSelectionDetail(actor, entityId, entityType, title) {
    return ShellRouter.openDrawer(actor, 'selection-detail', { entityId, entityType, title });
  }

  /**
   * Open the modifier breakdown drawer.
   *
   * @param {Actor} actor
   * @param {object} params
   * @param {string} params.label - What is being broken down
   * @param {Array} params.modifiers - Array of modifier objects
   * @param {number} params.total
   * @returns {Promise<object|null>}
   */
  static async openModifierBreakdown(actor, params) {
    return ShellRouter.openDrawer(actor, 'modifier-breakdown', params);
  }

  /**
   * Open the filter/sort drawer.
   *
   * @param {Actor} actor
   * @param {object} params
   * @returns {Promise<object|null>}
   */
  static async openFilterDrawer(actor, params = {}) {
    return ShellRouter.openDrawer(actor, 'filter-drawer', params);
  }

  /**
   * Open the mentor advice drawer.
   *
   * @param {Actor} actor
   * @param {string} advice
   * @param {string} [mood]
   * @returns {Promise<object|null>}
   */
  static async openMentorAdvice(actor, advice, mood = 'neutral') {
    return ShellRouter.openDrawer(actor, 'mentor-advice', { advice, mood });
  }

  /**
   * Close whatever drawer is currently active on the actor's shell.
   *
   * @param {Actor} actor
   */
  static async closeDrawer(actor) {
    return ShellRouter.closeDrawer(actor);
  }
}
