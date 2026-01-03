/**
 * SuggestionExplainer
 *
 * Phase 2C: Narrative Layer & Explanation Generation
 *
 * Converts engine scoring into human-readable, conversational explanations.
 * Anchors the suggestion in the player's build history and identity.
 *
 * Key Principles:
 * - One sentence, conversational tone
 * - No numbers, no math, no "system" language
 * - Always framed as advice, not instruction
 * - Acknowledges player's actual history
 * - Soft warnings only when necessary
 */

import { SWSELogger } from '../utils/logger.js';
import { BuildIdentityAnchor, ANCHOR_STATE } from './BuildIdentityAnchor.js';
import { PivotDetector, PIVOT_STATE } from './PivotDetector.js';

export class SuggestionExplainer {

  /**
   * Generate a human-readable explanation for a suggestion
   *
   * @param {Object} suggestion - { itemName, theme, confidenceLevel, confidence }
   * @param {Actor} actor
   * @param {Array} opportunityCostReasons - Array of warning strings (optional)
   * @returns {string} Single-sentence explanation
   */
  static explain(suggestion, actor, opportunityCostReasons = []) {
    try {
      const primaryAnchor = BuildIdentityAnchor.getAnchor(actor, 'primary');
      const pivotState = PivotDetector.getState(actor);
      const level = actor.system.level || 1;

      let explanation = '';

      // ─────────────────────────────────────────────────────────────
      // Base explanation based on anchor state
      // ─────────────────────────────────────────────────────────────

      if (primaryAnchor && primaryAnchor.state === ANCHOR_STATE.LOCKED) {
        // Player has a locked identity
        explanation = this._explainForLockedAnchor(suggestion, primaryAnchor, level);
      } else if (primaryAnchor && primaryAnchor.state === ANCHOR_STATE.PROPOSED) {
        // Player is developing an identity
        explanation = this._explainForProposedAnchor(suggestion, primaryAnchor, level);
      } else {
        // No anchor yet - early game or exploratory
        explanation = this._explainForNoAnchor(suggestion, level);
      }

      // ─────────────────────────────────────────────────────────────
      // Adjust for pivot state
      // ─────────────────────────────────────────────────────────────

      if (pivotState === PIVOT_STATE.EXPLORATORY) {
        explanation = this._adjustForExploratory(explanation, suggestion);
      } else if (pivotState === PIVOT_STATE.PIVOTING) {
        explanation = this._adjustForPivoting(explanation, suggestion);
      }

      // ─────────────────────────────────────────────────────────────
      // Add soft opportunity cost warning if needed
      // ─────────────────────────────────────────────────────────────

      if (opportunityCostReasons && opportunityCostReasons.length > 0 && level >= 5) {
        explanation = this._addOpportunityCostWarning(explanation, opportunityCostReasons);
      }

      return explanation;
    } catch (err) {
      SWSELogger.error('[SuggestionExplainer] Error generating explanation:', err);
      return `${suggestion.itemName} is available for your character.`;
    }
  }

  /**
   * Generate explanation for a locked anchor
   * Player has committed to an identity
   */
  static _explainForLockedAnchor(suggestion, primaryAnchor, level) {
    const archetypeName = this._archetypeKeyToName(primaryAnchor.archetype);

    // Check if suggestion matches anchor
    const matches = this._suggestionMatchesArchetype(suggestion, primaryAnchor.archetype);

    if (matches) {
      // Strong match - reinforce identity
      if (level < 5) {
        return `${suggestion.itemName} is a natural fit for your ${archetypeName} direction.`;
      } else if (level < 10) {
        return `This continues building on your ${archetypeName} foundation.`;
      } else {
        return `${suggestion.itemName} deepens your established ${archetypeName} expertise.`;
      }
    } else {
      // Contradiction to anchor
      if (level < 5) {
        return `${suggestion.itemName} differs from your focus on ${archetypeName}, but isn't ruled out.`;
      } else {
        return `${suggestion.itemName} doesn't fit your ${archetypeName} focus, though it could work in niche cases.`;
      }
    }
  }

  /**
   * Generate explanation for a proposed anchor
   * Player is leaning toward an identity
   */
  static _explainForProposedAnchor(suggestion, primaryAnchor, level) {
    const archetypeName = this._archetypeKeyToName(primaryAnchor.archetype);
    const matches = this._suggestionMatchesArchetype(suggestion, primaryAnchor.archetype);

    if (matches) {
      return `${suggestion.itemName} supports the ${archetypeName} direction you've been leaning.`;
    } else {
      return `${suggestion.itemName} would shift away from the ${archetypeName} path you've been exploring.`;
    }
  }

  /**
   * Generate explanation when no anchor is detected
   * Early game or highly exploratory
   */
  static _explainForNoAnchor(suggestion, level) {
    if (level <= 3) {
      return `${suggestion.itemName} is a solid early choice for your developing character.`;
    } else {
      return `${suggestion.itemName} complements your current build well.`;
    }
  }

  /**
   * Adjust explanation for EXPLORATORY pivot state
   * Player is experimenting - be permissive
   */
  static _adjustForExploratory(explanation, suggestion) {
    // Replace "is a natural fit" with "could work well"
    // Replace "doesn't fit" with "could be interesting"
    return explanation
      .replace(/is a natural fit/i, 'could work well')
      .replace(/doesn't fit/i, 'could be interesting')
      .replace(/differs from your focus/i, 'diverges from your main focus, but you\'re exploring');
  }

  /**
   * Adjust explanation for PIVOTING state
   * Player is actively changing direction
   */
  static _adjustForPivoting(explanation, suggestion) {
    // Emphasize flexibility
    return explanation
      .replace(/your focus/, 'your previous focus')
      .replace(/your direction/, 'your past direction');
  }

  /**
   * Add soft opportunity cost warning
   * Only surfaces after level 5 to avoid early-game overwhelm
   */
  static _addOpportunityCostWarning(explanation, reasons) {
    if (!reasons || reasons.length === 0) {
      return explanation;
    }

    // Format reasons nicely
    let warningText;
    if (reasons.length === 1) {
      warningText = reasons[0];
    } else {
      warningText = reasons.slice(0, 2).join('; ');  // Only use first 2 reasons
    }

    return `${explanation} Just note: ${warningText}.`;
  }

  /**
   * Check if suggestion's theme matches an archetype
   */
  static _suggestionMatchesArchetype(suggestion, archetypeKey) {
    if (!suggestion.theme) return false;

    // Import theme mapping (avoid circular dependency)
    // This will be resolved at runtime when module loads
    try {
      const THEME_TO_ARCHETYPE = {
        'melee': ['frontline_damage', 'assassin'],
        'force': ['force_dps', 'force_control'],
        'ranged': ['sniper', 'assassin'],
        'stealth': ['assassin', 'sniper'],
        'social': ['face', 'controller'],
        'tech': ['tech_specialist', 'skill_monkey'],
        'leadership': ['controller', 'face'],
        'support': ['force_control', 'controller'],
        'combat': ['frontline_damage', 'controller'],
        'exploration': ['skill_monkey', 'sniper'],
        'vehicle': ['sniper', 'tech_specialist'],
        'tracking': ['sniper', 'skill_monkey']
      };

      const archetypes = THEME_TO_ARCHETYPE[suggestion.theme] || [];
      return archetypes.includes(archetypeKey);
    } catch (err) {
      return false;
    }
  }

  /**
   * Convert archetype key to human-readable name
   */
  static _archetypeKeyToName(key) {
    const names = {
      'frontline_damage': 'Frontline Damage Dealer',
      'controller': 'Battlefield Controller',
      'face': 'Face / Social Manipulator',
      'skill_monkey': 'Skill Monkey',
      'force_dps': 'Force DPS',
      'force_control': 'Force Control',
      'tech_specialist': 'Tech Specialist',
      'sniper': 'Sniper / Ranged',
      'assassin': 'Assassin / Stealth'
    };
    return names[key] || 'build';
  }
}
