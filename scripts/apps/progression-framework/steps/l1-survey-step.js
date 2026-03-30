/**
 * L1SurveyStep plugin
 *
 * Post-class survey step — skippable.
 * Mentor has already been swapped on class commit.
 * This step allows the player to answer optional guidance questions.
 *
 * Phase 4 (Phase 9): Build Analysis Integration
 * - Runs BuildAnalysisEngine to analyze accumulated selections
 * - Displays conflict signals and strength signals to player
 * - Provides mentor feedback on build coherence
 * - Suggests archetype alignment based on selections
 *
 * When skipped:
 *   - No survey data is recorded
 *   - Class mentor remains active
 *   - Progression continues normally
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { BuildAnalysisIntegration } from '../shell/build-analysis-integration.js';

export class L1SurveyStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._surveyAnswers = {
      playstyle: null,          // 'aggressive', 'defensive', 'social', 'tactical'
      focus: null,              // 'combat', 'skills', 'roleplay'
      experience: null,         // 'newbie', 'intermediate', 'veteran'
    };

    this._isSkipped = false;

    // Phase 4: Build analysis results
    this._analysisResult = null;  // Result from BuildAnalysisIntegration
    this._emergentArchetype = null; // Detected archetype if not explicitly set

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Survey is opt-in, so no forced entry
    this._isSkipped = false;

    // Phase 4: Run build analysis to see coherence and conflicts
    try {
      this._analysisResult = await BuildAnalysisIntegration.analyzeAndProvideFeedback(shell);

      if (this._analysisResult) {
        // Display analysis feedback via mentor
        const feedback = this._analysisResult.feedback;
        if (feedback) {
          await shell.mentorRail.speak(feedback, this._getMoodFromAnalysis());
        }

        // Store emergent archetype for reference
        this._emergentArchetype = this._analysisResult.emergentArchetype;
      }
    } catch (err) {
      console.error('[L1SurveyStep] Build analysis failed:', err);
      // Continue anyway - analysis failure shouldn't block progression
    }
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

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
      radio.addEventListener('change', onPlaystyleChange, { signal });
    });

    // Focus radios
    shell.element.querySelectorAll('input[name="survey-focus"]').forEach(radio => {
      radio.addEventListener('change', onFocusChange, { signal });
    });

    // Experience radios
    shell.element.querySelectorAll('input[name="survey-experience"]').forEach(radio => {
      radio.addEventListener('change', onExperienceChange, { signal });
    });
  }

  async onStepExit(shell) {
    // Phase 4: Save analysis results to buildIntent for persistence
    if (shell?.buildIntent && this._analysisResult) {
      shell.buildIntent.commitSelection('l1-survey', 'analysis', {
        hasConflicts: (this._analysisResult.analysis?.conflictSignals?.length || 0) > 0,
        hasStrengths: (this._analysisResult.analysis?.strengthSignals?.length || 0) > 0,
        emergentArchetype: this._emergentArchetype?.bestMatch || null,
      });
    }

    // PHASE 3: Seed mentor path commitment from emergent archetype analysis
    // If survey detected a clear archetype match, set it as soft mentor preference
    if (this._emergentArchetype?.bestMatch) {
      try {
        const { getMentorMemory, setMentorMemory, setCommittedPath } =
          await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js');
        const { getMentorForClass } =
          await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js');

        const actor = shell?.actor || shell?.document;
        if (!actor) return;

        // Get the primary class mentor
        const primaryClass = actor.items.find(i => i.type === 'class')?.name;
        if (primaryClass) {
          const mentorData = getMentorForClass(primaryClass);
          if (mentorData && mentorData.name) {
            const mentorId = mentorData.name.toLowerCase();

            // Only set path if one hasn't already been explicitly chosen
            const memory = getMentorMemory(actor, mentorId);
            if (!memory.committedPath || memory.commitmentStrength < 0.5) {
              const archetypeName = this._emergentArchetype.bestMatch;
              const updatedMemory = setCommittedPath(memory, archetypeName);
              await setMentorMemory(actor, mentorId, updatedMemory);

              console.log(
                `[L1SurveyStep] Seeded mentor path: "${archetypeName}" ` +
                `for mentor "${mentorData.name}" based on build analysis`
              );
            }
          }
        }
      } catch (err) {
        // Silently fail — survey shouldn't block on mentor seeding
        console.warn('[L1SurveyStep] Failed to seed mentor path commitment:', err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    // Phase 4: Include build analysis results for UI display
    const conflictSummary = this._analysisResult
      ? BuildAnalysisIntegration.getConflictSummary(this._analysisResult)
      : null;
    const strengthSummary = this._analysisResult
      ? BuildAnalysisIntegration.getStrengthSummary(this._analysisResult)
      : null;

    return {
      surveyAnswers: { ...this._surveyAnswers },
      isSkipped: this._isSkipped,
      // Phase 4: Analysis results for UI
      analysisResult: this._analysisResult,
      conflictSummary,
      strengthSummary,
      emergentArchetype: this._emergentArchetype,
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

  /**
   * Determine mentor mood based on build analysis results.
   * Phase 4: Reflects feedback on coherence and conflicts.
   * @private
   */
  _getMoodFromAnalysis() {
    if (!this._analysisResult?.analysis) return 'neutral';

    const conflicts = this._analysisResult.analysis.conflictSignals || [];
    const strengths = this._analysisResult.analysis.strengthSignals || [];

    // Mood based on build coherence
    if (conflicts.length === 0 && strengths.length > 0) {
      return 'encouraging'; // Strong coherent build
    }

    if (conflicts.length > 0) {
      const critical = conflicts.filter(c => c.severity === 'critical').length;
      return critical > 0 ? 'cautionary' : 'neutral'; // Warnings for issues
    }

    return 'neutral';
  }

  _getSurveyHash() {
    // Simple hash to identify answered survey vs skipped
    if (this._isSkipped) return 'survey-skipped';
    const answers = [this._surveyAnswers.playstyle, this._surveyAnswers.focus, this._surveyAnswers.experience]
      .filter(v => v !== null)
      .join('-');
    return `survey-${answers}`;
  }
}
