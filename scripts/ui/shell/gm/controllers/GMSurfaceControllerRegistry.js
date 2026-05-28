/**
 * GMSurfaceControllerRegistry
 *
 * Lightweight controller router for GM Datapad surfaces.
 * The GM Datapad remains one shared holopad shell host; surface controllers own
 * page-local DOM wiring so gm-datapad.js can shrink without behavior drift.
 */

import { GMHouseRulesSurfaceController } from './GMHouseRulesSurfaceController.js';
import { GMSettingsSurfaceController } from './GMSettingsSurfaceController.js';
import { GMWorkspaceSurfaceController } from './GMWorkspaceSurfaceController.js';

const CONTROLLERS = Object.freeze({
  'house-rules': GMHouseRulesSurfaceController,
  settings: GMSettingsSurfaceController,
  workspace: GMWorkspaceSurfaceController
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
