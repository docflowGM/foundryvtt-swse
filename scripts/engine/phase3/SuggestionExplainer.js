/**
 * Phase 3: SuggestionExplainer (Simplified)
 *
 * Clean, mentor-ready explanation generation.
 * This is a strategic simplification of Phase 2C logic.
 *
 * Responsibilities:
 * - Generate one-sentence mentor explanations
 * - Anchor explanations in player's build identity
 * - Adjust tone for exploration/pivoting
 * - Hide all math and system language
 */

export class SuggestionExplainer {
  /**
   * Generate explanation given anchor and pivot state
   *
   * @param {Object} suggestion - { itemName, theme }
   * @param {Object} context - { anchorState, archetypeName, pivotState, level }
   * @param {Array} opportunityCostReasons - Optional warnings
   * @returns {string} Single-sentence explanation
   */
  static explain(suggestion, context, opportunityCostReasons = []) {
    const { anchorState, archetypeName, pivotState, level } = context;

    let explanation = '';

    // Base explanation by anchor state
    if (anchorState === 'locked') {
      explanation = this._explainForLockedAnchor(suggestion, archetypeName, level);
    } else if (anchorState === 'proposed') {
      explanation = this._explainForProposedAnchor(suggestion, archetypeName, level);
    } else {
      explanation = this._explainForNoAnchor(suggestion, level);
    }

    // Adjust for pivot state
    if (pivotState === 'exploratory') {
      explanation = this._adjustForExploratory(explanation);
    } else if (pivotState === 'pivoting') {
      explanation = this._adjustForPivoting(explanation);
    }

    // Add soft warnings if needed
    if (opportunityCostReasons?.length > 0 && level >= 5) {
      explanation = this._addOpportunityCostWarning(explanation, opportunityCostReasons);
    }

    return explanation;
  }

  /**
   * Explanation for locked anchor (identity confirmed)
   */
  static _explainForLockedAnchor(suggestion, archetypeName, level) {
    const matches = this._themeMatchesArchetype(suggestion.theme, archetypeName);

    if (matches) {
      if (level < 5) {
        return `${suggestion.itemName} is a natural fit for your ${archetypeName} direction.`;
      } else if (level < 10) {
        return `This continues building on your ${archetypeName} foundation.`;
      } else {
        return `${suggestion.itemName} deepens your established ${archetypeName} expertise.`;
      }
    } else {
      if (level < 5) {
        return `${suggestion.itemName} differs from your focus on ${archetypeName}, but isn't ruled out.`;
      } else {
        return `${suggestion.itemName} doesn't fit your ${archetypeName} focus, though it could work in niche cases.`;
      }
    }
  }

  /**
   * Explanation for proposed anchor (identity emerging)
   */
  static _explainForProposedAnchor(suggestion, archetypeName, level) {
    const matches = this._themeMatchesArchetype(suggestion.theme, archetypeName);

    if (matches) {
      return `${suggestion.itemName} supports the ${archetypeName} direction you've been leaning.`;
    } else {
      return `${suggestion.itemName} would shift away from the ${archetypeName} path you've been exploring.`;
    }
  }

  /**
   * Explanation when no anchor detected
   */
  static _explainForNoAnchor(suggestion, level) {
    if (level <= 3) {
      return `${suggestion.itemName} is a solid early choice for your developing character.`;
    } else {
      return `${suggestion.itemName} complements your current build well.`;
    }
  }

  /**
   * Soften language for exploratory state
   */
  static _adjustForExploratory(explanation) {
    return explanation
      .replace(/is a natural fit/i, 'could work well')
      .replace(/doesn't fit/i, 'could be interesting')
      .replace(/differs from your focus/i, 'diverges from your main focus, but you\'re exploring');
  }

  /**
   * Acknowledge direction change for pivoting state
   */
  static _adjustForPivoting(explanation) {
    return explanation
      .replace(/your focus/, 'your previous focus')
      .replace(/your direction/, 'your past direction');
  }

  /**
   * Add soft opportunity cost warning
   */
  static _addOpportunityCostWarning(explanation, reasons) {
    if (!reasons?.length) {return explanation;}

    const warningText = reasons.length === 1
      ? reasons[0]
      : reasons.slice(0, 2).join('; ');

    return `${explanation} Just note: ${warningText}.`;
  }

  /**
   * Check if suggestion theme matches archetype
   */
  static _themeMatchesArchetype(theme, archetypeName) {
    const THEME_TO_ARCHETYPE = {
      'melee': ['Frontline Damage Dealer', 'Assassin / Stealth'],
      'force': ['Force DPS', 'Force Control'],
      'ranged': ['Sniper / Ranged', 'Assassin / Stealth'],
      'stealth': ['Assassin / Stealth', 'Sniper / Ranged'],
      'social': ['Face / Social Manipulator', 'Battlefield Controller'],
      'tech': ['Tech Specialist', 'Skill Monkey'],
      'leadership': ['Battlefield Controller', 'Face / Social Manipulator'],
      'support': ['Force Control', 'Battlefield Controller'],
      'combat': ['Frontline Damage Dealer', 'Battlefield Controller'],
      'exploration': ['Skill Monkey', 'Sniper / Ranged'],
      'vehicle': ['Sniper / Ranged', 'Tech Specialist'],
      'tracking': ['Sniper / Ranged', 'Skill Monkey']
    };

    const archetypes = THEME_TO_ARCHETYPE[theme] || [];
    return archetypes.includes(archetypeName);
  }
}
