/**
 * GM contact canvas drop hooks.
 *
 * Allows GMs to drag lightweight GM Datapad contacts directly onto the Scene
 * canvas. The contact is actorized if needed, then a linked barebones NPC token
 * is placed at the drop point using the contact/actor portrait when available.
 */

import { HooksRegistry } from '/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { GMContactActorizerService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-contact-actorizer-service.js';

function isCanvasContactPayload(data = {}) {
  return game.user?.isGM && GMContactActorizerService.isActorizablePayload(data);
}

function handleDropCanvasData(_canvas, data = {}) {
  if (!isCanvasContactPayload(data)) return undefined;

  (async () => {
    try {
      const x = Number.isFinite(Number(data.x)) ? Number(data.x) : 0;
      const y = Number.isFinite(Number(data.y)) ? Number(data.y) : 0;
      const result = await GMContactActorizerService.createCanvasTokenFromPayload(data, { x, y, scene: canvas?.scene });
      const actorName = result?.actor?.name || result?.label || data?.name || 'GM contact';
      ui.notifications?.info?.(`${result?.created ? 'Created NPC actor and token' : 'Created token for linked NPC'}: ${actorName}.`);
    } catch (err) {
      SWSELogger.error('[GM Contact Canvas Drop] Could not create contact token:', err);
      ui.notifications?.error?.(err?.message || 'Could not create a token from that GM contact.');
    }
  })();

  return false;
}

export function registerGMContactCanvasDropHooks() {
  HooksRegistry.register('dropCanvasData', handleDropCanvasData, {
    id: 'swse-gm-contact-canvas-drop',
    priority: -20,
    description: 'Create barebones NPC tokens when GM Datapad contacts are dropped on the canvas',
    category: 'gm-datapad'
  });
}

export default registerGMContactCanvasDropHooks;
