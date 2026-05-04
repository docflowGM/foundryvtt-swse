/**
 * ShellOverlayManager — Overlay container helpers (Phase 11)
 *
 * Provides static helpers for opening shell overlays from anywhere in the system.
 * All callers must go through ShellRouter — this module wraps common overlay patterns.
 *
 * OVERLAY container classification (Phase 11 Addendum):
 *   - upgrade-single-item: focused single-item upgrade
 *   - confirm-*: short confirmation dialogs
 *   - warning-*: invalid action / prerequisite-not-met notices
 */

import { ShellRouter } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js';
import { openItemCustomization } from '/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js';

export class ShellOverlayManager {

  /**
   * Open an upgrade overlay for a single item.
   * Preferred container for single-item upgrade from item sheets.
   *
   * @param {Actor} actor
   * @param {Item} item
   * @returns {Promise<object|null>} Shell host
   */
  static async openSingleItemUpgrade(actor, item) {
    if (!actor || !item) return null;
    return openItemCustomization(actor, item);
  }

  /**
   * Open a confirmation overlay on the actor's shell.
   *
   * @param {Actor} actor
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} [params.confirmLabel]
   * @param {string} [params.cancelLabel]
   * @param {boolean} [params.isDangerous]
   * @param {Function} params.onConfirm - Async callback on confirm
   * @param {Function} [params.onCancel] - Async callback on cancel
   * @returns {Promise<object|null>} Shell host
   */
  static async openConfirmation(actor, params) {
    if (!actor) return null;
    const overlayId = `confirm-${params.id ?? 'generic'}`;
    return ShellRouter.openOverlay(actor, overlayId, params);
  }

  /**
   * Open a warning overlay on the actor's shell.
   *
   * @param {Actor} actor
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} [params.dismissLabel]
   * @returns {Promise<object|null>} Shell host
   */
  static async openWarning(actor, params) {
    if (!actor) return null;
    const overlayId = `warning-${params.id ?? 'generic'}`;
    return ShellRouter.openOverlay(actor, overlayId, params);
  }

  /**
   * Close whatever overlay is currently active on the actor's shell.
   *
   * @param {Actor} actor
   */
  static async closeOverlay(actor) {
    return ShellRouter.closeOverlay(actor);
  }
}
