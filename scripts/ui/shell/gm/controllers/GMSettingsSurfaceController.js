/**
 * GMSettingsSurfaceController
 *
 * GM-specific wrapper around the shared holopad settings controller.
 * Owns only GM-only policy controls; shared theme/shell settings remain in the
 * actor/GM SettingsSurfaceController used by every datapad shell.
 */

import { SettingsSurfaceController } from '/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceController.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class GMSettingsSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
    this._settings = new SettingsSurfaceController(host, {
      actor: null,
      preferActor: false,
      persistActorTheme: false,
      logger: SWSELogger
    });
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;

    this._settings.attach(root);
    this._wireGamePolicySettings(root, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
    this._settings?.destroy?.();
  }

  _wireGamePolicySettings(root, signal) {
    const fields = root.querySelectorAll('[data-game-policy-field]');
    fields.forEach((field) => {
      field.addEventListener('change', async (event) => {
        const input = event.currentTarget;
        const key = input.dataset.gamePolicyField;
        if (!key) return;

        let value;
        if (input.type === 'checkbox') value = input.checked === true;
        else if (input.type === 'number') value = Number(input.value || 0);
        else value = input.value;

        try {
          await game.settings.set(this.host?.NS ?? 'foundryvtt-swse', key, value);
          ui?.notifications?.info?.('Game policy updated.');
          await this.host?.render?.(false);
        } catch (err) {
          SWSELogger.error('[GMSettingsSurfaceController] Failed to update game policy setting:', err);
          ui?.notifications?.error?.(`Game policy update failed: ${err.message}`);
        }
      }, { signal });
    });
  }
}
