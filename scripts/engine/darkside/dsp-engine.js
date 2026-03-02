/**
 * Dark Side Points (DSP) Engine
 * PURE EVALUATION - Authoritative source for all dark side calculations
 *
 * This engine provides:
 * - Canonical DSP value reading
 * - Saturation calculations (DSP as % of max)
 * - Band classification (touched → fallen)
 * - Bias multipliers for mentor suggestions
 * - Institution inference (jedi/sith alignment)
 * - Threshold checking
 *
 * CRITICAL: This engine NEVER mutates data. NEVER calls ActorEngine.
 * This is PURE EVALUATION LOGIC ONLY.
 *
 * Mutations happen at the call site (ForceEngine, etc.) and must
 * route through ActorEngine directly.
 *
 * All DSP evaluations MUST use engine calculations.
 * No inline DSP math outside this module.
 */

/**
 * DSP Band Definitions
 * Maps saturation % to narrative band with tone modifier
 */
const DSP_BANDS = {
  touched: { min: 0.0, max: 0.15, tone: 'measured', warning: false },
  strained: { min: 0.15, max: 0.3, tone: 'concerned', warning: true },
  slipping: { min: 0.3, max: 0.5, tone: 'firm', warning: true },
  tainted: { min: 0.5, max: 0.75, tone: 'grave', warning: true },
  edge: { min: 0.75, max: 0.9, tone: 'severe', warning: true },
  fallen: { min: 0.9, max: 1.0, tone: 'cold', warning: true }
};

/**
 * Force Institution Thresholds
 * Determines jedi/sith path based on DSP saturation
 */
const INSTITUTION_THRESHOLDS = {
  JEDI_MAX: 0.33,     // < 33% DSP = jedi path
  SITH_MIN: 0.67      // > 67% DSP = sith path
  // Between: neutral/balance
};

/**
 * DSP Bias Scaling for Mentor Suggestions
 * Controls how strongly DSP influences what gets suggested
 */
const SUGGESTION_BIAS_SCALING = {
  SCALE_FACTOR: 0.1,   // +0.1 multiplier per DSP point
  MAX_MULTIPLIER: 1.5  // Hard cap at 1.5x
};

/**
 * DSP Configuration
 * System defaults and limits
 */
const DSP_CONFIG = {
  DEFAULT_MAX: 10,          // Default max DSP value
  MIN_VALUE: 0,             // Cannot go below 0
  SATURATION_CAP: 1.0,      // Saturation never exceeds 100%
};

export const DSPEngine = {
  /**
   * Get current DSP value for actor
   * Reads from canonical location: system.darkSide.value
   * PURE READ - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {number} Current DSP value (0+)
   */
  getValue(actor) {
    if (!actor) return 0;
    return actor.system?.darkSide?.value ?? 0;
  },

  /**
   * Get maximum DSP capacity for actor
   * Reads from canonical location: system.darkSide.max
   * Falls back to house rule calculation: wisdom × darkSideMaxMultiplier
   * PURE READ - NO MUTATION
   *
   * House Rule Integration:
   * - darkSideMaxMultiplier setting: controls multiplier (default: 1)
   * - Formula: max = wisdom × multiplier
   *
   * @param {Actor} actor - The character
   * @returns {number} Maximum DSP value
   */
  getMax(actor) {
    if (!actor) return DSP_CONFIG.DEFAULT_MAX;

    // Check for explicit storage
    const explicit = actor.system?.darkSide?.max;
    if (explicit && explicit > 0) {
      return explicit;
    }

    // Fall back to house rule calculation
    const wisdom = actor.system?.attributes?.wis?.base ?? 10;
    const multiplier = this._getHouseRuleMultiplier();
    return Math.max(1, wisdom * multiplier);
  },

  /**
   * Get darkSideMaxMultiplier house rule setting
   * PURE READ - NO MUTATION
   *
   * @private
   * @returns {number} Multiplier (default: 1)
   */
  _getHouseRuleMultiplier() {
    try {
      return game?.settings?.get('foundryvtt-swse', 'darkSideMaxMultiplier') ?? 1;
    } catch (err) {
      // Fallback if game not loaded
      return 1;
    }
  },

  /**
   * Calculate DSP saturation as percentage (0-1)
   * This is the core calculation used by all narrative/mentor systems
   * Formula: value / max, capped at 1.0
   * PURE MATH - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {number} Saturation ratio (0.0 - 1.0)
   */
  getSaturation(actor) {
    if (!actor) return 0;

    const value = this.getValue(actor);
    const max = this.getMax(actor);

    if (max === 0) return 0;

    const saturation = value / max;
    return Math.min(saturation, DSP_CONFIG.SATURATION_CAP);
  },

  /**
   * Calculate DSP saturation using wisdom as denominator
   * Alternative calculation for story/narrative context
   * Formula: value / wisdom, capped at 1.0
   * Used by: mentor story resolver for narrative filtering
   * PURE MATH - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {number} Saturation ratio (0.0 - 1.0)
   */
  getSaturationByWisdom(actor) {
    if (!actor) return 0;

    const value = this.getValue(actor);
    const wisdom = actor.system?.attributes?.wis?.base ?? 10;

    if (wisdom === 0) return 0;

    const saturation = value / wisdom;
    return Math.min(saturation, DSP_CONFIG.SATURATION_CAP);
  },

  /**
   * Get DSP band classification based on saturation
   * Bands determine narrative tone and mentor response filtering
   * PURE LOGIC - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {string} Band name: 'touched' | 'strained' | 'slipping' | 'tainted' | 'edge' | 'fallen'
   */
  getBand(actor) {
    const saturation = this.getSaturation(actor);
    return this._getBandFromSaturation(saturation);
  },

  /**
   * Get DSP band from raw saturation value
   * Internal helper for band calculation
   * PURE LOGIC - NO MUTATION
   *
   * @param {number} saturation - Saturation value (0-1)
   * @returns {string} Band name
   * @private
   */
  _getBandFromSaturation(saturation) {
    if (saturation < DSP_BANDS.strained.min) return 'touched';
    if (saturation < DSP_BANDS.slipping.min) return 'strained';
    if (saturation < DSP_BANDS.tainted.min) return 'slipping';
    if (saturation < DSP_BANDS.edge.min) return 'tainted';
    if (saturation < DSP_BANDS.fallen.min) return 'edge';
    return 'fallen';
  },

  /**
   * Get tone modifier for current DSP band
   * Determines voice synthesis and dialogue tone
   * PURE READ - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {string} Tone: 'measured' | 'concerned' | 'firm' | 'grave' | 'severe' | 'cold'
   */
  getTone(actor) {
    const band = this.getBand(actor);
    return DSP_BANDS[band]?.tone ?? 'measured';
  },

  /**
   * Check if DSP band requires warning
   * Used by mentor system to add caution messages
   * PURE LOGIC - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {boolean} Whether to display DSP warning
   */
  shouldWarn(actor) {
    const band = this.getBand(actor);
    return DSP_BANDS[band]?.warning ?? false;
  },

  /**
   * Calculate mentor suggestion bias multiplier
   * Stronger DSP = higher chance of dark side suggestions
   * Formula: min(1.5, 1 + (value * 0.1))
   * Scaling: +0.1 per DSP point, hard cap at 1.5x
   * PURE MATH - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {number} Bias multiplier (1.0 - 1.5)
   */
  getBiasMultiplier(actor) {
    const value = this.getValue(actor);
    const multiplier = 1 + (value * SUGGESTION_BIAS_SCALING.SCALE_FACTOR);
    return Math.min(multiplier, SUGGESTION_BIAS_SCALING.MAX_MULTIPLIER);
  },

  /**
   * Determine force institution path based on DSP
   * Used by prestige class system for path inference
   *
   * Logic:
   * - < 33% DSP saturation = jedi path
   * - > 67% DSP saturation = sith path
   * - Between = neutral/balanced
   * PURE LOGIC - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {string} Institution: 'jedi' | 'sith' | 'neutral'
   */
  getInstitution(actor) {
    if (!actor) return 'neutral';

    // Check for explicit institution override
    const explicit = actor.system?.institution;
    if (explicit) return explicit.toLowerCase();

    // Infer from DSP saturation
    const saturation = this.getSaturation(actor);

    if (saturation < INSTITUTION_THRESHOLDS.JEDI_MAX) return 'jedi';
    if (saturation > INSTITUTION_THRESHOLDS.SITH_MIN) return 'sith';
    return 'neutral';
  },

  /**
   * Check if actor meets a specific DSP threshold
   * PURE LOGIC - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @param {number} threshold - The DSP value threshold to check
   * @returns {boolean} True if actor's DSP >= threshold
   */
  meetsThreshold(actor, threshold) {
    return this.getValue(actor) >= threshold;
  },

  /**
   * Get corruption axis interpretation
   * Maps DSP saturation to moral stance interpretation
   * Different for each corruption axis philosophy
   * PURE LOGIC - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @param {string} axis - Corruption axis ('Domination' | 'Temptation' | 'Exploitation' | 'Nihilism')
   * @returns {string} Axis-specific DSP interpretation
   */
  getCorruptionAxisInterpretation(actor, axis = 'Domination') {
    const saturation = this.getSaturation(actor);

    const interpretations = {
      Domination: (sat) => {
        if (sat > 0.5) return '⚠️ Your power grows undeniable...';
        if (sat > 0.2) return 'The weakness of restraint diminishes...';
        return '';
      },
      Temptation: (sat) => {
        if (sat > 0.5) return '⚠️ Indulgence whispers louder...';
        if (sat > 0.2) return 'Resistance becomes exhausting...';
        return '';
      },
      Exploitation: (sat) => {
        if (sat > 0.5) return '⚠️ Others exist only as tools...';
        if (sat > 0.2) return 'Compassion feels like chains...';
        return '';
      },
      Nihilism: (sat) => {
        if (sat > 0.5) return '⚠️ Nothing matters but the void...';
        if (sat > 0.2) return 'Meaning crumbles...';
        return '';
      }
    };

    const interpreter = interpretations[axis] || (() => '');
    return interpreter(saturation);
  },

  /**
   * Get formatted DSP info object
   * Useful for display, voice synthesis, or data export
   * PURE DATA ASSEMBLY - NO MUTATION
   *
   * @param {Actor} actor - The character
   * @returns {object} DSP info structure
   */
  formatInfo(actor) {
    const value = this.getValue(actor);
    const max = this.getMax(actor);
    const saturation = this.getSaturation(actor);
    const band = this.getBand(actor);
    const tone = this.getTone(actor);
    const bias = this.getBiasMultiplier(actor);
    const institution = this.getInstitution(actor);
    const warning = this.shouldWarn(actor);

    return {
      value,
      max,
      saturation,
      saturationPercent: Math.round(saturation * 100),
      band,
      tone,
      biasMultiplier: bias,
      institution,
      shouldWarn: warning
    };
  }
};
