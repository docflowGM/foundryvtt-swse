import { MENTORS } from '/systems/foundryvtt-swse/scripts/apps/mentor-dialogues.data.js';

function resolveMentor(mentorKey, displayName) {
  const mentor = MENTORS?.[mentorKey] || MENTORS?.[displayName] || MENTORS?.default || null;
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
  ];
}

function normalizeAttributeBias(attributeBias = {}) {
  const map = {
    str: 'strength', dex: 'dexterity', con: 'constitution',
    int: 'intelligence', wis: 'wisdom', cha: 'charisma'
  };
  const out = {};
  for (const [key, value] of Object.entries(attributeBias)) {
    out[map[key] || key] = Number(value || 0);
  }
  return out;
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
    questions: questions?.length ? questions : genericQuestions(normalizedArchetypes),
  };

  if (typeof resolveQuestions === 'function') definition.resolveQuestions = resolveQuestions;
  return definition;
}
