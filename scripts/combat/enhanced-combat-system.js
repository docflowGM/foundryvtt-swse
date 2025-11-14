/**
 * Enhanced Combat System for SWSE
 * Implements full SWSE combat rules including:
 * - Attack vs Reflex Defense automation
 * - Shield system (personal energy shields)
 * - Damage Reduction (DR)
 * - Force power attacks (Use the Force vs Defense)
 * - Critical hit confirmation and damage
 * - Automatic targeting and damage application
 */

export class SWSECombat {

  /**
   * Roll attack against a target
   * @param {Actor} attacker - The attacking actor
   * @param {Item} weapon - The weapon being used
   * @param {Actor} target - The target actor (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Attack result
   */
  static async rollAttack(attacker, weapon, target = null, options = {}) {
    // Get target from canvas if not provided
    if (!target && canvas.tokens.controlled.length === 1 && game.user.targets.size === 1) {
      target = Array.from(game.user.targets)[0].actor;
    }

    // Calculate attack bonus
    const attackData = this._calculateAttackBonus(attacker, weapon);

    // Roll attack
    const roll = await new Roll(`1d20 + ${attackData.bonus}`).evaluate({async: true});
    const d20Result = roll.terms[0].results[0].result;

    // Determine if it's a natural 1 or 20
    const isNat1 = d20Result === 1;
    const isNat20 = d20Result === 20;

    // Check critical threat
    const critRange = weapon.system?.critRange || 20;
    const isCritThreat = d20Result >= critRange;

    // Build result object
    const result = {
      attacker,
      weapon,
      target,
      roll,
      total: roll.total,
      d20: d20Result,
      bonus: attackData.bonus,
      breakdown: attackData.breakdown,
      isNat1,
      isNat20,
      isCritThreat,
      hits: false,
      critConfirmed: false
    };

    // Check if attack hits
    if (target) {
      const reflexDefense = target.system.defenses?.reflex?.total || 10;
      result.targetDefense = reflexDefense;

      // Natural 1 always misses, natural 20 always hits
      if (isNat1) {
        result.hits = false;
      } else if (isNat20) {
        result.hits = true;
      } else {
        result.hits = roll.total >= reflexDefense;
      }

      // Check critical confirmation if threat
      if (isCritThreat && result.hits && !isNat1) {
        const confirmRoll = await new Roll(`1d20 + ${attackData.bonus}`).evaluate({async: true});
        result.critConfirmRoll = confirmRoll;
        result.critConfirmed = confirmRoll.total >= reflexDefense;
      }
    }

    // Create chat message
    await this._createAttackMessage(result);

    return result;
  }

  /**
   * Roll damage and apply to target
   * @param {Actor} attacker - The attacking actor
   * @param {Item} weapon - The weapon being used
   * @param {Actor} target - The target actor
   * @param {Object} options - Additional options (isCrit, etc.)
   * @returns {Promise<Object>} Damage result
   */
  static async rollDamage(attacker, weapon, target = null, options = {}) {
    const damageData = this._calculateDamage(attacker, weapon, options);

    // Roll damage
    const roll = await new Roll(damageData.formula).evaluate({async: true});

    const result = {
      attacker,
      weapon,
      target,
      roll,
      total: roll.total,
      formula: damageData.formula,
      breakdown: damageData.breakdown,
      isCrit: options.isCrit || false,
      applied: false
    };

    // Apply damage if target selected
    if (target) {
      const damageApplied = await this.applyDamageToTarget(target, roll.total);
      result.applied = true;
      result.damageApplied = damageApplied;
    }

    // Create chat message
    await this._createDamageMessage(result);

    return result;
  }

  /**
   * Apply damage to a target (with Shield Rating and DR)
   * @param {Actor} target - The target actor
   * @param {number} damage - Raw damage amount
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Damage application result
   */
  static async applyDamageToTarget(target, damage, options = {}) {
    let remainingDamage = damage;
    const result = {
      totalDamage: damage,
      shieldReduction: 0,
      shieldRatingLost: 0,
      drReduced: 0,
      hpDamage: 0,
      thresholdExceeded: false
    };

    // 1. Apply Shield Rating (SR) reduction
    // SR reduces ALL damage from the attack
    // SR only decreases by 5 if the attack damage exceeds the current SR
    const currentSR = target.system.shields?.rating || 0;
    if (currentSR > 0) {
      // Shield Rating reduces damage up to its current value
      const shieldReduction = Math.min(remainingDamage, currentSR);
      result.shieldReduction = shieldReduction;
      remainingDamage -= shieldReduction;

      // If attack damage exceeded SR, reduce SR by 5
      if (damage > currentSR) {
        const newSR = Math.max(0, currentSR - 5);
        result.shieldRatingLost = 5;
        await target.update({'system.shields.rating': newSR});

        if (newSR === 0) {
          ui.notifications.warn(`${target.name}'s shields have been depleted!`);
        } else {
          ui.notifications.info(`${target.name}'s shields reduce damage by ${shieldReduction}! (SR reduced from ${currentSR} to ${newSR})`);
        }
      } else {
        ui.notifications.info(`${target.name}'s shields reduce damage by ${shieldReduction}! (SR ${currentSR} holds)`);
      }
    }

    // 2. Apply damage reduction (DR)
    const dr = target.system.damageReduction || 0;
    if (dr > 0 && remainingDamage > 0) {
      const drReduction = Math.min(remainingDamage, dr);
      result.drReduced = drReduction;
      remainingDamage -= drReduction;

      if (drReduction > 0) {
        ui.notifications.info(`${target.name}'s armor reduces damage by ${drReduction}!`);
      }
    }

    // 3. Apply remaining damage to HP
    if (remainingDamage > 0) {
      result.hpDamage = remainingDamage;
      await target.applyDamage(remainingDamage, options);

      // Check if damage exceeded threshold
      const threshold = target.system.damageThreshold || 10;
      result.thresholdExceeded = damage >= threshold;
    }

    return result;
  }

  /**
   * Roll Force power attack
   * @param {Actor} attacker - The Force user
   * @param {Item} power - The Force power
   * @param {Actor} target - The target actor
   * @param {string} defenseType - Which defense to target (reflex, fortitude, will)
   * @returns {Promise<Object>} Force power result
   */
  static async rollForcePowerAttack(attacker, power, target, defenseType = 'will') {
    // Calculate Use the Force bonus
    const utf = attacker.system.skills?.useTheForce || {};
    const utfBonus = utf.total || 0;

    // Roll Use the Force check
    const roll = await new Roll(`1d20 + ${utfBonus}`).evaluate({async: true});
    const d20Result = roll.terms[0].results[0].result;

    // Get target's defense
    const targetDefense = target.system.defenses?.[defenseType]?.total || 10;

    const result = {
      attacker,
      power,
      target,
      defenseType,
      roll,
      total: roll.total,
      d20: d20Result,
      bonus: utfBonus,
      targetDefense,
      hits: roll.total >= targetDefense,
      isNat1: d20Result === 1,
      isNat20: d20Result === 20
    };

    // Natural 1 always fails
    if (result.isNat1) {
      result.hits = false;
    }
    // Natural 20 always succeeds
    if (result.isNat20) {
      result.hits = true;
    }

    // Create chat message
    await this._createForcePowerMessage(result);

    return result;
  }

  /**
   * Calculate attack bonus
   * @private
   */
  static _calculateAttackBonus(attacker, weapon) {
    const system = attacker.system;
    const weaponData = weapon.system;

    // Base attack bonus
    const bab = system.baseAttack || system.bab || 0;

    // Ability modifier
    const attackAbility = weaponData.attackAbility || 'str';
    const abilityMod = system.abilities?.[attackAbility]?.mod || 0;

    // Size modifier
    const sizeModifiers = {
      'fine': 8, 'diminutive': 4, 'tiny': 2, 'small': 1,
      'medium': 0, 'large': -1, 'huge': -2, 'gargantuan': -4, 'colossal': -8
    };
    const sizeMod = sizeModifiers[system.size?.toLowerCase()] || 0;

    // Range penalty (if ranged weapon beyond optimal range)
    let rangePenalty = 0;
    // TODO: Implement range calculation

    // Miscellaneous modifiers
    const misc = weaponData.attackBonus || 0;

    // Condition penalty
    const conditionPenalty = attacker.conditionPenalty || 0;

    // Focus bonus
    const focusBonus = weaponData.focus ? 5 : 0;

    // Total bonus
    const bonus = bab + abilityMod + sizeMod + rangePenalty + misc + focusBonus - conditionPenalty;

    return {
      bonus,
      breakdown: {
        bab,
        abilityMod,
        sizeMod,
        rangePenalty,
        misc,
        focusBonus,
        conditionPenalty
      }
    };
  }

  /**
   * Calculate damage
   * @private
   */
  static _calculateDamage(attacker, weapon, options = {}) {
    const system = attacker.system;
    const weaponData = weapon.system;
    const isCrit = options.isCrit || false;

    // Base damage die
    let baseDamage = weaponData.damage || '1d6';

    // Critical multiplier
    if (isCrit) {
      const critMultiplier = weaponData.critMultiplier || 2;
      // Multiply the dice
      const match = baseDamage.match(/(\d+)d(\d+)/);
      if (match) {
        const numDice = parseInt(match[1]);
        const dieSize = match[2];
        baseDamage = `${numDice * critMultiplier}d${dieSize}`;
      }
    }

    // Half heroic level (rounded down)
    // Official SWSE: All damage includes ½ heroic level
    const heroicLevel = system.heroicLevel || system.level || 1;
    const halfHeroicLevel = Math.floor(heroicLevel / 2);

    // Ability modifier for damage
    const damageAbility = weaponData.damageAbility || weaponData.attackAbility || 'str';
    let abilityMod = system.abilities?.[damageAbility]?.mod || 0;

    // Two-handed modifier (2x STR for melee weapons)
    if (weaponData.twoHanded && damageAbility === 'str') {
      abilityMod = abilityMod * 2;
    }

    // Miscellaneous damage modifiers
    const misc = weaponData.damageBonus || 0;

    // Specialization bonus
    const specializationBonus = weaponData.specialization ? 2 : 0;

    // Total modifier (includes half heroic level per official rules)
    const totalMod = halfHeroicLevel + abilityMod + misc + specializationBonus;

    // Build formula
    const formula = totalMod !== 0 ? `${baseDamage} + ${totalMod}` : baseDamage;

    return {
      formula,
      breakdown: {
        baseDamage,
        halfHeroicLevel,
        abilityMod,
        misc,
        specializationBonus,
        isCrit
      }
    };
  }

  /**
   * Create attack chat message
   * @private
   */
  static async _createAttackMessage(result) {
    const { attacker, weapon, target, roll, total, hits, isCritThreat, critConfirmed, breakdown } = result;

    let content = `
      <div class="swse-attack-roll">
        <div class="attack-header">
          <h3><i class="fas fa-sword"></i> ${weapon.name} Attack</h3>
        </div>
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${roll.formula}</div>
            <div class="dice-total">${total}</div>
          </div>
        </div>
        <div class="attack-breakdown">
          <strong>Breakdown:</strong>
          BAB ${breakdown.bab >= 0 ? '+' : ''}${breakdown.bab},
          Ability ${breakdown.abilityMod >= 0 ? '+' : ''}${breakdown.abilityMod}
          ${breakdown.focusBonus ? `, Focus +${breakdown.focusBonus}` : ''}
          ${breakdown.sizeMod !== 0 ? `, Size ${breakdown.sizeMod >= 0 ? '+' : ''}${breakdown.sizeMod}` : ''}
          ${breakdown.conditionPenalty !== 0 ? `, Condition -${breakdown.conditionPenalty}` : ''}
        </div>
    `;

    if (target) {
      content += `
        <div class="attack-result">
          <strong>vs ${target.name}'s Reflex Defense (${result.targetDefense})</strong>
          <div class="result-text ${hits ? 'hit' : 'miss'}">
            ${hits ? '<i class="fas fa-check-circle"></i> HIT!' : '<i class="fas fa-times-circle"></i> MISS!'}
          </div>
        </div>
      `;

      if (isCritThreat && hits) {
        content += `
          <div class="crit-threat">
            <strong>⚠️ Critical Threat!</strong>
            ${critConfirmed ?
              `<div class="crit-confirmed">✓ Critical Hit Confirmed! (${result.critConfirmRoll.total})</div>` :
              `<div class="crit-failed">✗ Critical Failed (${result.critConfirmRoll?.total || 'N/A'})</div>`
            }
          </div>
        `;
      }

      if (hits) {
        content += `
          <div class="roll-damage-btn">
            <button class="swse-btn" data-action="rollDamage" data-attacker-id="${attacker.id}" data-weapon-id="${weapon.id}" data-target-id="${target.id}" ${critConfirmed ? 'data-is-crit="true"' : ''}>
              <i class="fas fa-dice-d20"></i> Roll Damage ${critConfirmed ? '(CRITICAL!)' : ''}
            </button>
          </div>
        `;
      }
    }

    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: attacker}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    });
  }

  /**
   * Create damage chat message
   * @private
   */
  static async _createDamageMessage(result) {
    const { attacker, weapon, target, roll, total, isCrit, damageApplied } = result;

    let content = `
      <div class="swse-damage-roll">
        <div class="damage-header">
          <h3><i class="fas fa-burst"></i> ${weapon.name} Damage ${isCrit ? '(CRITICAL!)' : ''}</h3>
        </div>
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${roll.formula}</div>
            <div class="dice-total damage-total">${total}</div>
          </div>
        </div>
    `;

    if (damageApplied && target) {
      content += `
        <div class="damage-applied">
          <strong>Damage Applied to ${target.name}:</strong>
          ${damageApplied.shieldReduction > 0 ? `<div>⚡ Shield Rating Reduced: ${damageApplied.shieldReduction}${damageApplied.shieldRatingLost > 0 ? ` (SR -${damageApplied.shieldRatingLost})` : ''}</div>` : ''}
          ${damageApplied.drReduced > 0 ? `<div>🛡️ DR Reduced: ${damageApplied.drReduced}</div>` : ''}
          ${damageApplied.hpDamage > 0 ? `<div>❤️ HP Damage: ${damageApplied.hpDamage}</div>` : ''}
          ${damageApplied.thresholdExceeded ? `<div class="threshold-warning">⚠️ Damage Threshold Exceeded!</div>` : ''}
        </div>
      `;
    }

    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: attacker}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    });
  }

  /**
   * Create Force power chat message
   * @private
   */
  static async _createForcePowerMessage(result) {
    const { attacker, power, target, defenseType, roll, total, hits, targetDefense } = result;

    let content = `
      <div class="swse-force-power-roll">
        <div class="force-header">
          <h3><i class="fas fa-hand-sparkles"></i> ${power.name}</h3>
        </div>
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">Use the Force: ${roll.formula}</div>
            <div class="dice-total">${total}</div>
          </div>
        </div>
        <div class="force-result">
          <strong>vs ${target.name}'s ${defenseType.toUpperCase()} Defense (${targetDefense})</strong>
          <div class="result-text ${hits ? 'hit' : 'miss'}">
            ${hits ? '<i class="fas fa-check-circle"></i> SUCCESS!' : '<i class="fas fa-times-circle"></i> FAILURE!'}
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: attacker}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    });
  }

  /**
   * Initialize combat system hooks
   */
  static init() {
    // Register chat button handlers
    Hooks.on('renderChatMessage', (message, html) => {
      html.find('[data-action="rollDamage"]').click(async (event) => {
        const button = event.currentTarget;
        const attackerId = button.dataset.attackerId;
        const weaponId = button.dataset.weaponId;
        const targetId = button.dataset.targetId;
        const isCrit = button.dataset.isCrit === 'true';

        const attacker = game.actors.get(attackerId);
        const weapon = attacker.items.get(weaponId);
        const target = game.actors.get(targetId);

        if (attacker && weapon) {
          await this.rollDamage(attacker, weapon, target, { isCrit });
        }
      });
    });
  }
}

// Make available globally
window.SWSECombat = SWSECombat;
