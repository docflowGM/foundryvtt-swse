/**
 * Armor Role Alignment Engine
 *
 * Evaluates how well armor fits the character's combat role and playstyle.
 *
 * Role Scoring:
 * Defender/Tank: Armor is essential - high alignment bonus
 * Generalist: Armor is useful - moderate bonus
 * Striker/Mobile: Armor has tradeoffs - negative bonus (mobility cost matters more)
 *
 * Playstyle Modifiers:
 * - Mobile characters (high DEX): penalty for heavy armor
 * - Stationary characters (high STR): bonus for armor in general
 *
 * Scoring: -10 to +25 (matching weapon-scoring ROLE_ALIGNMENT range)
 */

export class ArmorRoleAlignmentEngine {
  /**
   * Compute role alignment bonus for armor
   * @param {Object} armor - The armor item
   * @param {Object} charContext - Character context with role, playstyle
   * @returns {Number} Role alignment score (-10 to +25)
   */
  static computeRoleAlignment(armor, charContext) {
    const category = armor.system?.category || 'light';
    const primaryRole = charContext.primaryRole || 'generalist';
    const playstyleHints = charContext.playstyleHints || [];
    const charDex = charContext.attributes?.dex || 0;
    const charStr = charContext.attributes?.str || 0;

    // Start with role-based score
    let score = this._getRoleScore(primaryRole);

    // Apply armor category modifier for this role
    const categoryModifier = this._getCategoryModifier(category, primaryRole);
    score += categoryModifier;

    // Apply playstyle-specific penalties
    if (playstyleHints.includes('mobile')) {
      score -= this._getMobilePlaystylePenalty(category, charDex);
    }

    // Apply playstyle-specific bonuses
    if (playstyleHints.includes('stationary')) {
      score += this._getStationaryPlaystyleBonus(category);
    }

    // Clamp to bounds
    score = Math.max(-10, Math.min(25, score));

    return score;
  }

  /**
   * Get base role alignment score
   * @private
   */
  static _getRoleScore(role) {
    const roleScores = {
      'defender': 15,        // Armor is central to role
      'tank': 15,            // Armor is central to role
      'generalist': 5,       // Armor is useful but not primary
      'striker': -3,         // Armor trades mobility for protection
      'mobile': -5,          // Armor is actively detrimental
      'support': 3           // Armor is secondary
    };
    return roleScores[role] || 5; // Default to moderate if unknown
  }

  /**
   * Modifier based on armor category and role
   * @private
   */
  static _getCategoryModifier(category, role) {
    // Tank/Defender prefers heavier armor
    if (role === 'defender' || role === 'tank') {
      if (category === 'light') return -2;
      if (category === 'medium') return 3;
      if (category === 'heavy') return 5;
    }

    // Striker/Mobile prefers lighter armor
    if (role === 'striker' || role === 'mobile') {
      if (category === 'light') return 2;
      if (category === 'medium') return -3;
      if (category === 'heavy') return -5;
    }

    // Generalist is neutral
    if (role === 'generalist') {
      if (category === 'light') return 0;
      if (category === 'medium') return 0;
      if (category === 'heavy') return 0;
    }

    return 0;
  }

  /**
   * Penalty for mobile playstyle in heavy armor
   * @private
   */
  static _getMobilePlaystylePenalty(category, charDex) {
    if (category === 'light') return 0;
    if (category === 'medium') return 3;
    if (category === 'heavy') {
      // Heavier penalty for high-DEX characters in heavy armor
      return 5 + Math.max(0, charDex - 1) * 1;
    }
    return 0;
  }

  /**
   * Bonus for stationary playstyle with armor
   * @private
   */
  static _getStationaryPlaystyleBonus(category) {
    if (category === 'light') return 0;
    if (category === 'medium') return 2;
    if (category === 'heavy') return 4;
    return 0;
  }
}

export default ArmorRoleAlignmentEngine;
