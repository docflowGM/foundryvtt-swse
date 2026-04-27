/**
 * SWSEUpgradeApp — Upgrade Workshop Application (Phase 10)
 *
 * Supports two launch modes:
 *   actor  — opened from the character sheet gear tab; browses all actor-owned upgradeable items
 *   single-item — opened from an item sheet; locked to that item
 *
 * Contract:
 *   - UI only requests data and sends commands
 *   - All mutations route through CommandBus → UpgradeCommands → UpgradeService → ActorEngine
 *   - No direct item/actor mutation in this file
 */

import { BaseSWSEAppV2 } from '/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js';
import { UpgradeService } from '/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js';
import { CommandBus } from '/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class SWSEUpgradeApp extends BaseSWSEAppV2 {

  /**
   * @param {Actor|Item} actorOrItem
   *   - Pass an Item document for legacy/single-item mode (item sheet launch)
   *   - Pass an Actor document for actor-wide mode (character sheet launch)
   * @param {object} options
   *   - mode: 'actor' | 'single-item'  (default: auto-detected)
   *   - focusedItemId: string  (required when mode === 'single-item' via actor API)
   */
  constructor(actorOrItem, options = {}) {
    super(options);

    // Auto-detect whether we received an Item or an Actor
    if (actorOrItem?.documentName === 'Item') {
      // Legacy item-sheet launch: new SWSEUpgradeApp(item)
      const item = actorOrItem;
      this.actor = item.actor ?? null;
      this.mode = 'single-item';
      this.focusedItemId = item.id;
    } else {
      // Actor-mode launch: new SWSEUpgradeApp(actor, { mode, focusedItemId })
      this.actor = actorOrItem ?? null;
      this.mode = options.mode ?? 'actor';
      this.focusedItemId = options.focusedItemId ?? null;
    }

    this.selectedCategoryId = null;
    this.selectedItemId = this.focusedItemId ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: 'swse-upgrade-app',
    classes: ['swse', 'swse-app', 'swse-upgrade-app', 'swse-theme-holo'],
    position: { width: 960, height: 680 },
    window: { resizable: true, title: 'Upgrade Workshop' }
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base) ?? { ...base };
    return foundry.utils.mergeObject(clone, this.DEFAULT_OPTIONS ?? {});
  }

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/upgrade/upgrade-app.hbs'
    }
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    // Call BaseSWSEAppV2 lifecycle tracking
    await super._prepareContext(options);

    try {
      if (!this.actor) {
        // Unowned item — show unavailable state
        return { vm: UpgradeService.buildEmptyViewModel() };
      }

      const appData = await UpgradeService.buildUpgradeAppData({
        actor: this.actor,
        mode: this.mode,
        focusedItemId: this.focusedItemId,
        selectedCategoryId: this.selectedCategoryId,
        selectedItemId: this.selectedItemId
      });

      // Sync app state to resolved values (handles invalid/stale selections)
      this.selectedCategoryId = appData.activeCategoryId;
      this.selectedItemId = appData.activeItemId;

      return { vm: appData.vm };
    } catch (err) {
      SWSELogger.error('[SWSEUpgradeApp] _prepareContext failed', err);
      return { vm: UpgradeService.buildEmptyViewModel() };
    }
  }

  // ─── Event Wiring (BaseSWSEAppV2 contract) ───────────────────────────────────

  wireEvents() {
    const root = this.element;
    if (!root) return;

    // Category tab selection — only triggers re-render on actual change
    root.querySelectorAll('[data-category-id]').forEach(el => {
      el.addEventListener('click', () => {
        if (this.selectedCategoryId === el.dataset.categoryId) return;
        this.selectedCategoryId = el.dataset.categoryId;
        this.selectedItemId = null;
        this.render(false);
      });
    });

    // Item rail row selection
    root.querySelectorAll('[data-item-id]').forEach(el => {
      el.addEventListener('click', () => {
        if (this.selectedItemId === el.dataset.itemId) return;
        this.selectedItemId = el.dataset.itemId;
        this.render(false);
      });
    });

    // Apply upgrade
    root.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
      el.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!this.actor || !this.selectedItemId) return;
        try {
          await CommandBus.execute('APPLY_ITEM_UPGRADE', {
            actor: this.actor,
            itemId: this.selectedItemId,
            upgradeId: el.dataset.upgradeId
          });
          this.render(false);
        } catch (err) {
          ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`);
        }
      });
    });

    // Remove upgrade
    root.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
      el.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!this.actor || !this.selectedItemId) return;
        try {
          await CommandBus.execute('REMOVE_ITEM_UPGRADE', {
            actor: this.actor,
            itemId: this.selectedItemId,
            upgradeIndex: Number(el.dataset.upgradeIndex)
          });
          this.render(false);
        } catch (err) {
          ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`);
        }
      });
    });

    // Finalize upgrades
    root.querySelector('[data-action="finalize-upgrades"]')?.addEventListener('click', async () => {
      if (!this.actor || !this.selectedItemId) return;
      try {
        await CommandBus.execute('FINALIZE_ITEM_UPGRADES', {
          actor: this.actor,
          itemId: this.selectedItemId
        });
        ui.notifications?.info?.('Upgrades finalized.');
        this.render(false);
      } catch (err) {
        ui.notifications?.error?.(`Failed to finalize: ${err.message}`);
      }
    });

    // Lightsaber: set blade color
    root.querySelectorAll('[data-lightsaber-action="set-color"]').forEach(el => {
      el.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!this.actor || !this.selectedItemId) return;
        try {
          await CommandBus.execute('SET_LIGHTSABER_COLOR', {
            actor: this.actor,
            itemId: this.selectedItemId,
            colorId: el.dataset.colorId
          });
          this.render(false);
        } catch (err) {
          ui.notifications?.error?.(`Failed to set color: ${err.message}`);
        }
      });
    });

    // Lightsaber: set crystal
    root.querySelectorAll('[data-lightsaber-action="set-crystal"]').forEach(el => {
      el.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!this.actor || !this.selectedItemId) return;
        try {
          await CommandBus.execute('SET_LIGHTSABER_CRYSTAL', {
            actor: this.actor,
            itemId: this.selectedItemId,
            crystalId: el.dataset.crystalId
          });
          this.render(false);
        } catch (err) {
          ui.notifications?.error?.(`Failed to set crystal: ${err.message}`);
        }
      });
    });

    // Lightsaber: set chassis
    root.querySelectorAll('[data-lightsaber-action="set-chassis"]').forEach(el => {
      el.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!this.actor || !this.selectedItemId) return;
        try {
          await CommandBus.execute('SET_LIGHTSABER_CHASSIS', {
            actor: this.actor,
            itemId: this.selectedItemId,
            chassisId: el.dataset.chassisId
          });
          this.render(false);
        } catch (err) {
          ui.notifications?.error?.(`Failed to set chassis: ${err.message}`);
        }
      });
    });

    // Close
    root.querySelector('[data-action="close-app"]')?.addEventListener('click', () => this.close());
  }

  // ─── Static launch helpers ────────────────────────────────────────────────────

  /**
   * Open upgrade app for an actor (gear tab launch).
   * Warns and returns null if actor has no upgradeable items.
   */
  static openForActor(actor) {
    if (!actor) return null;
    const summary = UpgradeService.getUpgradeAppSummary(actor);
    if (summary.totalApplicableItems <= 0) {
      ui.notifications?.warn?.('No upgradeable items available.');
      return null;
    }
    const app = new SWSEUpgradeApp(actor, { mode: 'actor' });
    app.render(true);
    return app;
  }

  /**
   * Open upgrade app focused on a single owned item.
   * Warns and returns null if item is not upgradeable.
   */
  static openForItem(actor, item) {
    if (!actor || !item) return null;
    const applicability = UpgradeService.getItemApplicability(actor, item);
    if (!applicability.upgradeable) {
      ui.notifications?.warn?.('This item cannot be upgraded.');
      return null;
    }
    const app = new SWSEUpgradeApp(actor, { mode: 'single-item', focusedItemId: item.id });
    app.render(true);
    return app;
  }
}
