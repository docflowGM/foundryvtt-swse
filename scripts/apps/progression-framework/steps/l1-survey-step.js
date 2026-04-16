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
  processSurveyAnswers,
} from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-survey.js';
import { IdentityEngine } from '/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js';

function resolveActorClassId(actor) {
  const classItems = actor?.items?.filter?.((item) => item.type === 'class') || [];
  const latest = classItems[classItems.length - 1];
  return latest?.name || null;
}

export class L1SurveyStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._surveyAnswers = {};
    this._surveyDefinition = null;
    this._analysisResult = null;
    this._emergentArchetype = null;
    this._renderAbort = null;
  }

  async onStepEnter(shell) {
    this._surveyDefinition = getSurveyDefinition(resolveActorClassId(shell?.actor));
    try {
      this._analysisResult = await BuildAnalysisIntegration.analyzeAndProvideFeedback(shell);
      this._emergentArchetype = this._analysisResult?.emergentArchetype || null;
    } catch (err) {
      console.warn('[L1SurveyStep] Build analysis failed:', err);
    }
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onAnswerChanged = (event) => {
      const input = event.currentTarget;
      const questionId = input?.dataset?.questionId;
      const optionId = input?.value;
      const question = this._surveyDefinition?.questions?.find?.((entry) => entry.id === questionId);
      const option = question?.options?.find?.((entry) => entry.id === optionId);
      if (!question || !option) return;
      this._surveyAnswers[questionId] = option;
      shell.render();
    };

    shell.element.querySelectorAll('[data-survey-question-id]').forEach((input) => {
      input.addEventListener('change', onAnswerChanged, { signal });
    });
  }

  async onStepExit(shell) {
    if (!this._surveyDefinition) return;
    const surveyBias = convertSurveyAnswersToBias(this._surveyAnswers);
    IdentityEngine.injectSurveyBias(shell.actor, surveyBias);

    if (!shell.actor.system.swse) shell.actor.system.swse = {};
    if (!shell.actor.system.swse.surveyResponses) shell.actor.system.swse.surveyResponses = {};
    shell.actor.system.swse.surveyResponses[this._surveyDefinition.classId] = {
      completed: true,
      surveyId: this._surveyDefinition.surveyId,
      answers: { ...this._surveyAnswers },
    };

    const surveySummary = processSurveyAnswers(this._surveyAnswers, this._surveyDefinition);
    shell.committedSelections.set('l1-survey', {
      surveyId: this._surveyDefinition.surveyId,
      classId: this._surveyDefinition.classId,
      answers: { ...this._surveyAnswers },
      biasLayers: surveyBias,
      summary: surveySummary,
    });
  }

  async getStepData(context) {
    const mentor = getStepMentorObject(context?.shell?.actor ?? null, context?.shell ?? null);
    const mentorGuidance = getStepGuidance(context?.shell?.actor ?? null, 'l1-survey', context?.shell ?? null);
    const surveyData = this._surveyDefinition
      ? buildSurveyStepData(this._surveyDefinition, this._surveyAnswers)
      : { questions: [], topMatches: [], mentor: mentor || null };

    return {
      surveyAnswers: { ...this._surveyAnswers },
      mentorName: surveyData.mentor?.name || mentor?.name || null,
      mentorTitle: surveyData.mentor?.title || mentor?.title || mentor?.class || null,
      mentorPortrait: surveyData.mentor?.portrait || mentor?.portrait || null,
      mentorGuidance: surveyData.mentor?.classGuidance || mentorGuidance,
      surveyDefinition: this._surveyDefinition,
      surveyQuestions: surveyData.questions,
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
    return this.renderDetailsPanelEmptyState();
  }

  async onItemFocused() {}
  async onItemCommitted() {}

  validate() {
    return { isValid: true, errors: [], warnings: [] };
  }

  getBlockingIssues() {
    return [];
  }
}
