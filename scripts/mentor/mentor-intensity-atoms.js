/**
 * MENTOR INTENSITY ATOMS - Advisory Confidence Levels
 *
 * Intensity Atoms represent how strongly a mentor stands behind a reaction.
 * Intensity expresses CONFIDENCE in the mentor's endorsement, never correctness or command.
 *
 * These are engine-facing identifiers (no numbers at runtime).
 * They map to advisory confidence semantics, affecting tone and phrasing only.
 *
 * Intensity is determined ALONGSIDE Judgment Atoms during mentor response selection.
 */

/**
 * Canonical Intensity Atoms
 * Five-level scale representing advisory confidence.
 */
export const INTENSITY_ATOMS = {
  /**
   * very_low
   * "This barely warrants comment."
   *
   * The mentor notices something but doesn't strongly endorse or warn against it.
   * Phrasing is tentative, observational, or dismissive.
   * Silence may override this intensity (no response at all).
   *
   * Used when:
   * - Minor observations without strong judgment
   * - Optional or exploratory choices
   * - Low-impact decisions
   */
  very_low: "very_low",

  /**
   * low
   * "This is a light nudge."
   *
   * The mentor gently suggests a direction without strong conviction.
   * Phrasing is permissive, exploratory, or cautiously interested.
   *
   * Used when:
   * - Minor synergies or small advantages
   * - Exploratory choices that fit but don't strongly align
   * - Soft observations or curiosities
   */
  low: "low",

  /**
   * medium
   * "This might be worth considering."
   *
   * The mentor offers balanced guidance based on moderate conviction.
   * Phrasing is balanced, thoughtful, and reasonable.
   * This is the default/common intensity for most mentor reactions.
   *
   * Used when:
   * - Moderate synergies or solid fit
   * - Meaningful but not critical decisions
   * - Standard mentor guidance
   */
  medium: "medium",

  /**
   * high
   * "This is guidance I stand behind."
   *
   * The mentor confidently endorses a direction.
   * Phrasing is assured, strong, and recommending.
   *
   * Used when:
   * - Strong synergies or excellent fit
   * - Critical progression moments
   * - On-path decisions
   * - Significant warnings or risks
   */
  high: "high",

  /**
   * very_high
   * "This is what I would recommend."
   *
   * The mentor strongly endorses (or warns against) a choice.
   * Phrasing is emphatic, certain, and compelling.
   * This is RARE and reserved for pivotal moments.
   *
   * Used when:
   * - Exceptional synergies or major alignment
   * - Threshold moments (level ≥ 6)
   * - Critical path confirmations
   * - Severe risks or dark side warnings
   */
  very_high: "very_high"
};

/**
 * All Intensity Atoms as an array, ordered from lowest to highest.
 * Useful for validation and intensity scaling operations.
 */
export const INTENSITY_ATOM_LIST = [
  INTENSITY_ATOMS.very_low,
  INTENSITY_ATOMS.low,
  INTENSITY_ATOMS.medium,
  INTENSITY_ATOMS.high,
  INTENSITY_ATOMS.very_high
];

/**
 * Intensity Atom levels (0-4 for internal calculations).
 * Maps atom → numeric level for comparisons.
 */
export const INTENSITY_LEVELS = {
  [INTENSITY_ATOMS.very_low]: 0,
  [INTENSITY_ATOMS.low]: 1,
  [INTENSITY_ATOMS.medium]: 2,
  [INTENSITY_ATOMS.high]: 3,
  [INTENSITY_ATOMS.very_high]: 4
};

/**
 * Numeric scale (0-1) for each intensity.
 * Used for legacy 0-1 scaling in rendering.
 */
export const INTENSITY_SCALE = {
  [INTENSITY_ATOMS.very_low]: 0.0,
  [INTENSITY_ATOMS.low]: 0.25,
  [INTENSITY_ATOMS.medium]: 0.5,
  [INTENSITY_ATOMS.high]: 0.75,
  [INTENSITY_ATOMS.very_high]: 1.0
};

/**
 * Validate that an intensity atom is recognized.
 * @param {string} intensity - The intensity atom to validate
 * @returns {boolean} True if intensity is a valid Intensity Atom
 */
export function isValidIntensityAtom(intensity) {
  return INTENSITY_ATOM_LIST.includes(intensity);
}

/**
 * Get the numeric level (0-4) of an intensity atom.
 * @param {string} intensity - The intensity atom
 * @returns {number} The level (0-4), or -1 if invalid
 */
export function getIntensityLevel(intensity) {
  return INTENSITY_LEVELS[intensity] ?? -1;
}

/**
 * Get the 0-1 scale value of an intensity atom.
 * @param {string} intensity - The intensity atom
 * @returns {number} The 0-1 scale (0.0-1.0), or 0.5 if invalid
 */
export function getIntensityScale(intensity) {
  return INTENSITY_SCALE[intensity] ?? 0.5;
}

/**
 * Increment intensity to the next level (up to very_high).
 * @param {string} intensity - The current intensity atom
 * @returns {string} The next intensity atom, or the same if already very_high
 */
export function incrementIntensity(intensity) {
  const currentLevel = getIntensityLevel(intensity);
  if (currentLevel < 4) {
    return INTENSITY_ATOM_LIST[currentLevel + 1];
  }
  return intensity;
}

/**
 * Decrement intensity to the previous level (down to very_low).
 * @param {string} intensity - The current intensity atom
 * @returns {string} The previous intensity atom, or the same if already very_low
 */
export function decrementIntensity(intensity) {
  const currentLevel = getIntensityLevel(intensity);
  if (currentLevel > 0) {
    return INTENSITY_ATOM_LIST[currentLevel - 1];
  }
  return intensity;
}
