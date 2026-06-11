/**
 * Runtime localization layer for canonical mentor dialogue data.
 *
 * The dialogue source of truth remains data/mentor-dialogues.json, generated into
 * mentor-dialogues.data.js. This helper overlays Foundry i18n values at read time
 * so mentor prose can be translated without forking the mentor data model.
 */

const MENTOR_DIALOGUE_ROOT = 'SWSE.MentorDialogues';
const MENTOR_ATOM_ROOT = 'SWSE.MentorAtoms';
const MENTOR_TEMPLATE_DIALOGUE_ROOT = 'SWSE.MentorTemplateDialogues';

function _sanitizeI18nSegment(segment) {
  const cleaned = String(segment ?? '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Value';
}

function _mentorKey(mentorKey) {
  return _sanitizeI18nSegment(mentorKey || 'Scoundrel');
}

function _dialogueKey(mentorKey, pathParts = []) {
  const parts = [_mentorKey(mentorKey), ...pathParts.map(_sanitizeI18nSegment)];
  return `${MENTOR_DIALOGUE_ROOT}.${parts.join('.')}`;
}

function _atomPhraseKey(mentorName, atom, intensity) {
  return `${MENTOR_ATOM_ROOT}.Phrases.${_sanitizeI18nSegment(mentorName || 'default')}.${_sanitizeI18nSegment(atom)}.${_sanitizeI18nSegment(intensity || 'medium')}`;
}

function _atomGenericKey(mentorName, intensity) {
  return `${MENTOR_ATOM_ROOT}.Generic.${_sanitizeI18nSegment(mentorName || 'default')}.${_sanitizeI18nSegment(intensity || 'medium')}`;
}

function _atomJudgmentKey(pathParts = []) {
  return `${MENTOR_ATOM_ROOT}.Judgment.${pathParts.map(_sanitizeI18nSegment).join('.')}`;
}

function _reasonAtomKey(atom, field = 'Label') {
  return `${MENTOR_ATOM_ROOT}.Reasons.${_sanitizeI18nSegment(atom)}.${_sanitizeI18nSegment(field)}`;
}

function _reasonCategoryKey(category, field = 'Label') {
  return `${MENTOR_ATOM_ROOT}.Categories.${_sanitizeI18nSegment(category)}.${_sanitizeI18nSegment(field)}`;
}

function _templateDialogueKey(pathParts = []) {
  return `${MENTOR_TEMPLATE_DIALOGUE_ROOT}.${pathParts.map(_sanitizeI18nSegment).join('.')}`;
}

function _i18nValue(key, fallback) {
  const i18n = globalThis.game?.i18n;
  if (!i18n?.localize || !key) return fallback;
  const localized = i18n.localize(key);
  return localized && localized !== key ? localized : fallback;
}

function _cloneAndLocalize(value, mentorKey, pathParts = []) {
  if (typeof value === 'string') {
    if (pathParts[pathParts.length - 1] === 'portrait') return value;
    return _i18nValue(_dialogueKey(mentorKey, pathParts), value);
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => _cloneAndLocalize(entry, mentorKey, [...pathParts, String(index)]));
  }

  if (value && typeof value === 'object') {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = _cloneAndLocalize(entry, mentorKey, [...pathParts, key]);
    }
    return clone;
  }

  return value;
}

function _cloneAndLocalizeTemplateDialogue(value, pathParts = []) {
  if (typeof value === 'string') {
    if (pathParts[pathParts.length - 1] === 'avatar') return value;
    return _i18nValue(_templateDialogueKey(pathParts), value);
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => _cloneAndLocalizeTemplateDialogue(entry, [...pathParts, String(index)]));
  }

  if (value && typeof value === 'object') {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = _cloneAndLocalizeTemplateDialogue(entry, [...pathParts, key]);
    }
    return clone;
  }

  return value;
}

/**
 * Localize a full mentor object while preserving its original shape.
 * @param {object|null} mentor
 * @param {string} mentorKey
 * @returns {object|null}
 */
export function localizeMentorData(mentor, mentorKey = 'Scoundrel') {
  if (!mentor || typeof mentor !== 'object') return mentor ?? null;
  return _cloneAndLocalize(mentor, mentorKey, []);
}

/**
 * Localize one mentor dialogue field with a fallback value.
 * @param {string} mentorKey
 * @param {string[]} pathParts
 * @param {string} fallback
 * @returns {string}
 */
export function localizeMentorDialogueValue(mentorKey, pathParts, fallback = '') {
  if (!fallback) return fallback;
  return _i18nValue(_dialogueKey(mentorKey, pathParts), fallback);
}

/**
 * Localize mentor-template dialogue JSON loaded from data/mentor-template-dialogues.json.
 * This keeps the JSON data file canonical while allowing class/profile dialogue
 * cards to be translated at runtime.
 * @param {object|null} dialogueData
 * @returns {object|null}
 */
export function localizeMentorTemplateDialogues(dialogueData) {
  if (!dialogueData || typeof dialogueData !== 'object') return dialogueData ?? null;
  return _cloneAndLocalizeTemplateDialogue(dialogueData, []);
}

/**
 * Localize a mentor reason-atom phrase.
 * @param {string} mentorName
 * @param {string} atom
 * @param {string} intensity
 * @param {string} fallback
 * @returns {string}
 */
export function localizeMentorAtomPhrase(mentorName, atom, intensity, fallback = '') {
  if (!fallback) return fallback;
  const key = _atomPhraseKey(mentorName, atom, intensity);
  return _i18nValue(key, fallback);
}

/**
 * Localize a generic mentor atom fallback explanation.
 * @param {string} mentorName
 * @param {string} intensity
 * @param {string} fallback
 * @returns {string}
 */
export function localizeMentorGenericExplanation(mentorName, intensity, fallback = '') {
  if (!fallback) return fallback;
  const key = _atomGenericKey(mentorName, intensity);
  return _i18nValue(key, fallback);
}

/**
 * Localize judgment-engine connective/fallback text.
 * @param {string[]} pathParts
 * @param {string} fallback
 * @returns {string}
 */
export function localizeMentorJudgmentText(pathParts, fallback = '') {
  if (!fallback) return fallback;
  return _i18nValue(_atomJudgmentKey(pathParts), fallback);
}

/**
 * Localize a reason atom label/description for inspection UIs.
 * @param {string} atom
 * @param {string} field
 * @param {string} fallback
 * @returns {string}
 */
export function localizeMentorReasonAtom(atom, field = 'Label', fallback = '') {
  return _i18nValue(_reasonAtomKey(atom, field), fallback || atom || '');
}

/**
 * Localize a reason atom category label/description for inspection UIs.
 * @param {string} category
 * @param {string} field
 * @param {string} fallback
 * @returns {string}
 */
export function localizeMentorReasonCategory(category, field = 'Label', fallback = '') {
  return _i18nValue(_reasonCategoryKey(category, field), fallback || category || '');
}
