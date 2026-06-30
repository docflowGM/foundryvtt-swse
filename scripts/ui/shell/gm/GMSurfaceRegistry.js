/**
 * GMSurfaceRegistry — surface view-model router for the GM Holopad.
 *
 * Keeps GMDatapad as the ApplicationV2 host while moving GM page context
 * ownership into shell-style surface services. This mirrors the actor holopad
 * architecture without forcing every existing GM action handler to move in the
 * same pass.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const SURFACE_IMPORTS = {
  home: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMDashboardSurfaceService.js'),
  bulletin: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js'),
  jobs: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js'),
  trade: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js'),
  'house-rules': () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMHouseRulesSurfaceService.js'),
  store: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMStoreControlSurfaceService.js'),
  approvals: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalsSurfaceService.js'),
  healing: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMHealingSurfaceService.js'),
  workspace: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMWorkspaceSurfaceService.js'),
  factions: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js'),
  intel: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js'),
  locations: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js'),
  'skill-challenges': () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js'),
  settings: () => import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMSettingsSurfaceService.js')
};

const SERVICE_EXPORTS = {
  home: 'GMDashboardSurfaceService',
  bulletin: 'GMBulletinSurfaceService',
  jobs: 'GMJobBoardSurfaceService',
  trade: 'GMTradeConsoleSurfaceService',
  'house-rules': 'GMHouseRulesSurfaceService',
  store: 'GMStoreControlSurfaceService',
  approvals: 'GMApprovalsSurfaceService',
  healing: 'GMHealingSurfaceService',
  workspace: 'GMWorkspaceSurfaceService',
  factions: 'GMFactionRelationshipSurfaceService',
  intel: 'GMIntelSurfaceService',
  locations: 'GMLocationsSurfaceService',
  'skill-challenges': 'GMSkillChallengeSurfaceService',
  settings: 'GMSettingsSurfaceService'
};

export class GMSurfaceRegistry {
  static getSurfaceIds() {
    return Object.keys(SURFACE_IMPORTS);
  }

  static hasSurface(surfaceId) {
    return Boolean(SURFACE_IMPORTS[surfaceId]);
  }

  static async buildSurfaceVm({ surfaceId = 'home', host } = {}) {
    const resolvedSurfaceId = this.hasSurface(surfaceId) ? surfaceId : 'home';

    if (resolvedSurfaceId !== surfaceId) {
      SWSELogger.warn(`[GMSurfaceRegistry] Unknown GM surface "${surfaceId}"; falling back to home.`);
    }

    try {
      const module = await SURFACE_IMPORTS[resolvedSurfaceId]();
      const exportName = SERVICE_EXPORTS[resolvedSurfaceId];
      const service = module?.[exportName];

      if (!service?.buildViewModel) {
        throw new Error(`GM surface service ${exportName} does not expose buildViewModel()`);
      }

      const vm = await service.buildViewModel(host);
      return {
        id: resolvedSurfaceId,
        surfaceId: resolvedSurfaceId,
        ...vm
      };
    } catch (err) {
      SWSELogger.error(`[GMSurfaceRegistry] Failed to build GM surface "${resolvedSurfaceId}":`, err);
      return {
        id: resolvedSurfaceId,
        surfaceId: resolvedSurfaceId,
        pageTitle: 'GM Surface Error',
        pageDescription: err?.message ?? 'Unknown GM surface error',
        error: err?.message ?? String(err)
      };
    }
  }
}
