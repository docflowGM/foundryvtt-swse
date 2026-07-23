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

const ACTIVE = new WeakMap();

export class GMSurfaceControllerRegistry {
  static async bind({ surfaceId, host, root } = {}) {
    if (!host || !root) return false;

    const previous = ACTIVE.get(host);
    previous?.controller?.destroy?.();
    GMInteractionRepairService.destroy(host);
    ACTIVE.delete(host);

    const Controller = CONTROLLERS[surfaceId];
    if (!Controller) return false;

    const controller = new Controller(host);
    try {
      const attached = await controller.attach(root);
      if (attached === false) {
        controller.destroy?.();
        return false;
      }
      GMInteractionRepairService.bind({ surfaceId, host, root });
      ACTIVE.set(host, { surfaceId, controller });
      return true;
    } catch (error) {
      controller.destroy?.();
      GMInteractionRepairService.destroy(host);
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
