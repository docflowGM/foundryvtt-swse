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

    // Bonus HP (damage buffer from abilities/talents - consumed first)
    if (hp.bonus > 0 && !options.ignoreBonus) {
      const used = Math.min(hp.bonus, remaining);
      remaining -= used;
      updates["system.hp.bonus"] = hp.bonus - used;
    }

    // Temp HP (from Active Effects)
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
  /* DESTINY POINTS                                                             */
  /* -------------------------------------------------------------------------- */

  async spendDestinyPoint(reason = "unspecified") {
    if (this.type !== "character") return false;

    const current = this.system.destinyPoints?.value ?? 0;
    if (current <= 0) {
      ui.notifications.warn("No Destiny Points remaining!");
      return false;
    }

    await this.update(
      { "system.destinyPoints.value": current - 1 },
      { diff: true }
    );

    ChatMessage.create({
      content: `<p><strong>${this.name}</strong> spends a Destiny Point for ${reason}. (${current - 1} remaining)</p>`,
      speaker: { actor: this }
    });

    Hooks.callAll("swse.destinyPointSpent", this, reason);
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* ROLLS                                                                      */
  /* -------------------------------------------------------------------------- */

  async rollSkill(skill, options = {}) { return SWSERoll.rollSkill(this, skill, options); }
  async rollAttack(weapon, options = {}) { return SWSERoll.rollAttack(this, weapon, options); }
  async rollDamage(weapon, options = {}) { return SWSERoll.rollDamage(this, weapon, options); }

  /* -------------------------------------------------------------------------- */
  /* DESTINY POINTS                                                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Spend a Destiny Point
   * @param {string} type - The type of Destiny effect being triggered
   * @param {Object} options - Additional options (effect, reason, etc.)
   * @returns {Promise<boolean>} - True if successfully spent, false otherwise
   */
  async spendDestinyPoint(type, options = {}) {
    const dp = this.system.destinyPoints;
    const destiny = this.system.destiny;

    // Check eligibility
    if (!destiny?.hasDestiny) {
      ui.notifications.warn(`${this.name} does not have Destiny!`);
      return false;
    }

    if (destiny.fulfilled) {
      ui.notifications.warn(`${this.name}'s Destiny has been fulfilled!`);
      return false;
    }

    if (dp.value <= 0) {
      ui.notifications.warn(`${this.name} has no Destiny Points remaining!`);
      return false;
    }

    // Decrement Destiny Points
    await this.update({ "system.destinyPoints.value": dp.value - 1 });

    // Fire hook for other systems to respond
    Hooks.callAll("swse.destinyPointSpent", this, type, options);

    // Create chat message
    this._createDestinyPointMessage(type, options);

    return true;
  }

  /**
   * Create a chat message when a Destiny Point is spent
   * @private
   */
  _createDestinyPointMessage(type, options = {}) {
    const effectLabel = options.effectLabel || type;
    const reason = options.reason || "used a Destiny Point";

    const message = `
      <div class="destiny-point-message">
        <p><strong>${this.name}</strong> ${reason}.</p>
        <p>Effect: <em>${effectLabel}</em></p>
        <p>Destiny Points Remaining: ${Math.max(0, this.system.destinyPoints.value)}/${this.system.destinyPoints.max}</p>
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: message,
      type: CONST.CHAT_MESSAGE_TYPES.OOC
    });
  }

  /* -------------------------------------------------------------------------- */
  /* FORCE POINTS                                                               */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if actor has enough Force Points
   * @param {number} amount - Number of Force Points required
   * @returns {boolean} Whether actor has enough Force Points
   */
  hasForcePoints(amount = 1) {
    const fp = this.system.forcePoints?.value ?? 0;
    return fp >= amount;
  }

  /**
   * Spend Force Points
   * @param {string} reason - The reason for spending (for chat message)
   * @param {number} amount - Number of Force Points to spend (default 1)
   * @param {Object} options - Additional options
   * @param {boolean} options.silent - If true, don't show chat message
   * @returns {Promise<boolean>} Whether the spend was successful
   */
  async spendForcePoint(reason = 'unspecified', amount = 1, options = {}) {
    const fp = this.system.forcePoints;

    if (!fp || fp.value < amount) {
      if (!options.silent) {
        ui.notifications.warn(`${this.name} doesn't have enough Force Points! (${fp?.value ?? 0}/${amount} required)`);
      }
      return false;
    }

    // Deduct Force Points
    await this.update({ 'system.forcePoints.value': fp.value - amount });

    // Create chat message unless silent
    if (!options.silent) {
      const message = `
        <div class="swse force-point-spend">
          <h4><i class="fas fa-hand-sparkles"></i> Force Point Spent</h4>
          <p><strong>${this.name}</strong> spends ${amount} Force Point${amount > 1 ? 's' : ''} for ${reason}.</p>
          <p class="fp-remaining">Force Points Remaining: ${fp.value - amount}/${fp.max}</p>
        </div>
      `;

      await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: message
      });
    }

    // Fire hook for other systems to respond
    Hooks.callAll('swse.forcePointSpent', this, reason, amount);

    return true;
  }

  /**
   * Regain Force Points (e.g., after rest)
   * @param {number} amount - Number of Force Points to regain (default: all)
   * @returns {Promise<number>} New Force Point value
   */
  async regainForcePoints(amount = null) {
    const fp = this.system.forcePoints;
    if (!fp) return 0;

    const newValue = amount !== null
      ? Math.min(fp.max, fp.value + amount)
      : fp.max;

    await this.update({ 'system.forcePoints.value': newValue });

    if (newValue > fp.value) {
      ui.notifications.info(`${this.name} regains ${newValue - fp.value} Force Point(s).`);
    }

    return newValue;
  }

}