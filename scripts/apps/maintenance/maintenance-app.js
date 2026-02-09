// scripts/apps/maintenance/maintenance-app.js
import { swseLogger } from '../../utils/logger.js';
import SWSEApplication from '../base/swse-application.js';

export class MaintenanceApp extends SWSEApplication {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEApplication.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-maintenance',
      classes: ['swse', 'swse-maintenance', 'swse-app'],
      template: 'systems/foundryvtt-swse/templates/apps/maintenance.hbs',
      position: { width: 600, height: 400 },
      title: 'SWSE Maintenance'
    }
  );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    root.querySelector('.swse-rest-short')?.addEventListener('click', () => this._onShortRest());
    root.querySelector('.swse-rest-long')?.addEventListener('click', () => this._onLongRest());
  }

  async _onShortRest() {
    // Placeholder: implement short rest behavior using ActorEngine
    swseLogger.info('Short rest clicked');
    ui.notifications?.info('Short rest executed (placeholder)');
  }

  async _onLongRest() {
    swseLogger.info('Long rest clicked');
    ui.notifications?.info('Long rest executed (placeholder)');
  }
}
