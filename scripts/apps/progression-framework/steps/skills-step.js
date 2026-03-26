/**
 * SkillsStep plugin
 *
 * Handles skill selection and training during character generation.
 * Integrates with existing skill registry and training logic.
 *
 * Data:
 * - trainedSkills: Map<skillKey, {trained: boolean, focus?: boolean, misc?: number}>
 * - trainedCount: number (current count)
 * - allowedCount: number (max allowed for this character)
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SkillRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';

export class SkillsStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State
    this._trainedSkills = new Map();      // skillKey → {trained, focus, misc}
    this._allSkills = [];                 // Full skill list from registry
    this._trainedCount = 0;
    this._allowedCount = 1;               // Updated on enter from character data

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    const character = shell.actor?.system || {};

    // Load allowed skills count from character build
    this._allowedCount = character.build?.trainedSkillsAllowed || 1;

    // Load existing skill selections if any
    const existingSkills = character.skills || {};
    for (const [key, skillData] of Object.entries(existingSkills)) {
      this._trainedSkills.set(key, { ...skillData });
    }

    // Count current trained
    this._trainedCount = Array.from(this._trainedSkills.values())
      .filter(s => s.trained)
      .length;

    // Load full skill list from registry
    try {
      const skillRegistry = SkillRegistry.getInstance?.() || SkillRegistry;
      this._allSkills = await skillRegistry.getSkills?.() || [];
      if (typeof skillRegistry === 'function') {
        // Fallback if it's a constructor
        this._allSkills = Object.values(skillRegistry.SKILLS || {});
      }
    } catch (err) {
      swseLogger.warn('[SkillsStep] Failed to load skill registry:', err);
      this._allSkills = [];
    }

    // Enable Ask Mentor
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire skill checkboxes
    const skillCheckboxes = shell.element.querySelectorAll('.skills-step-skill-checkbox');
    skillCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.preventDefault();
        const skillKey = checkbox.dataset.skill;
        const checked = checkbox.checked;

        this._toggleSkill(skillKey, checked);
        shell.render();
      }, { signal });
    });

    // Wire train/untrain buttons
    const trainButtons = shell.element.querySelectorAll('.skills-step-train-btn');
    trainButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const skillKey = btn.dataset.skill;
        this._trainSkill(skillKey);
        shell.render();
      }, { signal });
    });

    const untrainButtons = shell.element.querySelectorAll('.skills-step-untrain-btn');
    untrainButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const skillKey = btn.dataset.skill;
        this._untrainSkill(skillKey);
        shell.render();
      }, { signal });
    });

    // Wire reset button
    const resetBtn = shell.element.querySelector('.skills-step-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._resetAllSkills();
        shell.render();
      }, { signal });
    }
  }

  async onStepExit(shell) {
    // Persist skill selections to shell state
    // This is handled by getStepData()

    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      const trainedList = Array.from(this._trainedSkills.entries())
        .filter(([_, data]) => data.trained)
        .reduce((acc, [key, data]) => {
          acc[key] = data.rank || 1;
          return acc;
        }, {});

      shell.buildIntent.commitSelection(
        this.descriptor.stepId,
        'skills',
        trainedList
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    return {
      trainedSkills: Object.fromEntries(this._trainedSkills),
      trainedCount: this._trainedCount,
      allowedCount: this._allowedCount,
      allSkills: this._allSkills,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];
    const warnings = [];

    // No hard requirement to train all slots, but warn if not used
    if (this._trainedCount === 0 && this._allowedCount > 0) {
      warnings.push(`You have ${this._allowedCount} skill training slot(s) available. Consider selecting skills!`);
    }

    if (this._trainedCount > this._allowedCount) {
      errors.push(`Too many skills trained (${this._trainedCount}/${this._allowedCount}). Untrain some skills.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getSelection() {
    const trainedList = Array.from(this._trainedSkills.entries())
      .filter(([_, data]) => data.trained)
      .map(([key, _]) => key);

    return {
      selected: trainedList,
      count: this._trainedCount,
      isComplete: this._trainedCount <= this._allowedCount,
    };
  }

  getBlockingIssues() {
    const validation = this.validate();
    return validation.errors;
  }

  // ---------------------------------------------------------------------------
  // Skill Management
  // ---------------------------------------------------------------------------

  _toggleSkill(skillKey, trained) {
    if (!this._trainedSkills.has(skillKey)) {
      this._trainedSkills.set(skillKey, {});
    }

    const skillData = this._trainedSkills.get(skillKey);

    if (trained && this._trainedCount >= this._allowedCount) {
      ui.notifications.warn(`You can only train ${this._allowedCount} skill(s). Untrain another skill first.`);
      return;
    }

    skillData.trained = trained;
    this._trainedCount = Array.from(this._trainedSkills.values())
      .filter(s => s.trained)
      .length;

    swseLogger.log(`[SkillsStep] Skill "${skillKey}" toggled to ${trained}, count: ${this._trainedCount}/${this._allowedCount}`);
  }

  _trainSkill(skillKey) {
    if (!this._trainedSkills.has(skillKey)) {
      this._trainedSkills.set(skillKey, {});
    }

    const skillData = this._trainedSkills.get(skillKey);

    if (!skillData.trained && this._trainedCount >= this._allowedCount) {
      ui.notifications.warn(`You can only train ${this._allowedCount} skill(s). Untrain another skill first.`);
      return;
    }

    skillData.trained = true;
    this._trainedCount = Array.from(this._trainedSkills.values())
      .filter(s => s.trained)
      .length;

    swseLogger.log(`[SkillsStep] Skill "${skillKey}" trained, count: ${this._trainedCount}/${this._allowedCount}`);
  }

  _untrainSkill(skillKey) {
    if (this._trainedSkills.has(skillKey)) {
      this._trainedSkills.get(skillKey).trained = false;
      this._trainedCount = Array.from(this._trainedSkills.values())
        .filter(s => s.trained)
        .length;
      swseLogger.log(`[SkillsStep] Skill "${skillKey}" untrained, count: ${this._trainedCount}/${this._allowedCount}`);
    }
  }

  _resetAllSkills() {
    this._trainedSkills.forEach(skillData => {
      skillData.trained = false;
    });
    this._trainedCount = 0;
    swseLogger.log(`[SkillsStep] All skills reset`);
    ui.notifications.info('All skill selections have been reset.');
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/skills-work-surface.hbs',
      data: stepData,
    };
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'skills')
      || 'Make your choice wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }

}
