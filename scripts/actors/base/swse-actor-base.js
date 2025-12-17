import { SWSERoll } from '../../combat/rolls/enhanced-rolls.js';
import { ForcePointsUtil } from '../../utils/force-points.js';

export class SWSEActorBase extends Actor {
  /**
   * Backwards-compatible flag helpers.
   * Accept legacy scope "swse" but store/read under the system id "foundryvtt-swse".
   */
  getFlag(scope, key) {
    if (scope === "swse") {
      // Prefer the proper system id scope
      const value = super.getFlag("foundryvtt-swse", key);
      if (value !== undefined) return value;

      // Fallback: read any legacy data stored directly under flags.swse
      const legacyFlags = this.flags?.swse;
      if (!legacyFlags) return undefined;

      if (typeof foundry !== "undefined" && foundry.utils?.getProperty) {
        return foundry.utils.getProperty(legacyFlags, key);
      }

      return key.split(".").reduce(
        (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
        legacyFlags
      );
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


  prepareDerivedData() {
    super.prepareDerivedData();
    // Data model handles calculations
  }

  get conditionPenalty() {
    return this.system.conditionTrack?.penalty || 0;
  }

  get isHelpless() {
    return this.system.conditionTrack?.current === 5;
  }

  async applyDamage(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) return;

    let damageToApply = amount;
    const currentHP = this.system.hp.value;
    const tempHP = this.system.hp.temp;
    const isDroid = this.system.isDroid || false;

    // Apply to temp HP first
    if (tempHP > 0 && !options.ignoreTemp) {
      const tempDamage = Math.min(damageToApply, tempHP);
      damageToApply -= tempDamage;
      await this.update({'system.hp.temp': tempHP - tempDamage});
    }

    // Apply to regular HP
    if (damageToApply > 0) {
      let newHP = Math.max(currentHP - damageToApply, isDroid ? -Infinity : 0);

      // For droids, check if single hit exceeds Damage Threshold
      if (isDroid && options.checkThreshold !== false) {
        const damageThreshold = this.system.damageThreshold || 10;

        if (amount >= damageThreshold) {
          // Droid is destroyed if hit exceeds threshold
          newHP = Math.min(newHP, -1);
          await this.update({'system.hp.value': newHP});
          ui.notifications.error(`${this.name} is DESTROYED! (Damage exceeded threshold)`);
          return amount;
        }
      }

      // Cap HP at 0 for living beings
      if (!isDroid) {
        newHP = Math.max(0, newHP);
      }

      await this.update({'system.hp.value': newHP});

      // Check damage threshold for condition track (living beings)
      if (!isDroid && options.checkThreshold !== false && amount >= this.system.damageThreshold) {
        await this.moveConditionTrack(1);
        ui.notifications.warn(`${this.name} takes a hit! Moved down the condition track.`);
      }

      // Check for disabled/destroyed state
      if (isDroid) {
        if (newHP <= -1) {
          ui.notifications.error(`${this.name} is DESTROYED!`);
        } else if (newHP === 0) {
          ui.notifications.warn(`${this.name} is DISABLED! Can only take standard actions.`);
        }
      } else {
        // Check for death (living beings)
        if (newHP === 0 && this.isHelpless) {
          ui.notifications.error(`${this.name} has been defeated!`);
        }
      }
    }

    return amount;
  }

  async applyHealing(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) return;

    const currentHP = this.system.hp.value;
    const maxHP = this.system.hp.max;
    const isDroid = this.system.isDroid || false;

    // Droids can only be repaired via Mechanics skill, not natural healing
    if (isDroid && !options.isRepair) {
      ui.notifications.warn(`${this.name} is a droid and can only be repaired with the Mechanics skill!`);
      return 0;
    }

    // Destroyed droids cannot be repaired (HP <= -1)
    if (isDroid && currentHP <= -1) {
      ui.notifications.error(`${this.name} is destroyed and cannot be repaired!`);
      return 0;
    }

    const newHP = Math.min(maxHP, currentHP + amount);
    await this.update({'system.hp.value': newHP});

    const actualHealing = newHP - currentHP;

    if (isDroid) {
      ui.notifications.info(`${this.name} is repaired for ${actualHealing} HP`);
    } else {
      ui.notifications.info(`${this.name} heals ${actualHealing} HP`);
    }

    return actualHealing;
  }

  async moveConditionTrack(steps) {
    const current = this.system.conditionTrack.current;
    const newPosition = Math.max(0, Math.min(5, current + steps));

    if (newPosition === current) return;

    await this.update({'system.conditionTrack.current': newPosition});

    const labels = ['Normal', '-1', '-2', '-5', '-10', 'Helpless'];
    const direction = steps > 0 ? 'worsens' : 'improves';

    ui.notifications.info(
      `${this.name} ${direction} to ${labels[newPosition]} on the Condition Track`
    );

    return newPosition;
  }

  async useSecondWind() {
    if (this.type !== 'character') {
      ui.notifications.warn('Only characters can use Second Wind');
      return false;
    }

    if (this.system.secondWind?.used) {
      ui.notifications.warn('Second Wind already used');
      return false;
    }

    const healing = this.system.secondWind.value;
    await this.applyHealing(healing);
    await this.update({'system.secondWind.used': true});
    
    // Check for improved Second Wind houserule
    if (game.settings.get('foundryvtt-swse', "secondWindImproved")) {
      await this.moveConditionTrack(-1);
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `${this.name} uses Second Wind, healing ${healing} HP and improving condition!`
      });
    } else {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `${this.name} uses Second Wind, healing ${healing} HP!`
      });
    }

    return true;
  }

  async spendForcePoint(reason = 'unspecified', options = {}) {
    if (this.type !== 'character') return false;

    const current = this.system.forcePoints?.value || 0;
    if (current <= 0) {
      ui.notifications.warn('No Force Points remaining!');
      return false;
    }

    await this.update({'system.forcePoints.value': current - 1});

    // If no dialog and not silent, create a simple chat message
    if (!options.silent && !options.showDialog) {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `${this.name} spends a Force Point for ${reason} (${current - 1} remaining)`
      });
    }

    return true;
  }

  /**
   * Roll a Force Point with dialog for Dark Side temptation
   * @param {string} reason - The reason for rolling the Force Point
   * @returns {Promise<number|null>} The bonus from the roll, or null if cancelled
   */
  async rollForcePoint(reason = 'boost') {
    const current = this.system.forcePoints?.value || 0;
    if (current <= 0) {
      ui.notifications.warn('No Force Points remaining!');
      return null;
    }

    // Show dialog
    const result = await ForcePointsUtil.showForcePointDialog(this, reason);
    if (!result) return null; // Cancelled

    // Spend the Force Point
    await this.spendForcePoint(reason, { silent: true });

    // Roll and get bonus
    const bonus = await ForcePointsUtil.rollForcePoint(this, {
      reason,
      useDarkSide: result.useDarkSide
    });

    return bonus;
  }

  /**
   * Reduce Dark Side Score by spending a Force Point
   */
  async reduceDarkSideScore() {
    return await ForcePointsUtil.reduceDarkSide(this);
  }

  /**
   * Avoid death by spending a Force Point
   */
  async avoidDeathWithForcePoint() {
    return await ForcePointsUtil.avoidDeath(this);
  }

  async rollSkill(skillKey) {
    return SWSERoll.rollSkill(this, skillKey);
  }

  async rollAttack(weapon) {
    return SWSERoll.rollAttack(this, weapon);
  }

  async rollDamage(weapon) {
    return SWSERoll.rollDamage(this, weapon);
  }

  getRollData() {
    const data = super.getRollData();

    data.halfLevel = Math.floor((this.system.level || 1) / 2);
    data.conditionPenalty = this.conditionPenalty;

    // Add ability modifiers
    for (const [key, ability] of Object.entries(this.system.abilities || {})) {
      data[key] = ability.mod;
    }

    // Add skills
    data.skills = this.system.skills || {};

    return data;
  }

  async _onDropItem(data) {
    // Handle special item drops
    const item = await fromUuid(data.uuid);
    if (!item) return false;

    // Handle species drops
    if (item.type === 'species') {
      // Remove existing species
      const existing = this.items.find(i => i.type === 'species');
      if (existing) await existing.delete();

      // Apply racial modifiers
      const mods = item.system.abilityModifiers || {};
      const updates = {};
      for (const [key, value] of Object.entries(mods)) {
        updates[`system.abilities.${key}.racial`] = value;
      }
      await this.update(updates);
    }

    // Handle class drops
    if (item.type === 'class') {
      // Update class field
      await this.update({'system.class': item.name});
    }

    return super._onDropItem(data);
  }
}
