import { SWSERoll } from '../../combat/rolls/enhanced-rolls.js';
import { ForcePointsUtil } from '../../utils/force-points.js';

/**
 * SWSE Actor Base – Fully Modernized for v13+ and Active Effect Engine
 * - Structured SWSE effects are applied AFTER derived data
 * - Preserves RAW Saga mechanics
 * - Compatible with rewritten SWSEActiveEffectsManager
 */
export class SWSEActorBase extends Actor {

  /* -------------------------------------------------------------------------- */
  /* FLAG COMPATIBILITY LAYER (Legacy "swse" → Proper "foundryvtt-swse")        */
  /* -------------------------------------------------------------------------- */

  getFlag(scope, key) {
    if (scope === "swse") {
      const val = super.getFlag("foundryvtt-swse", key);
      if (val !== undefined) return val;

      const legacy = this.flags?.swse;
      if (!legacy) return undefined;

      return foundry.utils.getProperty
        ? foundry.utils.getProperty(legacy, key)
        : key.split(".").reduce((o, k) => (o?.[k] ?? undefined), legacy);
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
  /* DERIVED DATA                                                               */
  /* -------------------------------------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();

    // Apply SWSE structured Active Effects AFTER the system calculates its base values
    this._applyActiveEffects();
  }

  /**
   * Apply SWSE structured Active Effects directly to Actor.system.*
   * - E1: modifies system data directly
   * - C1: manual application in derivedData
   * - A: auto-create missing nested fields
   * - M1: sequential multipliers
   */
  _applyActiveEffects() {
    const effects = this.effects ?? [];
    if (!effects.length) return;

    for (const effect of effects) {
      if (effect.disabled || !effect.updates) continue;

      for (const [path, config] of Object.entries(effect.updates)) {
        if (!config || typeof config.value === "undefined") continue;

        const mode = config.mode ?? "ADD";
        const value = config.value;

        // Auto-create missing fields
        let current = foundry.utils.getProperty(this, path);
        if (current === undefined) {
          foundry.utils.setProperty(this, path, 0);
          current = 0;
        }

        let result = current;

        switch (mode) {
          case "ADD":
            result = current + value;
            break;

          case "MULTIPLY":
            result = current * value; // Sequential multiplier stacking
            break;

          case "OVERRIDE":
            result = value;
            break;

          case "BASE":
            if (current === 0 || current === null) result = value;
            break;

          default:
            console.warn(`SWSE ActiveEffect: Unknown mode "${mode}"`);
            break;
        }

        foundry.utils.setProperty(this, path, result);
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CONDITION PENALTY + UTILITY GETTERS                                       */
  /* -------------------------------------------------------------------------- */

  get conditionPenalty() {
    return this.system.conditionTrack?.penalty ?? 0;
  }

  get isHelpless() {
    return this.system.conditionTrack?.current === 5;
  }

  /* -------------------------------------------------------------------------- */
  /* DAMAGE & HEALING                                                           */
  /* -------------------------------------------------------------------------- */

  async applyDamage(amount, options = {}) {
    if (typeof amount !== "number" || amount < 0) return;

    const hp = this.system.hp;
    const isDroid = this.system.isDroid === true;

    let remaining = amount;
    const updates = {};

    // TEMP HP
    if (hp.temp > 0 && !options.ignoreTemp) {
      const tempUsed = Math.min(hp.temp, remaining);
      remaining -= tempUsed;
      updates["system.hp.temp"] = hp.temp - tempUsed;
    }

    // REAL HP
    if (remaining > 0) {
      let newHP = hp.value - remaining;

      // Droid destruction (RAW)
      if (isDroid && options.checkThreshold !== false) {
        const threshold = this.system.damageThreshold ?? 10;

        if (amount >= threshold) {
          updates["system.hp.value"] = -1;
          ui.notifications.error(`${this.name} is DESTROYED! (Damage exceeded threshold)`);

          Hooks.callAll("swse.actorDamageApplied", this, amount, options);
          await this.update(updates, { diff: true });
          return amount;
        }
      }

      if (!isDroid) newHP = Math.max(0, newHP);
      updates["system.hp.value"] = newHP;

      // RAW Threshold → CT movement
      if (!isDroid && options.checkThreshold !== false) {
        const threshold = this.system.damageThreshold ?? 0;
        if (amount >= threshold) {
          await this.moveConditionTrack(1);

          ChatMessage.create({
            content: `<b>${this.name}</b> takes a heavy blow and moves down the Condition Track!`,
            speaker: { actor: this }
          });
        }
      }

      // Droid states
      if (isDroid) {
        if (newHP <= -1) ui.notifications.error(`${this.name} is DESTROYED!`);
        else if (newHP === 0) ui.notifications.warn(`${this.name} is DISABLED!`);
      } else {
        if (newHP === 0 && this.isHelpless)
          ui.notifications.error(`${this.name} has been defeated!`);
      }
    }

    Hooks.callAll("swse.actorDamageApplied", this, amount, options);
    await this.update(updates, { diff: true });
    return amount;
  }

  async applyHealing(amount, options = {}) {
    if (typeof amount !== "number" || amount < 0) return 0;

    const hp = this.system.hp;
    const isDroid = this.system.isDroid === true;

    if (isDroid && !options.isRepair) {
      ui.notifications.warn(`${this.name} is a droid and must be repaired with Mechanics.`);
      return 0;
    }

    if (isDroid && hp.value <= -1) {
      ui.notifications.error(`${this.name} is destroyed and cannot be repaired.`);
      return 0;
    }

    const newHP = Math.min(hp.max, hp.value + amount);
    const healed = newHP - hp.value;

    await this.update({ "system.hp.value": newHP }, { diff: true });

    ui.notifications.info(
      isDroid ? `${this.name} is repaired for ${healed} HP`
              : `${this.name} heals ${healed} HP`
    );

    Hooks.callAll("swse.actorHealingApplied", this, healed, options);
    return healed;
  }

  /* -------------------------------------------------------------------------- */
  /* CONDITION TRACK                                                            */
  /* -------------------------------------------------------------------------- */

  async moveConditionTrack(steps) {
    const cur = this.system.conditionTrack.current;
    const next = Math.clamped(cur + steps, 0, 5);

    if (next === cur) return cur;

    await this.update({ "system.conditionTrack.current": next }, { diff: true });

    const labels = ["Normal", "-1", "-2", "-5", "-10", "Helpless"];
    ui.notifications.info(
      `${this.name} ${steps > 0 ? "worsens" : "improves"} to ${labels[next]}`
    );

    Hooks.callAll("swse.actorConditionTrackChanged", this, next, cur);
    return next;
  }

  /* -------------------------------------------------------------------------- */
  /* SECOND WIND                                                                */
  /* -------------------------------------------------------------------------- */

  async useSecondWind() {
    if (this.type !== "character") {
      ui.notifications.warn("Only characters can use Second Wind.");
      return false;
    }

    if (this.system.secondWind.used) {
      ui.notifications.warn("Second Wind already used.");
      return false;
    }

    const healValue = this.system.secondWind.value;

    await this.applyHealing(healValue);
    await this.update({ "system.secondWind.used": true }, { diff: true });

    const improved = game.settings.get("foundryvtt-swse", "secondWindImproved");

    if (improved) {
      await this.moveConditionTrack(-1);

      ChatMessage.create({
        content: `${this.name} uses Second Wind: heals ${healValue} HP and improves condition!`,
        speaker: { actor: this }
      });
    } else {
      ChatMessage.create({
        content: `${this.name} uses Second Wind and heals ${healValue} HP!`,
        speaker: { actor: this }
      });
    }

    Hooks.callAll("swse.actorSecondWindUsed", this);
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* FORCE POINTS                                                               */
  /* -------------------------------------------------------------------------- */

  async spendForcePoint(reason = "unspecified", options = {}) {
    if (this.type !== "character") return false;

    const current = this.system.forcePoints.value;
    if (current <= 0) {
      ui.notifications.warn("No Force Points remaining!");
      return false;
    }

    await this.update(
      { "system.forcePoints.value": current - 1 },
      { diff: true }
    );

    if (!options.silent && !options.showDialog) {
      ChatMessage.create({
        content: `${this.name} spends a Force Point for ${reason}. (${current - 1} left)`,
        speaker: { actor: this }
      });
    }

    Hooks.callAll("swse.forcePointSpent", this, reason);
    return true;
  }

  async rollForcePoint(reason = "boost") {
    const current = this.system.forcePoints.value;
    if (current <= 0) {
      ui.notifications.warn("No Force Points remaining!");
      return null;
    }

    const dialog = await ForcePointsUtil.showForcePointDialog(this, reason);
    if (!dialog) return null;

    await this.spendForcePoint(reason, { silent: true });

    const bonus = await ForcePointsUtil.rollForcePoint(this, {
      reason,
      useDarkSide: dialog.useDarkSide
    });

    Hooks.callAll("swse.forcePointRolled", this, bonus);
    return bonus;
  }

  async reduceDarkSideScore() {
    return ForcePointsUtil.reduceDarkSide(this);
  }

  async avoidDeathWithForcePoint() {
    return ForcePointsUtil.avoidDeath(this);
  }

  /* -------------------------------------------------------------------------- */
  /* ROLLS                                                                      */
  /* -------------------------------------------------------------------------- */

  async rollSkill(skillKey) { return SWSERoll.rollSkill(this, skillKey); }
  async rollAttack(weapon) { return SWSERoll.rollAttack(this, weapon); }
  async rollDamage(weapon) { return SWSERoll.rollDamage(this, weapon); }

  /* -------------------------------------------------------------------------- */
  /* ROLL DATA                                                                  */
  /* -------------------------------------------------------------------------- */

  getRollData() {
    const data = super.getRollData();

    data.halfLevel = Math.floor((this.system.level ?? 1) / 2);
    data.conditionPenalty = this.conditionPenalty;

    data.abilities = {};
    for (const [k, ability] of Object.entries(this.system.abilities ?? {}))
      data.abilities[k] = ability.mod ?? 0;

    data.skills = this.system.skills ?? {};

    return data;
  }

  /* -------------------------------------------------------------------------- */
  /* DROP HANDLING                                                              */
  /* -------------------------------------------------------------------------- */

  async _onDropItem(data) {
    const item = await fromUuid(data.uuid);
    if (!item) return false;

    const updates = {};

    // Species
    if (item.type === "species") {
      const existing = this.items.find(i => i.type === "species");
      if (existing) await existing.delete();

      const mods = item.system.abilityModifiers ?? {};
      for (const [k, v] of Object.entries(mods))
        updates[`system.abilities.${k}.racial`] = v;
    }

    // Class
    if (item.type === "class") {
      updates["system.class"] = item.name;
    }

    if (Object.keys(updates).length) {
      await this.update(updates, { diff: true });
    }

    Hooks.callAll("swse.actorItemDropped", this, item);
    return super._onDropItem(data);
  }
}
