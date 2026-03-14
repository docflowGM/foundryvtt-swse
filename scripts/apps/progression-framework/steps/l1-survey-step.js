/**
 * L1SurveyStep plugin
 *
 * Post-class survey step — skippable.
 * Mentor has already been swapped on class commit.
 * This step allows the player to answer optional guidance questions.
 *
 * When skipped:
 *   - No survey data is recorded
 *   - Class mentor remains active
 *   - Progression continues normally
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';

export class L1SurveyStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._surveyAnswers = {
      playstyle: null,          // 'aggressive', 'defensive', 'social', 'tactical'
      focus: null,              // 'combat', 'skills', 'roleplay'
      experience: null,         // 'newbie', 'intermediate', 'veteran'
    };

    this._isSkipped = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Survey is opt-in, so no forced entry
    this._isSkipped = false;
  }

  async onDataReady(shell) {
    // Wire survey radio buttons if present
    if (!shell.element) return;

    const onPlaystyleChange = (e) => {
      this._surveyAnswers.playstyle = e.target.value;
      shell.render();
    };
    const onFocusChange = (e) => {
      this._surveyAnswers.focus = e.target.value;
      shell.render();
    };
    const onExperienceChange = (e) => {
      this._surveyAnswers.experience = e.target.value;
      shell.render();
    };

    // Playstyle radios
    shell.element.querySelectorAll('input[name="survey-playstyle"]').forEach(radio => {
      radio.addEventListener('change', onPlaystyleChange);
    });

    // Focus radios
    shell.element.querySelectorAll('input[name="survey-focus"]').forEach(radio => {
      radio.addEventListener('change', onFocusChange);
    });

    // Experience radios
    shell.element.querySelectorAll('input[name="survey-experience"]').forEach(radio => {
      radio.addEventListener('change', onExperienceChange);
    });
  }

  async onStepExit(shell) {
    // No cleanup needed for survey
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    return {
      surveyAnswers: { ...this._surveyAnswers },
      isSkipped: this._isSkipped,
    };
  }

  getSelection() {
    // Survey is optional, so always "complete" whether answered or skipped
    return {
      selected: this._isSkipped ? [] : [this._getSurveyHash()],
      count: 1,
      isComplete: true,  // Skippable means always complete
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    // Survey doesn't use details panel — return empty
    return this.renderDetailsPanelEmptyState();
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async onItemFocused(id, shell) {
    // Survey doesn't have focus items
  }

  async onItemCommitted(id, shell) {
    // Survey doesn't have commit items
  }

  // Explicit skip action (called by footer "Skip" button if available)
  async skipSurvey(shell) {
    this._isSkipped = true;
    shell.committedSelections.set('l1-survey', {
      skipped: true,
      answers: null,
    });
    shell.render();
  }

  // Explicit submit action (called by footer "Submit Survey" button)
  async submitSurvey(shell) {
    this._isSkipped = false;
    shell.committedSelections.set('l1-survey', {
      skipped: false,
      answers: { ...this._surveyAnswers },
    });
    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    // Survey is always valid (skippable)
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  getBlockingIssues() {
    return [];  // Survey has no blockers
  }

  getRemainingPicks() {
    if (this._isSkipped) {
      return [{ label: 'Survey skipped', count: 0, isWarning: false }];
    }

    const answered = [
      this._surveyAnswers.playstyle,
      this._surveyAnswers.focus,
      this._surveyAnswers.experience,
    ].filter(v => v !== null).length;

    return [{
      label: `Survey: ${answered}/3 questions answered`,
      count: 3 - answered,
      isWarning: false,
    }];
  }

  // ---------------------------------------------------------------------------
  // Utility Bar Config
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'minimal',  // Survey doesn't need search/filter
    };
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    await handleAskMentor(shell.actor, 'l1-survey', shell);
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'l1-survey') ||
      'This brief survey helps me understand how best to guide you. Answer truthfully — there are no wrong paths.';
  }

  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  _getSurveyHash() {
    // Simple hash to identify answered survey vs skipped
    if (this._isSkipped) return 'survey-skipped';
    const answers = [this._surveyAnswers.playstyle, this._surveyAnswers.focus, this._surveyAnswers.experience]
      .filter(v => v !== null)
      .join('-');
    return `survey-${answers}`;
  }
}
