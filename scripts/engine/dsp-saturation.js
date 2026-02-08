/**
 * DSP Saturation Engine
 * Evaluates dark side points as a percentage of Wisdom
 * Used for mentor tone modulation, warning severity, and moral context
 *
 * This is the single source of truth for DSP evaluation in the mentor system.
 */

/**
 * Calculate DSP saturation as a percentage
 * saturation = darkSidePoints / wisdom
 *
 * @param {Actor} actor - The actor to evaluate
 * @returns {number} Saturation value (0.0 to 1.0+)
 */
export function calculateDspSaturation(actor) {
  if (!actor || !actor.system) {
    return 0.0;
  }

  const wisdom = actor.system.attributes?.wis?.base || 10;
  const dsp = actor.system.darkSidePoints || 0;

  if (wisdom <= 0) {
    return 0.0;
  }

  return dsp / wisdom;
}

/**
 * Get the DSP saturation band name
 * Used internally by mentors to determine tone and severity
 *
 * @param {number} saturation - Saturation value (0.0 to 1.0+)
 * @returns {string} Band name: "touched", "strained", "slipping", "tainted", "edge", "fallen"
 */
export function getDspBand(saturation) {
  if (saturation < 0.2) {
    return 'touched';
  } else if (saturation < 0.4) {
    return 'strained';
  } else if (saturation < 0.6) {
    return 'slipping';
  } else if (saturation < 0.8) {
    return 'tainted';
  } else if (saturation < 1.0) {
    return 'edge';
  } else {
    return 'fallen';
  }
}

/**
 * Get band description for mentor dialogue
 *
 * @param {string} band - Band name
 * @returns {string} Human-readable description
 */
export function getBandDescription(band) {
  const descriptions = {
    touched: 'You have been touched by the dark side.',
    strained: 'The darkness strains at your resolve.',
    slipping: 'You are slipping toward the darkness.',
    tainted: 'The darkness has tainted your spirit.',
    edge: 'You stand on the edge of the abyss.',
    fallen: 'You have fallen to the darkness.'
  };

  return descriptions[band] || 'Unknown state.';
}

/**
 * Get mentor tone modifier based on DSP saturation
 * Used for dialogue voice generation
 *
 * @param {string} band - Band name
 * @returns {string} Tone modifier: "measured", "concerned", "firm", "grave", "severe", "cold"
 */
export function getToneModifier(band) {
  const tones = {
    touched: 'measured',
    strained: 'concerned',
    slipping: 'firm',
    tainted: 'grave',
    edge: 'severe',
    fallen: 'cold'
  };

  return tones[band] || 'measured';
}

/**
 * Determine if DSP saturation warrants a warning
 *
 * @param {number} saturation - Saturation value
 * @param {string} contextType - Type of context: "ability", "choice", "suggestion"
 * @returns {boolean} Whether a warning should be issued
 */
export function shouldWarn(saturation, contextType = 'choice') {
  // No warnings for touched state
  if (saturation < 0.2) {
    return false;
  }

  // Warnings increase in frequency as saturation increases
  const warnThresholds = {
    ability: 0.4,     // Warn when approaching slipping
    choice: 0.5,      // Warn when in slipping or worse
    suggestion: 0.6   // Warn when tainted or worse
  };

  const threshold = warnThresholds[contextType] || 0.5;
  return saturation >= threshold;
}

/**
 * Get warning severity level
 * Used to scale message intensity in mentor dialogue
 *
 * @param {number} saturation - Saturation value
 * @returns {number} Severity: 0 (none), 1 (light), 2 (medium), 3 (heavy)
 */
export function getWarningSeverity(saturation) {
  if (saturation < 0.4) {
    return 0; // No warning
  } else if (saturation < 0.6) {
    return 1; // Light
  } else if (saturation < 0.8) {
    return 2; // Medium
  } else if (saturation < 1.0) {
    return 3; // Heavy
  } else {
    return 3; // Heavy (capped)
  }
}

/**
 * Get suggestion bias multiplier based on DSP saturation
 * Used by suggestion engine to weight dark-side-aligned suggestions
 *
 * @param {number} saturation - Saturation value
 * @returns {number} Bias multiplier (1.0 = no bias, 1.5+ = strong dark-side bias)
 */
export function getDarkSideBiasMultiplier(saturation) {
  if (saturation < 0.2) {
    return 1.0; // No bias
  } else if (saturation < 0.4) {
    return 1.1; // Slight bias
  } else if (saturation < 0.6) {
    return 1.25; // Moderate bias
  } else if (saturation < 0.8) {
    return 1.5; // Strong bias
  } else if (saturation < 1.0) {
    return 1.75; // Very strong bias
  } else {
    return 2.0; // Maximum bias (capped)
  }
}

/**
 * Format DSP information for display
 *
 * @param {Actor} actor - The actor
 * @returns {object} Display info
 */
export function formatDspInfo(actor) {
  const dsp = actor.system.darkSidePoints || 0;
  const wisdom = actor.system.attributes?.wis?.base || 10;
  const saturation = calculateDspSaturation(actor);
  const band = getDspBand(saturation);

  return {
    darkSidePoints: dsp,
    wisdom: wisdom,
    saturation: saturation,
    saturationPercent: Math.round(saturation * 100),
    band: band,
    bandDescription: getBandDescription(band),
    toneModifier: getToneModifier(band),
    shouldWarn: shouldWarn(saturation),
    warningSeverity: getWarningSeverity(saturation),
    darkSideBiasMultiplier: getDarkSideBiasMultiplier(saturation)
  };
}
