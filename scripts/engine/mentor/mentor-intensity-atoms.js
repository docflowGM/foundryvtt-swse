/**
 * MENTOR INTENSITY ATOMS - Confidential Judgment Weights
 *
 * Intensity atoms represent weighted factors that contribute to how confidently
 * a mentor judgment supports a suggestion. They are pure numeric weights that
 * combine to produce an overall intensity score.
 *
 * This is an ENGINE-LAYER module: pure math, no side-effects, no UI.
 *
 * Intensity is INDEPENDENT of suggestion tier. A low-tier suggestion can have
 * high intensity (strong warning), and vice versa.
 */

/**
 * Canonical intensity atoms and their semantic meaning.
 * Each represents a reason the mentor stands behind a judgment.
 *
 * Values are decimal weights (0.0 to 1.0) contributed to overall intensity.
 */
export const INTENSITY_ATOMS = {
  // Core alignment factors
  THEME_MATCH: 'theme_match',              // 0-1: How well suggestion matches build themes
  PRESTIGE_SIGNAL: 'prestige_signal',      // 0-1: How strongly it supports detected prestige path
  ABILITY_SYNERGY: 'ability_synergy',      // 0-1: How well it synergizes with core abilities

  // Progression factors
  LEVEL_APPROPRIATE: 'level_appropriate',  // 0-1: Contextually correct for character level
  MILESTONE_ALIGNED: 'milestone_aligned',  // 0-1: Fits progression checkpoint

  // Build pattern factors
  MENTOR_MEMORY_AFFINITY: 'mentor_memory_affinity', // 0-1: Matches mentor's recorded bias
  ROLE_COHERENCE: 'role_coherence',        // 0-1: Maintains consistent character role

  // Risk/opportunity factors
  SYNERGY_STRENGTH: 'synergy_strength',    // 0-1: Strength of feat/item/talent synergy
  UNIQUE_ADVANTAGE: 'unique_advantage',    // 0-1: Provides capability not easily obtained elsewhere

  // Advisory factors
  EXPLORATORY_VALUE: 'exploratory_value',  // 0-1: Encourages build experimentation
  CAUTIONARY_WEIGHT: 'cautionary_weight'   // 0-1: Magnitude of potential risk/trap
};

/**
 * All atoms as an ordered array.
 */
export const INTENSITY_ATOM_LIST = Object.values(INTENSITY_ATOMS);

/**
 * Intensity levels (qualitative).
 * Used for tone and messaging only; independent of numeric score.
 */
export const INTENSITY_LEVELS = {
  VERY_LOW: 'very_low',    // Barely worth mentioning
  LOW: 'low',              // Gentle suggestion
  MEDIUM: 'medium',        // Balanced guidance (default)
  HIGH: 'high',            // Strong endorsement/warning
  VERY_HIGH: 'very_high'   // Emphatic recommendation/caution
};

export const INTENSITY_LEVEL_LIST = [
  INTENSITY_LEVELS.VERY_LOW,
  INTENSITY_LEVELS.LOW,
  INTENSITY_LEVELS.MEDIUM,
  INTENSITY_LEVELS.HIGH,
  INTENSITY_LEVELS.VERY_HIGH
];

/**
 * Map numeric intensity score to qualitative level.
 * @param {number} score - Normalized intensity score (0.0-1.0)
 * @returns {string} Intensity level from INTENSITY_LEVELS
 */
export function getIntensityLevel(score) {
  if (score < 0.2) return INTENSITY_LEVELS.VERY_LOW;
  if (score < 0.4) return INTENSITY_LEVELS.LOW;
  if (score < 0.65) return INTENSITY_LEVELS.MEDIUM;
  if (score < 0.85) return INTENSITY_LEVELS.HIGH;
  return INTENSITY_LEVELS.VERY_HIGH;
}

/**
 * Calculate overall intensity from weighted factors.
 *
 * @param {Object} factors - Map of atom keys to weights (0.0-1.0)
 *   Example: { theme_match: 0.8, prestige_signal: 0.6, level_appropriate: 1.0 }
 *
 * @param {Object} options - Optional control flags
 *   @param {boolean} options.normalize - Normalize to 0.0-1.0 range (default: true)
 *   @param {boolean} options.includeCoreOnly - Only use core factors (default: false)
 *
 * @returns {Object} Intensity calculation result
 *   @returns {number} .score - Overall normalized intensity (0.0-1.0)
 *   @returns {string} .level - Qualitative intensity level
 *   @returns {Array} .breakdown - Detailed factor contributions
 *   @returns {number} .rawSum - Raw sum before normalization (if normalize=false)
 *
 * @example
 * const result = calculateIntensity({
 *   theme_match: 0.9,
 *   prestige_signal: 0.7,
 *   level_appropriate: 1.0
 * });
 * // Returns: { score: 0.87, level: 'high', breakdown: [...] }
 */
export function calculateIntensity(factors = {}, options = {}) {
  const {
    normalize = true,
    includeCoreOnly = false
  } = options;

  // Validate inputs
  if (typeof factors !== 'object' || factors === null) {
    return createIntensityResult(0, []);
  }

  // Core atoms (always included in calculations)
  const coreAtoms = [
    INTENSITY_ATOMS.THEME_MATCH,
    INTENSITY_ATOMS.PRESTIGE_SIGNAL,
    INTENSITY_ATOMS.ABILITY_SYNERGY,
    INTENSITY_ATOMS.MENTOR_MEMORY_AFFINITY
  ];

  // Determine which atoms to include
  let activeAtoms = INTENSITY_ATOM_LIST;
  if (includeCoreOnly) {
    activeAtoms = coreAtoms;
  }

  // Filter to provided factors and normalize each to 0.0-1.0
  const breakdown = [];
  let rawSum = 0;
  let factorCount = 0;

  for (const atom of activeAtoms) {
    const value = factors[atom];

    if (typeof value === 'number') {
      // Clamp to 0.0-1.0
      const clamped = Math.max(0, Math.min(1, value));
      breakdown.push({
        atom,
        contribution: clamped
      });
      rawSum += clamped;
      factorCount++;
    }
  }

  // Calculate normalized score
  let score = 0;
  if (factorCount > 0) {
    const average = rawSum / factorCount;
    score = normalize ? average : rawSum;
  }

  // Clamp final score to 0.0-1.0
  score = Math.max(0, Math.min(1, score));

  return createIntensityResult(score, breakdown);
}

/**
 * Helper: Create standardized intensity result object.
 * @private
 */
function createIntensityResult(score, breakdown) {
  return {
    score: Math.round(score * 100) / 100,        // 2 decimals
    level: getIntensityLevel(score),
    breakdown: breakdown,
    rawSum: breakdown.reduce((sum, b) => sum + b.contribution, 0)
  };
}

/**
 * Utility: Check if an atom key is valid.
 * @param {string} key - Atom key to validate
 * @returns {boolean}
 */
export function isValidAtom(key) {
  return INTENSITY_ATOM_LIST.includes(key);
}

/**
 * Utility: Filter factors to only valid atoms.
 * @param {Object} factors - Map of atoms to weights
 * @returns {Object} Filtered factors with only valid atoms
 */
export function filterValidFactors(factors = {}) {
  const filtered = {};
  for (const [key, value] of Object.entries(factors)) {
    if (isValidAtom(key) && typeof value === 'number') {
      filtered[key] = value;
    }
  }
  return filtered;
}
