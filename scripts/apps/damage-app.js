/**
 * DamageApp — ApplicationV2 Migration
 */
import BaseSWSEAppV2 from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { DamageEngine } from "/systems/foundryvtt-swse/engine/combat/damage-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class DamageApp extends BaseSWSEAppV2 {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.damageInput = 0;
    this.bypassDT = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'damage-app',
      title: 'Apply Damage',
      template: 'modules/foundryvtt-swse/templates/apps/damage-app.hbs',
      position: {
        width: 300,
        height: 'auto'
      },
      window: {
        resizable: false
      },
      classes: ['damage-app']
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const hpStatus = DamageEngine.getHPStatus(this.actor);
    const dt = DamageEngine.getDamageThreshold(this.actor);

    return foundry.utils.mergeObject(context, {
      actor: this.actor,
      hpStatus,
      dt,
      damageInput: this.damageInput,
      bypassDT: this.bypassDT
    });
  }

  wireEvents() {
    const root = this.element;

    const damageInput = root.querySelector('input[name="damage"]');
    if (damageInput) {
      damageInput.addEventListener('change', (e) => {
        this.damageInput = Math.max(0, Number(e.currentTarget.value) || 0);
      });
    }

    const bypassDTInput = root.querySelector('input[name="bypassDT"]');
    if (bypassDTInput) {
      bypassDTInput.addEventListener('change', (e) => {
        this.bypassDT = e.currentTarget.checked;
      });
    }

    const applyBtn = root.querySelector('[data-action="apply"]');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this._applyDamage());
    }

    const applyHalfBtn = root.querySelector('[data-action="apply-half"]');
    if (applyHalfBtn) {
      applyHalfBtn.addEventListener('click', () => this._applyDamage(true));
    }

    const applyDoubleBtn = root.querySelector('[data-action="apply-double"]');
    if (applyDoubleBtn) {
      applyDoubleBtn.addEventListener('click', () => this._applyDamage(false, true));
    }

    const healBtn = root.querySelector('[data-action="heal"]');
    if (healBtn) {
      healBtn.addEventListener('click', () => this._heal());
    }

    const restoreTempBtn = root.querySelector('[data-action="restore-temp"]');
    if (restoreTempBtn) {
      restoreTempBtn.addEventListener('click', () => this._restoreTemp());
    }
  }

  async _applyDamage(half = false, double = false) {
    let dmg = this.damageInput;
    if (half) dmg = Math.floor(dmg / 2);
    if (double) dmg *= 2;

    const result = await DamageEngine.applyDamage(this.actor, dmg, {
      bypassDT: this.bypassDT
    });

    ui.notifications.info(`${result.reason}: ${result.newHP} HP`);
    this.render();
  }

  async _heal() {
    const hp = this.actor.system.hp || {};
    const newHP = Math.min(hp.max || 1, (hp.value || 0) + this.damageInput);
    await ActorEngine.updateActor(this.actor, { 'system.hp.value': newHP });
    ui.notifications.info(`Healed to ${newHP} HP`);
    this.render();
  }

  async _restoreTemp() {
    const hp = this.actor.system.hp || {};
    const restored = Math.max(0, this.damageInput);
    await ActorEngine.updateActor(this.actor, { 'system.hp.temp': restored });
    ui.notifications.info(`Restored ${restored} temp HP`);
    this.render();
  }
}
