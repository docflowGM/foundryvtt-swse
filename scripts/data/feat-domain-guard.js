/**
 * Feat Domain Guard
 *
 * Keeps feat enumeration from leaking talent-only records into feat pickers.
 *
 * The deny list below was generated from exact name collisions between the
 * curated feat catalog and the curated talent corpus. These are SWSE talents
 * that had been scraped/migrated into data/feat-catalog.json and the canonical
 * feats compendium source as fake feat records. Do not use the raw talents pack
 * as the authority here: that pack still contains a few known legacy contaminant
 * rows for real feats such as Mobility and Weapon Proficiency (Simple Weapons).
 */

export function normalizeContentName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const TALENT_ONLY_FEAT_CONTAMINANTS = new Set([
  'educated',
  'force focus',
  'forceful warrior',
  'greater weapon focus',
  'greater weapon specialization',
  'harms way',
  'indomitable will',
  'lucky shot',
  'noble fencing style',
  'recall',
  'redirect shot',
  'stunning strike',
  'weapon specialization'
]);

// Phase 5C: canonical feat identities that share a name with a talent (certified SAME_NAME_DIFFERENT_DOMAIN). The name guard
// above targets scraped contaminants; these records are real, certified feats and are recognised by canonical id.
export const CANONICAL_FEATS_SHARING_TALENT_NAMES = new Set(['c352f81dde5c9dff' /* Recall (The Force Unleashed Campaign Guide p.35) */]);

export function isTalentOnlyFeatContaminant(docOrName) {
  const name = typeof docOrName === 'string' ? docOrName : docOrName?.name;
  const key = normalizeContentName(name);
  if (!key) return false;
  if (typeof docOrName !== 'string' && String(docOrName?.type ?? 'feat').toLowerCase() !== 'talent'
    && CANONICAL_FEATS_SHARING_TALENT_NAMES.has(docOrName?._id ?? docOrName?.id)) return false;
  if (TALENT_ONLY_FEAT_CONTAMINANTS.has(key)) return true;

  const type = typeof docOrName === 'string' ? null : docOrName?.type;
  if (type && String(type).toLowerCase() === 'talent') return true;

  return false;
}

export function filterFeatDomainDocuments(docs = []) {
  return (docs || []).filter((doc) => doc?.name && !isTalentOnlyFeatContaminant(doc));
}
