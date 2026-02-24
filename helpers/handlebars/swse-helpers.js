export const swseHelpers = {
  halfLevel: (level) => Math.floor(Number(level || 1) / 2),

  conditionPenalty: (track) => {
    const penalties = { 'normal': 0, '-1': -1, '-2': -2, '-5': -5, '-10': -10, 'helpless': 0 };
    return penalties[track] || 0;
  },

  isHelpless: (track) => track === 'helpless' || track === 5,

  defenseCalculation: (defense, actor) => {
    if (defense === 'reflex' && actor?.system?.armor?.equipped) {
      return `10 + Armor ${actor.system.armor.reflexBonus || 0}`;
    }
    return `10 + Level ${actor?.system?.level || 1}`;
  },

  forceRerollDice: (level) => {
    // Display helper for showing Force Point dice bonus
    // Uses standard heroic scaling: 1d6 (default), 2d6 (level 8+), 3d6 (level 15+)
    const l = Number(level || 1);
    if (l >= 15) return '+3d6 (take highest)';
    if (l >= 8) return '+2d6 (take highest)';
    return '+1d6';
  },

  skillTotal: (skill, halfLevel, abilityMod, conditionPenalty) => {
    let total = Number(halfLevel || 0) + Number(abilityMod || 0);
    if (skill?.trained) {total += 5;}
    if (skill?.focused) {total += 5;}
    total += Number(skill?.misc || 0);
    total += Number(conditionPenalty || 0);
    return total;
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

