import { SWSERoll } from '../rolls/enhanced-rolls.js';

/**
 * Base Actor class for SWSE
 * This is where the data model meets actual functionality.
 * Think of this as the actor's brain - it knows how to use its data.
 */
export class SWSEActorBase extends Actor {

  prepareDerivedData() {
    super.prepareDerivedData();
    // The data model handles calculations now
  }

  /**
   * Get the current condition penalty
   * This is used everywhere - rolls, defenses, etc.
   */
  get conditionPenalty() {
    return this.system.conditionTrack?.penalty || 0;
  }

  /**
   * Check if the actor is helpless
   */
  get isHelpless() {
    return this.system.conditionTrack?.current === 5;
  }

  /**
   * Apply damage with automatic threshold checking
   * This is the heart of SWSE's damage system
   */
  async applyDamage(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) return;

    let damageToApply = amount;
    const currentHP = this.system.hp.value;
    const tempHP = this.system.hp.temp;

    // First, damage goes to temporary HP
    if (tempHP > 0 && !options.ignoreTemp) {
      const tempDamage = Math.min(damageToApply, tempHP);
      damageToApply -= tempDamage;
      await this.update({'system.hp.temp': tempHP - tempDamage});
    }

    // Then to regular HP
    const newHP = Math.max(0, currentHP - damageToApply);
    await this.update({'system.hp.value': newHP});

    // Check damage threshold
    if (options.checkThreshold && amount >= this.system.damageThreshold) {
      await this.moveConditionTrack(1);
      ui.notifications.warn(
        `${this.name} takes a hit! Moved down the condition track.`
      );
    }

    // Check for unconsciousness/death
    if (newHP === 0) {
      if (this.isHelpless) {
        ui.notifications.error(`${this.name} has been defeated!`);
      } else {
        ui.notifications.warn(`${this.name} is at 0 HP!`);
      }
    }

    return {
      damageDealt: amount,
      hpRemaining: newHP,
      thresholdExceeded: amount >= this.system.damageThreshold
    };
  }

  /**
   * Apply healing
   */
  async applyHealing(amount) {
    if (typeof amount !== 'number' || amount < 0) return;

    const currentHP = this.system.hp.value;
    const maxHP = this.system.hp.max;
    const newHP = Math.min(maxHP, currentHP + amount);

    await this.update({'system.hp.value': newHP});

    const actualHealing = newHP - currentHP;
    ui.notifications.info(`${this.name} heals ${actualHealing} HP`);

    return actualHealing;
  }

  /**
   * Move on the condition track
   * @param {number} steps - Positive moves down (worse), negative up (better)
   */
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

  /**
   * Use Second Wind (character-specific, but defined here for inheritance)
   */
  async useSecondWind() {
    if (this.type !== 'character') {
      ui.notifications.warn('Only characters can use Second Wind');
      return false;
    }

    if (this.system.secondWind?.used) {
      ui.notifications.warn('Second Wind already used this encounter');
      return false;
    }

    const healing = this.system.secondWind.healing;
    await this.applyHealing(healing);
    await this.update({'system.secondWind.used': true});

    // Also improve condition track by 1
    await this.moveConditionTrack(-1);

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this}),
      content: `${this.name} uses Second Wind, healing ${healing} HP and improving condition!`
    });

    return true;
  }

  /**
   * Spend a Force Point
   */
  async spendForcePoint(reason = 'unspecified') {
    if (this.type !== 'character') return false;

    const current = this.system.forcePoints?.value || 0;
    if (current <= 0) {
      ui.notifications.warn('No Force Points remaining!');
      return false;
    }

    await this.update({'system.forcePoints.value': current - 1});

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this}),
      content: `${this.name} spends a Force Point for ${reason} (${current - 1} remaining)`
    });

    return true;
  }

  /**
   * Roll a skill check
   */
  async rollSkill(skillKey) {
    return SWSERoll.rollSkill(this, skillKey);
  }

  /**
   * Roll an attack
   */
  async rollAttack(weapon) {
    return SWSERoll.rollAttack(this, weapon);
  }

  /**
   * Roll damage
   */
  async rollDamage(weapon) {
    return SWSERoll.rollDamage(this, weapon);
  }

  /**
   * Rest (short or long)
   */
  async rest(type = 'short') {
    const updates = {};

    if (type === 'short') {
      // Recover from condition track (if not persistent)
      if (!this.system.conditionTrack.persistent && 
          this.system.conditionTrack.current > 0) {
        updates['system.conditionTrack.current'] = 0;
      }

      // Reset Second Wind
      if (this.type === 'character') {
        updates['system.secondWind.used'] = false;
      }
    } else if (type === 'long') {
      // Full recovery
      updates['system.hp.value'] = this.system.hp.max;
      updates['system.conditionTrack.current'] = 0;
      updates['system.conditionTrack.persistent'] = false;

      if (this.type === 'character') {
        updates['system.secondWind.used'] = false;
        // Reset Force Points to maximum
        updates['system.forcePoints.value'] = this.system.forcePoints.max;
      }
    }

    await this.update(updates);

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this}),
      content: `${this.name} takes a ${type} rest`
    });

    return true;
  }

  /**
   * Get roll data for formulas
   */
  getRollData() {
    const data = super.getRollData();

    // Add useful shortcuts for roll formulas
    data.halfLevel = Math.floor(this.system.level / 2);
    data.conditionPenalty = this.conditionPenalty;

    // Add ability modifiers as shortcuts
    for (const [key, ability] of Object.entries(this.system.abilities)) {
      data[key] = ability.mod;
    }

    // Add defense values
    data.reflex = this.system.defenses.reflex.total;
    data.fortitude = this.system.defenses.fortitude.total;
    data.will = this.system.defenses.will.total;

    return data;
  }
}
