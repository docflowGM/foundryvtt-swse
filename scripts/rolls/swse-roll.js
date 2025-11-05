export class SWSERoll {

  static async roll(actor, rollType, options = {}) {
    const rollData = actor.getRollData();
    let formula = '1d20';
    let label = '';

    switch(rollType) {
      case 'skill':
        const skill = actor.system.skills[options.skillKey];
        formula = `1d20 + ${skill?.total || 0}`;
        label = `${options.skillKey} Check`;
        break;

      case 'attack':
        formula = `1d20 + @bab + @${options.ability || 'str'}`;
        label = `${options.weapon?.name || 'Attack'} Roll`;
        break;

      case 'damage':
        formula = options.weapon?.system?.damage || '1d6';
        label = `${options.weapon?.name || 'Damage'} Roll`;
        break;

      case 'ability':
        formula = `1d20 + @abilities.${options.ability}.mod`;
        label = `${options.ability.toUpperCase()} Check`;
        break;
    }

    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode')
    });

    return roll;
  }

  static async rollSkill(actor, skillKey) {
    return this.roll(actor, 'skill', {skillKey});
  }

  static async rollAttack(actor, weapon) {
    return this.roll(actor, 'attack', {weapon, ability: weapon?.system?.attackAbility || 'str'});
  }

  static async rollDamage(actor, weapon) {
    return this.roll(actor, 'damage', {weapon});
  }

  static async rollAbility(actor, ability) {
    return this.roll(actor, 'ability', {ability});
  }
}

window.SWSERoll = SWSERoll;
