// scripts/apps/maintenance/maintenance-app.js
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import SWSEApplication from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { ForceRegimenExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-regimen-executor.js";

export class MaintenanceApp extends SWSEApplication {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(SWSEApplication.DEFAULT_OPTIONS ?? {}),
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
    await super._onRender(context, options);

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
    const actors = canvas?.tokens?.controlled?.map?.(token => token.actor)?.filter(Boolean) || [];
    const unique = Array.from(new Map(actors.map(actor => [actor.id, actor])).values());
    if (!unique.length) {
      ui.notifications?.warn('Select one or more actor tokens before triggering long rest.');
      return;
    }
    let cleared = 0;
    for (const actor of unique) {
      const result = await ForceRegimenExecutor.clearForLongRest(actor, { source: 'gm-long-rest' });
      cleared += Number(result?.ended || 0) || 0;
    }
    ui.notifications?.info(`Long rest executed. Cleared ${cleared} Force Regimen effect(s).`);
  }
}
