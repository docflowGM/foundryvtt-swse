/**
 * Follower defense rules (Clone Wars Campaign Guide pp. 32-34) consumed by the canonical DefenseCalculator and the follower sheet.
 * Pure data rules only: this module computes nothing about defenses itself.
 */

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function followerTemplateType(actor) {
  const raw = String(
    actor?.flags?.swse?.follower?.templateType
    || actor?.system?.progression?.followerTemplateType
    || actor?.system?.progression?.followerTemplate
    || actor?.system?.followerType
    || actor?.system?.npcProfile?.template
    || ''
  ).toLowerCase();
  if (raw.includes('aggressive')) return 'aggressive';
  if (raw.includes('defensive')) return 'defensive';
  if (raw.includes('utility')) return 'utility';
  return '';
}

/** Template defense bonus: aggressive +2 Fortitude, defensive +2 Reflex, utility +2 Will (an explicit stored override wins). */
export function followerTemplateDefenseBonus(actor, defense) {
  const explicit = actor?.system?.progression?.followerTemplateDefenseBonus || {};
  const direct = finite(explicit?.[defense], NaN);
  if (Number.isFinite(direct)) return direct;
  const type = followerTemplateType(actor);
  if (type === 'aggressive' && defense === 'fortitude') return 2;
  if (type === 'defensive' && defense === 'reflex') return 2;
  if (type === 'utility' && defense === 'will') return 2;
  return 0;
}
