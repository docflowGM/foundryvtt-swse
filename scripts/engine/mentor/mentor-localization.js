/**
 * Runtime localization layer for canonical mentor dialogue data.
 *
 * The dialogue source of truth remains data/mentor-dialogues.json, generated into
 * mentor-dialogues.data.js. This helper overlays Foundry i18n values at read time
 * so mentor prose can be translated without forking the mentor data model.
 */

const MENTOR_DIALOGUE_ROOT = 'SWSE.MentorDialogues';

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
