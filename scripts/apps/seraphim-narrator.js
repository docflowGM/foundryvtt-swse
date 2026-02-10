/**
 * Seraphim Narrator — Phase 3 Reactive Dialogue
 *
 * Pure generator: reads state only, explains and reacts, never enforces or prescribes.
 *
 * Contract:
 * - Input: read-only context (state snapshot)
 * - Output: structured dialogue (strings, no side effects)
 * - Never: blocks progression, enforces rules, mutates data, issues imperatives
 */

export class Seraphim {

  /**
   * Generate all dialogue for current step
   *
   * Input context (read-only):
   * - currentStep: string (e.g. 'intro', 'locomotion', 'review')
   * - droidSystems: object (current config)
   * - budget: object { total, spent, remaining }
   * - isValid: boolean
   * - validationErrors: array
   * - stepConfig: object (step metadata)
   * - selectedItems: array | object (current selections)
   * - availableItems: array (items for this step)
   *
   * Output:
   * {
   *   intro: string,           // Intro for step
   *   reaction: string,        // Reaction to selections
   *   warnings: string[],      // Soft warnings (not blockers)
   *   budget: string,          // Budget analysis
   *   review: string           // Summary for review step
   * }
   */
  static generateDialogue(context) {
    if (!context) return this._emptyDialogue();

    const { currentStep, droidSystems, budget, validationErrors, stepConfig, selectedItems, availableItems } = context;

    // Dispatch to step-specific dialogue
    switch (currentStep) {
      case 'intro':
        return this._dialogueIntro();
      case 'size':
        return this._dialogueSize(droidSystems, stepConfig);
      case 'locomotion':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'manipulators':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'sensors':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'processor':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'armor':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'weapons':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'accessories':
        return this._dialogueSystem(droidSystems, stepConfig, selectedItems, budget);
      case 'review':
        return this._dialogueReview(droidSystems, budget, validationErrors);
      default:
        return this._emptyDialogue();
    }
  }

  /**
   * Intro step: Welcome and explain the process
   */
  static _dialogueIntro() {
    return {
      intro: 'Welcome to the Droid Builder. I am Seraphim, your assistant. We will now configure a droid system by selecting core components and managing your credit budget.',
      reaction: 'Let me help you build something reliable.',
      warnings: [],
      budget: 'Your budget: 2000 credits. You will select systems as we proceed.',
      review: ''
    };
  }

  /**
   * Size step: Explain size implications
   */
  static _dialogueSize(droidSystems, stepConfig) {
    const sizeImplications = {
      'Tiny': 'Tiny droids are compact but have limited system capacity and durability.',
      'Small': 'Small droids balance mobility with reasonable system slots.',
      'Medium': 'Medium droids offer solid capacity and are the standard baseline.',
      'Large': 'Large droids provide more capacity but are less mobile.',
      'Huge': 'Huge droids maximize system capacity at the cost of severe mobility penalties.'
    };

    const currentSize = droidSystems.size || 'Medium';
    const implication = sizeImplications[currentSize] || sizeImplications['Medium'];

    return {
      intro: 'Select your droid size. This affects system capacity, weight, and mobility.',
      reaction: `You have selected ${currentSize}. ${implication}`,
      warnings: [],
      budget: '',
      review: ''
    };
  }

  /**
   * System selection steps: React to choices, explain trade-offs
   */
  static _dialogueSystem(droidSystems, stepConfig, selectedItems, budget) {
    const stepLabel = stepConfig?.label || 'Unknown Step';
    const stepName = stepLabel.replace('Select ', '').toLowerCase();
    const isMultiSelect = stepConfig?.selectionType === 'multiple';

    // Build reaction based on selection
    let reaction = '';
    if (Array.isArray(selectedItems) && selectedItems.length > 0) {
      const names = selectedItems.map(s => s.name).join(', ');
      reaction = `You have selected: ${names}. This configuration emphasizes ${this._getEmphasis(stepName, selectedItems)}.`;
    } else if (selectedItems?.name) {
      reaction = `You have selected: ${selectedItems.name}. This provides ${this._getCharacteristic(stepName, selectedItems)}.`;
    } else {
      reaction = `No selection yet. Consider what role your droid will serve.`;
    }

    // Budget analysis
    let budgetMsg = '';
    if (budget) {
      budgetMsg = `Remaining budget: ${budget.remaining} / ${budget.total} credits.`;
      if (budget.remaining < 300) {
        budgetMsg += ` You are approaching budget limits.`;
      }
    }

    // Warnings (soft, advisory, not prescriptive)
    const warnings = this._warningsForStep(stepName, selectedItems, budget);

    return {
      intro: `${stepLabel}. Choose a ${stepName} system for your droid.`,
      reaction: reaction,
      warnings: warnings,
      budget: budgetMsg,
      review: ''
    };
  }

  /**
   * Review step: Summary and final checks
   */
  static _dialogueReview(droidSystems, budget, validationErrors) {
    let reviewMsg = `Configuration Summary:\n\n`;
    reviewMsg += `Degree: ${droidSystems.degree || 'Not selected'}\n`;
    reviewMsg += `Size: ${droidSystems.size || 'Medium'}\n`;
    reviewMsg += `Locomotion: ${droidSystems.locomotion?.name || 'Not selected'}\n`;
    reviewMsg += `Appendages: ${droidSystems.appendages?.length || 0}\n`;
    reviewMsg += `Sensors: ${droidSystems.sensors?.length || 0}\n`;
    reviewMsg += `Processor: ${droidSystems.processor?.name || 'Not selected'}\n`;
    reviewMsg += `Armor: ${droidSystems.armor?.name || 'Not selected'}\n`;
    reviewMsg += `Weapons: ${droidSystems.weapons?.length || 0}\n`;
    reviewMsg += `Accessories: ${droidSystems.accessories?.length || 0}\n\n`;

    if (budget) {
      reviewMsg += `Total Spent: ${budget.spent} / ${budget.total} credits`;
    }

    let reaction = 'Configuration is ready for finalization.';
    if (validationErrors && validationErrors.length > 0) {
      reaction = `Warning: There are validation issues. Review them before finalizing.`;
    }

    return {
      intro: 'Review your complete droid configuration.',
      reaction: reaction,
      warnings: validationErrors || [],
      budget: '',
      review: reviewMsg
    };
  }

  /**
   * Helper: Describe the emphasis of a selection
   * (Observable, no prescriptive language)
   */
  static _getEmphasis(stepName, selectedItems) {
    const nameStr = Array.isArray(selectedItems)
      ? selectedItems.map(s => s.name).join(', ')
      : selectedItems?.name || '';

    const emphasizes = {
      'locomotion': {
        'wheels': 'speed and mobility',
        'treads': 'stability and terrain control',
        'legs': 'balance between mobility and durability',
        'hover': 'evasion and advanced terrain coverage',
        'flight': 'maximum mobility'
      },
      'manipulators': {
        'hand': 'fine manipulation and dexterity',
        'gripper': 'basic object handling',
        'tentacle': 'complex or delicate tasks',
        'saw': 'cutting and construction',
        'probe': 'remote sensing'
      },
      'sensors': {
        'optical': 'visual target acquisition',
        'thermal': 'heat signature detection',
        'motion': 'movement tracking',
        'radiation': 'environmental scanning',
        'olfactory': 'chemical analysis'
      },
      'processor': {
        'simple': 'basic autonomous control',
        'standard': 'standard reasoning capacity',
        'advanced': 'complex decision-making',
        'elite': 'maximum cognitive load'
      },
      'armor': {
        'light': 'mobility over protection',
        'medium': 'balanced durability',
        'heavy': 'protection over mobility',
        'reinforced': 'maximum durability'
      },
      'weapons': 'combat capability',
      'accessories': 'specialized functions'
    };

    // Try to match item names to emphasis
    for (const [key, val] of Object.entries(emphasizes[stepName] || {})) {
      if (nameStr.toLowerCase().includes(key)) {
        return val;
      }
    }

    // Fallback
    return emphasizes[stepName] || 'this system';
  }

  /**
   * Helper: Describe what a selection provides
   * (Observable, no prescriptive language)
   */
  static _getCharacteristic(stepName, selectedItem) {
    const name = selectedItem?.name || '';

    const characteristics = {
      'locomotion': {
        'wheels': 'good mobility across open terrain',
        'treads': 'excellent stability and obstacle crossing',
        'legs': 'adaptability to varied terrain',
        'hover': 'superior evasion capabilities',
        'flight': 'maximum mobility and three-dimensional movement'
      },
      'processor': {
        'simple': 'basic autonomous functions',
        'standard': 'standard reasoning and tactical awareness',
        'advanced': 'complex decision-making and adaptation',
        'elite': 'maximum cognitive capacity'
      },
      'armor': {
        'light': 'minimal protection, maximum agility',
        'medium': 'balanced defense',
        'heavy': 'significant protection',
        'reinforced': 'maximum durability'
      }
    };

    // Try to match item name
    for (const [key, val] of Object.entries(characteristics[stepName] || {})) {
      if (name.toLowerCase().includes(key)) {
        return val;
      }
    }

    // Fallback
    return 'additional capabilities';
  }

  /**
   * Helper: Generate soft warnings (advisory, not enforcement)
   */
  static _warningsForStep(stepName, selectedItems, budget) {
    const warnings = [];

    // Budget warnings (observable, not prescriptive)
    if (budget && budget.remaining < 300) {
      warnings.push('Your remaining budget is limited. Consider finalizing selections.');
    }

    if (budget && budget.remaining === 0) {
      warnings.push('Budget fully allocated. No further purchases are possible.');
    }

    // System-specific observations
    if (stepName === 'manipulators') {
      if (Array.isArray(selectedItems) && selectedItems.length === 0) {
        warnings.push('No manipulators selected. This limits the droid\'s ability to interact with objects.');
      }
    }

    if (stepName === 'armor') {
      if (selectedItems?.name?.toLowerCase().includes('light')) {
        warnings.push('Light armor provides minimal protection. Consider balance with your intended role.');
      }
    }

    return warnings;
  }

  /**
   * Empty dialogue (fallback)
   */
  static _emptyDialogue() {
    return {
      intro: '',
      reaction: '',
      warnings: [],
      budget: '',
      review: ''
    };
  }
}
