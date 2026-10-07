/**
 * Phase 5C compatibility: the six pre-cutover implementation-derivative feat records
 * (Weapon Proficiency (Simple Weapons)/(Pistols)/(Rifles)/(Heavy Weapons), Advanced Melee Weapon Proficiency,
 * Heavy Weapon Proficiency) no longer exist as compendium feats. Name-based callers resolve these labels to the
 * canonical Weapon Proficiency feat plus an explicit choice. The authoritative mapping is
 * data/migrations/feat-canonical-aliases.json (verified equal to this table by tools/verify-canonical-production.mjs).
 * Retire when name-based feat lookups are replaced by canonical-id + choice lookups (Phase 5G).
 */
export const CANONICAL_WEAPON_PROFICIENCY_ID = 'ecc2471ac96ec2d4';

export const LEGACY_WEAPON_PROFICIENCY_LABELS = Object.freeze({
  'weapon proficiency (simple weapons)': 'simple',
  'weapon proficiency (pistols)': 'pistols',
  'weapon proficiency (rifles)': 'rifles',
  'weapon proficiency (heavy weapons)': 'heavy-weapons',
  'weapon proficiency (advanced melee weapons)': 'advanced-melee',
  'advanced melee weapon proficiency': 'advanced-melee',
  'heavy weapon proficiency': 'heavy-weapons',
});

export function legacyWeaponProficiencyChoice(name) {
  return LEGACY_WEAPON_PROFICIENCY_LABELS[String(name ?? '').trim().toLowerCase()] ?? null;
}

/** Item data for the canonical feat carrying the explicit choice, keeping the label as the item name. */
export function applyLegacyWeaponProficiencyChoice(itemData, label, group) {
  const data = foundry.utils.deepClone(itemData);
  data.name = label;
  data.flags = { ...(data.flags ?? {}), swse: { ...(data.flags?.swse ?? {}), choices: { ...(data.flags?.swse?.choices ?? {}), weaponProficiency: { group } } } };
  return data;
}
