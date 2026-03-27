/**
 * Suggestion Result Contract — Phase 4 Work Package C
 *
 * Defines the unified schema that all suggestion engines must output.
 * Ensures consistent, explainable, auditable suggestions.
 *
 * Schema:
 * {
 *   optionId: string,
 *   optionName: string,
 *   tier: number (6-0, high to low confidence),
 *   score: number,
 *   reasons: [
 *     { type, text, signal, weight }
 *   ],
 *   tradeoffs: [
 *     { type, text, impact }
 *   ],
 *   warnings: [
 *     { level, text, actionable }
 *   ],
 *   mentorContext: {
 *     voice: string,
 *     keyPoints: [string],
 *     cautionLevel: 'none' | 'warning' | 'caution'
 *   },
 *   forecastSummary: {
 *     unlocks: [string],
 *     delays: {},
 *     blocks: [string]
 *   },
 *   debugInfo: {
 *     scoringFactors: {},
 *     selectedOver: [string],
 *     exclusions: [string]
 *   }
 * }
 */

/**
 * Reason types for suggestions
 */
export const ReasonType = {
  PRESTIGE_PREREQUISITE: 'prestige-prerequisite',  // Required for prestige class
  PRESTIGE_QUALIFIED: 'prestige-qualified',        // Just became eligible for prestige
  CHAIN_CONTINUATION: 'chain-continuation',        // Continues a feat/talent chain
  ARCHETYPE_SYNERGY: 'archetype-synergy',         // Matches inferred archetype
  ABILITY_SYNERGY: 'ability-synergy',             // Scales with high ability
  SKILL_SYNERGY: 'skill-synergy',                 // Uses trained skill
  CLASS_SYNERGY: 'class-synergy',                 // Strong class match
  SURVEY_SIGNAL: 'survey-signal',                 // Matches declared survey answer
  META_SYNERGY: 'meta-synergy',                   // Community-validated synergy
  MENTOR_SIGNAL: 'mentor-signal',                 // Mentor bias for this item
  AVAILABLE: 'available',                          // Just legal (fallback)
};

/**
 * Tradeoff types for suggestions
 */
export const TradeoffType = {
  PRESTIGE_DELAY: 'prestige-delay',              // Delays prestige entry
  SKILL_OPPORTUNITY: 'skill-opportunity',        // Loses access to skill synergy
  FEAT_CHAIN_BREAK: 'feat-chain-break',         // Breaks continuation of chain
  ATTRIBUTE_UNFIT: 'attribute-unfit',           // Poor fit for current attributes
  ACTION_ECONOMY: 'action-economy',              // Uses valuable action slot
  DUPLICATE_BENEFIT: 'duplicate-benefit',        // Duplicates existing bonus
  RARE_SLOT: 'rare-slot',                       // Uses scarce resource
};

/**
 * Warning types for suggestions
 */
export const WarningType = {
  DIRTY_NODE: 'dirty-node',                     // Prior selection changed; reconsider
  NEAR_BLOCKED: 'near-blocked',                 // Soon to be illegal
  LOW_SYNERGY: 'low-synergy',                   // Weak mechanical synergy
  RISKY_PRESTIGE: 'risky-prestige',             // Prestige path becomes difficult
  UNUSUAL_BUILD: 'unusual-build',               // Atypical for this archetype
};

/**
 * Build a suggestion result that adheres to the contract.
 *
 * @param {Object} options - Result data
 * @returns {Object} Canonical suggestion result
 */
export function buildSuggestionResult(options = {}) {
  return {
    // Identification
    optionId: options.optionId || 'unknown',
    optionName: options.optionName || 'Unknown Option',

    // Confidence/Ranking
    tier: validateTier(options.tier ?? 0),
    score: options.score ?? 0,

    // Explanation
    reasons: Array.isArray(options.reasons)
      ? options.reasons.map(validateReason)
      : [],

    // Caveats
    tradeoffs: Array.isArray(options.tradeoffs)
      ? options.tradeoffs.map(validateTradeoff)
      : [],

    warnings: Array.isArray(options.warnings)
      ? options.warnings.map(validateWarning)
      : [],

    // Mentor/advisory output
    mentorContext: {
      voice: options.mentorContext?.voice || 'neutral',
      keyPoints: Array.isArray(options.mentorContext?.keyPoints)
        ? options.mentorContext.keyPoints
        : [],
      cautionLevel: validateCautionLevel(options.mentorContext?.cautionLevel ?? 'none'),
    },

    // Forward-looking summary
    forecastSummary: {
      unlocks: Array.isArray(options.forecastSummary?.unlocks)
        ? options.forecastSummary.unlocks
        : [],
      delays: options.forecastSummary?.delays ?? {},
      blocks: Array.isArray(options.forecastSummary?.blocks)
        ? options.forecastSummary.blocks
        : [],
    },

    // Debugging/auditability
    debugInfo: {
      scoringFactors: options.debugInfo?.scoringFactors ?? {},
      selectedOver: Array.isArray(options.debugInfo?.selectedOver)
        ? options.debugInfo.selectedOver
        : [],
      exclusions: Array.isArray(options.debugInfo?.exclusions)
        ? options.debugInfo.exclusions
        : [],
    },
  };
}

/**
 * Validate tier is in valid range [0-6].
 * @private
 */
function validateTier(tier) {
  const t = parseInt(tier, 10);
  return Math.max(0, Math.min(6, isNaN(t) ? 0 : t));
}

/**
 * Validate reason adheres to schema.
 * @private
 */
function validateReason(reason) {
  if (typeof reason === 'string') {
    return {
      type: ReasonType.AVAILABLE,
      text: reason,
      signal: null,
      weight: 1,
    };
  }

  return {
    type: reason.type || ReasonType.AVAILABLE,
    text: reason.text || '',
    signal: reason.signal || null,
    weight: Math.max(0, reason.weight ?? 1),
  };
}

/**
 * Validate tradeoff adheres to schema.
 * @private
 */
function validateTradeoff(tradeoff) {
  if (typeof tradeoff === 'string') {
    return {
      type: TradeoffType.DUPLICATE_BENEFIT,
      text: tradeoff,
      impact: 'medium',
    };
  }

  return {
    type: tradeoff.type || TradeoffType.DUPLICATE_BENEFIT,
    text: tradeoff.text || '',
    impact: validateImpactLevel(tradeoff.impact ?? 'medium'),
  };
}

/**
 * Validate warning adheres to schema.
 * @private
 */
function validateWarning(warning) {
  if (typeof warning === 'string') {
    return {
      level: 'warning',
      text: warning,
      actionable: false,
    };
  }

  return {
    level: validateWarningLevel(warning.level ?? 'warning'),
    text: warning.text || '',
    actionable: warning.actionable === true,
  };
}

/**
 * Validate impact level.
 * @private
 */
function validateImpactLevel(level) {
  const valid = ['low', 'medium', 'high'];
  return valid.includes(level) ? level : 'medium';
}

/**
 * Validate warning level.
 * @private
 */
function validateWarningLevel(level) {
  const valid = ['info', 'warning', 'caution', 'urgent'];
  return valid.includes(level) ? level : 'warning';
}

/**
 * Validate caution level.
 * @private
 */
function validateCautionLevel(level) {
  const valid = ['none', 'warning', 'caution'];
  return valid.includes(level) ? level : 'none';
}

/**
 * Score a suggestion based on tier and factors.
 *
 * @param {number} tier - Tier (0-6)
 * @param {Object} factors - Additional scoring factors
 * @returns {number} Final score
 */
export function scoreFromTier(tier, factors = {}) {
  // Base score from tier
  const tiers = [1, 2, 4, 7, 12, 18, 25];
  let score = tiers[validateTier(tier)] || 0;

  // Adjust by factors
  if (factors.matchesBuildSignal) score += 5;
  if (factors.unlocksTarget) score += 8;
  if (factors.delaysTarget) score -= 5;
  if (factors.hasWarning) score -= 3;
  if (factors.confidence) score *= Math.max(0.5, factors.confidence);

  return Math.round(score);
}

/**
 * Compare two suggestions to determine ranking.
 *
 * @param {Object} a - First suggestion result
 * @param {Object} b - Second suggestion result
 * @returns {number} Sort order (-1, 0, or 1)
 */
export function compareSuggestions(a, b) {
  // Higher tier wins
  if ((b.tier ?? 0) !== (a.tier ?? 0)) {
    return (b.tier ?? 0) - (a.tier ?? 0);
  }

  // Higher score wins
  if ((b.score ?? 0) !== (a.score ?? 0)) {
    return (b.score ?? 0) - (a.score ?? 0);
  }

  // Fewer warnings wins
  const aWarnings = (a.warnings ?? []).length;
  const bWarnings = (b.warnings ?? []).length;
  if (bWarnings !== aWarnings) {
    return aWarnings - bWarnings;
  }

  // Alphabetical fallback
  return (a.optionName || '').localeCompare(b.optionName || '');
}
