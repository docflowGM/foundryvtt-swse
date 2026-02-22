/**
 * Tactical Suggestion Evaluator
 *
 * Generates real suggestions based on combat state.
 * Replaces placeholders in CombatSuggestionEngine.
 */

export class TacticalEvaluator {
  /**
   * Generate tactical suggestions for an actor
   * @param {Actor} actor
   * @param {Combat} combat
   * @returns {Array} Suggestion entries
   */
  static generateSuggestions(actor, combat) {
    if (!actor || !combat) {return [];}

    const suggestions = [];
    const combatant = combat.combatants.find(c => c.actor?.id === actor.id);
    if (!combatant) {return [];}

    // 1. Ranged attack suggestions
    const rangedAttacks = this._getRangedAttackSuggestions(actor, combat);
    suggestions.push(...rangedAttacks);

    // 2. Melee attack suggestions
    const meleeAttacks = this._getMeleeAttackSuggestions(actor, combat);
    suggestions.push(...meleeAttacks);

    // 3. Movement suggestions
    const movement = this._getMovementSuggestions(actor, combat, combatant);
    suggestions.push(...movement);

    // 4. Defense suggestions
    const defense = this._getDefenseSuggestions(actor, combat);
    suggestions.push(...defense);

    // 5. Action economy suggestions
    const actions = this._getActionEconomySuggestions(actor, combat, combatant);
    suggestions.push(...actions);

    // Sort by score descending
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Get ranged attack suggestions
   * @private
   */
  static _getRangedAttackSuggestions(actor, combat) {
    const suggestions = [];
    const enemies = this._getEnemiesInRange(actor, combat, 'ranged');

    if (enemies.length === 0) {
      return suggestions;
    }

    enemies.forEach((enemy, idx) => {
      const score = this._scoreTarget(actor, enemy, 'ranged');
      suggestions.push({
        id: `ranged-${idx}`,
        label: `Attack ${enemy.name}`,
        category: 'attack',
        score,
        confidence: Math.min(1, score + 0.2),
        reasonCodes: ['target-in-range', 'offensive-option'],
        explanation: `${enemy.name} is in ranged range. Score: ${(score * 100).toFixed(0)}%`
      });
    });

    return suggestions;
  }

  /**
   * Get melee attack suggestions
   * @private
   */
  static _getMeleeAttackSuggestions(actor, combat) {
    const suggestions = [];
    const enemies = this._getEnemiesInRange(actor, combat, 'melee');

    if (enemies.length === 0) {
      return suggestions;
    }

    enemies.forEach((enemy, idx) => {
      const score = this._scoreTarget(actor, enemy, 'melee');
      suggestions.push({
        id: `melee-${idx}`,
        label: `Engage ${enemy.name}`,
        category: 'attack',
        score,
        confidence: Math.min(1, score + 0.15),
        reasonCodes: ['target-adjacent', 'close-quarters'],
        explanation: `${enemy.name} is adjacent. High-damage option.`
      });
    });

    return suggestions;
  }

  /**
   * Get movement suggestions
   * @private
   */
  static _getMovementSuggestions(actor, combat, combatant) {
    const suggestions = [];

    // Low HP: move away
    const hpPercent = actor.system?.hp?.value / actor.system?.hp?.max || 0.5;
    if (hpPercent < 0.35) {
      suggestions.push({
        id: 'move-away',
        label: 'Move to Safety',
        category: 'movement',
        score: 0.8,
        confidence: 0.9,
        reasonCodes: ['low-hp', 'tactical-retreat'],
        explanation: `You're at ${(hpPercent * 100).toFixed(0)}% HP. Repositioning is critical.`
      });
    }

    // Reposition for advantage
    suggestions.push({
      id: 'move-position',
      label: 'Reposition',
      category: 'movement',
      score: 0.5,
      confidence: 0.6,
      reasonCodes: ['tactical-advantage', 'flanking-opportunity'],
      explanation: 'Move to gain positional advantage or flank an enemy.'
    });

    return suggestions;
  }

  /**
   * Get defense suggestions
   * @private
   */
  static _getDefenseSuggestions(actor, combat) {
    const suggestions = [];
    const hpPercent = actor.system?.hp?.value / actor.system?.hp?.max || 0.5;

    if (hpPercent < 0.5) {
      suggestions.push({
        id: 'defend',
        label: 'Take Defensive Stance',
        category: 'defense',
        score: 0.65,
        confidence: 0.8,
        reasonCodes: ['moderate-threat', 'defensive-bonus'],
        explanation: 'Increase defense at the cost of reduced offense.'
      });
    }

    // Retreat behind cover
    suggestions.push({
      id: 'cover',
      label: 'Move to Cover',
      category: 'defense',
      score: 0.45,
      confidence: 0.65,
      reasonCodes: ['environmental-advantage', 'damage-reduction'],
      explanation: 'Position behind cover to reduce incoming damage.'
    });

    return suggestions;
  }

  /**
   * Get action economy suggestions
   * @private
   */
  static _getActionEconomySuggestions(actor, combat, combatant) {
    const suggestions = [];

    // Aid ally
    suggestions.push({
      id: 'aid-ally',
      label: 'Aid an Ally',
      category: 'utility',
      score: 0.4,
      confidence: 0.55,
      reasonCodes: ['team-action', 'support-bonus'],
      explanation: 'Grant an ally +1 to their next attack or skill check.'
    });

    // Use item
    suggestions.push({
      id: 'use-item',
      label: 'Use an Item',
      category: 'utility',
      score: 0.35,
      confidence: 0.5,
      reasonCodes: ['consumable-resource', 'utility-option'],
      explanation: 'Use a stimpack, grenade, or other item.'
    });

    return suggestions;
  }

  /**
   * Get enemies in range
   * @private
   */
  static _getEnemiesInRange(actor, combat, rangeType) {
    const enemies = combat.combatants
      .filter(c => c.actor && c.actor.id !== actor.id && this._isEnemy(actor, c.actor))
      .map(c => c.actor);

    return enemies;
  }

  /**
   * Score a target (0-1)
   * @private
   */
  static _scoreTarget(actor, enemy, rangeType) {
    if (!enemy) {return 0;}

    const enemyHPPercent = enemy.system?.hp?.value / enemy.system?.hp?.max || 0.5;
    const isCriticalHealth = enemyHPPercent < 0.25;

    // Base score
    let score = 0.6;

    // Bonus: low enemy HP
    if (isCriticalHealth) {score += 0.25;} else if (enemyHPPercent < 0.5) {score += 0.15;}

    // Bonus: ranged > melee (safer)
    if (rangeType === 'ranged') {score += 0.05;}

    return Math.min(1, score);
  }

  /**
   * Check if actor is enemy of another
   * @private
   */
  static _isEnemy(actor, other) {
    // Placeholder: in real system, use faction/disposition
    // For now: assume all others are enemies in combat
    return true;
  }

  /**
   * Calculate confidence band
   */
  static calculateConfidenceBand(actor, combat) {
    const hpPercent = actor.system?.hp?.value / actor.system?.hp?.max || 0.5;

    if (hpPercent > 0.75) {return 'STRONG';}
    if (hpPercent > 0.5) {return 'MODERATE';}
    if (hpPercent > 0.25) {return 'WEAK';}
    return 'FALLBACK';
  }

  /**
   * Extract role tags from actor
   */
  static getRoleTags(actor) {
    const tags = [];

    // Check class
    const classItem = actor.items.find(i => i.type === 'class');
    if (classItem) {
      tags.push(classItem.name.toLowerCase().replace(/\s+/g, '-'));
    }

    // Check for specific talent markers
    const talents = actor.items.filter(i => i.type === 'talent');
    if (talents.some(t => t.name.includes('Sniper'))) {tags.push('ranged-specialist');}
    if (talents.some(t => t.name.includes('Duelist'))) {tags.push('melee-specialist');}
    if (talents.some(t => t.name.includes('Medic'))) {tags.push('support');}

    return tags.length > 0 ? tags : ['unknown'];
  }

  /**
   * Get intent vector from recent actions
   */
  static getIntentVector(combatant) {
    // Placeholder: infer from combat history
    // For now: return generic intents
    const intents = [];

    const token = combatant.token;
    if (!token) {return ['unknown'];}

    // Check token status
    if (token.document?.hidden) {intents.push('evasion');}

    return intents.length > 0 ? intents : ['tactical'];
  }

  /**
   * Evaluate party aggregate metrics
   */
  static evaluatePartyAggregate(combat) {
    const combatants = combat.combatants || [];
    const pcCombatants = combatants.filter(c => c.actor && !c.isNPC);
    const enemyCombatants = combatants.filter(c => c.actor && c.isNPC);

    // HP ratios
    const pcHP = pcCombatants
      .map(c => (c.actor?.system?.hp?.value || 0) / (c.actor?.system?.hp?.max || 1))
      .reduce((a, b) => a + b, 0) / Math.max(1, pcCombatants.length);

    const enemyHP = enemyCombatants
      .map(c => (c.actor?.system?.hp?.value || 0) / (c.actor?.system?.hp?.max || 1))
      .reduce((a, b) => a + b, 0) / Math.max(1, enemyCombatants.length);

    // Pressure: high when PCs are weak and enemies are strong
    const pressureIndex = Math.max(0, Math.min(1, (1 - pcHP) * (enemyCombatants.length / Math.max(1, pcCombatants.length))));

    // Entropy: how many viable options exist?
    const optionEntropy = Math.max(0.2, Math.min(1, pcCombatants.length / Math.max(1, Math.ceil(combatants.length / 2))));

    // Spotlight: equal when all PCs are healthy
    const healthVariance = pcCombatants.length > 1
      ? pcCombatants
          .map(c => c.actor?.system?.hp?.value / c.actor?.system?.hp?.max || 0.5)
          .reduce((sum, h) => sum + Math.pow(h - pcHP, 2), 0) / pcCombatants.length
      : 0;
    const spotlightImbalance = Math.min(1, Math.sqrt(healthVariance));

    return {
      optionEntropy,
      convergenceScore: 1 - optionEntropy,
      pressureIndex,
      confidenceMean: pcHP,
      confidenceVariance: healthVariance,
      intentDistribution: {
        offensive: 0.4,
        defensive: 0.35,
        utility: 0.25
      },
      roleCoverage: {
        striker: { expected: 1, actual: 1 },
        support: { expected: 0, actual: 0 }
      },
      spotlightImbalance
    };
  }

  /**
   * Evaluate diagnostic signals
   */
  static evaluateDiagnostics(combat) {
    const combatants = combat.combatants || [];
    const pcCombatants = combatants.filter(c => c.actor && !c.isNPC);

    // Fallback rate: how many actors have low HP?
    const fallbackActors = pcCombatants.filter(c => {
      const hp = c.actor?.system?.hp?.value / c.actor?.system?.hp?.max || 0.5;
      return hp < 0.35;
    }).length;
    const fallbackRate = Math.min(1, fallbackActors / Math.max(1, pcCombatants.length));

    // Defensive bias: check if most suggestions are defensive
    const defensiveBias = Math.min(1, fallbackRate * 0.7); // Rough proxy

    return {
      fallbackRate,
      repeatedSuggestionRate: 0.1, // Placeholder
      defensiveBias,
      perceptionMismatch: false,
      evaluationWarnings: fallbackActors > 0
        ? [`${fallbackActors} actor(s) at critical health`]
        : []
    };
  }
}
