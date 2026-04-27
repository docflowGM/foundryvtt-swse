/**
 * HomeSurfaceService — View-model builder for the Home launcher surface (Phase 12)
 *
 * Responsibilities:
 *   - Determine which app tiles are visible/enabled for the current actor
 *   - Provide labels, icons, route IDs, and badges for each tile
 *   - Delegate availability checks to existing services (UpgradeService, progression checks)
 *   - Return a plain serialisable VM — no mutations, no rules logic here
 *
 * Tile routing:
 *   Character   → 'sheet'       (always visible)
 *   Training    → 'chargen' or 'progression' (based on actor completeness)
 *   Workbench   → 'upgrade'     (only if upgradeable items exist)
 *   Store       → hidden        (not yet implemented)
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';


function supportedTypesForMentor(actor) {
  return ['character', 'droid', 'npc'].includes(actor?.type);
}

export class HomeSurfaceService {

  // ─── Entry Point ─────────────────────────────────────────────────────────────

  /**
   * Build the Home surface view model.
   *
   * @param {Actor} actor
   * @returns {Promise<object>}
   */
  static async buildViewModel(actor) {
    const [progressionSummary, upgradeSummary] = await Promise.all([
      this._getProgressionSummary(actor),
      this._getUpgradeSummary(actor)
    ]);

    return {
      id: 'home',
      title: 'Holopad Home',
      actorName: actor?.name ?? '',
      apps: [
        {
          id: 'sheet',
          label: 'Character',
          icon: '◇',
          routeId: 'sheet',
          visible: true,
          enabled: true,
          badge: null,
          description: 'Character record'
        },
        {
          id: 'progression',
          label: 'Training',
          icon: '▲',
          routeId: progressionSummary.routeId,
          visible: progressionSummary.visible,
          enabled: progressionSummary.enabled,
          badge: progressionSummary.badge,
          description: progressionSummary.description
        },
        {
          id: 'mentor',
          label: 'Chat with Mentor',
          icon: '✶',
          routeId: 'mentor',
          visible: supportedTypesForMentor(actor),
          enabled: true,
          badge: null,
          description: 'Seek guidance and planning advice'
        },
        {
          id: 'upgrade',
          label: 'Workbench',
          icon: '✦',
          routeId: 'upgrade',
          visible: upgradeSummary.visible,
          enabled: upgradeSummary.enabled,
          badge: upgradeSummary.badge,
          description: 'Upgrade gear and equipment'
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: '⚙',
          routeId: 'settings',
          visible: true,
          enabled: true,
          badge: null,
          description: 'Theme and interface options'
        }
      ]
    };
  }

  // ─── Tile Summaries ───────────────────────────────────────────────────────────

  static _getProgressionSummary(actor) {
    try {
      if (!actor) return this._progressionHidden();

      // Only character, droid, and npc types support progression
      const supportedTypes = ['character', 'droid', 'npc'];
      if (!supportedTypes.includes(actor.type)) return this._progressionHidden();

      const isIncomplete = this._isChargenIncomplete(actor);
      const level = Number(actor.system?.level) || 0;
      const isEpicBlocked = level >= 20;

      if (isIncomplete) {
        return {
          visible: true,
          enabled: true,
          routeId: 'chargen',
          badge: 'SETUP',
          description: 'Complete character creation'
        };
      }

      if (isEpicBlocked) {
        return {
          visible: true,
          enabled: false,
          routeId: 'progression',
          badge: 'MAX',
          description: 'Maximum level reached'
        };
      }

      return {
        visible: true,
        enabled: true,
        routeId: 'progression',
        badge: null,
        description: 'Level up or advance training'
      };
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Progression summary failed:', err);
      return this._progressionHidden();
    }
  }

  static async _getUpgradeSummary(actor) {
    try {
      if (!actor) return { visible: false, enabled: false, badge: null };

      const { UpgradeService } = await import(
        '/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js'
      );

      const allRecords = UpgradeService.collectOwnedUpgradeRecords(actor);
      const applicable = UpgradeService.filterApplicableRecords(allRecords);

      if (applicable.length === 0) return { visible: false, enabled: false, badge: null };

      return {
        visible: true,
        enabled: true,
        badge: applicable.length > 0 ? String(applicable.length) : null
      };
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Upgrade summary failed:', err);
      return { visible: false, enabled: false, badge: null };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  static _progressionHidden() {
    return { visible: false, enabled: false, routeId: 'progression', badge: null, description: '' };
  }

  /**
   * Mirror of the canonical chargen-incomplete check in progression-entry.js.
   * Returns true if the actor still needs chargen (level 0, no name, no class).
   *
   * @param {Actor} actor
   * @returns {boolean}
   */
  static _isChargenIncomplete(actor) {
    const system = actor.system;
    if ((system?.level || 0) === 0) return true;
    if (!actor.name || actor.name.trim() === '' || actor.name === 'New Character') return true;
    if (!actor.items?.some(item => item.type === 'class')) return true;
    return false;
  }
}
