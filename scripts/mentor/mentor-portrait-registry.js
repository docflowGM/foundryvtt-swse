/**
 * Mentor Portrait Registry
 *
 * Small resolver for mentor/NPC portrait paths used outside the structured
 * mentor dialogue data. Keeps store/rail surfaces from hardcoding asset paths.
 */

const SYSTEM_ID = 'foundryvtt-swse';

export const MENTOR_PORTRAIT_OVERRIDES = Object.freeze({
  rendarr: 'assets/mentors/rendarr.png',
  'rendarrs-exchange': 'assets/mentors/rendarr.png'
});

function getSystemBasePath() {
  const systemId = globalThis.game?.system?.id || SYSTEM_ID;
  return `systems/${systemId}`;
}

function normalizeMentorKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getMentorPortraitPath(mentorKey, fallbackPath = '') {
  const normalized = normalizeMentorKey(mentorKey);
  const relativePath = MENTOR_PORTRAIT_OVERRIDES[normalized];
  if (relativePath) {
    return `${getSystemBasePath()}/${relativePath}`;
  }
  return fallbackPath || '';
}

export function getRendarrPortraitPath() {
  return getMentorPortraitPath('rendarr');
}

export default {
  MENTOR_PORTRAIT_OVERRIDES,
  getMentorPortraitPath,
  getRendarrPortraitPath
};
