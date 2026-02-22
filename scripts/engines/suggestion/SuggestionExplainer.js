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
import { ReasonFactory } from './ReasonFactory.js';

export class SuggestionExplainer {

  /**
   * Generate structured reasons for a suggestion (new API)
   * Returns an array of reason objects with domain, code, text, safe, strength
   *
   * @param {Object} suggestion - { itemName, theme, confidenceLevel, confidence, tier, reason }
   * @param {Actor} actor
   * @param {Object} options - { focus, includeOpportunityCosts }
   * @returns {Array} Array of structured reason objects
   */
  static generateReasons(suggestion, actor, options = {}) {
    try {
      const { focus = null, includeOpportunityCosts = true } = options;
      const reasons = [];
      const primaryAnchor = BuildIdentityAnchor.getAnchor(actor, 'primary');
      const pivotState = PivotDetector.getState(actor);
      const level = actor.system?.level || 1;

      // Base reason from tier
      if (suggestion?.suggestion?.tier && suggestion.suggestion.tier > 0) {
        const tierReason = this._getTierReason(suggestion.suggestion.tier, suggestion, primaryAnchor, level);
        if (tierReason) {
          reasons.push(tierReason);
        }
      }

      // Add anchor-related reasons if available
      if (primaryAnchor) {
        const anchorReason = this._getAnchorReason(suggestion, primaryAnchor, level);
        if (anchorReason) {
          reasons.push(anchorReason);
        }
      }

      // Add pivot-state context
      if (pivotState === PIVOT_STATE.EXPLORATORY) {
        reasons.push(ReasonFactory.weak('player_state', 'EXPLORATORY_PHASE', 'You\'re exploring different directions', true));
      } else if (pivotState === PIVOT_STATE.PIVOTING) {
        reasons.push(ReasonFactory.weak('player_state', 'PIVOTING_PHASE', 'You\'re shifting your build direction', true));
      }

      return ReasonFactory.deduplicate(reasons);
    } catch (err) {
      SWSELogger.error('[SuggestionExplainer] Error generating reasons:', err);
      return [];
    }
  }

  /**
   * Generate a human-readable explanation for a suggestion
   *
   * @param {Object} suggestion - { itemName, theme, confidenceLevel, confidence }
   * @param {Actor} actor
   * @param {Array|Object} opportunityCostReasons - Array of warning strings OR options object
   * @param {Object} options - Optional: { focus, emphasizeContext }
   * @returns {string} Single-sentence explanation
   */
  static explain(suggestion, actor, opportunityCostReasons = [], options = {}) {
    try {
      // Handle backward compatibility: third argument can be options object
      let focusContext = null;
      let costReasons = opportunityCostReasons;

      if (opportunityCostReasons && typeof opportunityCostReasons === 'object' && !Array.isArray(opportunityCostReasons)) {
        options = opportunityCostReasons;
        costReasons = [];
      }

      focusContext = options.focus || null;
      const { emphasizeContext = true } = options;

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
      // Adjust for focus context (narrative emphasis)
      // ─────────────────────────────────────────────────────────────

      if (emphasizeContext && focusContext) {
        explanation = this._adjustForFocus(explanation, focusContext, suggestion);
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

      if (Array.isArray(costReasons) && costReasons.length > 0 && level >= 5) {
        explanation = this._addOpportunityCostWarning(explanation, costReasons);
      }

      return explanation;
    } catch (err) {
      SWSELogger.error('[SuggestionExplainer] Error generating explanation:', err);
      return `${suggestion.itemName} is available for your character.`;
    }
  }

  /**
   * Adjust explanation for progression focus context
   * Emphasizes different aspects based on what the player is focusing on
   * @private
   */
  static _adjustForFocus(explanation, focus, suggestion) {
    if (!focus) {return explanation;}

    const focusAdjustments = {
      skills: {
        replace: /strong fit/i,
        with: 'useful skill training'
      },
      feats: {
        replace: /strong fit/i,
        with: 'powerful feat choice'
      },
      classes: {
        replace: /strong fit/i,
        with: 'strong class progression'
      },
      talents: {
        replace: /strong fit/i,
        with: 'excellent talent synergy'
      },
      attributes: {
        replace: /strong fit/i,
        with: 'key ability improvement'
      },
      forcepowers: {
        replace: /strong fit/i,
        with: 'powerful Force ability'
      }
    };

    const adjustment = focusAdjustments[focus];
    if (adjustment) {
      return explanation.replace(adjustment.replace, adjustment.with);
    }

    return explanation;
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
   * Generate a tier-based reason object
   * @private
   */
  static _getTierReason(tier, suggestion, primaryAnchor, level) {
    const TIER_REASONS = {
      5: { code: 'PRESTIGE_PATH', text: 'Opens a prestige class path', domain: 'progression', strength: 0.95 },
      4: { code: 'CHAIN_CONT', text: 'Continues your current path', domain: 'progression', strength: 0.90 },
      3: { code: 'STRONG_FIT', text: 'Strong fit for your build', domain: 'synergy', strength: 0.85 },
      2: { code: 'MODERATE_FIT', text: 'Works well with your choices', domain: 'synergy', strength: 0.75 },
      1: { code: 'VIABLE', text: 'A viable option', domain: 'options', strength: 0.50 }
    };

    const tierInfo = TIER_REASONS[tier];
    if (!tierInfo) {return null;}

    return ReasonFactory.create({
      domain: tierInfo.domain,
      code: tierInfo.code,
      text: tierInfo.text,
      safe: true,
      strength: tierInfo.strength
    });
  }

  /**
   * Generate an anchor-based reason object
   * @private
   */
  static _getAnchorReason(suggestion, primaryAnchor, level) {
    const matches = this._suggestionMatchesArchetype(suggestion, primaryAnchor.archetype);
    const archetypeName = this._archetypeKeyToName(primaryAnchor.archetype);

    if (matches) {
      return ReasonFactory.create({
        domain: 'archetype',
        code: 'MATCHES_ARCHETYPE',
        text: `Aligns with your ${archetypeName} focus`,
        safe: true,
        strength: 0.85
      });
    } else {
      return ReasonFactory.create({
        domain: 'archetype',
        code: 'DIVERGES_ARCHETYPE',
        text: `Diverges from your ${archetypeName} focus, but viable`,
        safe: true,
        strength: 0.60
      });
    }
  }

  /**
   * Check if suggestion's theme matches an archetype
   */
  static _suggestionMatchesArchetype(suggestion, archetypeKey) {
    if (!suggestion.theme) {return false;}

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
