// NOTE: `conditionPenalty`, `isHelpless`, `defenseCalculation`, and `skillTotal`
// helpers were removed here (2026-08 Phase 1 authority audit). All four
// independently reimplemented SWSE rules math (condition-track penalties,
// helplessness, defense totals, skill totals) in template-facing code and had
// zero live call sites in any .hbs template — verified by repo-wide search.
// The authoritative computations live in scripts/utils/calc-conditions.js
// (condition penalties/helplessness) and DerivedCalculator/skills-reference.js
// (skill totals); templates read system.derived.* rather than recomputing
// rules. See docs/audits/v2-actor-authority-performance-phase-1.md, section
// "UI-side rule math audit".
export const swseHelpers = {
  halfLevel: (level) => Math.floor(Number(level || 1) / 2),

  // KNOWN GAP (documented, not fixed in Phase 1): forceRerollDice is used by
  // templates/partials/actor/persistent-header.hbs and independently derives
  // the Force Point bonus-dice COUNT from level tiers (1d6/2d6/3d6), while the
  // real authority — ForcePointsService.getScalingDice()/getDieSize() — also
  // factors in feats and ModifierEngine die-size upgrades (e.g. Strong in the
  // Force) and is async, so it cannot be called from a synchronous Handlebars
  // helper. No precomputed system.derived field for the full Force Point
  // formula exists yet to swap this call site onto. Left intact per Phase 1
  // scope; Phase 2 should have DerivedCalculator mirror
  // ForcePointsService.getFormulaDisplay() into system.derived and repoint
  // this template at that field.
  forceRerollDice: (level) => {
    // Display helper for showing Force Point dice bonus
    // Uses standard heroic scaling: 1d6 (default), 2d6 (level 8+), 3d6 (level 15+)
    const l = Number(level || 1);
    if (l >= 15) return '+3d6 (take highest)';
    if (l >= 8) return '+2d6 (take highest)';
    return '+1d6';
  },

  sign: (value) => {
    const num = Number(value || 0);
    return num >= 0 ? `+${num}` : String(num);
  },

  times: function(n, block) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += block.fn(i);
    }
    return result;
  },

  subtract: (a, b) => Number(a || 0) - Number(b || 0),

  /**
   * Check if a step has been completed in the level-up flow
   * @param {string} step - The step to check
   * @param {string} currentStep - The current active step
   * @returns {boolean} True if the step has been completed
   */
  stepCompleted: (step, currentStep) => {
    const stepOrder = [
      'species',
      'attributes',
      'class',
      'multiclass-bonus',
      'ability-increase',
      'feat',
      'force-powers',
      'talent',
      'summary'
    ];

    const stepIndex = stepOrder.indexOf(step);
    const currentIndex = stepOrder.indexOf(currentStep);

    return stepIndex !== -1 && currentIndex !== -1 && currentIndex > stepIndex;
  },

  /**
   * Check if a step comes before the current step in character generation
   * Used for marking chevron navigation as "clickable" for backwards navigation
   * @param {string} currentStep - The current active step
   * @param {string} step - The step to check if it's previous
   * @returns {boolean} True if step comes before currentStep
   */
  stepIsPrevious: (currentStep, step) => {
    // All possible steps in character generation, in order they can appear
    const baseStepOrder = [
      'name',
      'type',
      'degree',
      'size',
      'droid-builder',
      'species',
      'abilities',
      'class',
      'background',
      'skills',
      'languages',
      'feats',
      'talents',
      'force-powers',
      'starship-maneuvers',
      'droid-final',
      'summary',
      'shop'
    ];

    const stepIndex = baseStepOrder.indexOf(step);
    const currentIndex = baseStepOrder.indexOf(currentStep);

    return stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex;
  }
};

swseHelpers.extractHitDie = (value) => {
  if (value == null) {return '';}
  const str = String(value);
  const match = str.match(/d(\d+)/i);
  if (match) {return match[1];}
  const fallback = str.match(/(\d+)/);
  return fallback ? fallback[1] : str;
};


swseHelpers.formatBAB = (bab) => {
  if (bab == null) {return '';}
  // If it's an array or similar, normalize and join.
  if (Array.isArray(bab)) {
    const parts = bab
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v))
      .sort((a, b) => b - a); // highest to lowest, typical BAB display
    if (!parts.length) {return '';}
    return parts.map(v => (v >= 0 ? `+${v}` : `${v}`)).join('/');
  }
  const num = Number(bab);
  if (Number.isNaN(num)) {return String(bab);}
  return num >= 0 ? `+${num}` : `${num}`;
};

