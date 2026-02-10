/**
 * ============================================
 * Unified Suggestion Tier System (v2)
 * ============================================
 *
 * Single source of truth for suggestion tiers across ALL engines.
 * Replaces per-engine tier definitions with consistent, cross-engine tiers.
 *
 * Tier Hierarchy (high→low priority):
 * - TIER 6: Prestige prerequisites (gates access to prestige classes)
 * - TIER 5: Prestige qualification NOW (character currently qualifies)
 * - TIER 4: Chain/path continuation (builds on character's existing choices)
 * - TIER 3: Category synergy (matches class, build intent, or theme)
 * - TIER 2: Ability/theme synergy (secondary synergy with build goals)
 * - TIER 1: Thematic fit (should work with character type)
 * - TIER 0: Fallback/available (anything goes)
 */

export const UNIFIED_TIERS = {
  // ============================================================
  // PRIMARY TIERS (Prestige & Chain Mechanics)
  // ============================================================

  /**
   * TIER 6: Prerequisites for prestige class qualification
   * Used when: Item is a prerequisite another item needs
   * Example: "Force Sensitivity" when character is building toward Force Adept
   * Across: Feats, talents, powers, techniques
   */
  PRESTIGE_PREREQUISITE: 6,

  /**
   * TIER 5: Character currently qualifies for prestige path
   * Used when: Character meets all prerequisites for a prestige class RIGHT NOW
   * Example: Scout character with 2+ Awareness talents can access Bounty Hunter
   * Across: Classes (prestige), feats (enabling), talents (path-specific)
   */
  PRESTIGE_QUALIFIED_NOW: 5,

  /**
   * TIER 4: Continuation of established path
   * Used when: Item builds on character's existing commitments
   * Example: Next Scoundrel talent when already taken 2 Scoundrel talents
   * Example: Another Mobility feat when already took Mobility
   * Across: Feats (same feat multiple times), talents (same tree), powers (same category)
   */
  PATH_CONTINUATION: 4,

  // ============================================================
  // SECONDARY TIERS (Synergy & Category Matching)
  // ============================================================

  /**
   * TIER 3: Category synergy (strong thematic match)
   * Used when: Item aligns with class, build intent, or background theme
   * Example: "Mobility" feat for Scout (Acrobatics-heavy class)
   * Example: "Stealth" talents for Spy background
   * Across: Feats (matches class focus), talents (matches class trees), backgrounds (matches starting class)
   */
  CATEGORY_SYNERGY: 3,

  /**
   * TIER 2: Ability/theme synergy (secondary match)
   * Used when: Item synergizes with character's primary abilities or goals
   * Example: "Weapon Focus" for Str-based fighter
   * Example: "Tech Specialist" for Int-based build
   * Across: Feats (matches high ability), talents (matches build theme)
   */
  ABILITY_SYNERGY: 2,

  /**
   * TIER 1: Thematic fit (weak match)
   * Used when: Item fits character class/type but not specific build
   * Example: Any general feat for a Combat-focused character
   * Example: Any class-appropriate talent
   * Across: Feats (matches class tier), talents (level-appropriate)
   */
  THEMATIC_FIT: 1,

  // ============================================================
  // FALLBACK TIER
  // ============================================================

  /**
   * TIER 0: Fallback/available (no specific synergy)
   * Used when: Item is technically available but no synergy detected
   * Example: Feat from another class
   * Example: Any remaining power/talent
   * Across: Everything (default tier)
   */
  AVAILABLE: 0,

  // ============================================================
  // TIER METADATA
  // ============================================================

  /**
   * Descriptive labels for each tier (for UI display)
   */
  LABELS: {
    6: 'Prerequisite',
    5: 'Prestige Ready',
    4: 'Path Continuation',
    3: 'Strong Synergy',
    2: 'Ability Synergy',
    1: 'Thematic Fit',
    0: 'Available'
  },

  /**
   * Color codes for tier badges (CSS classes or color names)
   */
  COLORS: {
    6: '#FF6B6B', // Red - critical prerequisite
    5: '#FF8C00', // Orange - prestige ready now
    4: '#FFD700', // Gold - continuing existing path
    3: '#4ECDC4', // Teal - strong match
    2: '#87CEEB', // Sky blue - ability match
    1: '#B0C4DE', // Light slate - thematic fit
    0: '#D3D3D3'  // Light gray - available
  },

  /**
   * Icons for tier badges (emoji or icon class names)
   */
  ICONS: {
    6: '👑', // Prestige crown
    5: '⭐', // Star - ready now
    4: '🔗', // Chain - continuation
    3: '💎', // Gem - strong synergy
    2: '⚡', // Lightning - ability match
    1: '✓',  // Checkmark - fits theme
    0: '◦'   // Circle - available
  },

  /**
   * Description for each tier (user-facing tooltip text)
   */
  DESCRIPTIONS: {
    6: 'Required for your current prestige path',
    5: 'You qualify for this prestige class NOW',
    4: 'Continues your current path/build',
    3: 'Strong synergy with your build',
    2: 'Matches your ability scores',
    1: 'Thematic fit for your class',
    0: 'Available to select'
  },

  /**
   * Priority/weight for scoring and sorting (lower = higher priority)
   */
  PRIORITY: {
    6: 10,
    5: 20,
    4: 30,
    3: 40,
    2: 50,
    1: 60,
    0: 100
  }
};

/**
 * Verify that all tiers are properly configured
 * @returns {boolean} true if all tiers have metadata
 */
export function validateUnifiedTiers() {
  const requiredTiers = [6, 5, 4, 3, 2, 1, 0];
  const hasAllMetadata = requiredTiers.every(tier => {
    return (
      UNIFIED_TIERS.LABELS[tier] &&
      UNIFIED_TIERS.COLORS[tier] &&
      UNIFIED_TIERS.ICONS[tier] &&
      UNIFIED_TIERS.DESCRIPTIONS[tier] &&
      UNIFIED_TIERS.PRIORITY[tier] !== undefined
    );
  });

  if (!hasAllMetadata) {
    console.error('[UNIFIED_TIERS] Missing metadata for one or more tiers');
  }

  return hasAllMetadata;
}

/**
 * Get tier label with icon (for UI display)
 * @param {number} tier - Tier number (0-6)
 * @returns {string} Formatted label with icon
 */
export function getTierBadge(tier) {
  const icon = UNIFIED_TIERS.ICONS[tier] || '◦';
  const label = UNIFIED_TIERS.LABELS[tier] || 'Unknown';
  return `${icon} ${label}`;
}

/**
 * Get tier color for visual styling
 * @param {number} tier - Tier number (0-6)
 * @returns {string} Color hex code
 */
export function getTierColor(tier) {
  return UNIFIED_TIERS.COLORS[tier] || UNIFIED_TIERS.COLORS[0];
}

/**
 * Compare tiers (for sorting suggestions)
 * @param {number} tierA - First tier
 * @param {number} tierB - Second tier
 * @returns {number} -1 if A > B, 0 if equal, 1 if A < B
 */
export function compareTiers(tierA, tierB) {
  return tierB - tierA; // Higher tier first (6 > 5 > 4...)
}
