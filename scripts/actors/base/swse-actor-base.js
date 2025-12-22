import { SWSERoll } from '../../combat/rolls/enhanced-rolls.js';
import { ForcePointsUtil } from '../../utils/force-points.js';

/**
 * SWSE Actor Base – v13+
 * - Orchestrates derived data
 * - Applies Active Effects AFTER math
 * - Handles damage, healing, rolls
 */
export class SWSEActorBase extends Actor {

  /* -------------------------------------------------------------------------- */
  /* FLAG COMPATIBILITY                                                         */
  /* -------------------------------------------------------------------------- */

  getFlag(scope, key) {
    if (scope === "swse") {
      const val = super.getFlag("foundryvtt-swse", key);
      if (val !== undefined) return val;
      return this.flags?.swse?.[key];
    }
    return super.getFlag(scope, key);
  }

  async setFlag(scope, key, value) {
    if (scope === "swse") scope = "foundryvtt-swse";
    return super.setFlag(scope, key, value);
  }

  async unsetFlag(scope, key) {
    if (scope === "swse") scope = "foundryvtt-swse";
    return super.unsetFlag(scope, key);
  }

  /* -------------------------------------------------------------------------- */
  /* DERIVED DATA ENTRY POINT                                                   */
  /* -------------------------------------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();

    // ⚠️ IMPORTANT:
    // All numerical math happens in the DATA MODEL.
    // This class ONLY applies Active Effects afterward.
    this._applyActiveEffects();
  }

  /* -------------------------------------------------------------------------- */
  /* ACTIVE EFFECTS                                                             */
  /* -------------------------------------------------------------------------- */

  _applyActiveEffects() {
    const effects = this.effects ?? [];
    if (!effects.length) return;

    for (const effect of effects) {
      if (effect.disabled || !effect.updates) continue;

      for (const [path, config] of Object.entries(effect.updates)) {
        if (!config || typeof config.value === "undefined") continue;

        const mode = config.mode ?? "ADD";
        const value = config.value;

        let current = foundry.utils.getProperty(this, path);
        if (current === undefined) {
          foundry.utils.setProperty(this, path, 0);
          current = 0;
        }

        let result = current;

        switch (mode) {
          case "ADD": result = current + value; break;
          case "MULTIPLY": result = current * value; break;
          case "OVERRIDE": result = value; break;
          case "BASE":
            if (current === 0 || current === null) result = value;
            break;
        }

        foundry.utils.setProperty(this, path, result);
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* DAMAGE & HEALING                                                           */
  /* -------------------------------------------------------------------------- */

  async applyDamage(amount, options = {}) {
    if (typeof amount !== "number" || amount < 0) return;

    const hp = this.system.hp;
    const isDroid = this.system.traits?.isDroid === true;

    let remaining = amount;
    const updates = {};

    // Temp HP
    if (hp.temp > 0 && !options.ignoreTemp) {
      const used = Math.min(hp.temp, remaining);
      remaining -= used;
      updates["system.hp.temp"] = hp.temp - used;
    }

    // Real HP
    if (remaining > 0) {
      let newHP = hp.value - remaining;

      // Droid destruction rule
      if (isDroid && options.checkThreshold !== false) {
        if (amount >= this.system.damageThreshold) {
          updates["system.hp.value"] = -1;
          await this.update(updates, { diff: true });
          ui.notifications.error(`${this.name} is DESTROYED!`);
          return amount;
        }
      }

      if (!isDroid) newHP = Math.max(0, newHP);
      updates["system.hp.value"] = newHP;
    }

    await this.update(updates, { diff: true });
    return amount;
  }

  async applyHealing(amount, options = {}) {
    if (typeof amount !== "number" || amount < 0) return 0;

    const hp = this.system.hp;
    const isDroid = this.system.traits?.isDroid === true;

    if (isDroid && !options.isRepair) {
      ui.notifications.warn(`${this.name} must be repaired, not healed.`);
      return 0;
    }

    if (hp.value <= -1) return 0;

    const newHP = Math.min(hp.max, hp.value + amount);
    await this.update({ "system.hp.value": newHP }, { diff: true });
    return newHP - hp.value;
  }

  /* -------------------------------------------------------------------------- */
  /* ROLLS                                                                      */
  /* -------------------------------------------------------------------------- */

  async rollSkill(skill) { return SWSERoll.rollSkill(this, skill); }
  async rollAttack(weapon) { return SWSERoll.rollAttack(this, weapon); }
  async rollDamage(weapon) { return SWSERoll.rollDamage(this, weapon); }

}