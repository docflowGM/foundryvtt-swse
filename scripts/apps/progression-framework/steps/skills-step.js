/**
 * SkillsStep plugin
 *
 * Handles skill selection and training during character generation.
 * Integrates with existing skill registry and training logic.
 * Includes suggested skill selections from SuggestionService (Phase 10).
 *
 * Data:
 * - trainedSkills: Map<skillKey, {trained: boolean, focus?: boolean, misc?: number}>
 * - trainedCount: number (current count)
 * - allowedCount: number (max allowed for this character)
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { normalizeSkills } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SkillRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';

export class SkillsStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State
    this._trainedSkills = new Map();      // skillKey → {trained, focus, misc}
    this._allSkills = [];                 // Full skill list from registry
    this._trainedCount = 0;
    this._allowedCount = 1;               // Updated on enter from character data
    this._suggestedSkills = [];           // Suggested skills from SuggestionService

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    const character = shell.actor?.system || {};

    // Phase 2.5: Check if this is nonheroic progression
    const isNonheroic = shell.progressionSession?.nonheroicContext?.hasNonheroic === true;

    if (isNonheroic) {
      // Nonheroic characters get 1 + INT mod (minimum 1) skill slots
      const intMod = character.abilities?.int?.mod || 0;
      this._allowedCount = Math.max(1, 1 + intMod);
      swseLogger.log('[SkillsStep] Nonheroic progression - allowed skills:', {
        intMod,
        allowedCount: this._allowedCount
      });
    } else {
      // Load allowed skills count from character build
      this._allowedCount = character.build?.trainedSkillsAllowed || 1;
    }

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

    // Get suggested skills from SuggestionService
    await this._getSuggestedSkills(shell.actor, shell);

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
    // PHASE 1: Normalize and commit to canonical session
    const trainedList = Array.from(this._trainedSkills.entries())
      .filter(([_, data]) => data.trained)
      .map(([key, _]) => key);  // Just the keys for normalized format

    const normalizedSkills = normalizeSkills(trainedList);

    if (normalizedSkills && shell) {
      // Commit to canonical session (also updates buildIntent for backward compat)
      await this._commitNormalized(shell, 'skills', normalizedSkills);
    }
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const { suggestedIds, hasSuggestions } = this.formatSuggestionsForDisplay(this._suggestedSkills);
    return {
      trainedSkills: Object.fromEntries(this._trainedSkills),
      trainedCount: this._trainedCount,
      allowedCount: this._allowedCount,
      allSkills: this._allSkills.map(s => this._formatSkillCard(s, suggestedIds)),
      hasSuggestions,
      suggestedSkillIds: Array.from(suggestedIds),
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
    const customGuidance = getStepGuidance(shell.actor, 'skills');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return 'Choose skills that reflect your background and training. They will define what you excel at.';
    } else if (this.isLevelup(shell)) {
      return 'As you gain experience, you refine your skills. Invest in areas that matter to your journey.';
    }

    return 'Choose your skills wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested skills from SuggestionService
   * Recommendations based on class, background, and other selections
   * @private
   */
  async _getSuggestedSkills(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      // NOTE: Domain is 'skills_l1' per canonical domain registry (not 'skills')
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'skills_l1',
        available: this._allSkills,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedSkills = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[SkillsStep] Suggestion service error:', err);
      this._suggestedSkills = [];
    }
  }

  /**
   * Extract character data from shell for suggestion engine
   * Allows suggestions to understand what choices have been made so far
   * @private
   */
  _buildCharacterDataFromShell(shell) {
    if (!shell?.buildIntent) {
      return {};
    }

    return shell.buildIntent.toCharacterData();
  }

  _formatSkillCard(skill, suggestedIds = new Set()) {
    const isSuggested = this.isSuggestedItem(skill.id, suggestedIds);
    return {
      ...skill,
      isSuggested,
      badgeLabel: isSuggested ? 'Recommended' : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
    };
  }

}
