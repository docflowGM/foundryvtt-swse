/**
 * Mentor Suggestion JSON Loader
 *
 * Loads the phase-indexed mentor suggestion/personality data mirrored under
 * data/dialogue/mentor-suggestions/. This is intentionally separate from the
 * structured mentor biography/advisory JSON under data/dialogue/mentors/**,
 * which uses a different schema.
 */

const SYSTEM_ID = 'foundryvtt-swse';
const SUGGESTION_JSON_DIR = 'data/dialogue/mentor-suggestions';

let suggestionJsonCache = null;
let suggestionJsonLoadPromise = null;

function getSystemBasePath() {
  const systemId = globalThis.game?.system?.id || SYSTEM_ID;
  return `systems/${systemId}`;
}

function emptySuggestionJson() {
  return {
    personalities: {},
    dialogues: {},
    loaded: false
  };
}

async function fetchJsonFile(fileName) {
  const path = `${getSystemBasePath()}/${SUGGESTION_JSON_DIR}/${fileName}`;
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

function normalizeSuggestionJson(personalityPayload = {}, dialoguePayload = {}) {
  return {
    personalities: personalityPayload.personalities || {},
    dialogues: dialoguePayload.dialogues || {},
    loaded: true,
    meta: {
      personalitySchemaVersion: personalityPayload.schemaVersion ?? null,
      dialogueSchemaVersion: dialoguePayload.schemaVersion ?? null
    }
  };
}

/**
 * Load mentor suggestion JSON with a shared cache.
 * @param {Object} [options]
 * @param {boolean} [options.force=false] Reload even when cached.
 * @returns {Promise<Object>} Cached suggestion JSON payload.
 */
export async function loadMentorSuggestionJson({ force = false } = {}) {
  if (!force && suggestionJsonCache) {
    return suggestionJsonCache;
  }

  if (!force && suggestionJsonLoadPromise) {
    return suggestionJsonLoadPromise;
  }

  suggestionJsonLoadPromise = (async () => {
    try {
      const [personalityPayload, dialoguePayload] = await Promise.all([
        fetchJsonFile('mentor-personalities.json'),
        fetchJsonFile('mentor-suggestion-dialogues.json')
      ]);

      suggestionJsonCache = normalizeSuggestionJson(personalityPayload, dialoguePayload);
      return suggestionJsonCache;
    } catch (err) {
      console.warn('[SWSE] Mentor suggestion JSON unavailable; falling back to JS compatibility data.', err);
      suggestionJsonCache = emptySuggestionJson();
      return suggestionJsonCache;
    } finally {
      suggestionJsonLoadPromise = null;
    }
  })();

  return suggestionJsonLoadPromise;
}

/**
 * Get the current cache without triggering a fetch.
 * @returns {Object}
 */
export function getCachedMentorSuggestionJson() {
  return suggestionJsonCache || emptySuggestionJson();
}

/**
 * Clear cached suggestion JSON. Useful for development reloads.
 */
export function clearMentorSuggestionJsonCache() {
  suggestionJsonCache = null;
  suggestionJsonLoadPromise = null;
}

/**
 * Get personality config from JSON.
 * @param {string} mentorClass
 * @returns {Promise<Object|null>}
 */
export async function getMentorSuggestionPersonalityFromJson(mentorClass) {
  const data = await loadMentorSuggestionJson();
  return data.personalities?.[mentorClass] || null;
}

/**
 * Get phase dialogue map from JSON.
 * @param {Object} params
 * @param {string} params.mentorClass
 * @param {string} params.context
 * @param {string} params.phase
 * @returns {Promise<Object|null>}
 */
export async function getMentorSuggestionPhaseDialoguesFromJson({ mentorClass, context, phase }) {
  const data = await loadMentorSuggestionJson();
  return data.dialogues?.[mentorClass]?.[context]?.[phase] || null;
}

/**
 * Get rejection response text from JSON.
 * @param {string} mentorClass
 * @param {string} [intensity='gentle']
 * @returns {Promise<string|null>}
 */
export async function getMentorSuggestionRejectionFromJson(mentorClass, intensity = 'gentle') {
  const data = await loadMentorSuggestionJson();
  const rejection = data.dialogues?.[mentorClass]?.rejection;
  return rejection?.[intensity] || rejection?.gentle || null;
}

export default {
  loadMentorSuggestionJson,
  getCachedMentorSuggestionJson,
  clearMentorSuggestionJsonCache,
  getMentorSuggestionPersonalityFromJson,
  getMentorSuggestionPhaseDialoguesFromJson,
  getMentorSuggestionRejectionFromJson
};
