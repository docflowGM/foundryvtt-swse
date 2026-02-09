/**
 * Suggestion Presentation Mapping Layer
 *
 * DUMB: Zero logic, pure data lookups
 * TOTAL: Complete mapping for all reason codes
 * PURE: No side effects, functional only
 *
 * Converts ENGINE OUTPUT (semantic reasonCode) → UI DISPLAY (presentation data)
 *
 * This layer lives in the UI boundary and is forbidden from:
 * - Logic (if/for/switch without return)
 * - State mutation
 * - API calls
 * - DOM manipulation
 *
 * This layer is allowed to:
 * - Map string → object
 * - Return constants
 * - Format display text
 */

/**
 * Complete mapping of all semantic reason codes to presentation data
 * Each reasonCode → { icon, iconClass, cssClass, reason, [tooltip], [color] }
 */
export const SUGGESTION_PRESENTATION_MAP = {
  // Tier 6: Prestige path prerequisites
  PRESTIGE_PREREQ: {
    icon: 'fa-crown',
    iconClass: 'fas fa-crown suggestion-prestige',
    cssClass: 'suggestion-tier-prestige',
    reason: "Prerequisite for a prestige class you're building toward",
    color: 'gold',
    tooltip: 'Part of your prestige class path'
  },

  // Tier 5.5: Wishlist prerequisites
  WISHLIST_PATH: {
    icon: 'fa-star',
    iconClass: 'fas fa-star suggestion-wishlist',
    cssClass: 'suggestion-tier-wishlist',
    reason: 'Prerequisite for a goal on your wishlist',
    color: 'cyan',
    tooltip: 'Gets you closer to your goal'
  },

  // Tier 5: Meta synergy & martial arts
  META_SYNERGY: {
    icon: 'fa-fire',
    iconClass: 'fas fa-fire suggestion-synergy',
    cssClass: 'suggestion-tier-synergy',
    reason: 'Strong recommendation for your build',
    color: 'red',
    tooltip: 'Community-proven synergy combo'
  },

  MARTIAL_ARTS: {
    icon: 'fa-fire',
    iconClass: 'fas fa-fire suggestion-martial',
    cssClass: 'suggestion-tier-martial',
    reason: 'Martial arts feat - highly recommended when prerequisites are met',
    color: 'orange',
    tooltip: 'Unlocks martial arts progression'
  },

  // Tier 4.5: Species-specific feats
  SPECIES_EARLY: {
    icon: 'fa-dna',
    iconClass: 'fas fa-dna suggestion-species',
    cssClass: 'suggestion-tier-species',
    reason: 'Excellent species feat for your level',
    color: 'purple',
    tooltip: 'Tailored for your species'
  },

  // Tier 4: Chain continuation
  CHAIN_CONTINUATION: {
    icon: 'fa-link',
    iconClass: 'fas fa-link suggestion-chain',
    cssClass: 'suggestion-tier-chain',
    reason: 'Builds directly on a feat or talent you already have',
    color: 'green',
    tooltip: 'Natural progression from what you own'
  },

  // Tier 3.5: Mentor bias matches
  MENTOR_BIAS_MATCH: {
    icon: 'fa-user-tie',
    iconClass: 'fas fa-user-tie suggestion-mentor',
    cssClass: 'suggestion-tier-mentor',
    reason: 'Aligns with your mentor survey answers',
    color: 'blue',
    tooltip: 'Matches your stated preferences'
  },

  // Tier 3: Trained skill matches
  SKILL_PREREQ_MATCH: {
    icon: 'fa-bullseye',
    iconClass: 'fas fa-bullseye suggestion-skill',
    cssClass: 'suggestion-tier-skill',
    reason: 'Uses a trained skill you possess',
    color: 'lime',
    tooltip: 'Synergizes with your skills'
  },

  // Tier 2: Ability score matches
  ABILITY_PREREQ_MATCH: {
    icon: 'fa-fist-raised',
    iconClass: 'fas fa-fist-raised suggestion-ability',
    cssClass: 'suggestion-tier-ability',
    reason: 'Scales with your highest ability score',
    color: 'yellow',
    tooltip: 'Maximizes your strength'
  },

  // Tier 1: Class synergy
  CLASS_SYNERGY: {
    icon: 'fa-users-cog',
    iconClass: 'fas fa-users-cog suggestion-class',
    cssClass: 'suggestion-tier-class',
    reason: 'Strong synergy with your class',
    color: 'silver',
    tooltip: 'Works well with your class'
  },

  // Tier 0: Fallback (legal option)
  FALLBACK: {
    icon: '',
    iconClass: '',
    cssClass: '',
    reason: 'Legal option',
    color: 'gray',
    tooltip: 'Available but not recommended'
  },

  // Future availability (unqualified items)
  FUTURE_AVAILABLE: {
    icon: 'fa-hourglass-end',
    iconClass: 'fas fa-hourglass-end suggestion-future',
    cssClass: 'suggestion-tier-future',
    reason: 'Available in future levels',
    color: 'orange',
    tooltip: 'Unlock prerequisites to qualify'
  }
};

/**
 * Get presentation data for a reason code
 * @param {string} reasonCode - Semantic reason code (e.g., 'PRESTIGE_PREREQ')
 * @returns {Object} Presentation data { icon, iconClass, cssClass, reason, [tooltip], [color] }
 */
export function getPresentationData(reasonCode) {
  return SUGGESTION_PRESENTATION_MAP[reasonCode] || SUGGESTION_PRESENTATION_MAP.FALLBACK;
}

/**
 * Get human-readable reason text for a reason code
 * @param {string} reasonCode - Semantic reason code
 * @returns {string} Human-readable reason
 */
export function getReasonText(reasonCode) {
  return getPresentationData(reasonCode).reason;
}

/**
 * Get icon classes for a reason code
 * @param {string} reasonCode - Semantic reason code
 * @returns {string} FontAwesome + suggestion CSS classes
 */
export function getIconClass(reasonCode) {
  return getPresentationData(reasonCode).iconClass;
}

/**
 * Get CSS class for a reason code
 * @param {string} reasonCode - Semantic reason code
 * @returns {string} CSS class for styling
 */
export function getCssClass(reasonCode) {
  return getPresentationData(reasonCode).cssClass;
}

/**
 * Get tooltip text for a reason code
 * @param {string} reasonCode - Semantic reason code
 * @returns {string} Tooltip text
 */
export function getTooltip(reasonCode) {
  return getPresentationData(reasonCode).tooltip || '';
}

/**
 * Get color for a reason code (for styling/highlighting)
 * @param {string} reasonCode - Semantic reason code
 * @returns {string} Color name or hex code
 */
export function getColor(reasonCode) {
  return getPresentationData(reasonCode).color || 'gray';
}

/**
 * Generate HTML badge for a suggestion
 * Pure presentation: no side effects, just HTML string generation
 * @param {Object} suggestion - Engine output { tier, reasonCode, sourceId, confidence }
 * @returns {string} HTML for badge, or empty string if no suggestion
 */
export function generateSuggestionBadge(suggestion) {
  if (!suggestion || suggestion.tier <= 0) {
    return '';
  }

  const presentation = getPresentationData(suggestion.reasonCode);
  const title = presentation.tooltip ? `${presentation.reason} - ${presentation.tooltip}` : presentation.reason;

  return `<span class="suggestion-badge ${presentation.cssClass}" title="${title}"><i class="${presentation.iconClass}"></i></span>`;
}

/**
 * Generate HTML legend showing all suggestion tiers
 * @returns {string} HTML legend
 */
export function generateSuggestionLegend() {
  const tiers = [
    { code: 'PRESTIGE_PREREQ', label: 'Prestige Path' },
    { code: 'WISHLIST_PATH', label: 'Wishlist Path' },
    { code: 'META_SYNERGY', label: 'Meta Synergy' },
    { code: 'CHAIN_CONTINUATION', label: 'Chain Continuation' },
    { code: 'SKILL_PREREQ_MATCH', label: 'Uses Trained Skill' },
    { code: 'ABILITY_PREREQ_MATCH', label: 'Matches Highest Ability' },
    { code: 'CLASS_SYNERGY', label: 'Class Synergy' }
  ];

  const items = tiers.map(({ code, label }) => {
    const presentation = getPresentationData(code);
    return `
      <div class="suggestion-legend-item ${presentation.cssClass}">
        <span class="legend-icon"><i class="${presentation.iconClass}"></i></span>
        <span>${label}</span>
      </div>
    `;
  }).join('');

  return `<div class="suggestion-legend">${items}</div>`;
}

/**
 * Get CSS class for item row based on suggestion
 * @param {Object} item - Item with suggestion metadata
 * @returns {string} Space-separated CSS classes
 */
export function getItemRowCssClasses(item) {
  const classes = [];

  if (item.suggestion?.tier > 0) {
    classes.push('is-suggested');
    const cssClass = getCssClass(item.suggestion.reasonCode);
    if (cssClass) {
      classes.push(cssClass);
    }
  }

  return classes.join(' ');
}

/**
 * Format suggestion display for UI
 * @param {Object} suggestion - Engine output
 * @param {Object} item - The item being suggested (feat/talent)
 * @returns {Object} Formatted display object
 */
export function formatSuggestionDisplay(suggestion, item = {}) {
  if (!suggestion || suggestion.tier <= 0) {
    return null;
  }

  const presentation = getPresentationData(suggestion.reasonCode);

  return {
    ...presentation,
    tier: suggestion.tier,
    reasonCode: suggestion.reasonCode,
    sourceId: suggestion.sourceId,
    confidence: suggestion.confidence,
    badge: generateSuggestionBadge(suggestion),
    itemName: item.name || ''
  };
}
