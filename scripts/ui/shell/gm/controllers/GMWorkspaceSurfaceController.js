/**
 * GMWorkspaceSurfaceController
 *
 * Owns DOM wiring for workspace actor quick actions. Actor ownership and sheet
 * rendering stay with Foundry's actor/sheet APIs.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class GMWorkspaceSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-workspace');
    if (!pageElement) return;

    pageElement.querySelectorAll('[data-open-actor]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const actorId = event.currentTarget.dataset.openActor;
        const actor = game.actors?.get?.(actorId);
        if (!actor) {
          SWSELogger.warn?.(`[GMWorkspaceSurfaceController] Could not open missing actor ${actorId}`);
          ui?.notifications?.warn?.('That actor could not be found.');
          return;
        }
        actor.sheet?.render?.(true);
      }, { signal });
    });
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}
