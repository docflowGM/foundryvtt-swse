/**
 * DamageApp — Phase C Combat UI
 */
import { DamageEngine } from '../engines/combat/damage-engine.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

export class DamageApp extends Application {
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
      width: 300,
      height: 'auto',
      resizable: false,
      classes: ['damage-app']
    });
  }

  async getData() {
    const hpStatus = DamageEngine.getHPStatus(this.actor);
    const dt = DamageEngine.getDamageThreshold(this.actor);

    return {
      actor: this.actor,
      hpStatus,
      dt,
      damageInput: this.damageInput,
      bypassDT: this.bypassDT
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('input[name="damage"]').on('change', (e) => {
      this.damageInput = Math.max(0, Number(e.currentTarget.value) || 0);
    });

    html.find('input[name="bypassDT"]').on('change', (e) => {
      this.bypassDT = e.currentTarget.checked;
    });

    html.find('[data-action="apply"]').on('click', () => this._applyDamage());
    html.find('[data-action="apply-half"]').on('click', () => this._applyDamage(true));
    html.find('[data-action="apply-double"]').on('click', () => this._applyDamage(false, true));
    html.find('[data-action="heal"]').on('click', () => this._heal());
    html.find('[data-action="restore-temp"]').on('click', () => this._restoreTemp());
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
