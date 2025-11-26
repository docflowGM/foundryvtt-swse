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
    const l = Number(level || 1);
    if (l >= 15) return '+3d6';
    if (l >= 8) return '+2d6';
    return '+1d6';
  },

  skillTotal: (skill, halfLevel, abilityMod, conditionPenalty) => {
    let total = Number(halfLevel || 0) + Number(abilityMod || 0);
    if (skill?.trained) total += 5;
    if (skill?.focused) total += 5;
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
    for(let i = 0; i < n; i++) {
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
      'talent',
      'summary'
    ];

    const stepIndex = stepOrder.indexOf(step);
    const currentIndex = stepOrder.indexOf(currentStep);

    return stepIndex !== -1 && currentIndex !== -1 && currentIndex > stepIndex;
  }
};