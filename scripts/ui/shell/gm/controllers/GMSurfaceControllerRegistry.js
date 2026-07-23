/**
 * GMSurfaceControllerRegistry
 *
 * Lightweight controller router for GM Datapad surfaces.
 * The GM Datapad remains one shared holopad shell host; surface controllers own
 * page-local DOM wiring so gm-datapad.js can shrink without behavior drift.
 */

import { GMApprovalsSurfaceController } from './GMApprovalsSurfaceController.js';
import { GMBulletinSurfaceController } from './GMBulletinSurfaceController.js';
import { GMHealingSurfaceController } from './GMHealingSurfaceController.js';
import { GMJobBoardSurfaceController } from './GMJobBoardSurfaceController.js';
import { GMStoreControlSurfaceController } from './GMStoreControlSurfaceController.js';
import { GMHouseRulesSurfaceController } from './GMHouseRulesSurfaceController.js';
import { GMSettingsSurfaceController } from './GMSettingsSurfaceController.js';
import { GMTradeConsoleSurfaceController } from './GMTradeConsoleSurfaceController.js';
import { GMWorkspaceSurfaceController } from './GMWorkspaceSurfaceController.js';
import { GMFactionRelationshipSurfaceController } from './GMFactionRelationshipSurfaceController.js';
import { GMIntelSurfaceController } from './GMIntelSurfaceController.js';
import { GMLocationsSurfaceController } from './GMLocationsSurfaceController.js';
import { GMSkillChallengeSurfaceController } from './GMSkillChallengeSurfaceController.js';
import { GMInteractionRepairService } from '../GMInteractionRepairService.js';
import { GMControllerCompatibilityService } from '../GMControllerCompatibilityService.js';

const CONTROLLERS = Object.freeze({
  approvals: GMApprovalsSurfaceController,
  bulletin: GMBulletinSurfaceController,
  healing: GMHealingSurfaceController,
  jobs: GMJobBoardSurfaceController,
  'house-rules': GMHouseRulesSurfaceController,
  settings: GMSettingsSurfaceController,
  store: GMStoreControlSurfaceController,
  trade: GMTradeConsoleSurfaceController,
  workspace: GMWorkspaceSurfaceController,
  factions: GMFactionRelationshipSurfaceController,
  intel: GMIntelSurfaceController,
  locations: GMLocationsSurfaceController,
  'skill-challenges': GMSkillChallengeSurfaceController
});

const SURFACE_SELECTORS = Object.freeze({
  approvals: '.gm-datapad-approvals',
  bulletin: '.gm-datapad-bulletin',
  healing: '.gm-datapad-healing',
  jobs: '.gm-datapad-jobs',
  'house-rules': '.gm-datapad-house-rules',
  settings: '[data-shell-region="surface-settings"]',
  store: '.gm-datapad-store',
  trade: '.gm-datapad-trade',
  workspace: '.gm-datapad-workspace',
  factions: '.gm-datapad-factions',
  intel: '.gm-datapad-intel',
  locations: '.gm-datapad-locations',
  'skill-challenges': '.gm-datapad-skill-challenges'
});

const ACTIVE = new WeakMap();

function hasRenderedSurface(root, surfaceId) {
  const selector = SURFACE_SELECTORS[surfaceId];
  if (!selector) return true;
  return Boolean(root?.matches?.(selector) || root?.querySelector?.(selector));
}

export class GMSurfaceControllerRegistry {
  static async bind({ surfaceId, host, root } = {}) {
    if (!host || !root) return false;

    const previous = ACTIVE.get(host);
    previous?.controller?.destroy?.();
    GMInteractionRepairService.destroy(host);
    ACTIVE.delete(host);

    const Controller = CONTROLLERS[surfaceId];
    if (!Controller) return false;

    if (!hasRenderedSurface(root, surfaceId)) {
      const message = `GM Datapad rendered ${surfaceId}, but its expected surface root is missing.`;
      console.error(`[SWSE] ${message}`, {
        surfaceId,
        selector: SURFACE_SELECTORS[surfaceId],
        currentPage: host?.currentPage
      });
      globalThis.ui?.notifications?.error?.(`${message} Reload the Datapad and check the console.`);
      return false;
    }

    GMInteractionRepairService.bind({ surfaceId, host, root });
    const controller = GMControllerCompatibilityService.prepare({
      surfaceId,
      host,
      controller: new Controller(host)
    });

    try {
      const attached = await controller.attach(root);
      if (attached === false) {
        controller.destroy?.();
        console.error(`[SWSE] GM Datapad controller explicitly declined its rendered surface: ${surfaceId}`);
        globalThis.ui?.notifications?.error?.(`GM Datapad ${surfaceId} controls could not attach.`);
        return false;
      }
      ACTIVE.set(host, { surfaceId, controller });
      return true;
    } catch (error) {
      controller.destroy?.();
      console.error(`[SWSE] Failed to bind GM Datapad surface controller: ${surfaceId}`, error);
      globalThis.ui?.notifications?.error?.(`GM Datapad ${surfaceId} controls failed to initialize. Check the console for details.`);
      return false;
    }
  }

  static destroy(host) {
    const previous = ACTIVE.get(host);
    previous?.controller?.destroy?.();
    GMInteractionRepairService.destroy(host);
    ACTIVE.delete(host);
  }
}
