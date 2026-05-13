/**
 * L1SurveyStep plugin
 *
 * Class-centric survey step wired into the mentor survey registry.
 * Questions are derived from archetypes and voiced through the active mentor.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepGuidance, getStepMentorObject } from './mentor-step-integration.js';
import { BuildAnalysisIntegration } from '../shell/build-analysis-integration.js';
import {
  getSurveyDefinition,
  buildSurveyStepData,
  convertSurveyAnswersToBias,
  extractSurveyIntentTags,
  processSurveyAnswers,
} from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-survey.js';
import { IdentityEngine } from '/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js';
import { MentorTranslationIntegration } from '/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js';

function resolveActorClassId(actor, shell = null) {
  const sessionClass =
    shell?.progressionSession?.getSelection?.('class')
    || shell?.committedSelections?.get?.('class')
    || shell?.buildIntent?.toCharacterData?.()?.classes?.[0]
    || null;

  if (sessionClass?.name) return sessionClass.name;
  if (sessionClass?.className) return sessionClass.className;
  if (sessionClass?.id) return sessionClass.id;

  const classItems = actor?.items?.filter?.((item) => item.type === 'class') || [];
  const latest = classItems[classItems.length - 1];
  return latest?.name || actor?.system?.details?.class?.name || null;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function summarizeBiasLayer(layer, prefix) {
  return Object.entries(layer || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 3)
    .map(([key]) => ({
      label: `Tag: ${String(key).replace(/[_-]+/g, ' ').replace(/(^|\s)\w/g, (m) => m.toUpperCase())}`,
      cssClass: `is-${prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    }));
}

function buildProgressDots(totalQuestions, activeIndex, answeredCount, phase) {
  return Array.from({ length: Math.max(totalQuestions, 0) }, (_, index) => ({
    index: index + 1,
    isDone: index < answeredCount,
    isActive: phase !== 'complete' && index === activeIndex,
  }));
}

function buildMentorPortraitMarkup(portrait, mentorName) {
  const safeName = escapeHtml(mentorName || 'Mentor');
  const safePortrait = escapeHtml(portrait || 'systems/foundryvtt-swse/assets/mentors/salty.png');
  return `<img class="prog-l1-survey__mentor-image" src="${safePortrait}" alt="${safeName}" title="${safeName}" onerror="this.onerror=null; this.src='systems/foundryvtt-swse/assets/mentors/salty.png';"/>`;
}

function buildCompletionTags(surveySummary, topMatches = []) {
  const tags = [];
  for (const label of surveySummary?.detailTags || []) {
    if (!label || tags.some((entry) => entry.label === label)) continue;
    tags.push({ label, cssClass: 'is-tag' });
  }

  for (const match of topMatches || []) {
    const name = match?.archetype?.name;
    if (!name || tags.some((entry) => entry.label === name)) continue;
    tags.push({ label: name, cssClass: 'is-match' });
  }

  return tags.slice(0, 6);
}

export class L1SurveyStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._surveyAnswers = {};
    this._surveyDefinition = null;
    this._analysisResult = null;
    this._emergentArchetype = null;
    this._renderAbort = null;
    this._activeQuestionIndex = 0;
    this._lastPromptSpoken = null;
    this._surveyPhase = 'intro';
    this._activeSurveyClassKey = null;  // Track which class this survey is scoped to
    this._lastInlineTranslationKey = null;  // Track last applied translation to avoid re-running
  }

  async onStepEnter(shell) {
    const currentClassId = resolveActorClassId(shell?.actor, shell);
    this._surveyDefinition = getSurveyDefinition(currentClassId);
    const currentClassKey = String(currentClassId || '').toLowerCase();

    // Detect class change: if class differs from last time, reset survey
    const didClassChange = this._activeSurveyClassKey && this._activeSurveyClassKey !== currentClassKey;

    if (didClassChange) {
      console.log('[L1SurveyStep] Class changed from', this._activeSurveyClassKey, 'to', currentClassKey, '- resetting survey');
      this._resetSurveyForClassChange(shell);
    }

    // Track the current class for next time
    this._activeSurveyClassKey = currentClassKey;

    this._activeQuestionIndex = this._findNextQuestionIndex();

    try {
      this._analysisResult = await BuildAnalysisIntegration.analyzeAndProvideFeedback(shell);
      this._emergentArchetype = this._analysisResult?.emergentArchetype || null;
    } catch (err) {
      console.warn('[L1SurveyStep] Build analysis failed:', err);
    }

    this._surveyPhase = this._resolveInitialPhase();
    await this._speakCurrentPhase(shell, true);
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    shell.element.querySelectorAll('[data-action="survey-start"]').forEach((button) => {
      button.addEventListener('click', () => this._startSurvey(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-choose"]').forEach((button) => {
      button.addEventListener('click', (event) => this._chooseSurveyAnswer(shell, event.currentTarget), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-continue"]').forEach((button) => {
      button.addEventListener('click', () => this._continueSurvey(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-finish"]').forEach((button) => {
      button.addEventListener('click', () => this._finishSurvey(shell), { signal });
    });

    // NEW: Survey answer control actions
    shell.element.querySelectorAll('[data-action="survey-change-answer"]').forEach((button) => {
      button.addEventListener('click', () => this._changeCurrentAnswer(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-previous-question"]').forEach((button) => {
      button.addEventListener('click', () => this._goToPreviousQuestion(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-retake"]').forEach((button) => {
      button.addEventListener('click', () => this._retakeSurvey(shell), { signal });
    });

    // NEW: Wire up inline translation animation for survey text
    await this._renderInlineSurveyTranslation(shell);
  }

  /**
   * Apply translation animation to visible survey text elements
   * Uses MentorTranslationIntegration to render Aurebesh animation
   */
  async _renderInlineSurveyTranslation(shell) {
    if (!shell?.element) return;

    const mentorName = this._surveyDefinition?.classId || 'default';
    const phase = this._surveyPhase;

    // Create a stable key to avoid rerunning for the same phase/content
    const currentKey = `${phase}_${this._activeQuestionIndex}`;
    if (this._lastInlineTranslationKey === currentKey) {
      return; // Already rendered for this phase/question
    }
    this._lastInlineTranslationKey = currentKey;

    try {
      // Find all dialogue text spans and apply translation
      const dialogueTexts = shell.element.querySelectorAll('[data-l1-survey-dialogue-text]');

      for (const element of dialogueTexts) {
        if (!element || element._translationApplied) continue;

        const text = element.textContent?.trim();
        if (!text) continue;

        // Skip re-applying to same element
        element._translationApplied = true;

        try {
          await MentorTranslationIntegration.render({
            text,
            container: element,
            mentor: mentorName,
            topic: 'l1-survey',
            force: true
          });
        } catch (err) {
          // Gracefully degrade if translation fails
          console.warn('[L1SurveyStep] Translation failed for element, keeping plain text:', err);
        }
      }
    } catch (err) {
      console.warn('[L1SurveyStep] Inline translation setup failed:', err);
    }
  }

  // Survey action handlers
  async _startSurvey(shell) {
    this._surveyPhase = 'question';
    this._activeQuestionIndex = this._findNextQuestionIndex();
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _chooseSurveyAnswer(shell, target) {
    const questionId = target?.dataset?.questionId;
    const optionId = target?.dataset?.optionId;
    const question = this._getRenderableQuestions()?.find?.((entry) => entry.id === questionId);
    const option = question?.options?.find?.((entry) => entry.id === optionId);
    if (!question || !option) return;

    this._surveyAnswers[questionId] = option;
    this._activeQuestionIndex = this._findQuestionIndex(questionId);
    this._surveyPhase = 'response';
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _continueSurvey(shell) {
    const questions = this._getRenderableQuestions();
    const nextIndex = questions.findIndex((question) => !this._surveyAnswers?.[question.id]);
    if (nextIndex >= 0) {
      this._activeQuestionIndex = nextIndex;
      this._surveyPhase = 'question';
    } else {
      this._activeQuestionIndex = Math.max(questions.length - 1, 0);
      this._surveyPhase = 'complete';
    }
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _finishSurvey(shell) {
    this._surveyPhase = 'complete';
    await this._speakCurrentPhase(shell, true);
    await shell?._onNextStep?.();
  }

  /**
   * NEW: Change current answer - allow player to modify their selection
   * Returns from response phase back to question phase for same question
   */
  async _changeCurrentAnswer(shell) {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    if (!question) return;

    // Delete the current answer for this question
    delete this._surveyAnswers[question.id];

    // Return to question phase for this question
    this._surveyPhase = 'question';
    await this._speakCurrentPhase(shell, true);
    shell.render();

    console.log('[L1SurveyStep] Changed answer for question', question.id);
  }

  /**
   * NEW: Go to previous question for review/editing
   * Requires at least one previously answered question
   */
  async _goToPreviousQuestion(shell) {
    const questions = this._getRenderableQuestions();
    const currentIndex = this._activeQuestionIndex;

    // Find the previous answered question
    for (let i = currentIndex - 1; i >= 0; i--) {
      const question = questions[i];
      if (question && this._surveyAnswers?.[question.id]) {
        this._activeQuestionIndex = i;
        this._surveyPhase = 'response';
        await this._speakCurrentPhase(shell, true);
        shell.render();
        console.log('[L1SurveyStep] Moved to previous question at index', i);
        return;
      }
    }
  }

  /**
   * NEW: Retake the entire survey
   * Clears all answers and bias, returns to intro or first question
   */
  async _retakeSurvey(shell) {
    console.log('[L1SurveyStep] Retaking survey for', this._activeSurveyClassKey);

    // Clear all survey data
    this._surveyAnswers = {};
    this._activeQuestionIndex = 0;
    this._surveyPhase = 'intro';
    this._lastPromptSpoken = null;

    // Clear session survey selection
    if (shell?.progressionSession?.draftSelections) {
      delete shell.progressionSession.draftSelections.survey;
      delete shell.progressionSession.draftSelections['l1-survey'];
    }

    // Clear committed survey selection
    if (shell?.committedSelections) {
      shell.committedSelections.delete('survey');
      shell.committedSelections.delete('l1-survey');
    }

    // Clear survey bias if available
    if (typeof IdentityEngine?.clearSurveyBias === 'function') {
      IdentityEngine.clearSurveyBias(shell.actor);
    }

    // Clear survey responses from actor
    if (shell?.actor?.system?.swse?.surveyResponses?.[this._surveyDefinition?.classId]) {
      delete shell.actor.system.swse.surveyResponses[this._surveyDefinition.classId];
    }

    if (shell?.actor?.system?.swse) {
      delete shell.actor.system.swse.mentorBuildIntentBiases;
    }

    await this._speakCurrentPhase(shell, true);
    shell.render();

    console.log('[L1SurveyStep] Survey retaken - all answers cleared');
  }

  /**
   * NEW: Reset survey when class changes
   * Clears answers, bias, and selections from previous class
   */
  _resetSurveyForClassChange(shell) {
    const previousCount = Object.keys(this._surveyAnswers).length;

    // Clear survey data
    this._surveyAnswers = {};
    this._activeQuestionIndex = 0;
    this._surveyPhase = 'intro';
    this._lastPromptSpoken = null;
    this._analysisResult = null;
    this._emergentArchetype = null;

    // Clear session survey selection
    if (shell?.progressionSession?.draftSelections) {
      delete shell.progressionSession.draftSelections.survey;
      delete shell.progressionSession.draftSelections['l1-survey'];
    }

    // Clear committed survey selection
    if (shell?.committedSelections) {
      shell.committedSelections.delete('survey');
      shell.committedSelections.delete('l1-survey');
    }

    // Clear survey bias
    if (typeof IdentityEngine?.clearSurveyBias === 'function') {
      IdentityEngine.clearSurveyBias(shell.actor);
    }

    // Clear old survey responses
    if (shell?.actor?.system?.swse?.surveyResponses) {
      shell.actor.system.swse.surveyResponses = {};
    }

    if (shell?.actor?.system?.swse) {
      delete shell.actor.system.swse.mentorBuildIntentBiases;
    }

    console.log('[L1SurveyStep] Reset survey for class change - cleared', previousCount, 'answers');
  }

  /**
   * Public action handler for routing survey button actions from inline holopad mode.
   * Called when action buttons are clicked outside of shell.element context.
   */
  async handleAction(action, event, target, shell) {
    switch (action) {
      case 'survey-start':
        await this._startSurvey(shell);
        break;
      case 'survey-choose':
        await this._chooseSurveyAnswer(shell, target);
        break;
      case 'survey-continue':
        await this._continueSurvey(shell);
        break;
      case 'survey-finish':
        await this._finishSurvey(shell);
        break;
      case 'survey-change-answer':
        await this._changeCurrentAnswer(shell);
        break;
      case 'survey-previous-question':
        await this._goToPreviousQuestion(shell);
        break;
      case 'survey-retake':
        await this._retakeSurvey(shell);
        break;
    }
  }

  /**
   * Direction-aware exit: only inject bias and commit on forward navigation
   * @param {Object} shell - Progression shell
   * @param {Object} context - Exit context with optional direction ('forward' or 'backward')
   */
  async onStepExit(shell, context = {}) {
    if (!this._surveyDefinition) return;

    const direction = context?.direction || 'forward';
    const isMovingBackward = direction === 'backward';

    if (isMovingBackward) {
      // Preserve draft state but do NOT finalize bias/commitment
      console.log('[L1SurveyStep] Moving backward - preserving survey answers without finalizing');
      return;
    }

    // Only on forward exit: inject bias and commit results
    const surveyBias = convertSurveyAnswersToBias(this._surveyAnswers);
    const surveyIntentTags = extractSurveyIntentTags(this._surveyAnswers);
    IdentityEngine.injectSurveyBias(shell.actor, surveyBias);

    if (!shell.actor.system.swse) shell.actor.system.swse = {};
    shell.actor.system.swse.mentorBuildIntentBiases = { ...surveyIntentTags };
    if (!shell.actor.system.swse.surveyResponses) shell.actor.system.swse.surveyResponses = {};
    shell.actor.system.swse.surveyResponses[this._surveyDefinition.classId] = {
      completed: true,
      surveyId: this._surveyDefinition.surveyId,
      answers: { ...this._surveyAnswers },
      intentTags: { ...surveyIntentTags },
    };

    const surveySummary = processSurveyAnswers(this._surveyAnswers, this._surveyDefinition);
    shell.committedSelections.set('l1-survey', {
      surveyId: this._surveyDefinition.surveyId,
      classId: this._surveyDefinition.classId,
      answers: { ...this._surveyAnswers },
      biasLayers: surveyBias,
      summary: surveySummary,
      intentTags: surveyIntentTags,
    });

    // Also commit to canonical 'survey' key for node definitions
    shell.progressionSession?.commitSelection?.('l1-survey', 'survey', {
      surveyId: this._surveyDefinition.surveyId,
      classId: this._surveyDefinition.classId,
      answers: { ...this._surveyAnswers },
      biasLayers: surveyBias,
      summary: surveySummary,
      intentTags: surveyIntentTags,
    });

    console.log('[L1SurveyStep] Survey finalized for', this._activeSurveyClassKey, 'with', Object.keys(this._surveyAnswers).length, 'answers');
  }

  async getStepData(context) {
    const mentor = getStepMentorObject(context?.shell?.actor ?? null, context?.shell ?? null);
    const mentorGuidance = getStepGuidance(context?.shell?.actor ?? null, 'l1-survey', context?.shell ?? null);
    const surveyData = this._surveyDefinition
      ? buildSurveyStepData(this._surveyDefinition, this._surveyAnswers)
      : { questions: [], topMatches: [], mentor: mentor || null };

    const questions = (surveyData.questions || []).map((question, qIndex) => ({
      ...question,
      displayIndex: qIndex + 1,
      options: (question.options || []).map((option, oIndex) => ({
        ...option,
        displayIndex: oIndex + 1
      }))
    }));
    const activeQuestion = questions?.[this._activeQuestionIndex] || null;
    const selectedOption = activeQuestion ? this._surveyAnswers?.[activeQuestion.id] || null : null;
    const answeredCount = Object.keys(this._surveyAnswers).length;
    const totalQuestions = questions.length || 0;
    const isComplete = totalQuestions > 0 && answeredCount >= totalQuestions;
    const surveySummary = processSurveyAnswers(this._surveyAnswers, this._surveyDefinition);
    const completionTags = buildCompletionTags(surveySummary, surveyData.topMatches);

    return {
      surveyAnswers: { ...this._surveyAnswers },
      mentorName: surveyData.mentor?.name || mentor?.name || null,
      mentorTitle: surveyData.mentor?.title || mentor?.title || mentor?.class || null,
      mentorPortrait: surveyData.mentor?.portrait || mentor?.portrait || null,
      mentorPortraitMarkup: buildMentorPortraitMarkup(
        surveyData.mentor?.portrait || mentor?.portrait || null,
        surveyData.mentor?.name || mentor?.name || 'Mentor'
      ),
      mentorGuidance: surveyData.mentor?.classGuidance || mentorGuidance,
      surveyDefinition: this._surveyDefinition,
      surveyQuestions: questions,
      activeQuestion,
      selectedOption,
      activeQuestionNumber: Math.min(this._activeQuestionIndex + 1, Math.max(totalQuestions, 1)),
      answeredCount,
      remainingCount: Math.max(totalQuestions - answeredCount, 0),
      totalQuestions,
      isComplete,
      surveyPhase: this._surveyPhase,
      progressDots: buildProgressDots(totalQuestions, this._activeQuestionIndex, answeredCount, this._surveyPhase),
      promptText: this._getPromptText(activeQuestion),
      responseText: this._getResponseText(selectedOption),
      completionText: this._getCompletionText(),
      introText: surveyData.mentor?.summaryGuidance
        || surveyData.mentor?.classGuidance
        || mentorGuidance
        || 'Answer honestly so your mentor can read the shape of your path.',
      surveySummary,
      completionTags,
      topMatches: surveyData.topMatches,
      analysisResult: this._analysisResult,
      emergentArchetype: this._emergentArchetype,
    };
  }

  getSelection() {
    const questions = this._getRenderableQuestions();
    const selected = Object.keys(this._surveyAnswers);
    return {
      selected,
      count: selected.length,
      isComplete: questions.length > 0 && selected.length >= questions.length,
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel() {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    const selectedOption = question ? this._surveyAnswers?.[question.id] || null : null;

    if (!question) {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-details.hbs',
        data: {
          title: 'Intent Locked In',
          summary: 'Your mentor has enough to read the shape of your path. Review the strongest archetype reads, then continue when you are ready.',
          tags: [],
        },
      };
    }

    if (!selectedOption) {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-details.hbs',
        data: {
          title: `Question ${this._activeQuestionIndex + 1}`,
          summary: 'Choose the answer that feels closest to the character you want to play. The detail rail will update once you make your call.',
          tags: [],
        },
      };
    }

    const tags = Array.isArray(selectedOption?.detailTags) && selectedOption.detailTags.length
      ? selectedOption.detailTags.map((label) => ({ label: `Tag: ${label}`, cssClass: 'is-tag' }))
      : [
          ...summarizeBiasLayer(selectedOption?.biasLayers?.roleBias, 'Role'),
          ...summarizeBiasLayer(selectedOption?.biasLayers?.mechanicalBias, 'Focus'),
          ...summarizeBiasLayer(selectedOption?.biasLayers?.attributeBias, 'Lean')
        ].slice(0, 6);

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-details.hbs',
      data: {
        title: selectedOption.detailRailTitle || selectedOption.label,
        summary: selectedOption.detailRailText || selectedOption.hint || 'This answer nudges the mentor read toward the style of play you just signaled.',
        tags,
      },
    };
  }

  async onItemFocused() {}
  async onItemCommitted() {}

  validate() {
    return { isValid: true, errors: [], warnings: [] };
  }

  getBlockingIssues() {
    return [];
  }

  _getRenderableQuestions() {
    return buildSurveyStepData(this._surveyDefinition, this._surveyAnswers)?.questions || [];
  }

  _findQuestionIndex(questionId = null) {
    if (!questionId) return 0;
    return Math.max(this._getRenderableQuestions().findIndex((question) => question.id === questionId), 0);
  }

  _findNextQuestionIndex(preferredQuestionId = null) {
    const questions = this._getRenderableQuestions() || [];
    if (!questions.length) return 0;

    if (preferredQuestionId) {
      const preferredIndex = questions.findIndex((question) => question.id === preferredQuestionId);
      if (preferredIndex >= 0 && !this._surveyAnswers[preferredQuestionId]) return preferredIndex;
    }

    const unansweredIndex = questions.findIndex((question) => !this._surveyAnswers?.[question.id]);
    return unansweredIndex >= 0 ? unansweredIndex : Math.max(questions.length - 1, 0);
  }

  _resolveInitialPhase() {
    const questions = this._getRenderableQuestions();
    if (!questions.length) return 'complete';
    const answeredCount = Object.keys(this._surveyAnswers || {}).length;
    if (answeredCount <= 0) return 'intro';
    if (answeredCount >= questions.length) return 'complete';
    return 'question';
  }

  _getPromptText(activeQuestion) {
    if (!activeQuestion) {
      return 'The survey is complete. Your mentor has enough to read the shape of your path.';
    }
    return activeQuestion.text || 'Choose the answer that fits your character best.';
  }

  _getResponseText(selectedOption) {
    if (!selectedOption) return null;
    return selectedOption.detailRailText || selectedOption.hint || 'That answer tells your mentor a lot about how you want this character to play.';
  }

  _getCompletionText() {
    return 'Profile logged. Your mentor has enough to read the shape of your path. Review the strongest readings, then continue into background.';
  }

  async _speakCurrentPhase(shell, force = false) {
    const mentorDialogue = this._getCurrentMentorDialogue();
    if (!mentorDialogue) return;
    if (!force && mentorDialogue === this._lastPromptSpoken) return;
    this._lastPromptSpoken = mentorDialogue;
    await shell?.mentorRail?.speak?.(mentorDialogue, 'encouraging');
  }

  _getCurrentMentorDialogue() {
    if (this._surveyPhase === 'intro') {
      return 'Before we lock your path in, I want to hear how you think. Answer honestly. The shape of your build starts here.';
    }

    if (this._surveyPhase === 'response') {
      const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
      const selectedOption = question ? this._surveyAnswers?.[question.id] || null : null;
      return this._getResponseText(selectedOption);
    }

    if (this._surveyPhase === 'complete') {
      return 'Good. I have the shape of your instincts now. Carry that forward into the rest of the build.';
    }

    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    if (!question) {
      return 'Good. I have the shape of your instincts now. Carry that forward into the rest of the build.';
    }

    const cleanText = String(question.text || '').replace(/^\s*[^:]+ asks:\s*/i, '').trim();
    const questionNumber = this._activeQuestionIndex + 1;
    const totalQuestions = this._getRenderableQuestions()?.length || 0;
    return `${cleanText} (${questionNumber}/${totalQuestions})`;
  }
}
