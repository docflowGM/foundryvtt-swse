/**
 * Feat Domain Guard
 *
 * Keeps feat enumeration from leaking talent-only records into feat pickers.
 *
 * The deny list below was generated from exact name collisions between the
 * curated feat catalog and the curated talent corpus. These are SWSE talents
 * that had been scraped/migrated into data/feat-catalog.json and packs/feats.db
 * as fake feat records. Do not use the raw talents pack as the authority here:
 * that pack still contains a few known legacy contaminant rows for real feats
 * such as Mobility and Weapon Proficiency (Simple Weapons).
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

export function isTalentOnlyFeatContaminant(docOrName) {
  const name = typeof docOrName === 'string' ? docOrName : docOrName?.name;
  const key = normalizeContentName(name);
  if (!key) return false;
  if (TALENT_ONLY_FEAT_CONTAMINANTS.has(key)) return true;

  const type = typeof docOrName === 'string' ? null : docOrName?.type;
  if (type && String(type).toLowerCase() === 'talent') return true;

  return false;
}

export function filterFeatDomainDocuments(docs = []) {
  return (docs || []).filter((doc) => doc?.name && !isTalentOnlyFeatContaminant(doc));
}
