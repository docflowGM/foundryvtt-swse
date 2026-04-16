import SURVEY_DEFINITIONS from './definitions/index.js';

function normalizeClassId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function getSurveyDefinition(classNameOrId) {
  const classId = normalizeClassId(classNameOrId);
  return SURVEY_DEFINITIONS[classId] || null;
}

export function getAllSurveyDefinitions() {
  return Object.values(SURVEY_DEFINITIONS);
}

export function getSurveyDefinitionForActor(actor) {
  const classItems = actor?.items?.filter?.((item) => item.type === 'class') || [];
  const latest = classItems[classItems.length - 1];
  return getSurveyDefinition(latest?.name || actor?.system?.details?.class?.name || null);
}

export { normalizeClassId, SURVEY_DEFINITIONS };
