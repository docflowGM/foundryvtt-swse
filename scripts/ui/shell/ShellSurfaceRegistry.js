/**
 * ShellSurfaceRegistry — View model builders for shell surfaces/overlays/drawers (Phase 11)
 *
 * Each surface, overlay, and drawer has a dedicated VM builder here.
 * The shell host calls these during _prepareContext when a non-sheet container is active.
 *
 * Rules:
 *   - No rules logic here — VM builders call services/engines, never compute rules
 *   - All builders are async and must return plain serialisable objects
 *   - Surface VMs must include at minimum: { id, title }
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ShellSurfaceRegistry {

  // ─── Surface VM Builders ────────────────────────────────────────────────────

  /**
   * Build a view model for the requested surface.
   *
   * @param {object} params
   * @param {Actor} params.actor
   * @param {string} params.surfaceId
   * @param {object} params.surfaceOptions
   * @param {object} params.shellHost
   * @returns {Promise<object>}
   */
  static async buildSurfaceVm({ actor, surfaceId, surfaceOptions, shellHost }) {
    switch (surfaceId) {
      case 'home':
        return this._buildHomeSurfaceVm(actor, surfaceOptions);
      case 'progression':
        return this._buildProgressionSurfaceVm(actor, surfaceOptions, shellHost);
      case 'chargen':
        return this._buildChargenSurfaceVm(actor, surfaceOptions, shellHost);
      case 'upgrade':
        return this._buildUpgradeSurfaceVm(actor, surfaceOptions, shellHost);
      case 'settings':
        return this._buildSettingsSurfaceVm(actor, surfaceOptions);
      case 'mentor':
        return this._buildMentorSurfaceVm(actor, surfaceOptions);
      case 'messenger':
        return this._buildMessengerSurfaceVm(actor, surfaceOptions);
      case 'store':
        return this._buildStoreSurfaceVm(actor, surfaceOptions);
      case 'workbench':
        return this._buildWorkbenchSurfaceVm(actor, surfaceOptions, shellHost);
      case 'customization':
        return this._buildCustomizationSurfaceVm(actor, surfaceOptions, shellHost);
      default:
        SWSELogger.warn(`[ShellSurfaceRegistry] Unknown surface: ${surfaceId}`);
        return { id: surfaceId, title: surfaceId, error: `Unknown surface: ${surfaceId}` };
    }
  }

  // ─── Overlay VM Builders ────────────────────────────────────────────────────

  /**
   * Build a view model for the requested overlay.
   *
   * @param {object} params
   * @param {Actor} params.actor
   * @param {string} params.overlayId
   * @param {object} params.overlayOptions
   * @param {object} params.shellHost
   * @returns {Promise<object>}
   */
  static async buildOverlayVm({ actor, overlayId, overlayOptions, shellHost }) {
    if (overlayId === 'upgrade-single-item') {
      return this._buildSingleItemUpgradeOverlayVm(actor, overlayOptions);
    }

    if (overlayId.startsWith('confirm-')) {
      return this._buildConfirmOverlayVm(overlayId, overlayOptions);
    }

    if (overlayId.startsWith('warning-')) {
      return this._buildWarningOverlayVm(overlayId, overlayOptions);
    }

    return { overlayId, title: overlayId };
  }

  // ─── Drawer VM Builders ─────────────────────────────────────────────────────

  /**
   * Build a view model for the requested drawer.
   *
   * @param {object} params
   * @param {Actor} params.actor
   * @param {string} params.drawerId
   * @param {object} params.drawerOptions
   * @param {object} params.shellHost
   * @returns {Promise<object>}
   */
  static async buildDrawerVm({ actor, drawerId, drawerOptions, shellHost }) {
    switch (drawerId) {
      case 'item-detail':
        return this._buildItemDetailDrawerVm(actor, drawerOptions);
      case 'choice-detail':
        return this._buildChoiceDetailDrawerVm(actor, drawerOptions);
      case 'selection-detail':
        return this._buildSelectionDetailDrawerVm(actor, drawerOptions);
      case 'modifier-breakdown':
        return this._buildModifierBreakdownDrawerVm(actor, drawerOptions);
      case 'filter-drawer':
        return this._buildFilterDrawerVm(actor, drawerOptions);
      case 'mentor-advice':
        return this._buildMentorAdviceDrawerVm(actor, drawerOptions);
      case 'holonet-notifications':
        return this._buildHolonetNotificationsDrawerVm(actor, drawerOptions);
      default:
        return { drawerId, title: drawerId };
    }
  }

  // ─── Surface Builders (private) ─────────────────────────────────────────────

  /**
   * Home launcher surface VM — built using HomeSurfaceService.
   *
   * @param {Actor} actor
   * @param {object} options
   */
  static async _buildHomeSurfaceVm(actor, options) {
    try {
      const { HomeSurfaceService } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/HomeSurfaceService.js'
      );
      return await HomeSurfaceService.buildViewModel(actor);
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Home surface VM failed:', err);
      return { id: 'home', title: 'Holopad Home', error: err.message };
    }
  }

  static async _buildSettingsSurfaceVm(actor, options) {
    try {
      const { SettingsSurfaceService } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceService.js'
      );
      return await SettingsSurfaceService.buildViewModel(actor, options);
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Settings surface VM failed:', err);
      return { id: 'settings', title: 'Holopad Settings', error: err.message };
    }
  }


  static async _buildMentorSurfaceVm(actor, options) {
    try {
      const { MentorSurfaceService } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/MentorSurfaceService.js'
      );
      return await MentorSurfaceService.buildViewModel(actor, options);
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Mentor surface VM failed:', err);
      return { id: 'mentor', title: 'Chat with Mentor', error: err.message };
    }
  }

  static async _buildStoreSurfaceVm(actor, options) {
    try {
      const { StoreSurfaceService } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceService.js'
      );
      return await StoreSurfaceService.buildViewModel(actor, options);
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Store surface VM failed:', err);
      return { id: 'store', title: 'Galactic Trade Exchange', error: err.message };
    }
  }

  /**
   * Workbench surface VM — inline via WorkbenchSurfaceAdapter.
   * Creates/reuses an ItemCustomizationWorkbench instance that renders into the holopad surface.
   *
   * @param {Actor} actor
   * @param {object} options - { itemId, category, mode }
   * @param {object} shellHost
   */
  static async _buildWorkbenchSurfaceVm(actor, options, shellHost) {
    if (!actor) {
      return { id: 'workbench', title: 'Armory // Customization', error: 'No actor selected' };
    }

    try {
      const { WorkbenchSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
      );
      const adapter = WorkbenchSurfaceAdapter.getOrCreate(shellHost, actor, options);
      return adapter.buildViewModel();
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Workbench surface VM failed:', err);
      return { id: 'workbench', title: 'Armory // Customization', error: err.message };
    }
  }

  /**
   * Customization surface VM — Droid Garage and Starship Shipyard inside the holopad.
   * Launches the CustomizationBayApp as an inline surface.
   *
   * @param {Actor} actor
   * @param {object} options - { bayMode, contextMode }
   */
  static async _buildCustomizationSurfaceVm(actor, options, shellHost) {
    if (!actor) {
      return { id: 'customization', title: 'Customization Bay', error: 'No actor selected' };
    }

    try {
      const { CustomizationSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js'
      );
      const adapter = CustomizationSurfaceAdapter.getOrCreate(shellHost, actor, options ?? {});
      return adapter.buildViewModel();
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Customization surface VM failed:', err);
      return { id: 'customization', title: 'Customization Bay', error: err.message };
    }
  }

  /**
   * Progression surface VM — inline via ProgressionSurfaceAdapter.
   * Creates/reuses a ProgressionShell instance that renders content into the holopad surface.
   */
  static async _buildProgressionSurfaceVm(actor, options, shellHost) {
    if (!actor) {
      return { id: 'progression', title: 'Level Up', error: 'No actor selected' };
    }

    try {
      const { ProgressionSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
      );
      const adapter = await ProgressionSurfaceAdapter.getOrCreate(shellHost, actor, 'levelup', options);
      return adapter.buildViewModel();
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Progression surface VM failed:', err);
      return { id: 'progression', title: 'Level Up', error: err.message };
    }
  }

  /**
   * Chargen surface VM — inline via ProgressionSurfaceAdapter.
   * Creates/reuses a ChargenShell instance that renders content into the holopad surface.
   */
  static async _buildChargenSurfaceVm(actor, options, shellHost) {
    if (!actor) {
      return { id: 'chargen', title: 'Character Creation', error: 'No actor selected' };
    }

    try {
      const { ProgressionSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
      );
      const adapter = await ProgressionSurfaceAdapter.getOrCreate(shellHost, actor, 'chargen', options);
      return adapter.buildViewModel();
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Chargen surface VM failed:', err);
      return { id: 'chargen', title: 'Character Creation', error: err.message };
    }
  }

  /**
   * Upgrade surface VM — built using UpgradeService (fully inline, no external shell).
   *
   * @param {Actor} actor
   * @param {object} options - { mode, focusedItemId, selectedCategoryId, selectedItemId }
   * @param {object} shellHost
   */
  static async _buildUpgradeSurfaceVm(actor, options, shellHost) {
    try {
      const { UpgradeService } = await import(
        '/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js'
      );

      if (!actor) {
        return { id: 'upgrade', title: 'Upgrade Workshop', vm: UpgradeService.buildEmptyViewModel() };
      }

      const mode = options.mode ?? 'actor';
      const focusedItemId = options.focusedItemId ?? null;
      const selectedCategoryId = options.selectedCategoryId ?? null;
      const selectedItemId = options.selectedItemId ?? null;

      const appData = await UpgradeService.buildUpgradeAppData({
        actor,
        mode,
        focusedItemId,
        selectedCategoryId,
        selectedItemId
      });

      // Sync resolved state back to the shell host surface options
      if (shellHost) {
        shellHost._shellSurfaceOptions = {
          ...shellHost._shellSurfaceOptions,
          selectedCategoryId: appData.activeCategoryId,
          selectedItemId: appData.activeItemId
        };
      }

      return {
        id: 'upgrade',
        title: 'Upgrade Workshop',
        mode,
        vm: appData.vm
      };
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Upgrade surface VM failed:', err);
      return { id: 'upgrade', title: 'Upgrade Workshop', error: err.message };
    }
  }



  static async _buildHolonetNotificationsDrawerVm(actor, options) {
    try {
      const { HolonetNoticeCenterService } = await import(
        '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-notice-center-service.js'
      );
      return await HolonetNoticeCenterService.buildCenterVm({ actor, limit: options.limit ?? 18, previewLimit: options.previewLimit ?? 6 });
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Holonet notifications drawer VM failed:', err);
      return { drawerId: 'holonet-notifications', title: 'Holonet Alerts', totalUnread: 0, notices: [], chips: [], error: err.message };
    }
  }

  // ─── Overlay Builders (private) ─────────────────────────────────────────────

  /**
   * Single-item upgrade overlay VM.
   */
  static async _buildSingleItemUpgradeOverlayVm(actor, options) {
    try {
      const { UpgradeService } = await import(
        '/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js'
      );

      const focusedItemId = options.focusedItemId ?? null;

      if (!actor || !focusedItemId) {
        return {
          overlayId: 'upgrade-single-item',
          title: 'Item Upgrades',
          vm: UpgradeService.buildEmptyViewModel()
        };
      }

      const appData = await UpgradeService.buildUpgradeAppData({
        actor,
        mode: 'single-item',
        focusedItemId,
        selectedCategoryId: options.selectedCategoryId ?? null,
        selectedItemId: focusedItemId
      });

      return {
        overlayId: 'upgrade-single-item',
        title: 'Item Upgrades',
        focusedItemId,
        vm: appData.vm
      };
    } catch (err) {
      SWSELogger.error('[ShellSurfaceRegistry] Single-item upgrade overlay VM failed:', err);
      return { overlayId: 'upgrade-single-item', title: 'Item Upgrades', error: err.message };
    }
  }

  /**
   * Confirmation overlay VM.
   */
  static _buildConfirmOverlayVm(overlayId, options) {
    return {
      overlayId,
      title: options.title ?? 'Confirm',
      message: options.message ?? 'Are you sure?',
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      isDangerous: options.isDangerous ?? false
    };
  }

  /**
   * Warning overlay VM.
   */
  static _buildWarningOverlayVm(overlayId, options) {
    return {
      overlayId,
      title: options.title ?? 'Warning',
      message: options.message ?? '',
      dismissLabel: options.dismissLabel ?? 'Dismiss'
    };
  }

  // ─── Drawer Builders (private) ──────────────────────────────────────────────

  static async _buildItemDetailDrawerVm(actor, options) {
    const { entityId } = options;
    if (!entityId || !actor) return { drawerId: 'item-detail', title: 'Item Detail' };
    const item = actor.items.get(entityId);
    if (!item) return { drawerId: 'item-detail', title: 'Item Detail' };
    return {
      drawerId: 'item-detail',
      title: item.name,
      itemId: item.id,
      itemType: item.type,
      itemName: item.name,
      itemImg: item.img,
      system: item.system
    };
  }

  static async _buildChoiceDetailDrawerVm(actor, options) {
    return {
      drawerId: 'choice-detail',
      title: options.title ?? 'Detail',
      entityId: options.entityId,
      entityType: options.entityType,
      content: options.content ?? null
    };
  }

  static async _buildSelectionDetailDrawerVm(actor, options) {
    return {
      drawerId: 'selection-detail',
      title: options.title ?? 'Details',
      entityId: options.entityId,
      entityType: options.entityType,
      content: options.content ?? null
    };
  }

  static async _buildModifierBreakdownDrawerVm(actor, options) {
    return {
      drawerId: 'modifier-breakdown',
      title: options.title ?? 'Modifier Breakdown',
      modifiers: options.modifiers ?? [],
      total: options.total ?? 0,
      label: options.label ?? ''
    };
  }

  static async _buildFilterDrawerVm(actor, options) {
    return {
      drawerId: 'filter-drawer',
      title: 'Filters',
      filters: options.filters ?? [],
      activeFilters: options.activeFilters ?? {}
    };
  }

  static async _buildMentorAdviceDrawerVm(actor, options) {
    return {
      drawerId: 'mentor-advice',
      title: 'Mentor Guidance',
      advice: options.advice ?? '',
      mood: options.mood ?? 'neutral'
    };
  }
}
