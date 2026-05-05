// Compatibility wrapper. Public imports may still use this path.
// Static data has been extracted into dedicated modules under ./authority/.

export { normalizeAuthorityKey } from './authority/authority-key-normalizer.js';
export { FEAT_PREREQUISITE_AUTHORITY } from './authority/feat-prerequisite-authority.js';
export { TALENT_PREREQUISITE_AUTHORITY } from './authority/talent-prerequisite-authority.js';

import { normalizeAuthorityKey } from './authority/authority-key-normalizer.js';
import { FEAT_PREREQUISITE_AUTHORITY } from './authority/feat-prerequisite-authority.js';
import { TALENT_PREREQUISITE_AUTHORITY } from './authority/talent-prerequisite-authority.js';

export function getCanonicalContentAuthority(type, name) {
  const key = normalizeAuthorityKey(name);
  if (!key) return null;
  if (type === 'feat') return FEAT_PREREQUISITE_AUTHORITY[key] || null;
  if (type === 'talent') return TALENT_PREREQUISITE_AUTHORITY[key] || null;
  return FEAT_PREREQUISITE_AUTHORITY[key] || TALENT_PREREQUISITE_AUTHORITY[key] || null;
}

export function getCanonicalPrerequisiteText(type, name) {
  return getCanonicalContentAuthority(type, name)?.prerequisite || '';
}

export function getCanonicalDescriptionText(type, name) {
  const entry = getCanonicalContentAuthority(type, name);
  return entry?.description || entry?.benefit || '';
}

export function getCanonicalBenefitText(type, name) {
  const entry = getCanonicalContentAuthority(type, name);
  return entry?.benefit || entry?.description || '';
}

export function hasCanonicalAuthority(type, name) {
  return !!getCanonicalContentAuthority(type, name);
}
