import { getEquipmentLoadoutProfile, hasLoadoutCommitment } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment-loadout-profile.js";
/**
 * Suggestion Route Coherence Guard
 *
 * Final safety pass for suggestion ranking. This does not make legal choices
 * illegal. It only prevents broad ability/combat heuristics from promoting
 * tactical side-lane options, such as grenade/burst/splash feats, above the
 * character's established route when there is no explicit build evidence.
 */

const FORCE_ROUTE_CLASS_KEYS = new Set([
  'jedi',
  'jedi-knight',
  'jedi-master',
  'force-adept',
  'force-disciple',
  'imperial-knight',
  'sith-apprentice',
  'sith-lord',
]);

const PROTECTED_REASON_CODES = new Set([
  'PRESTIGE_PREREQ',
  'PRESTIGE_ROUTE_CONTINUATION',
  'WISHLIST_PATH',
  'CHAIN_CONTINUATION',
  'ARCHETYPE_RECOMMENDATION',
  'PRESTIGE_SIGNAL',
]);

const WEAK_ROUTE_REASON_CODES = new Set([
  'FALLBACK',
  'ABILITY_PREREQ_MATCH',
  'CLASS_SYNERGY',
  'SKILL_PREREQ_MATCH',
  'MENTOR_BIAS_MATCH',
]);

const TACTICAL_SIDE_LANE_TAGS = new Set([
  'grenade',
  'grenades',
  'explosive',
  'explosives',
  'demolitions',
  'burst',
  'splash',
  'area_pressure',
  'area_damage',
  'heavy_weapon',
  'weapon_heavy',
  'artillery',
]);

const STRONG_ROUTE_ALIGNED_TAGS = new Set([
  'force_training',
  'force_capacity',
  'force_execution',
  'force_power',
  'use_the_force',
  'lightsaber',
  'lightsaber_form',
  'duelist',
  'block',
  'deflect',
]);

const RANGED_COMMITMENT_FEATS = [
  'point-blank shot',
  'precise shot',
  'rapid shot',
  'far shot',
  'deadeye',
  'weapon focus (pistols)',
  'weapon focus (rifles)',
  'weapon proficiency (pistols)',
  'weapon proficiency (rifles)',
  'weapon proficiency (heavy weapons)',
];

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  if (value instanceof Map) return Array.from(value.values());
  return [value];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function candidateTags(candidate) {
  return unique([
    ...asArray(candidate?.context?.allTags),
    ...asArray(candidate?.tags),
    ...asArray(candidate?.system?.tags),
  ].map(normalizeTag));
}

function searchableCandidateText(candidate) {
  return [
    candidate?.name,
    candidate?.slug,
    candidate?.system?.slug,
    candidate?.system?.shortSummary,
    candidate?.system?.benefit,
    candidate?.system?.effect,
    candidate?.system?.description,
  ].map(value => String(value || '').toLowerCase()).join(' ');
}

function actorClassKeys(actor) {
  return Array.from(actor?.items?.contents || actor?.items || [])
    .filter(item => item?.type === 'class')
    .map(item => normalizeKey(item?.name))
    .filter(Boolean);
}

function pendingClassKeys(options = {}) {
  const pending = options?.pendingData || {};
  return [
    pending?.selectedClass?.name,
    pending?.selectedClass?.className,
    pending?.selectedClassName,
    pending?.className,
    options?.slotContext?.selectedClass?.name,
    options?.slotContext?.className,
  ].map(normalizeKey).filter(Boolean);
}

function buildIntentRouteKeys(buildIntent = {}) {
  return unique([
    ...asArray(buildIntent?.primaryThemes),
    ...Object.keys(buildIntent?.themes || {}).filter(key => Number(buildIntent?.themes?.[key] || 0) >= 0.3),
    ...asArray(buildIntent?.signals?.classes),
    ...asArray(buildIntent?.prestigeAffinities).map(entry => entry?.className || entry?.name || entry?.id),
    ...asArray(buildIntent?.priorityPrereqs).map(entry => entry?.forClass || entry?.className),
  ].map(normalizeTag));
}

function isForceOrJediRoute(actor, buildIntent = {}, options = {}) {
  const routeKeys = unique([
    ...actorClassKeys(actor),
    ...pendingClassKeys(options),
    ...buildIntentRouteKeys(buildIntent),
  ]);

  if (buildIntent?.forceFocus === true) return true;
  return routeKeys.some(key => FORCE_ROUTE_CLASS_KEYS.has(key) || key.includes('force') || key.includes('jedi') || key.includes('lightsaber'));
}

function hasTacticalSideLaneTags(candidate) {
  const tags = candidateTags(candidate);
  if (tags.some(tag => TACTICAL_SIDE_LANE_TAGS.has(tag))) return true;

  const text = searchableCandidateText(candidate);
  return /\b(grenade|grenades|explosive|explosives|demolition|burst weapon|splash weapon|heavy weapon|artillery)\b/.test(text);
}

function hasStrongRouteAlignedTags(candidate) {
  const tags = candidateTags(candidate);
  if (tags.some(tag => STRONG_ROUTE_ALIGNED_TAGS.has(tag))) return true;

  const text = searchableCandidateText(candidate);
  return /\b(use the force|force training|force sensitivity|force power|lightsaber form|lightsaber defense|block|deflect)\b/.test(text);
}

function actorHasRangedCommitment(actor, options = {}) {
  const ownedNames = new Set(
    Array.from(actor?.items?.contents || actor?.items || [])
      .filter(item => item?.type === 'feat' || item?.type === 'talent')
      .map(item => normalizeName(item?.name))
      .filter(Boolean)
  );

  for (const feat of options?.pendingData?.selectedFeats || []) {
    ownedNames.add(normalizeName(feat?.name || feat));
  }
  for (const feat of options?.pendingData?.grantedFeats || []) {
    ownedNames.add(normalizeName(feat?.name || feat));
  }

  return RANGED_COMMITMENT_FEATS.some(name => ownedNames.has(name));
}

function isExplicitlySupported(reasonCode, suggestion, candidate, actor, buildIntent, options) {
  const code = String(reasonCode || suggestion?.reasonCode || '').toUpperCase();
  if (PROTECTED_REASON_CODES.has(code)) return true;
  if (suggestion?.sourceId && /prestige:|chain:|wishlist:/i.test(String(suggestion.sourceId))) return true;
  if (suggestion?.reason?.matchingRules?.some(rule => /prestige|chain|wishlist|archetype/i.test(String(rule)))) return true;

  const tacticalSideLane = hasTacticalSideLaneTags(candidate);
  // A generic Force/lightsaber tag should not rescue grenade/explosive/heavy-weapon
  // recommendations. Those lanes need direct route evidence or loadout commitment.
  if (!tacticalSideLane && hasStrongRouteAlignedTags(candidate)) return true;
  if (actorHasRangedCommitment(actor, options)) return true;

  const profile = options?.equipmentProfile || getEquipmentLoadoutProfile(actor, options);
  // Tactical side lanes can be promoted when the player is actually carrying or
  // equipping that lane. Equipped grenades/heavy weapons matter more than loose
  // inventory, but several carried explosives are still meaningful evidence.
  if (hasLoadoutCommitment(profile, ['grenade', 'explosives', 'heavy_weapon', 'area_damage'])) return true;
  if (profile?.hasEquippedGrenade || Number(profile?.weaponGroups?.grenade?.inventoryCount || 0) >= 3) return true;
  return false;
}

function shouldDemote({ suggestion, candidate, actor, buildIntent, options }) {
  const reasonCode = String(suggestion?.reasonCode || '').toUpperCase();
  if (!suggestion || !candidate || !actor) return false;
  if (!isForceOrJediRoute(actor, buildIntent, options)) return false;
  if (!hasTacticalSideLaneTags(candidate)) return false;
  if (isExplicitlySupported(reasonCode, suggestion, candidate, actor, buildIntent, options)) return false;
  if (!WEAK_ROUTE_REASON_CODES.has(reasonCode) && Number(suggestion?.tier || 0) >= 4) return false;
  return true;
}

export function applySuggestionRouteCoherenceGuard(suggestion, context = {}) {
  if (!suggestion || typeof suggestion !== 'object') return suggestion;

  const { candidate, actor, buildIntent, options = {} } = context;
  if (!shouldDemote({ suggestion, candidate, actor, buildIntent, options })) {
    return suggestion;
  }

  const original = {
    tier: suggestion.tier,
    reasonCode: suggestion.reasonCode,
    confidence: suggestion.confidence,
    scoring: suggestion.scoring ? { ...suggestion.scoring } : null,
  };

  const scoring = suggestion.scoring ? { ...suggestion.scoring } : null;
  if (scoring) {
    scoring.baseFinal = Number.isFinite(scoring.baseFinal) ? scoring.baseFinal : scoring.final;
    scoring.routeCoherenceDelta = Math.min(Number(scoring.final || 0), 0) - Number(scoring.final || 0);
    scoring.final = Math.min(Number(scoring.final || 0), 0.03);
    scoring.confidence = Math.min(Number(scoring.confidence || 0), 0.18);
  }

  return {
    ...suggestion,
    tier: 0,
    reasonCode: 'FALLBACK',
    originalReasonCode: suggestion.reasonCode,
    confidence: Math.min(Number(suggestion.confidence || 0.2), 0.18),
    scoring,
    routeCoherenceGuard: {
      active: true,
      original,
      reason: 'This is a legal tactical side-lane option, but it is not supported strongly enough by the current Jedi/Force route to promote as a suggestion.',
    },
  };
}

export default applySuggestionRouteCoherenceGuard;
