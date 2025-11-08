import { SWSERoll } from '../../rolls/enhanced-rolls.js';

export class SWSEActorBase extends Actor {

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

    // Apply to temp HP first
    if (tempHP > 0 && !options.ignoreTemp) {
      const tempDamage = Math.min(damageToApply, tempHP);
      damageToApply -= tempDamage;
      await this.update({'system.hp.temp': tempHP - tempDamage});
    }

    // Apply to regular HP
    if (damageToApply > 0) {
      const newHP = Math.max(0, currentHP - damageToApply);
      await this.update({'system.hp.value': newHP});

      // Check damage threshold
      if (options.checkThreshold !== false && amount >= this.system.damageThreshold) {
        await this.moveConditionTrack(1);
        ui.notifications.warn(`${this.name} takes a hit! Moved down the condition track.`);
      }

      // Check for death
      if (newHP === 0 && this.isHelpless) {
        ui.notifications.error(`${this.name} has been defeated!`);
      }
    }

    return amount;
  }

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
    if (game.settings.get("swse", "secondWindImproved")) {
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