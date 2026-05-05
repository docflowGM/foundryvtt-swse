import { MENTORS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';

function resolveMentor(mentorKey, displayName) {
  const mentor = MENTORS?.[mentorKey] || MENTORS?.[displayName] || MENTORS?.default || MENTORS?.Scoundrel || null;
  return mentor ? {
    name: mentor.name,
    title: mentor.title,
    portrait: mentor.portrait,
    classGuidance: mentor.classGuidance,
    summaryGuidance: mentor.summaryGuidance,
    description: mentor.description,
  } : null;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

function normalizeAttributeBias(attributeBias = {}) {
  const map = {
    str: 'strength', dex: 'dexterity', con: 'constitution',
    int: 'intelligence', wis: 'wisdom', cha: 'charisma'
  };
  const out = {};
  for (const [key, value] of Object.entries(attributeBias || {})) {
    out[map[key] || key] = Number(value || 0);
  }
  return out;
}

function normalizeOption(option = {}) {
  return {
    ...option,
    detailTags: Array.isArray(option.detailTags) ? option.detailTags : [],
    biasLayers: {
      mechanicalBias: { ...(option?.biasLayers?.mechanicalBias || {}) },
      roleBias: { ...(option?.biasLayers?.roleBias || {}) },
      attributeBias: normalizeAttributeBias(option?.biasLayers?.attributeBias || {}),
    },
    biases: { ...(option?.biases || {}) },
  };
}

function normalizeQuestion(question = {}) {
  return {
    ...question,
    options: Array.isArray(question.options) ? question.options.map(normalizeOption) : [],
  };
}

function genericQuestions(archetypes = []) {
  if (!archetypes.length) return [];
  return [
    {
      id: 'path',
      text: 'Which path sounds closest to you?',
      options: archetypes.map((entry) => ({
        id: entry.id,
        label: entry.name,
        hint: entry.notes,
        detailRailTitle: entry.name,
        detailRailText: entry.notes,
        detailTags: [entry.name],
        archetypeHint: entry.id,
        biasLayers: {
          mechanicalBias: { ...(entry.mechanicalBias || {}) },
          roleBias: { ...(entry.roleBias || {}) },
          attributeBias: normalizeAttributeBias(entry.attributeBias || {}),
        },
        biases: {}
      }))
    }
  ].map(normalizeQuestion);
}

function resolveBranchedQuestions(questions = [], answers = {}) {
  const resolved = [];
  for (const question of questions || []) {
    if (question?.branchOn && question?.branches) {
      const branchAnswerId = answers?.[question.branchOn]?.id;
      const branchOptions = branchAnswerId ? question.branches?.[branchAnswerId] : null;
      resolved.push(normalizeQuestion({
        id: question.id,
        text: question.text,
        options: Array.isArray(branchOptions) ? branchOptions : []
      }));
      continue;
    }
    resolved.push(normalizeQuestion(question));
  }
  return resolved.filter((entry) => Array.isArray(entry.options) && entry.options.length > 0);
}

export function buildSurveyDefinition({ surveyId, classId, displayName, mentorKey, archetypes = [], questions = [], resolveQuestions = null }) {
  const normalizedArchetypes = (archetypes || []).map((entry) => ({
    ...entry,
    name: entry.name || toTitleCase(entry.id),
    mechanicalBias: { ...(entry.mechanicalBias || {}) },
    roleBias: { ...(entry.roleBias || {}) },
    attributeBias: normalizeAttributeBias(entry.attributeBias || {}),
  }));

  const definition = {
    surveyId,
    surveyType: 'l1',
    classId,
    classDisplayName: displayName,
    displayName,
    mentorKey: mentorKey || displayName,
    mentor: resolveMentor(mentorKey || displayName, displayName),
    archetypes: normalizedArchetypes,
    questions: questions?.length ? questions.map(normalizeQuestion) : genericQuestions(normalizedArchetypes),
  };

  if (typeof resolveQuestions === 'function') {
    definition.resolveQuestions = (answers = {}) => resolveQuestions(answers).map(normalizeQuestion);
  } else if (questions?.some?.((q) => q?.branchOn && q?.branches)) {
    definition.resolveQuestions = (answers = {}) => resolveBranchedQuestions(definition.questions, answers);
  }

  return definition;
}
