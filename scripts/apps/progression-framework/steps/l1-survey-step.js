/**
 * L1SurveyStep plugin
 *
 * Class-centric survey step wired into the mentor survey registry.
 * Questions are derived from archetypes and voiced through the active mentor.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepGuidance, getStepMentorObject } from './mentor-step-integration.js';
import { resolveMentorPortraitPath } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
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
  const safePortrait = escapeHtml(resolveMentorPortraitPath(portrait));
  return `<img class="prog-l1-survey-stage__mentor-image prog-holo-media__image" src="${safePortrait}" alt="${safeName}" title="${safeName}" onerror="this.onerror=null; this.src='systems/foundryvtt-swse/assets/mentors/salty.png';"/>`;
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


function compactList(values = [], limit = 4) {
  const filtered = (values || []).filter(Boolean).slice(0, limit);
  if (!filtered.length) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} or ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(', ')}, or ${filtered[filtered.length - 1]}`;
}

function extractOptionFocusWords(options = []) {
  return (options || [])
    .map((option) => {
      const tags = Array.isArray(option?.detailTags) ? option.detailTags.filter(Boolean) : [];
      return tags[0] || option?.label || null;
    })
    .filter(Boolean);
}

function resolveMentorVoiceKey(mentor = null) {
  const raw = String(mentor?.name || mentor?.id || mentor?.mentorId || '').toLowerCase();
  if (raw.includes('miraj')) return 'miraj';
  if (raw.includes('j0') || raw.includes('jon') || raw.includes('j0-n1')) return 'j0n1';
  if (raw.includes('salty')) return 'salty';
  if (raw.includes('lead')) return 'lead';
  if (raw.includes('breach')) return 'breach';
  return 'default';
}

function voiceSurveyClarification(mentor, phase, coreText) {
  const voice = resolveMentorVoiceKey(mentor);
  const prefixByVoice = {
    miraj: phase === 'complete'
      ? 'Pause and review what your answers reveal.'
      : 'Be still a moment. This question is not a test of worth.',
    j0n1: phase === 'complete'
      ? 'Review protocol engaged.'
      : 'Clarification: this prompt is a preference diagnostic, not an examination.',
    salty: phase === 'complete'
      ? 'Check the chart before we cast off, matey.'
      : 'Here be the chart, matey. This one is askin\' what kind of trouble ye mean to survive.',
    lead: phase === 'complete'
      ? 'Final check. Read the profile like a mission brief.'
      : 'Read the prompt like a mission brief. It is asking what you prioritize when the plan changes.',
    breach: phase === 'complete'
      ? 'Final weapons check. Make sure the profile matches the fighter you mean to build.'
      : 'Strip it down. This question is asking what you do when the fighting starts.',
    default: phase === 'complete'
      ? 'Review your answers before you commit the profile.'
      : 'Put simply, this question is asking what kind of character you want the build to support.',
  };

  const suffixByVoice = {
    miraj: 'Choose the answer that feels true after reflection; the Force favors honesty over cleverness.',
    j0n1: 'Please select the response that best reflects expected operating behavior. Optimization follows completion, not speculation.',
    salty: 'Pick the answer that sounds like yer instincts, not the one with the shiniest brass on it.',
    lead: 'Choose the answer you would trust under pressure, not the one that merely sounds impressive.',
    breach: 'Pick the instinct you will actually use when things get ugly.',
    default: 'Choose the answer that best matches how you want the character to act in play.',
  };

  return `${prefixByVoice[voice] || prefixByVoice.default} ${coreText} ${suffixByVoice[voice] || suffixByVoice.default}`.replace(/\s+/g, ' ').trim();
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
    this._surveyFinalized = false;
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

    const restoredDraft = this._restoreSurveyDraft(shell);
    if (!restoredDraft) this._activeQuestionIndex = this._findNextQuestionIndex();

    try {
      this._analysisResult = await BuildAnalysisIntegration.analyzeAndProvideFeedback(shell);
      this._emergentArchetype = this._analysisResult?.emergentArchetype || null;
    } catch (err) {
      console.warn('[L1SurveyStep] Build analysis failed:', err);
    }

    if (!restoredDraft) this._surveyPhase = this._resolveInitialPhase();
    await this._speakCurrentPhase(shell, true);
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();

    // Step actions are handled through handleAction() via the shell delegated
    // action bridge. Keeping only translation setup here avoids duplicate
    // survey commits from both direct listeners and delegated listeners.
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
    this._surveyFinalized = false;
    this._surveyPhase = 'question';
    this._activeQuestionIndex = this._findNextQuestionIndex();
    await this._saveSurveyDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _chooseSurveyAnswer(shell, target) {
    const questionId = target?.dataset?.questionId;
    const optionId = target?.dataset?.optionId;
    const question = this._getRenderableQuestions()?.find?.((entry) => entry.id === questionId);
    const option = question?.options?.find?.((entry) => entry.id === optionId);
    if (!question || !option) return;

    this._surveyFinalized = false;
    this._surveyAnswers[questionId] = option;
    this._activeQuestionIndex = this._findQuestionIndex(questionId);
    this._surveyPhase = 'response';
    await this._saveSurveyDraft(shell);
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
    await this._saveSurveyDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _finishSurvey(shell) {
    this._surveyPhase = 'complete';
    this._surveyFinalized = true;
    await this._saveSurveyDraft(shell);
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
    this._surveyFinalized = false;

    // Return to question phase for this question
    this._surveyPhase = 'question';
    await this._saveSurveyDraft(shell);
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
        this._surveyFinalized = false;
        await this._saveSurveyDraft(shell);
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
    this._surveyFinalized = false;
    this._lastInlineTranslationKey = null;

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

    await this._clearSurveyDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();

    console.log('[L1SurveyStep] Survey retaken - all answers cleared');
  }

  async _goBackWithinSurvey(shell) {
    const questions = this._getRenderableQuestions();

    if (this._surveyPhase === 'intro') {
      await this._saveSurveyDraft(shell);
      await shell?._onPreviousStep?.();
      return;
    }

    if (this._surveyPhase === 'question') {
      if (this._activeQuestionIndex <= 0) {
        this._surveyPhase = 'intro';
      } else {
        this._activeQuestionIndex = Math.max(this._activeQuestionIndex - 1, 0);
        const previousQuestion = questions[this._activeQuestionIndex];
        this._surveyPhase = previousQuestion && this._surveyAnswers?.[previousQuestion.id] ? 'response' : 'question';
      }
    } else if (this._surveyPhase === 'response') {
      this._surveyPhase = 'question';
    } else if (this._surveyPhase === 'complete') {
      this._surveyFinalized = false;
      this._activeQuestionIndex = Math.max(questions.length - 1, 0);
      this._surveyPhase = 'response';
    } else {
      this._surveyPhase = 'intro';
    }

    await this._saveSurveyDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell?.render?.();
  }

  _canSurveyBack() {
    return true;
  }

  _getSurveyDraftKey() {
    return this._surveyDefinition?.classId || this._activeSurveyClassKey || 'unknown';
  }

  _buildSurveyDraftRecord() {
    return {
      completed: false,
      surveyId: this._surveyDefinition?.surveyId || null,
      classId: this._surveyDefinition?.classId || null,
      answers: { ...(this._surveyAnswers || {}) },
      activeQuestionIndex: this._activeQuestionIndex || 0,
      surveyPhase: this._surveyPhase || 'intro',
      updatedAt: new Date().toISOString(),
    };
  }

  _restoreSurveyDraft(shell) {
    if (!this._surveyDefinition || Object.keys(this._surveyAnswers || {}).length) return false;
    const classKey = this._getSurveyDraftKey();
    const drafts = shell?.actor?.getFlag?.('foundryvtt-swse', 'l1SurveyDrafts') || {};
    const draft = drafts?.[classKey];
    if (!draft || draft.completed) return false;
    if (draft.surveyId && draft.surveyId !== this._surveyDefinition.surveyId) return false;

    this._surveyAnswers = { ...(draft.answers || {}) };
    this._activeQuestionIndex = Number.isFinite(Number(draft.activeQuestionIndex))
      ? Number(draft.activeQuestionIndex)
      : this._findNextQuestionIndex();
    this._surveyPhase = draft.surveyPhase || this._resolveInitialPhase();
    this._surveyFinalized = false;
    return true;
  }

  async _saveSurveyDraft(shell) {
    if (!this._surveyDefinition || !shell?.actor?.setFlag) return;
    const classKey = this._getSurveyDraftKey();
    const existing = shell.actor.getFlag?.('foundryvtt-swse', 'l1SurveyDrafts') || {};
    const next = {
      ...(existing || {}),
      [classKey]: this._buildSurveyDraftRecord(),
    };
    try {
      await shell.actor.setFlag('foundryvtt-swse', 'l1SurveyDrafts', next);
    } catch (err) {
      console.warn('[L1SurveyStep] Failed to save survey draft:', err);
    }
  }

  async _clearSurveyDraft(shell) {
    if (!this._surveyDefinition || !shell?.actor?.setFlag) return;
    const classKey = this._getSurveyDraftKey();
    const existing = { ...(shell.actor.getFlag?.('foundryvtt-swse', 'l1SurveyDrafts') || {}) };
    delete existing[classKey];
    try {
      await shell.actor.setFlag('foundryvtt-swse', 'l1SurveyDrafts', existing);
    } catch (err) {
      console.warn('[L1SurveyStep] Failed to clear survey draft:', err);
    }
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
    this._surveyFinalized = false;
    this._analysisResult = null;
    this._emergentArchetype = null;
    this._lastInlineTranslationKey = null;

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
        event?.preventDefault?.();
        await this._startSurvey(shell);
        return true;
      case 'survey-choose':
        event?.preventDefault?.();
        await this._chooseSurveyAnswer(shell, target);
        return true;
      case 'survey-continue':
        event?.preventDefault?.();
        await this._continueSurvey(shell);
        return true;
      case 'survey-finish':
        event?.preventDefault?.();
        await this._finishSurvey(shell);
        return true;
      case 'survey-change-answer':
        event?.preventDefault?.();
        await this._changeCurrentAnswer(shell);
        return true;
      case 'survey-previous-question':
        event?.preventDefault?.();
        await this._goToPreviousQuestion(shell);
        return true;
      case 'survey-retake':
        event?.preventDefault?.();
        await this._retakeSurvey(shell);
        return true;
      case 'survey-back':
        event?.preventDefault?.();
        await this._goBackWithinSurvey(shell);
        return true;
      case 'ask-mentor':
        event?.preventDefault?.();
        await this.onAskMentor(shell);
        return true;
      default:
        return false;
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

    await this._saveSurveyDraft(shell);

    if (isMovingBackward) {
      // Preserve draft state but do NOT finalize bias/commitment
      console.log('[L1SurveyStep] Moving backward - preserving survey answers without finalizing');
      return;
    }

    const questions = this._getRenderableQuestions();
    const answeredCount = Object.keys(this._surveyAnswers || {}).length;
    const isComplete = questions.length > 0 && answeredCount >= questions.length;
    const isExplicitlyFinalized = this._surveyFinalized || this._surveyPhase === 'complete';

    if (!isComplete || !isExplicitlyFinalized) {
      console.log('[L1SurveyStep] Survey incomplete - draft saved without injecting mentor bias', {
        answeredCount,
        totalQuestions: questions.length,
        phase: this._surveyPhase,
      });
      return;
    }

    // Only a completed, explicitly finalized survey may inject bias and commit results
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

    await this._clearSurveyDraft(shell);

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

    const activeMentor = mentor || surveyData.mentor || null;
    const mentorName = activeMentor?.name || surveyData.mentor?.name || null;
    const mentorTitle = activeMentor?.title || surveyData.mentor?.title || activeMentor?.class || null;
    const mentorPortrait = resolveMentorPortraitPath(activeMentor?.portrait || surveyData.mentor?.portrait || null);

    return {
      surveyAnswers: { ...this._surveyAnswers },
      mentorName,
      mentorTitle,
      mentorPortrait,
      mentorPortraitMarkup: buildMentorPortraitMarkup(mentorPortrait, mentorName || 'Mentor'),
      mentorGuidance: activeMentor?.classGuidance || surveyData.mentor?.classGuidance || mentorGuidance,
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
      canSurveyBack: this._canSurveyBack(),
      surveyDraftNotice: !isComplete ? 'Draft saved. Mentor recommendations update only after you complete the survey.' : null,
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

  async onAskMentor(shell) {
    const mentor = getStepMentorObject(shell?.actor ?? null, shell);
    const clarification = this._buildQuestionClarification(mentor);
    if (clarification && shell?.mentorRail) {
      await shell.mentorRail.speak(clarification, 'encouraging');
    }
  }

  _buildQuestionClarification(mentor = null) {
    const questions = this._getRenderableQuestions();
    const question = questions?.[this._activeQuestionIndex] || null;
    const answeredCount = Object.keys(this._surveyAnswers || {}).length;
    const totalQuestions = questions.length || 0;

    if (this._surveyPhase === 'intro') {
      const core = `It sets up the kind of recommendations I will give later. You may leave early; any answers remain a draft and will not steer the build until you complete all ${totalQuestions || 'the'} questions.`;
      return voiceSurveyClarification(mentor, 'intro', core);
    }

    if (this._surveyPhase === 'complete') {
      const core = 'Nothing is committed until you continue from here. If any answer feels wrong, go back and adjust it before the profile becomes a recommendation signal.';
      return voiceSurveyClarification(mentor, 'complete', core);
    }

    if (!question) {
      const core = 'There is no active question to clarify right now. Move forward or return to the previous prompt to review your intent.';
      return voiceSurveyClarification(mentor, this._surveyPhase, core);
    }

    const focusWords = compactList(extractOptionFocusWords(question.options), 4);
    const selectedOption = this._surveyAnswers?.[question.id] || null;

    if (this._surveyPhase === 'response' && selectedOption) {
      const tags = compactList(selectedOption.detailTags || [], 3);
      const tagText = tags ? `That answer points toward ${tags}.` : 'That answer records one part of your preferred play style.';
      const core = `${tagText} It is still draft information, so change it if it does not match the character you mean to build.`;
      return voiceSurveyClarification(mentor, 'response', core);
    }

    const core = focusWords
      ? `It is comparing instincts such as ${focusWords}. It helps separate what sounds interesting from what you actually want the character to do at the table.`
      : 'It is measuring the role, tactics, and feel you want this character to lean toward. There is no wrong answer; there is only a clearer signal.';
    return voiceSurveyClarification(mentor, 'question', core);
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
