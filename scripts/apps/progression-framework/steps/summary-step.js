/**
 * SummaryStep plugin (formerly: read-only summary, now: summary with final name registration)
 *
 * Review of all character progression selections with final name input.
 * This step acts as "registering a datapad profile" — player reviews all choices
 * and registers the character's final name before creation.
 *
 * Summarizes decisions from: attributes, class, skills, feats, talents.
 * Allows character naming at this stage (moved from NameStep via Phase 2 Summary Refactor).
 * Final checkpoint before character creation completes.
 *
 * Data:
 * - Aggregated from prior steps via shell committedSelections
 * - Name and level are editable on THIS step (now the "datapad registration" phase)
 *
 * NOTE: NameStep was removed. Character naming happens here as the final UI step
 * before confirmation, creating a natural "datapad profile registration" flow.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class SummaryStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State (aggregated from shell committedSelections + editable name/level)
    this._summary = {
      name: '',
      level: 1,
      species: '',
      class: '',
      attributes: {},
      skills: [],
      feats: [],
      talents: [],
      languages: [],
      money: { total: 0, sources: [] },
      hpCalculation: { base: 0, modifiers: 0, total: 0 },
    };

    // Character naming (was in NameStep, now here for "datapad profile registration")
    this._characterName = '';
    this._startingLevel = 1;
    this._isReviewComplete = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Aggregate all committed selections from prior steps
    this._aggregateSummary(shell);

    // Load existing name/level if character already has them
    const character = shell.actor?.system || {};
    if (character.identity?.name) {
      this._characterName = character.identity.name;
    }
    if (shell.targetLevel) {
      this._startingLevel = shell.targetLevel;
    }

    // Enable Ask Mentor for final guidance
    shell.mentor.askMentorEnabled = true;

    swseLogger.log('[SummaryStep] Entered with aggregated summary:', this._summary);
    swseLogger.log('[SummaryStep] Character name:', this._characterName, 'Starting level:', this._startingLevel);
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Wire name input (now editable on this step as "datapad profile registration")
    const nameInput = shell.element.querySelector('.summary-step-name-input');
    if (nameInput) {
      nameInput.value = this._characterName;
      nameInput.addEventListener('input', (e) => {
        this._characterName = e.target.value;
        this._summary.name = e.target.value;
      });
      nameInput.addEventListener('change', () => {
        shell.render();
      });
    }

    // Wire level input (level slider, also editable here)
    const levelInput = shell.element.querySelector('.summary-step-level-input');
    if (levelInput) {
      levelInput.value = this._startingLevel;
      levelInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 20) {
          this._startingLevel = val;
          this._summary.level = val;
        }
      });
      levelInput.addEventListener('change', () => {
        shell.render();
      });
    }

    // Wire random name button (for living beings)
    const randomNameBtn = shell.element.querySelector('.summary-step-random-name-btn');
    if (randomNameBtn) {
      randomNameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const randomName = await this._generateRandomName(shell.actor);
        if (randomName) {
          this._characterName = randomName;
          this._summary.name = randomName;
          shell.render();
        }
      });
    }

    // Wire random droid name button (if character is droid)
    const randomDroidNameBtn = shell.element.querySelector('.summary-step-random-droid-name-btn');
    if (randomDroidNameBtn) {
      randomDroidNameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const randomName = await this._generateRandomDroidName(shell.actor);
        if (randomName) {
          this._characterName = randomName;
          this._summary.name = randomName;
          shell.render();
        }
      });
    }

    // Wire any "back to step" buttons if present (ability to return to prior steps)
    const backButtons = shell.element.querySelectorAll('.summary-step-edit-btn');
    backButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const stepId = btn.dataset.step;
        if (stepId) {
          swseLogger.log(`[SummaryStep] User wants to edit step: ${stepId}`);
          // This would be handled by shell navigation
        }
      });
    });

    // Mark as reviewed
    this._isReviewComplete = true;
  }

  async onStepExit(shell) {
    // No cleanup needed; name state is preserved in this._characterName
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    return {
      summary: this._summary,
      characterName: this._characterName,  // Final name for actor creation
      startingLevel: this._startingLevel,   // Starting level (1-20)
      isReviewComplete: this._isReviewComplete,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];
    const warnings = [];

    // Character name is NOW required on THIS step (moved from NameStep)
    // This enforces "datapad profile registration" before creation
    if (!this._characterName || this._characterName.trim() === '') {
      errors.push('Character name is required (enter or generate a name above)');
    }

    // Validate starting level
    if (this._startingLevel < 1 || this._startingLevel > 20) {
      errors.push('Starting level must be between 1 and 20');
    }

    // Validate that all prior steps are complete
    if (!this._summary.class) {
      errors.push('Character class must be selected');
    }

    if (Object.keys(this._summary.attributes).length === 0) {
      errors.push('Character attributes must be assigned');
    }

    // Feats and talents should be complete based on level
    const requiredFeats = this._calculateRequiredFeats();
    if (this._summary.feats.length < requiredFeats) {
      warnings.push(`Character should have ${requiredFeats} feat(s), currently has ${this._summary.feats.length}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getSelection() {
    // Character name is now a selection on this step (formerly on NameStep)
    return {
      selected: this._characterName ? [this._characterName] : [],
      count: this._characterName ? 1 : 0,
      isComplete: this._isReviewComplete && !!this._characterName && this._startingLevel >= 1 && this._startingLevel <= 20,
    };
  }

  getBlockingIssues() {
    const validation = this.validate();
    return validation.errors;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/summary-work-surface.hbs',
      data: stepData,
    };
  }

  // ---------------------------------------------------------------------------
  // Aggregation & Helpers
  // ---------------------------------------------------------------------------

  _aggregateSummary(shell) {
    const character = shell.actor?.system || {};
    const steps = shell.committedSelections || new Map();

    // Name/Level — NO LONGER comes from a committed NameStep
    // Will be entered directly on this SummaryStep as "datapad profile registration"
    this._summary.name = this._characterName || character.identity?.name || '';
    this._summary.level = this._startingLevel || shell.targetLevel || 1;

    // Species/Class
    const speciesData = steps.get('species');
    this._summary.species = speciesData?.speciesName || character.species || '';

    const classData = steps.get('class');
    this._summary.class = classData?.className || character.classes?.[0]?.name || '';

    // Attributes
    const attrData = steps.get('attribute');
    if (attrData?.abilities) {
      this._summary.attributes = { ...attrData.abilities };
    }

    // Skills
    const skillsData = steps.get('skills');
    if (skillsData?.trainedSkills) {
      this._summary.skills = Object.entries(skillsData.trainedSkills)
        .filter(([_, data]) => data.trained)
        .map(([key, _]) => key);
    }

    // Languages
    const languageData = steps.get('languages');
    if (languageData?.selectedLanguages) {
      this._summary.languages = Array.isArray(languageData.selectedLanguages)
        ? languageData.selectedLanguages
        : [languageData.selectedLanguages];
    }

    // Feats (both general and class)
    const generalFeatData = steps.get('general-feat');
    const classFeatData = steps.get('class-feat');
    const allFeats = [];
    if (generalFeatData?.selectedFeats) {
      const generalFeats = Array.isArray(generalFeatData.selectedFeats)
        ? generalFeatData.selectedFeats
        : [generalFeatData.selectedFeats];
      allFeats.push(...generalFeats);
    }
    if (classFeatData?.selectedFeats) {
      const classFeats = Array.isArray(classFeatData.selectedFeats)
        ? classFeatData.selectedFeats
        : [classFeatData.selectedFeats];
      allFeats.push(...classFeats);
    }
    this._summary.feats = allFeats;

    // Talents (both general and class)
    const generalTalentData = steps.get('general-talent');
    const classTalentData = steps.get('class-talent');
    const allTalents = [];
    if (generalTalentData?.selectedTalents) {
      const generalTalents = Array.isArray(generalTalentData.selectedTalents)
        ? generalTalentData.selectedTalents
        : [generalTalentData.selectedTalents];
      allTalents.push(...generalTalents);
    }
    if (classTalentData?.selectedTalents) {
      const classTalents = Array.isArray(classTalentData.selectedTalents)
        ? classTalentData.selectedTalents
        : [classTalentData.selectedTalents];
      allTalents.push(...classTalents);
    }
    this._summary.talents = allTalents;

    swseLogger.log('[SummaryStep] Aggregated summary:', this._summary);
  }

  _calculateRequiredFeats() {
    // Heroic characters start with 1 general feat
    // This is a simplified calculation; actual rules may vary
    return 1;
  }

  // ---------------------------------------------------------------------------
  // Random Name Generation (migrated from NameStep)
  // ---------------------------------------------------------------------------

  /**
   * Generate a random name for a living being.
   * Uses existing name generator from chargen-shared.js
   *
   * @param {Actor} actor - The actor to generate a name for
   * @returns {Promise<string|null>} Random name or null if generation fails
   */
  async _generateRandomName(actor) {
    try {
      // Import and use existing random name generator from old chargen
      const { getRandomName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomName === 'function') {
        return await getRandomName(actor);
      }
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to generate random name:', err);
    }
    return null;
  }

  /**
   * Generate a random droid name.
   * Uses existing droid name generator from chargen-shared.js
   *
   * @param {Actor} actor - The actor to generate a name for
   * @returns {Promise<string|null>} Random droid name or null if generation fails
   */
  async _generateRandomDroidName(actor) {
    try {
      // Import and use existing droid name generator from old chargen
      const { getRandomDroidName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomDroidName === 'function') {
        return await getRandomDroidName(actor);
      }
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to generate random droid name:', err);
    }
    return null;
  }
}
