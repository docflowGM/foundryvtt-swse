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
  }

  async onStepEnter(shell) {
    this._surveyDefinition = getSurveyDefinition(resolveActorClassId(shell?.actor, shell));
    this._activeQuestionIndex = this._findNextQuestionIndex();

    try {
      this._analysisResult = await BuildAnalysisIntegration.analyzeAndProvideFeedback(shell);
      this._emergentArchetype = this._analysisResult?.emergentArchetype || null;
    } catch (err) {
      console.warn('[L1SurveyStep] Build analysis failed:', err);
    }

    await this._speakActiveQuestion(shell, true);
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onAnswerChanged = async (event) => {
      const input = event.currentTarget;
      const questionId = input?.dataset?.questionId;
      const optionId = input?.value;
      const question = this._getRenderableQuestions()?.find?.((entry) => entry.id === questionId);
      const option = question?.options?.find?.((entry) => entry.id === optionId);
      if (!question || !option) return;
      this._surveyAnswers[questionId] = option;
      this._activeQuestionIndex = this._findNextQuestionIndex(questionId);
      await this._speakActiveQuestion(shell);
      shell.render();
    };

    shell.element.querySelectorAll('[data-survey-question-id]').forEach((input) => {
      input.addEventListener('change', onAnswerChanged, { signal });
    });
  }

  async onStepExit(shell) {
    if (!this._surveyDefinition) return;
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
  }

  async getStepData(context) {
    const mentor = getStepMentorObject(context?.shell?.actor ?? null, context?.shell ?? null);
    const mentorGuidance = getStepGuidance(context?.shell?.actor ?? null, 'l1-survey', context?.shell ?? null);
    const surveyData = this._surveyDefinition
      ? buildSurveyStepData(this._surveyDefinition, this._surveyAnswers)
      : { questions: [], topMatches: [], mentor: mentor || null };

    const activeQuestion = surveyData.questions?.[this._activeQuestionIndex] || null;
    const answeredCount = Object.keys(this._surveyAnswers).length;
    const totalQuestions = surveyData.questions?.length || 0;
    const isComplete = totalQuestions > 0 && answeredCount >= totalQuestions;

    return {
      surveyAnswers: { ...this._surveyAnswers },
      mentorName: surveyData.mentor?.name || mentor?.name || null,
      mentorTitle: surveyData.mentor?.title || mentor?.title || mentor?.class || null,
      mentorPortrait: surveyData.mentor?.portrait || mentor?.portrait || null,
      mentorGuidance: surveyData.mentor?.classGuidance || mentorGuidance,
      surveyDefinition: this._surveyDefinition,
      surveyQuestions: surveyData.questions,
      activeQuestion,
      activeQuestionNumber: Math.min(this._activeQuestionIndex + 1, Math.max(totalQuestions, 1)),
      answeredCount,
      remainingCount: Math.max(totalQuestions - answeredCount, 0),
      totalQuestions,
      isComplete,
      topMatches: surveyData.topMatches,
      analysisResult: this._analysisResult,
      emergentArchetype: this._emergentArchetype,
    };
  }

  getSelection() {
    return {
      selected: Object.keys(this._surveyAnswers),
      count: Object.keys(this._surveyAnswers).length,
      isComplete: true,
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

  async _speakActiveQuestion(shell, force = false) {
    const mentorDialogue = this._getActiveMentorDialogue();
    if (!mentorDialogue) return;
    if (!force && mentorDialogue === this._lastPromptSpoken) return;
    this._lastPromptSpoken = mentorDialogue;
    await shell?.mentorRail?.speak?.(mentorDialogue, 'encouraging');
  }

  _getActiveMentorDialogue() {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    if (!question) {
      return 'Good. I have the shape of your instincts now. Look over the read in the right rail, then move when you are ready.';
    }

    const cleanText = String(question.text || '').replace(/^\s*[^:]+ asks:\s*/i, '').trim();
    const questionNumber = this._activeQuestionIndex + 1;
    const totalQuestions = this._getRenderableQuestions()?.length || 0;
    return `${cleanText} (${questionNumber}/${totalQuestions})`;
  }
}
