/**
 * ShellRouter — Single-window surface routing authority (Phase 11)
 *
 * All major workflow launches (progression, chargen, upgrade) MUST go through
 * this router instead of directly calling .render(true) on standalone apps.
 *
 * The router finds or opens the actor's character sheet (shell host) and
 * delegates surface switching to it.
 *
 * CONTAINER CLASSIFICATION (from Phase 11 Addendum):
 *   Route   — full surface takeover (progression, chargen, actor-wide upgrade)
 *   Overlay — modal layer above current surface (single-item upgrade, confirmations)
 *   Drawer  — side panel alongside current surface (detail inspectors, breakdowns)
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ShellRouter {
  /** @type {Map<string, object>} actorId → shell host instance */
  static _registry = new Map();

  /**
   * Register a shell host for an actor.
   * Called automatically by the character sheet on construction/open.
   *
   * @param {string} actorId
   * @param {object} shellHost - The character sheet instance (ShellHostMixin applied)
   */
  static register(actorId, shellHost) {
    this._registry.set(actorId, shellHost);
    SWSELogger.debug(`[ShellRouter] Registered shell for actor: ${actorId}`);
  }

  /**
   * Unregister a shell host when the sheet closes.
   *
   * @param {string} actorId
   */
  static unregister(actorId) {
    this._registry.delete(actorId);
    SWSELogger.debug(`[ShellRouter] Unregistered shell for actor: ${actorId}`);
  }

  /**
   * Get the open shell host for an actor, or null if none is open.
   *
   * @param {string} actorId
   * @returns {object|null}
   */
  static getShell(actorId) {
    const host = this._registry.get(actorId);
    if (!host) return null;
    // Stale check: Foundry ApplicationV2 sets rendered = false when closed
    if (!host.rendered) {
      this._registry.delete(actorId);
      return null;
    }
    return host;
  }

  /**
   * Open a ROUTE surface on the actor's shell host.
   * If no shell is open, opens the actor sheet first (which registers as shell host).
   *
   * Route containers: 'sheet' | 'progression' | 'chargen' | 'upgrade'
   *
   * @param {Actor} actor
   * @param {string} surfaceId
   * @param {object} [options]
   * @returns {Promise<object>} The shell host
   */
  static async openSurface(actor, surfaceId, options = {}) {
    SWSELogger.debug(`[ShellRouter] openSurface → actor=${actor?.name}, surface=${surfaceId}`);

    let shell = this.getShell(actor.id);

    if (!shell) {
      // Open the actor sheet — it will register itself via ShellHostMixin on construction
      if (actor.sheet) {
        await actor.sheet.render(true);
        // Wait a tick for registration to complete
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      shell = this.getShell(actor.id);
    }

    if (!shell) {
      SWSELogger.error(`[ShellRouter] Could not open shell for actor: ${actor.name}`);
      return null;
    }

    await shell.setSurface(surfaceId, options);
    shell.render(false);

    return shell;
  }

  /**
   * Open an OVERLAY on the actor's current shell surface.
   *
   * Overlay containers: 'upgrade-single-item' | 'confirm-*' | 'warning-*'
   *
   * @param {Actor} actor
   * @param {string} overlayId
   * @param {object} [options]
   * @returns {Promise<object>} The shell host
   */
  static async openOverlay(actor, overlayId, options = {}) {
    SWSELogger.debug(`[ShellRouter] openOverlay → actor=${actor?.name}, overlay=${overlayId}`);

    let shell = this.getShell(actor.id);

    if (!shell) {
      shell = await this.openSurface(actor, 'sheet');
    }

    if (!shell) return null;

    await shell.openOverlay(overlayId, options);
    shell.render(false);

    return shell;
  }

  /**
   * Open a DRAWER alongside the actor's current shell surface.
   *
   * Drawer containers: 'item-detail' | 'choice-detail' | 'selection-detail' |
   *                    'modifier-breakdown' | 'filter-drawer' | 'mentor-advice'
   *
   * @param {Actor} actor
   * @param {string} drawerId
   * @param {object} [options]
   * @returns {Promise<object>} The shell host
   */
  static async openDrawer(actor, drawerId, options = {}) {
    SWSELogger.debug(`[ShellRouter] openDrawer → actor=${actor?.name}, drawer=${drawerId}`);

    let shell = this.getShell(actor.id);

    if (!shell) {
      shell = await this.openSurface(actor, 'sheet');
    }

    if (!shell) return null;

    await shell.openDrawer(drawerId, options);
    shell.render(false);

    return shell;
  }

  /**
   * Close the overlay on the actor's shell host and re-render.
   *
   * @param {Actor} actor
   */
  static async closeOverlay(actor) {
    const shell = this.getShell(actor.id);
    if (!shell) return;
    await shell.closeOverlay();
    shell.render(false);
  }

  /**
   * Close the drawer on the actor's shell host and re-render.
   *
   * @param {Actor} actor
   */
  static async closeDrawer(actor) {
    const shell = this.getShell(actor.id);
    if (!shell) return;
    await shell.closeDrawer();
    shell.render(false);
  }

  /**
   * Return the actor's shell to the 'sheet' surface.
   *
   * @param {Actor} actor
   */
  static async returnToSheet(actor) {
    const shell = this.getShell(actor.id);
    if (!shell) return;
    await shell.setSurface('sheet');
    shell.render(false);
  }

  /**
   * Notify the shell that an external surface (e.g. ProgressionShell) closed,
   * so the shell can return to the base 'sheet' mode.
   *
   * @param {string} actorId
   */
  static notifySurfaceClosed(actorId) {
    const shell = this.getShell(actorId);
    if (!shell) return;
    if (shell.shellSurface !== 'sheet') {
      shell.setSurface('sheet').then(() => shell.render(false));
    }
  }
}
