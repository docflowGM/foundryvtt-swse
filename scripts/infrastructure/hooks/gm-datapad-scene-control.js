/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * GM Datapad canvas access is now registered through SceneControlRegistry by:
 * /scripts/scene-controls/swse-canvas-tools.js
 */

import { sceneControlRegistry } from "/systems/foundryvtt-swse/scripts/scene-controls/api.js";
import { registerSWSECanvasTools } from "/systems/foundryvtt-swse/scripts/scene-controls/swse-canvas-tools.js";

export function registerGMDatapadSceneControl() {
  registerSWSECanvasTools();
  sceneControlRegistry.installFoundryHook();
}

export default registerGMDatapadSceneControl;
