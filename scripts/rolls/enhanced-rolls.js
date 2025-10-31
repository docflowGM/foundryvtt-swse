/**
 * Enhanced Roll Helpers
 * Provides utilities for rolling with SWSE-specific features
 */

export class SWSERoll {
  
  /**
   * Create an attack roll
   */
  static async rollAttack(actor, weapon, options = {}) {
    const rollData = actor.getRollData();
    
    // Build attack formula
    let formula = '1d20';
    formula += ` + @bab`;
    formula += ` + @${weapon.system.attackAttribute || 'str'}`;
    formula += ` + ${weapon.system.attackBonus || 0}`;
    formula += ` + @sizeMod`;
    formula += ` + @conditionPenalty`;
    
    // Create roll
    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});
    
    // Create chat message
    const chatData = {
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${weapon.name} - Attack Roll`,
      content: await this._createAttackCard(roll, weapon, actor),
      sound: CONFIG.sounds.dice
    };
    
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    
    return ChatMessage.create(chatData);
  }
  
  /**
   * Create a damage roll
   */
  static async rollDamage(actor, weapon, options = {}) {
    const rollData = actor.getRollData();
    
    // Build damage formula
    let formula = weapon.system.damage || '1d6';
    
    // Add ability modifier if melee
    if (!weapon.system.range || weapon.system.range.toLowerCase() === 'melee') {
      formula += ` + @${weapon.system.attackAttribute || 'str'}`;
    }
    
    // Add half level
    formula += ` + @halfLevel`;
    
    // Create roll
    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});
    
    // Create chat message
    const chatData = {
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${weapon.name} - Damage Roll`,
      content: await this._createDamageCard(roll, weapon, actor),
      sound: CONFIG.sounds.dice
    };
    
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    
    return ChatMessage.create(chatData);
  }
  
  /**
   * Create a skill check
   */
  static async rollSkill(actor, skillKey, options = {}) {
    const skill = actor.system.skills[skillKey];
    const rollData = actor.getRollData();
    
    const formula = `1d20 + @skills.${skillKey}`;
    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});
    
    const chatData = {
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${skillKey.capitalize()} Check`,
      content: await this._createSkillCard(roll, skillKey, skill, actor),
      sound: CONFIG.sounds.dice
    };
    
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    
    return ChatMessage.create(chatData);
  }
  
  /**
   * Create Use the Force check
   */
  static async rollUseTheForce(actor, power, options = {}) {
    const rollData = actor.getRollData();
    const formula = `1d20 + @skills.useTheForce`;
    
    const roll = new Roll(formula, rollData);
    await roll.evaluate({async: true});
    
    const dc = power.system.useTheForce || 15;
    const success = roll.total >= dc;
    
    const chatData = {
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `Use the Force: ${power.name}`,
      content: await this._createForcePowerCard(roll, power, dc, success, actor),
      sound: CONFIG.sounds.dice
    };
    
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    
    return ChatMessage.create(chatData);
  }
  
  // === PRIVATE HELPER METHODS ===
  
  static async _createAttackCard(roll, weapon, actor) {
    return `
      <div class="swse-roll attack-roll">
        <div class="roll-header">
          <img src="${weapon.img}" alt="${weapon.name}"/>
          <h3>${weapon.name}</h3>
        </div>
        <div class="roll-result">
          <div class="dice-result">
            <h4 class="dice-total">${roll.total}</h4>
          </div>
          <div class="dice-formula">
            <span class="formula">${roll.formula}</span>
          </div>
        </div>
        <div class="roll-breakdown">
          ${this._formatRollBreakdown(roll)}
        </div>
      </div>
    `;
  }
  
  static async _createDamageCard(roll, weapon, actor) {
    return `
      <div class="swse-roll damage-roll">
        <div class="roll-header">
          <img src="${weapon.img}" alt="${weapon.name}"/>
          <h3>${weapon.name} - Damage</h3>
        </div>
        <div class="roll-result">
          <div class="dice-result">
            <h4 class="dice-total">${roll.total}</h4>
          </div>
          <div class="damage-type">
            ${weapon.system.damageType || 'energy'}
          </div>
        </div>
        <div class="roll-breakdown">
          ${this._formatRollBreakdown(roll)}
        </div>
        <button class="apply-damage" data-amount="${roll.total}">
          Apply ${roll.total} Damage
        </button>
      </div>
    `;
  }
  
  static async _createSkillCard(roll, skillKey, skill, actor) {
    return `
      <div class="swse-roll skill-roll">
        <div class="roll-header">
          <h3>${skillKey.capitalize()}</h3>
        </div>
        <div class="roll-result">
          <div class="dice-result">
            <h4 class="dice-total">${roll.total}</h4>
          </div>
          <div class="skill-modifier">
            Modifier: ${skill.total >= 0 ? '+' : ''}${skill.total}
          </div>
        </div>
        <div class="roll-breakdown">
          ${this._formatRollBreakdown(roll)}
        </div>
      </div>
    `;
  }
  
  static async _createForcePowerCard(roll, power, dc, success, actor) {
    return `
      <div class="swse-roll force-roll ${success ? 'success' : 'failure'}">
        <div class="roll-header">
          <img src="${power.img}" alt="${power.name}"/>
          <h3>${power.name}</h3>
        </div>
        <div class="roll-result">
          <div class="dice-result">
            <h4 class="dice-total">${roll.total}</h4>
            <span class="dc-label">DC ${dc}</span>
          </div>
          <div class="result-label ${success ? 'success' : 'failure'}">
            ${success ? '✓ SUCCESS' : '✗ FAILURE'}
          </div>
        </div>
        <div class="power-effect">
          ${power.system.effect || ''}
        </div>
      </div>
    `;
  }
  
  static _formatRollBreakdown(roll) {
    const parts = [];
    
    for (const term of roll.terms) {
      if (term instanceof Die) {
        parts.push(`<span class="dice-part">${term.results.map(r => r.result).join(', ')}</span>`);
      } else if (term instanceof NumericTerm) {
        if (term.number !== 0) {
          parts.push(`<span class="modifier-part">${term.number >= 0 ? '+' : ''}${term.number}</span>`);
        }
      }
    }
    
    return `<div class="breakdown">${parts.join(' ')}</div>`;
  }
}

// Make available globally
window.SWSERoll = SWSERoll;
