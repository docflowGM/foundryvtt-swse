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
  factions: GMFactionRelationshipSurfaceController
});

const ACTIVE = new WeakMap();

export class GMSurfaceControllerRegistry {
  static async bind({ surfaceId, host, root } = {}) {
    if (!host || !root) return false;

    const previous = ACTIVE.get(host);
    previous?.controller?.destroy?.();
    ACTIVE.delete(host);

    const Controller = CONTROLLERS[surfaceId];
    if (!Controller) return false;

    const controller = new Controller(host);
    ACTIVE.set(host, { surfaceId, controller });
    await controller.attach(root);
    return true;
  }

  static destroy(host) {
    const previous = ACTIVE.get(host);
    previous?.controller?.destroy?.();
    ACTIVE.delete(host);
  }
}
