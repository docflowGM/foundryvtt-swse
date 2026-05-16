/**
 * BaseClassSurveyStep
 *
 * Optional level-up survey shown only the first time a character takes a NEW
 * base class after level 1. It layers new-class intent on top of the L1 survey;
 * it does not replace the L1 identity and it does not fire when returning to a
 * base class already taken.
 */

import { L1SurveyStep } from './l1-survey-step.js';
import {
  getBaseClassSurveyDefinition,
  normalizeBaseClassSurveyKey,
} from '/systems/foundryvtt-swse/scripts/mentor/mentor-survey/base-class-survey-definitions.js';
import {
  convertSurveyAnswersToBias,
  extractSurveyIntentTags,
  processSurveyAnswers,
} from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-survey.js';
import { IdentityEngine } from '/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js';

function normalizeClassName(value) {
  return String(value?.name || value?.className || value?.id || value || '').trim();
}

function getActorBaseClassItems(actor) {
  return (actor?.items?.filter?.((item) => {
    if (item.type !== 'class') return false;
    const key = normalizeBaseClassSurveyKey(item.name || item.system?.name || item.id);
    if (!key) return false;
    return item.system?.isNonheroic !== true && item.system?.prestigeClass !== true && item.system?.isPrestige !== true;
  }) || []);
}

function getSelectedClass(shell) {
  return shell?.progressionSession?.getSelection?.('class')
    || shell?.progressionSession?.draftSelections?.class
    || shell?.committedSelections?.get?.('class')
    || null;
}

function getSelectedClassKey(shell) {
  const selected = getSelectedClass(shell);
  return normalizeBaseClassSurveyKey(selected?.name || selected?.className || selected?.id || selected);
}

function getPreviousBaseClassKey(actor, selectedKey) {
  const owned = getActorBaseClassItems(actor)
    .map((item) => normalizeBaseClassSurveyKey(item.name || item.id))
    .filter(Boolean);
  return owned.find((key) => key && key !== selectedKey) || owned[0] || null;
}

function mergeBias(target, source) {
  for (const layer of ['mechanicalBias', 'roleBias', 'attributeBias']) {
    if (!target[layer]) target[layer] = {};
    for (const [key, value] of Object.entries(source?.[layer] || {})) {
      target[layer][key] = (target[layer][key] || 0) + Number(value || 0);
    }
  }
}


function buildAggregateClassSurveyIntent(classSurveys = {}) {
  const out = {
    skillBias: [], featBias: [], talentBias: [], backgroundBias: [], prestigeClassTargets: [], detailTags: [],
    skillBiasWeights: {}, featBiasWeights: {}, talentBiasWeights: {}, backgroundBiasWeights: {},
    prestigeClassWeights: {}, attributeBiasWeights: {},
  };
  const addArray = (key, values = []) => {
    for (const value of values || []) {
      if (value && !out[key].includes(value)) out[key].push(value);
    }
  };
  const addWeights = (key, values = {}) => {
    for (const [name, value] of Object.entries(values || {})) {
      out[key][name] = (out[key][name] || 0) + Number(value || 0);
    }
  };

  for (const survey of Object.values(classSurveys || {})) {
    if (survey?.completed !== true) continue;
    const tags = survey.intentTags || {};
    addArray('skillBias', tags.skillBias);
    addArray('featBias', tags.featBias);
    addArray('talentBias', tags.talentBias);
    addArray('backgroundBias', tags.backgroundBias);
    addArray('prestigeClassTargets', tags.prestigeClassTargets);
    addArray('detailTags', tags.detailTags);
    addWeights('skillBiasWeights', tags.skillBiasWeights);
    addWeights('featBiasWeights', tags.featBiasWeights);
    addWeights('talentBiasWeights', tags.talentBiasWeights);
    addWeights('backgroundBiasWeights', tags.backgroundBiasWeights);
    addWeights('prestigeClassWeights', tags.prestigeClassWeights);
    addWeights('attributeBiasWeights', tags.attributeBiasWeights);
  }
  out.prestigeClassTarget = out.prestigeClassTargets[0] || null;
  return out;
}

function buildAggregateClassSurveyBias(classSurveys = {}) {
  const out = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
  for (const survey of Object.values(classSurveys || {})) {
    if (survey?.completed !== true) continue;
    mergeBias(out, survey.biasLayers || {});
  }
  return out;
}

export class BaseClassSurveyStep extends L1SurveyStep {
  constructor(descriptor) {
    super(descriptor);
    this._targetClassKey = null;
    this._previousClassKey = null;
  }

  async onStepEnter(shell) {
    const selected = getSelectedClass(shell);
    this._targetClassKey = getSelectedClassKey(shell);
    this._previousClassKey = getPreviousBaseClassKey(shell?.actor, this._targetClassKey);
    this._surveyDefinition = getBaseClassSurveyDefinition(
      this._targetClassKey || normalizeClassName(selected),
      this._previousClassKey
    );

    this._surveyAnswers = this._loadDraftAnswers(shell);
    this._activeQuestionIndex = this._findNextQuestionIndex();
    this._surveyPhase = this._resolveInitialPhase();
    this._lastPromptSpoken = null;

    if (shell.mentor) shell.mentor.askMentorEnabled = true;
    const mentorKey = this._surveyDefinition?.mentorKey || this._surveyDefinition?.classDisplayName || null;
    if (mentorKey && shell?.mentorRail?.setMentor) {
      shell.mentorRail.setMentor(mentorKey);
    }

    await this._speakCurrentPhase(shell, true);
  }

  async _chooseSurveyAnswer(shell, target) {
    await super._chooseSurveyAnswer(shell, target);
    this._saveDraft(shell);
  }

  async _changeCurrentAnswer(shell) {
    await super._changeCurrentAnswer(shell);
    this._saveDraft(shell);
  }

  async _continueSurvey(shell) {
    await super._continueSurvey(shell);
    this._saveDraft(shell);
  }

  async _retakeSurvey(shell) {
    this._surveyAnswers = {};
    this._activeQuestionIndex = 0;
    this._surveyPhase = 'intro';
    this._lastPromptSpoken = null;
    this._clearDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _finishSurvey(shell) {
    this._surveyPhase = 'complete';
    this._saveCompletedSurvey(shell);
    await this._speakCurrentPhase(shell, true);
    await shell?._onNextStep?.();
  }

  async onStepExit(shell, context = {}) {
    if (!this._surveyDefinition) return;
    const isMovingBackward = context?.direction === 'backward';
    if (isMovingBackward) {
      this._saveDraft(shell);
      return;
    }

    const questions = this._getRenderableQuestions();
    const isComplete = questions.length > 0 && Object.keys(this._surveyAnswers || {}).length >= questions.length;
    if (this._surveyPhase !== 'complete' || !isComplete) {
      this._saveDraft(shell);
      return;
    }

    this._saveCompletedSurvey(shell);
  }

  async onAskMentor(shell) {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    const clarification = question?.mentorClarification
      || 'This survey is here to understand what this new class means for your character. I can clarify the question, but the answer should remain yours.';
    await shell?.mentorRail?.speak?.(clarification, 'encouraging');
  }

  async getStepData(context) {
    const data = await super.getStepData(context);
    const previous = this._surveyDefinition?.previousClassDisplayName || 'your old path';
    const target = this._surveyDefinition?.targetClassDisplayName || this._surveyDefinition?.classDisplayName || 'new class';
    return {
      ...data,
      surveyEyebrow: 'New Class Survey',
      surveyTitle: `${previous} to ${target}`,
      surveySubtitle: `${data.answeredCount} / ${data.totalQuestions} answered`,
      beginLabel: 'Begin Class Survey',
      continueLabel: 'Continue Training',
      completionReadsTitle: 'New class intent',
      introText: this._surveyDefinition?.openingText
        || `Before this new training becomes part of your path, tell your mentor what becoming a ${target} means to you.`,
      completionText: this._getCompletionText(),
      isBaseClassSurvey: true,
      previousClassName: previous,
      targetClassName: target,
    };
  }

  _getCompletionText() {
    const target = this._surveyDefinition?.targetClassDisplayName || this._surveyDefinition?.classDisplayName || 'this class';
    return `Class intent logged. These answers will guide recommendations for ${target} choices without rewriting your original Level 1 identity.`;
  }

  _getCurrentMentorDialogue() {
    const target = this._surveyDefinition?.targetClassDisplayName || this._surveyDefinition?.classDisplayName || 'this new class';
    const previous = this._surveyDefinition?.previousClassDisplayName || 'your old path';

    if (this._surveyPhase === 'intro') {
      return this._surveyDefinition?.openingText || `You are adding ${target} to a path that began as ${previous}. Tell me what this change means.`;
    }

    if (this._surveyPhase === 'complete') {
      return `Good. I understand what ${target} is meant to become for you. We will use that as guidance, not a cage.`;
    }

    return super._getCurrentMentorDialogue();
  }

  _loadDraftAnswers(shell) {
    const draft = shell?.progressionSession?.draftSelections?.classSurveyDrafts?.[this._targetClassKey];
    return draft?.answers ? { ...draft.answers } : {};
  }

  _saveDraft(shell) {
    if (!this._targetClassKey || !shell?.progressionSession?.draftSelections) return;
    if (!shell.progressionSession.draftSelections.classSurveyDrafts) {
      shell.progressionSession.draftSelections.classSurveyDrafts = {};
    }
    shell.progressionSession.draftSelections.classSurveyDrafts[this._targetClassKey] = {
      classId: this._targetClassKey,
      previousClassId: this._previousClassKey,
      completed: false,
      currentQuestion: this._activeQuestionIndex,
      phase: this._surveyPhase,
      answers: { ...this._surveyAnswers },
      updatedAt: Date.now(),
    };
  }

  _clearDraft(shell) {
    if (!this._targetClassKey || !shell?.progressionSession?.draftSelections?.classSurveyDrafts) return;
    delete shell.progressionSession.draftSelections.classSurveyDrafts[this._targetClassKey];
  }

  _saveCompletedSurvey(shell) {
    if (!this._targetClassKey || !this._surveyDefinition || !shell?.progressionSession?.draftSelections) return;

    const biasLayers = convertSurveyAnswersToBias(this._surveyAnswers);
    const intentTags = extractSurveyIntentTags(this._surveyAnswers);
    const summary = processSurveyAnswers(this._surveyAnswers, this._surveyDefinition);
    const completed = {
      surveyId: this._surveyDefinition.surveyId,
      surveyType: 'base-class',
      classId: this._targetClassKey,
      className: this._surveyDefinition.targetClassDisplayName || this._surveyDefinition.classDisplayName,
      previousClassId: this._previousClassKey,
      previousClassName: this._surveyDefinition.previousClassDisplayName,
      completed: true,
      completedAt: Date.now(),
      answers: { ...this._surveyAnswers },
      biasLayers,
      intentTags,
      summary,
    };

    const drafts = shell.progressionSession.draftSelections;
    if (!drafts.classSurveys) drafts.classSurveys = {};
    drafts.classSurveys[this._targetClassKey] = completed;
    this._clearDraft(shell);

    if (shell?.committedSelections?.set) {
      shell.committedSelections.set('base-class-survey', completed);
    }

    const aggregate = buildAggregateClassSurveyBias(drafts.classSurveys);
    const aggregateIntent = buildAggregateClassSurveyIntent(drafts.classSurveys);
    if (!shell.actor.system) shell.actor.system = {};
    if (!shell.actor.system.swse) shell.actor.system.swse = {};
    shell.actor.system.swse.classSurveyBias = aggregate;
    shell.actor.system.swse.classSurveyIntentBiases = aggregateIntent;
    shell.actor.system.swse.classSurveyResponses = {
      ...(shell.actor.system.swse.classSurveyResponses || {}),
      [this._targetClassKey]: completed,
    };

    IdentityEngine.computeTotalBias?.(shell.actor);
  }
}
