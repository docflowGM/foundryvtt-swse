/**
 * Enhanced Combat System for SWSE
 *
 * @class SWSECombat
 * @description
 * Implements full Star Wars Saga Edition combat rules including:
 * - Attack vs Reflex Defense automation
 * - Shield system (personal energy shields with SR)
 * - Damage Reduction (DR) from armor
 * - Force power attacks (Use the Force vs Defense)
 * - Critical hit confirmation and multiplied damage
 * - Automatic targeting and damage application
 * - Range calculation and penalties
 * - Cover and concealment detection
 * - Flanking detection and bonuses
 * - Point Blank Shot, Precise Shot, and other combat feat support
 * - Full Attack action with Double/Triple Attack feats
 *
 * @example
 * // Roll a standard attack
 * const result = await SWSECombat.rollAttack(attacker, weapon, target);
 *
 * @example
 * // Roll a full attack action
 * const fullAttack = await SWSECombat.rollFullAttack(attacker, weapon, target);
 *
 * @example
 * // Roll damage separately
 * const damage = await SWSECombat.rollDamage(attacker, weapon, target, { isCrit: true });
 */

import { getCoverBonus, getConcealmentMissChance, checkConcealmentHit, getFlankingBonus } from '../utils/combat-utils.js';

export class SWSECombat {

    static getSelectedActor() {
        return canvas.tokens.controlled[0]?.actor;
    }


  /**
   * Roll attack against a target
   *
   * @param {Actor} attacker - The attacking actor
   * @param {Item} weapon - The weapon item being used for the attack
   * @param {Actor} [target=null] - The target actor (auto-detected if not provided)
   * @param {Object} [options={}] - Additional attack options
   * @param {number} [options.multipleAttackPenalty=0] - Penalty from multiple attacks (Full Attack)
   * @param {number} [options.attackNumber] - Which attack in a series (for Full Attack)
   * @param {number} [options.totalAttacks] - Total attacks being made (for Full Attack)
   * @param {boolean} [options.isFullAttack=false] - Whether this is part of a Full Attack action
   * @param {number} [options.rangePenalty] - Manual range penalty override
   * @param {boolean} [options.powerAttack=false] - Whether Power Attack is being used
   * @param {number} [options.powerAttackPenalty=0] - Power Attack penalty amount
   *
   * @returns {Promise<Object>} Attack result containing:
   * @returns {Actor} returns.attacker - The attacking actor
   * @returns {Item} returns.weapon - The weapon used
   * @returns {Actor} returns.target - The target actor
   * @returns {Roll} returns.roll - The d20 attack roll
   * @returns {number} returns.total - Total attack roll (d20 + modifiers)
   * @returns {number} returns.d20 - The natural d20 result
   * @returns {number} returns.bonus - Total attack bonus (without d20)
   * @returns {string} returns.breakdown - Human-readable breakdown of bonuses
   * @returns {Object} returns.modifiers - Detailed modifier values
   * @returns {boolean} returns.isNat1 - Whether the d20 was a natural 1 (auto-miss)
   * @returns {boolean} returns.isNat20 - Whether the d20 was a natural 20 (auto-hit)
   * @returns {boolean} returns.isCritThreat - Whether this threatens a critical hit
   * @returns {boolean} returns.hits - Whether the attack hit the target
   * @returns {boolean} returns.critConfirmed - Whether critical was confirmed
   * @returns {Roll} [returns.critConfirmRoll] - The critical confirmation roll (if applicable)
   * @returns {boolean} returns.concealmentMiss - Whether concealment caused a miss
   * @returns {number} [returns.targetDefense] - Target's Reflex Defense
   *
   * @example
   * // Basic attack
   * const result = await SWSECombat.rollAttack(myCharacter, blasterRifle);
   * if (result.hits) {
   *   await SWSECombat.rollDamage(myCharacter, blasterRifle, result.target);
   * }
   *
   * @example
   * // Attack with Power Attack
   * const result = await SWSECombat.rollAttack(warrior, sword, enemy, {
   *   powerAttack: true,
   *   powerAttackPenalty: 5
   * });
   */
  static async rollAttack(attacker, weapon, target = null, options = {}) {
    // Get target from canvas if not provided
    if (!target && canvas.tokens.controlled.length === 1 && game.user.targets.size === 1) {
      target = Array.from(game.user.targets)[0].actor;
    }

    // Get tokens for positioning
    const attackerToken = attacker.getActiveTokens()[0];
    const targetToken = target?.getActiveTokens()[0];

    // Calculate attack bonus with all modifiers
    const attackData = this._calculateAttackBonus(attacker, weapon, target, {
      attackerToken,
      targetToken,
      ...options
    });

    // Roll attack
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackData.bonus}`).evaluate({async: true});
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
      modifiers: attackData.modifiers,
      isNat1,
      isNat20,
      isCritThreat,
      hits: false,
      critConfirmed: false,
      concealmentMiss: false
    };

    // Check if attack hits
    if (target) {
      let reflexDefense = target.system.defenses?.reflex?.total || 10;

      // Add cover bonus to defense
      if (attackData.modifiers.coverBonus > 0) {
        reflexDefense += attackData.modifiers.coverBonus;
      }

      result.targetDefense = reflexDefense;

      // Natural 1 always misses, natural 20 always hits
      if (isNat1) {
        result.hits = false;
      } else if (isNat20) {
        result.hits = true;
      } else {
        result.hits = roll.total >= reflexDefense;
      }

      // Check concealment miss chance
      if (result.hits && attackData.modifiers.concealmentChance > 0) {
        const concealmentHit = checkConcealmentHit(attackData.modifiers.concealmentChance);
        if (!concealmentHit) {
          result.concealmentMiss = true;
          result.hits = false;
        }
      }

      // Check critical confirmation if threat
      if (isCritThreat && result.hits && !isNat1 && !result.concealmentMiss) {
        const confirmRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackData.bonus}`).evaluate({async: true});
        result.critConfirmRoll = confirmRoll;
        result.critConfirmed = confirmRoll.total >= reflexDefense;
      }
    }

    // Create chat message
    await this._createAttackMessage(result);

    return result;
  }

  /**
   * Roll Full Attack action with multiple attacks
   *
   * @description
   * Executes a Full Attack action according to SWSE rules. Number of attacks
   * and penalties are determined by the character's Double Attack and Triple Attack feats:
   * - No feats: 1 attack (standard Full Attack)
   * - Double Attack: 2 attacks at -5 each
   * - Double Attack + Triple Attack: 3 attacks at -10 each
   *
   * @param {Actor} attacker - The attacking actor
   * @param {Item} weapon - The weapon being used for all attacks
   * @param {Actor} [target=null] - The target actor (auto-detected if not provided)
   * @param {Object} [options={}] - Additional options passed to each attack
   *
   * @returns {Promise<Object>} Full attack result containing:
   * @returns {Array<Object>} returns.attacks - Array of individual attack results
   * @returns {number} returns.totalAttacks - Total number of attacks made
   * @returns {number} returns.attackPenalty - Penalty applied to each attack
   * @returns {boolean} returns.hasDoubleAttack - Whether character has Double Attack feat
   * @returns {boolean} returns.hasTripleAttack - Whether character has Triple Attack feat
   * @returns {boolean} returns.isFullAttack - Always true for Full Attack actions
   *
   * @example
   * // Full Attack with a character that has Double Attack (Rifles)
   * const result = await SWSECombat.rollFullAttack(soldier, blasterRifle, enemy);
   * // Result: 2 attacks at -5 each
   * swseLogger.log(result.totalAttacks); // 2
   * swseLogger.log(result.attackPenalty); // -5
   *
   * @example
   * // Full Attack with no Double/Triple Attack feats
   * const result = await SWSECombat.rollFullAttack(rookie, pistol, target);
   * // Result: 1 attack at no penalty (standard Full Attack)
   */
  static async rollFullAttack(attacker, weapon, target = null, options = {}) {
    // Check for Double Attack and Triple Attack feats
    const weaponGroup = weapon.system?.weaponGroup || weapon.name.toLowerCase();

    // Find Double Attack feat for this weapon
    const doubleAttackFeat = attacker.items.find(i =>
      i.type === 'feat' &&
      i.name.toLowerCase().includes('double attack') &&
      (i.system?.appliesTo?.toLowerCase().includes(weaponGroup) ||
       i.system?.weaponGroup?.toLowerCase().includes(weaponGroup) ||
       i.name.toLowerCase().includes(weaponGroup))
    );

    // Find Triple Attack feat for this weapon
    const tripleAttackFeat = attacker.items.find(i =>
      i.type === 'feat' &&
      i.name.toLowerCase().includes('triple attack') &&
      (i.system?.appliesTo?.toLowerCase().includes(weaponGroup) ||
       i.system?.weaponGroup?.toLowerCase().includes(weaponGroup) ||
       i.name.toLowerCase().includes(weaponGroup))
    );

    // Determine number of attacks and penalty
    let numAttacks = 1; // Default: Full Attack action = 1 attack
    let attackPenalty = 0;

    if (tripleAttackFeat && doubleAttackFeat) {
      // Triple Attack requires Double Attack
      numAttacks = 3;
      attackPenalty = -10; // -5 from Double Attack + -5 from Triple Attack
    } else if (doubleAttackFeat) {
      numAttacks = 2;
      attackPenalty = -5;
    }

    // Notify if no multiple attack feats
    if (numAttacks === 1) {
      ui.notifications.info(`${attacker.name} has no Double Attack or Triple Attack feat for ${weapon.name}. Full Attack = 1 attack.`);
    }

    const results = [];

    // Roll each attack with the penalty applied
    for (let i = 0; i < numAttacks; i++) {
      const attackOptions = {
        ...options,
        multipleAttackPenalty: attackPenalty,
        attackNumber: i + 1,
        totalAttacks: numAttacks,
        isFullAttack: true
      };

      const attackResult = await this.rollAttack(attacker, weapon, target, attackOptions);
      results.push(attackResult);

      // Brief delay between attacks for visual clarity
      if (i < numAttacks - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      attacks: results,
      totalAttacks: numAttacks,
      attackPenalty,
      hasDoubleAttack: !!doubleAttackFeat,
      hasTripleAttack: !!tripleAttackFeat,
      isFullAttack: true
    };
  }

  /**
   * Roll damage and optionally apply it to a target
   *
   * @description
   * Rolls weapon damage including all modifiers (ability, feats, critical multipliers).
   * If a target is provided, automatically applies damage accounting for Shield Rating
   * and Damage Reduction.
   *
   * @param {Actor} attacker - The attacking actor
   * @param {Item} weapon - The weapon being used
   * @param {Actor} [target=null] - The target actor (optional)
   * @param {Object} [options={}] - Additional damage options
   * @param {boolean} [options.isCrit=false] - Whether this is a critical hit (multiplies damage)
   * @param {number} [options.critMultiplier] - Critical multiplier override (default from weapon)
   * @param {number} [options.bonusDamage=0] - Additional flat damage bonus
   * @param {string} [options.damageType] - Damage type override (energy, kinetic, etc.)
   *
   * @returns {Promise<Object>} Damage result containing:
   * @returns {Actor} returns.attacker - The attacking actor
   * @returns {Item} returns.weapon - The weapon used
   * @returns {Actor} returns.target - The target actor (if provided)
   * @returns {Roll} returns.roll - The damage roll
   * @returns {number} returns.total - Total damage rolled
   * @returns {string} returns.formula - Damage formula used
   * @returns {string} returns.breakdown - Human-readable breakdown
   * @returns {boolean} returns.isCrit - Whether this was a critical hit
   * @returns {boolean} returns.applied - Whether damage was applied to a target
   * @returns {Object} [returns.damageApplied] - Damage application details (if target provided)
   *
   * @example
   * // Roll normal damage
   * const damage = await SWSECombat.rollDamage(attacker, weapon, target);
   *
   * @example
   * // Roll critical hit damage
   * const critDamage = await SWSECombat.rollDamage(attacker, weapon, target, {
   *   isCrit: true
   * });
   *
   * @example
   * // Roll damage without applying (for manual application)
   * const damage = await SWSECombat.rollDamage(attacker, weapon, null);
   * // Later: await SWSECombat.applyDamageToTarget(target, damage.total);
   */
  static async rollDamage(attacker, weapon, target = null, options = {}) {
    const damageData = this._calculateDamage(attacker, weapon, options);

    // Roll damage
    const roll = await globalThis.SWSE.RollEngine.safeRoll(damageData.formula).evaluate({async: true});

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
   * Apply damage to a target with Shield Rating and Damage Reduction
   *
   * @description
   * Applies damage according to SWSE rules:
   * 1. Shield Rating (SR) absorbs damage first
   *    - If damage > SR, shields lose 5 SR
   *    - If damage <= SR, shields absorb without SR loss
   * 2. Damage Reduction (DR) reduces remaining damage
   * 3. Remaining damage applied to HP
   * 4. Checks if Damage Threshold exceeded
   *
   * @param {Actor} target - The target actor receiving damage
   * @param {number} damage - Raw damage amount before reductions
   * @param {Object} [options={}] - Additional damage application options
   * @param {boolean} [options.ignoreShields=false] - Whether to bypass Shield Rating
   * @param {boolean} [options.ignoreDR=false] - Whether to bypass Damage Reduction
   * @param {string} [options.damageType] - Type of damage (for specific resistances)
   *
   * @returns {Promise<Object>} Damage application result containing:
   * @returns {number} returns.totalDamage - Original damage amount
   * @returns {number} returns.shieldReduction - Damage absorbed by shields
   * @returns {number} returns.shieldRatingLost - Shield Rating lost (0 or 5)
   * @returns {number} returns.drReduced - Damage reduced by DR
   * @returns {number} returns.hpDamage - Actual HP damage taken
   * @returns {boolean} returns.thresholdExceeded - Whether Damage Threshold was exceeded
   *
   * @example
   * // Apply 20 damage to a target with SR 10, DR 5
   * const result = await SWSECombat.applyDamageToTarget(droid, 20);
   * // Result: 10 absorbed by shields, SR reduced to 5
   * //         Remaining 10 damage reduced by 5 DR
   * //         5 HP damage actually taken
   *
   * @example
   * // Apply massive damage that exceeds threshold
   * const result = await SWSECombat.applyDamageToTarget(soldier, 50);
   * if (result.thresholdExceeded) {
   *   swseLogger.log("Target must make a damage threshold check!");
   * }
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
    const currentSR = target.system.shields?.rating || 0;
    if (currentSR > 0) {
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
      try {await target.applyDamage(remainingDamage, options);} catch(err) { swseLogger.error(err); ui.notifications.error('Damage/Healing failed.'); }

      // Update token HP bar
      const tokens = target.getActiveTokens();
      for (const token of tokens) {
        await token.document.update({
          'actorData.system.hp': target.system.hp
        });
      }

      // Check if damage exceeded threshold
      const threshold = target.system.damageThreshold || 10;
      result.thresholdExceeded = damage >= threshold;
    }

    return result;
  }

  /**
   * Roll Force power attack using Use the Force skill
   *
   * @description
   * Rolls a Use the Force check to attack with a Force power. The check is made
   * against one of the target's three defenses (Reflex, Fortitude, or Will) as
   * specified by the power.
   *
   * @param {Actor} attacker - The Force user making the attack
   * @param {Item} power - The Force power being used
   * @param {Actor} target - The target actor
   * @param {string} [defenseType='will'] - Which defense to target ('reflex', 'fortitude', or 'will')
   *
   * @returns {Promise<Object>} Force power result containing:
   * @returns {Actor} returns.attacker - The Force user
   * @returns {Item} returns.power - The Force power used
   * @returns {Actor} returns.target - The target actor
   * @returns {string} returns.defenseType - Defense being targeted
   * @returns {Roll} returns.roll - The Use the Force check roll
   * @returns {number} returns.total - Total check result
   * @returns {number} returns.d20 - Natural d20 result
   * @returns {number} returns.bonus - Use the Force skill bonus
   * @returns {number} returns.targetDefense - Target's defense value
   * @returns {boolean} returns.hits - Whether the power hit
   * @returns {boolean} returns.isNat1 - Natural 1 (auto-miss)
   * @returns {boolean} returns.isNat20 - Natural 20 (auto-hit)
   *
   * @example
   * // Force Lightning targeting Reflex Defense
   * const result = await SWSECombat.rollForcePowerAttack(
   *   jedi,
   *   forceLightning,
   *   target,
   *   'reflex'
   * );
   * if (result.hits) {
   *   // Apply Force Lightning damage
   * }
   *
   * @example
   * // Force Grip targeting Fortitude Defense
   * const result = await SWSECombat.rollForcePowerAttack(
   *   sith,
   *   forceGrip,
   *   victim,
   *   'fortitude'
   * );
   */
  static async rollForcePowerAttack(attacker, power, target, defenseType = 'will') {
    // Calculate Use the Force bonus
    const utf = attacker.system.skills?.useTheForce || {};
    const utfBonus = utf.total || 0;

    // Roll Use the Force check
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${utfBonus}`).evaluate({async: true});
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
   * Calculate attack bonus with all SWSE modifiers
   * @private
   */
  static _calculateAttackBonus(attacker, weapon, target, options = {}) {
    const system = attacker.system;
    const weaponData = weapon.system;
    const { attackerToken, targetToken, babOverride, fightingDefensively, totalDefense, multipleAttackPenalty } = options;

    // Base attack bonus
    const bab = babOverride !== undefined ? babOverride : (system.baseAttack || system.bab || 0);

    // Ability modifier
    const attackAbility = weaponData.attackAbility || 'str';
    const abilityMod = system.abilities?.[attackAbility]?.mod || 0;

    // Size modifier
    const sizeModifiers = {
      'fine': 8, 'diminutive': 4, 'tiny': 2, 'small': 1,
      'medium': 0, 'large': -1, 'huge': -2, 'gargantuan': -4, 'colossal': -8
    };
    const sizeMod = sizeModifiers[system.size?.toLowerCase()] || 0;

    // Miscellaneous weapon modifiers
    const misc = weaponData.attackBonus || 0;

    // Condition penalty
    const conditionPenalty = Math.abs(attacker.conditionPenalty || 0);

    // Focus bonus
    const focusBonus = weaponData.focus ? 5 : 0;

    // Calculate range-based modifiers
    let rangePenalty = 0;
    let pointBlankBonus = 0;
    let distance = 0;
    let rangeCategory = 'melee';

    if (attackerToken && targetToken && canvas.grid) {
      distance = canvas.grid.measureDistance(attackerToken, targetToken);
      const squareSize = canvas.scene.grid.distance || 5; // Default 5 feet per square
      const squares = Math.floor(distance / squareSize);

      // Get weapon range bands (SWSE has 4 bands: Point-Blank, Short, Medium, Long)
      const ranges = this._getWeaponRanges(weapon);

      if (ranges) {
        // Determine which range band the target is in
        if (squares <= ranges.pointBlank) {
          rangeCategory = 'point-blank';
          rangePenalty = 0;

          // Point Blank Shot feat applies within point-blank range
          const hasPointBlankShotFeat = attacker.items.find(i =>
            i.type === 'feat' && i.name.toLowerCase().includes('point blank shot')
          );
          const pointBlankShotDefault = game.settings.get('swse', 'pointBlankShotDefault');

          if (hasPointBlankShotFeat || pointBlankShotDefault) {
            pointBlankBonus = 1;
          }
        } else if (squares <= ranges.short) {
          rangeCategory = 'short';
          rangePenalty = -2;
        } else if (squares <= ranges.medium) {
          rangeCategory = 'medium';
          rangePenalty = -5;
        } else if (squares <= ranges.long) {
          rangeCategory = 'long';
          rangePenalty = -10;
        } else {
          rangeCategory = 'out-of-range';
          rangePenalty = -20; // Beyond long range = extreme penalty
        }
      }
    }

    // Flanking bonus
    let flankingBonus = 0;
    if (attackerToken && targetToken && this._checkFlanking(attackerToken, targetToken)) {
      flankingBonus = getFlankingBonus(true);
    }

    // Cover and concealment (target benefits)
    let coverBonus = 0;
    let concealmentChance = 0;
    if (attackerToken && targetToken) {
      const coverResult = this._checkCover(attackerToken, targetToken);
      coverBonus = getCoverBonus(coverResult.coverType);
      concealmentChance = getConcealmentMissChance(coverResult.concealmentType || 'none');
    }

    // Precise Shot (negates firing into melee penalty)
    let firingIntoMeleePenalty = 0;
    if (weaponData.ranged && targetToken && this._isTargetInMelee(targetToken)) {
      const hasPreciseShot = attacker.items.find(i =>
        i.type === 'feat' && i.name.toLowerCase().includes('precise shot')
      );
      if (!hasPreciseShot) {
        firingIntoMeleePenalty = -5;
      }
    }

    // Fighting Defensively (-5 to attacks, +2 to Reflex Defense)
    const fightingDefensivelyPenalty = fightingDefensively ? -5 : 0;

    // Total Defense (no attacks allowed, but included for completeness)
    const totalDefensePenalty = totalDefense ? -100 : 0;

    // Multiple Attack Penalty (from Double Attack / Triple Attack feats)
    const multiAttackPenalty = multipleAttackPenalty || 0;

    // Total bonus
    const bonus = bab + abilityMod + sizeMod + rangePenalty + misc + focusBonus +
                  pointBlankBonus + flankingBonus + firingIntoMeleePenalty +
                  fightingDefensivelyPenalty + totalDefensePenalty + multiAttackPenalty - conditionPenalty;

    return {
      bonus,
      breakdown: {
        bab,
        abilityMod,
        sizeMod,
        rangePenalty,
        misc,
        focusBonus,
        pointBlankBonus,
        flankingBonus,
        firingIntoMeleePenalty,
        fightingDefensivelyPenalty,
        multipleAttackPenalty: multiAttackPenalty,
        conditionPenalty
      },
      modifiers: {
        coverBonus,
        concealmentChance,
        distance,
        rangeCategory,
        isFlanking: flankingBonus > 0,
        isPointBlank: pointBlankBonus > 0,
        isFiringIntoMelee: firingIntoMeleePenalty !== 0
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

    // Point Blank Shot bonus (if within point-blank range)
    let pointBlankDamageBonus = 0;
    if (options.isPointBlank) {
      const hasPointBlankShotFeat = attacker.items.find(i =>
        i.type === 'feat' && i.name.toLowerCase().includes('point blank shot')
      );
      const pointBlankShotDefault = game.settings.get('swse', 'pointBlankShotDefault');

      if (hasPointBlankShotFeat || pointBlankShotDefault) {
        pointBlankDamageBonus = 1;
      }
    }

    // Total modifier (includes half heroic level per official rules)
    const totalMod = halfHeroicLevel + abilityMod + misc + specializationBonus + pointBlankDamageBonus;

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
        pointBlankDamageBonus,
        isCrit
      }
    };
  }

  /**
   * Check if two tokens are flanking a target
   * @private
   */
  static _checkFlanking(attackerToken, targetToken) {
    // Get all tokens within 5 feet of target
    const allies = canvas.tokens.placeables.filter(t =>
      t.actor &&
      t !== attackerToken &&
      t.document.disposition === attackerToken.document.disposition &&
      canvas.grid.measureDistance(t, targetToken) <= 5
    );

    if (allies.length === 0) return false;

    // Check if any ally is on opposite side of target
    const attackerPos = {
      x: attackerToken.center.x,
      y: attackerToken.center.y
    };
    const targetPos = {
      x: targetToken.center.x,
      y: targetToken.center.y
    };

    for (const ally of allies) {
      const allyPos = {
        x: ally.center.x,
        y: ally.center.y
      };

      // Calculate angle between attacker and ally relative to target
      const angleToAttacker = Math.atan2(attackerPos.y - targetPos.y, attackerPos.x - targetPos.x);
      const angleToAlly = Math.atan2(allyPos.y - targetPos.y, allyPos.x - targetPos.x);

      let angleDiff = Math.abs(angleToAttacker - angleToAlly);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      // Flanking if approximately opposite (within 45 degrees of 180)
      if (angleDiff >= (Math.PI * 3/4) && angleDiff <= (Math.PI * 5/4)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if target is in melee with another creature
   * @private
   */
  static _isTargetInMelee(targetToken) {
    const adjacentEnemies = canvas.tokens.placeables.filter(t =>
      t.actor &&
      t !== targetToken &&
      t.document.disposition !== targetToken.document.disposition &&
      canvas.grid.measureDistance(t, targetToken) <= 5
    );

    return adjacentEnemies.length > 0;
  }

  /**
   * Get weapon range bands based on weapon type
   * @private
   * @param {Item} weapon - The weapon
   * @returns {Object|null} Range bands in squares or null if melee
   */
  static _getWeaponRanges(weapon) {
    const weaponData = weapon.system;

    let ranges = null;

    // Check if weapon has custom ranges defined
    if (weaponData.ranges) {
      ranges = {
        pointBlank: weaponData.ranges.pointBlank || weaponData.ranges.pointblank || 0,
        short: weaponData.ranges.short || 0,
        medium: weaponData.ranges.medium || 0,
        long: weaponData.ranges.long || 0
      };
    } else {
      // Determine weapon type and apply SWSE standard ranges
      const weaponType = (weaponData.weaponType || weaponData.type || '').toLowerCase();
      const weaponGroup = (weaponData.weaponGroup || '').toLowerCase();
      const weaponName = weapon.name.toLowerCase();

      // SWSE Range Categories (Core Rulebook p.150)
      // All ranges in squares (1 square = 5 feet)

      // Heavy Weapons: 0-50 / 51-100 / 101-250 / 251-500 squares
      if (weaponType.includes('heavy') || weaponGroup.includes('heavy') ||
          weaponName.includes('heavy repeating')) {
        ranges = { pointBlank: 50, short: 100, medium: 250, long: 500 };
      }
      // Rifles: 0-30 / 31-60 / 61-150 / 151-300 squares
      else if (weaponType.includes('rifle') || weaponGroup.includes('rifle') ||
          weaponName.includes('rifle') || weaponName.includes('carbine') ||
          weaponName.includes('sniper')) {
        ranges = { pointBlank: 30, short: 60, medium: 150, long: 300 };
      }
      // Pistols: 0-20 / 21-40 / 41-60 / 61-80 squares
      else if (weaponType.includes('pistol') || weaponGroup.includes('pistol') ||
          weaponName.includes('pistol') || weaponName.includes('blaster pistol') ||
          weaponName.includes('hold-out')) {
        ranges = { pointBlank: 20, short: 40, medium: 60, long: 80 };
      }
      // Thrown Weapons: 0-6 / 7-8 / 9-10 / 11-12 squares
      else if (weaponType.includes('thrown') || weaponGroup.includes('thrown') ||
          weaponName.includes('grenade') || weaponName.includes('thermal detonator') ||
          weaponName.includes('thrown')) {
        ranges = { pointBlank: 6, short: 8, medium: 10, long: 12 };
      }
      // Simple Weapons (ranged): 0-20 / 21-40 / 41-60 / 61-80 squares
      else if (weaponGroup.includes('simple') && (weaponData.ranged || weaponType.includes('ranged'))) {
        ranges = { pointBlank: 20, short: 40, medium: 60, long: 80 };
      }
      // Bows/Crossbows (not standard SWSE but might be in game): same as simple ranged
      else if (weaponName.includes('bow') || weaponName.includes('crossbow')) {
        ranges = { pointBlank: 20, short: 40, medium: 60, long: 80 };
      }
      // Default: if marked as ranged but type unknown, use pistol ranges
      else if (weaponData.ranged || weaponType.includes('ranged')) {
        ranges = { pointBlank: 20, short: 40, medium: 60, long: 80 };
      }
    }

    // Melee weapons have no range
    if (!ranges) return null;

    // Apply house rule range reduction multiplier
    const rangeReduction = game.settings.get('swse', 'weaponRangeReduction');
    let multiplier = 1.0;

    switch (rangeReduction) {
      case 'threequarter': // 75% reduction
        multiplier = 0.25;
        break;
      case 'half': // 50% reduction
        multiplier = 0.5;
        break;
      case 'quarter': // 25% reduction
        multiplier = 0.75;
        break;
      case 'none': // No reduction (default)
      default:
        multiplier = 1.0;
        break;
    }

    // Apply multiplier to all range bands and round to nearest square
    return {
      pointBlank: Math.round(ranges.pointBlank * multiplier),
      short: Math.round(ranges.short * multiplier),
      medium: Math.round(ranges.medium * multiplier),
      long: Math.round(ranges.long * multiplier)
    };
  }

  /**
   * Check cover and concealment between attacker and target
   * @private
   */
  static _checkCover(attackerToken, targetToken) {
    // This is a simplified implementation
    // A full implementation would use ray casting and check for obstacles

    const result = {
      coverType: 'none',
      concealmentType: 'none'
    };

    // Check if there are any tokens between attacker and target
    const ray = new Ray(attackerToken.center, targetToken.center);
    const tokens = canvas.tokens.placeables;

    for (const token of tokens) {
      if (token === attackerToken || token === targetToken) continue;

      // Check if token intersects the ray
      const bounds = token.bounds;
      const intersects = ray.intersectSegment([
        {x: bounds.left, y: bounds.top},
        {x: bounds.right, y: bounds.bottom}
      ]);

      if (intersects) {
        // Token is blocking - determine if it's cover or concealment
        // For now, assume it's partial cover
        result.coverType = 'partial';
        break;
      }
    }

    // Check walls/terrain
    // This would require integration with Foundry's wall system
    // For now, return the basic result
    return result;
  }

  /**
   * Create attack chat message
   * @private
   */
  static async _createAttackMessage(result) {
    const { attacker, weapon, target, roll, total, hits, isCritThreat, critConfirmed,
            concealmentMiss, breakdown, modifiers } = result;

    let content = `
      <div class="swse-attack-roll">
        <div class="attack-header">
          <h3><i class="fas fa-sword"></i> ${weapon.name} Attack</h3>
          ${modifiers.isPointBlank ? '<span class="badge">Point Blank</span>' : ''}
          ${modifiers.isFlanking ? '<span class="badge">Flanking</span>' : ''}
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
          ${breakdown.rangePenalty !== 0 ? `, Range ${breakdown.rangePenalty}` : ''}
          ${breakdown.pointBlankBonus !== 0 ? `, Point Blank +${breakdown.pointBlankBonus}` : ''}
          ${breakdown.flankingBonus !== 0 ? `, Flanking +${breakdown.flankingBonus}` : ''}
          ${breakdown.firingIntoMeleePenalty !== 0 ? `, Firing into Melee ${breakdown.firingIntoMeleePenalty}` : ''}
          ${breakdown.fightingDefensivelyPenalty !== 0 ? `, Fighting Defensively ${breakdown.fightingDefensivelyPenalty}` : ''}
          ${breakdown.multipleAttackPenalty !== 0 ? `, Multiple Attacks ${breakdown.multipleAttackPenalty}` : ''}
          ${breakdown.conditionPenalty !== 0 ? `, Condition -${breakdown.conditionPenalty}` : ''}
          ${modifiers.distance && modifiers.rangeCategory !== 'melee' ? `, ${Math.round(modifiers.distance)}ft (${modifiers.rangeCategory})` : ''}
        </div>
    `;

    if (target) {
      const totalDefense = result.targetDefense + (modifiers.coverBonus || 0);
      content += `
        <div class="attack-result">
          <strong>vs ${target.name}'s Reflex Defense (${totalDefense})</strong>
          ${modifiers.coverBonus > 0 ? `<div class="cover-note">+${modifiers.coverBonus} Cover Bonus</div>` : ''}
          ${modifiers.concealmentChance > 0 ? `<div class="concealment-note">${modifiers.concealmentChance}% Miss Chance</div>` : ''}
          <div class="result-text ${hits ? 'hit' : 'miss'}">
            ${concealmentMiss ? '<i class="fas fa-eye-slash"></i> MISS (Concealment)!' :
              hits ? '<i class="fas fa-check-circle"></i> HIT!' :
              '<i class="fas fa-times-circle"></i> MISS!'}
          </div>
        </div>
      `;

      if (isCritThreat && hits && !concealmentMiss) {
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

      if (hits && !concealmentMiss) {
        content += `
          <div class="roll-damage-btn">
            <button class="swse-btn" data-action="rollDamage" data-attacker-id="${attacker.id}" data-weapon-id="${weapon.id}" data-target-id="${target.id}" ${critConfirmed ? 'data-is-crit="true"' : ''} ${modifiers.isPointBlank ? 'data-is-point-blank="true"' : ''}>
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
        const isPointBlank = button.dataset.isPointBlank === 'true';

        const attacker = game.actors.get(attackerId);
        const weapon = attacker.items.get(weaponId);
        const target = game.actors.get(targetId);

        if (attacker && weapon) {
          await this.rollDamage(attacker, weapon, target, { isCrit, isPointBlank });
        }
      });
    });
  }
}

// Make available globally
window.SWSECombat = SWSECombat;
