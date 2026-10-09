// Phase 5D-H -- canonical weapon <-> ability RELATIONS.
// "Weapons declare what they are. Abilities declare what they apply to." A relation joins
//     canonical ability identity  +  canonical weapon/profile (selected form)  +  condition  ->  mechanic
// The ability side is matched by canonical identity (feat identityKey / talent registry id); the display name is consulted ONLY for an
// ability that carries no canonical identity (legacy / homebrew, plus the few shipped talents that still lack a stable id -- listed in
// the 5D-H audit). No weapon name, feat name, talent name or description text participates for canonical content.
import { shapeOfWeapon } from './attack-consumer.js';
import { canonicalSelectionFromContext, normalizeToken } from './attack-shape.js';
import { canonicalFeatSlug } from './ability-selector.js';

/**
 * Policy census of EVERY distinct relation the canonical weapon corpus declares.
 *   class     EXECUTION | VALIDATION | PLAYER_CHOICE | DISPLAY_ONLY | SELECTOR | DEFER
 *   policy    AUTO | PROMPT (executable relations)
 *   consumer  where it executes (module / function)    -- or --
 *   deferred  { reason, owner } for an executable relation whose consumer is a separate subsystem
 * Deterministic and tested against the live corpus: a relation present in the corpus but absent here fails the census.
 */
export const RELATION_POLICY = Object.freeze({
  PROHIBITED: { class: 'VALIDATION', policy: 'AUTO', consumer: 'attack-shape#abilityProhibitedForShape (ability identity)' },
  EXTRA_ATTACK_PENALTY: { class: 'EXECUTION', policy: 'AUTO', consumer: 'special-mechanics#multi-attack-interaction -> multi-attack planner' },
  REMOVE_RAPID_STRIKE_ATTACK_PENALTY: { class: 'EXECUTION', policy: 'AUTO', consumer: 'special-mechanics#multi-attack-interaction -> multi-attack planner' },
  TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT: { class: 'EXECUTION', policy: 'AUTO', consumer: 'fire-state#ability-triggered-reset' },
  CANNOT_NEGATE_ATTACK: { class: 'EXECUTION', policy: 'AUTO', consumer: 'damage-type-rules#damageContextForReaction -> reaction-engine (negation exclusion)' },
  EXPLICIT_WEAPON_BENEFIT: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope (ruleAppliesToWeapon); relation is a certified mirror, validated by the 5D-H census relation-consistency check' },
  EXPLICIT_WEAPON_COMPATIBILITY: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope (ruleAppliesToWeapon); relation is a certified mirror, validated by the 5D-H census relation-consistency check' },
  EXPLICIT_WEAPON_OPTION: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope (ruleAppliesToWeapon); relation is a certified mirror, validated by the 5D-H census relation-consistency check' },
  EXPLICIT_WEAPON_FAMILY_MATCH: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope (ruleAppliesToWeapon); relation is a certified mirror, validated by the 5D-H census relation-consistency check' },
  SUPPORTED: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope (ruleAppliesToWeapon); relation is a certified mirror, validated by the 5D-H census relation-consistency check' },
  UNLOCKS_DOUBLE_WEAPON_MODE: { class: 'EXECUTION', policy: 'AUTO', consumer: 'condition-policy hasFeat(ability identity) -> attack-shape#doubleWeapon + relation join' },
  TREAT_AS_LIGHT_WEAPON_FOR_THIS_FEAT: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor treated-as-light-for-weapon-finesse (operation.weaponFinesseCountsAsLight)' },
  NAMED_DISCBLADE_DAMAGE_SYNERGY: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope; the ability has no canonical id so its display name is the legacy fallback; validated by the 5D-H census relation-consistency check' },
  NAMED_FIRA_ATTACK_BONUS_SYNERGY: { class: 'SELECTOR', policy: 'AUTO', consumer: 'weapon-descriptor join of the ability\'s own rule scope; the ability has no canonical id so its display name is the legacy fallback; validated by the 5D-H census relation-consistency check' },
  POSITIVE_WEAPON_MODIFIER: { class: 'EXECUTION', policy: 'AUTO', deferred: { reason: 'modifies the wielder\'s Block/Deflect Use the Force check; the value lives in operation.* keys (BlockCumulativePenalty, DeflectPenalty, blockDeflectUseTheForceEquipmentBonus, ...) and the consumer is the reaction roll, which does not yet read the wielded weapon', owner: 'reaction/defense workflow (Block, Deflect rolls)' } },
  NEGATIVE_WEAPON_MODIFIER: { class: 'EXECUTION', policy: 'AUTO', deferred: { reason: 'same as POSITIVE_WEAPON_MODIFIER (Block/Deflect Use the Force check penalty carried by the wielded lightsaber chassis)', owner: 'reaction/defense workflow (Block, Deflect rolls)' } },
  PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM: { class: 'EXECUTION', policy: 'AUTO', consumer: 'control-rules#controlDeclarationOf entitlement (operation.pinTripSubstitution) -> weapon-control-effects#entitlementOf -> SWSEGrappling Pin/Trip (weaponEntitlement); requires canonical proficiency, creates no feat Item' },
  FULL_ROUND_THREE_TARGET_AREA_ATTACK_WITH_DISCBLADE: { class: 'EXECUTION', policy: 'AUTO', deferred: { reason: 'Discblade Arc is a talent-granted full-round attack MODE; the relation id encodes the effect (no structured parameters) and the talent has no canonical identity', owner: 'talent canonical corpus (identity + structured Discblade Arc mode)' } },
  TREAT_DISCBLADE_AS_PISTOL_FOR_RANGE_ONLY: { class: 'EXECUTION', policy: 'AUTO', deferred: { reason: 'ability-conditional range family: the relation id encodes the effect and Distant Discblade Throw has no canonical identity; the generic range consumer (canonical-range treatedAs) exists', owner: 'talent canonical corpus (identity + structured rangeTreatedAs grant)' } },
  USE_THE_FORCE_DC_15_AFTER_RANGED_ATTACK_TO_RETURN_DISCBLADE_AS_FREE_ACTION: { class: 'EXECUTION', policy: 'PROMPT', deferred: { reason: 'Recall Discblade is a Use the Force recall action after a thrown attack; the relation id encodes the DC/action and the talent has no canonical identity', owner: 'talent canonical corpus (identity + structured recall action)' } },
  TREAT_AS_RIFLE_INSTEAD_OF_EXOTIC_AND_GAIN_PLUS_1_ATTACK: { class: 'EXECUTION', policy: 'AUTO', deferred: { reason: 'Siang Lance Mastery: the proficiency re-route is carried by the weapon abilityOverrides (consumed by the proficiency resolver); the +1 attack grant has no structured parameter and the talent has no canonical identity', owner: 'talent canonical corpus (identity + structured +1 attack grant)' } },
  unspecified: { class: 'DISPLAY_ONLY', consumer: 'none: abilityOverrides entry without a relation (the override itself is consumed by the proficiency resolver)' },
});

/** Relations that DECLARE an ability applicable to a weapon (mirrors of the ability's own scope; used by the census consistency check, never to widen a rule). */
export const APPLICABILITY_RELATIONS = Object.freeze(new Set([
  'EXPLICIT_WEAPON_BENEFIT', 'EXPLICIT_WEAPON_COMPATIBILITY', 'EXPLICIT_WEAPON_OPTION', 'EXPLICIT_WEAPON_FAMILY_MATCH', 'SUPPORTED',
  'UNLOCKS_DOUBLE_WEAPON_MODE', 'NAMED_DISCBLADE_DAMAGE_SYNERGY', 'NAMED_FIRA_ATTACK_BONUS_SYNERGY',
]));

const legacyKeys = (item) => {
  const full = normalizeToken(String(item?.name || item?.system?.slug || item?.slug || ''));
  const base = normalizeToken(String(item?.name || item?.system?.slug || item?.slug || '').replace(/\([^)]*\)/g, '').trim());
  return [...new Set([full, base].filter(Boolean))];
};

/** Does this owned ability carry the identity a relation names? Canonical identity decides; name only when the ability has none. */
export function abilityMatchesRelationKey(item, relationAbilityToken) {
  const canonical = canonicalFeatSlug(item);
  if (canonical !== null) return canonical === relationAbilityToken;
  return legacyKeys(item).includes(relationAbilityToken);
}

/** Relations the selected canonical form declares for this ability (empty for legacy weapons). */
export function relationsForAbility(weapon, item, context = {}, only = null) {
  const shape = shapeOfWeapon(weapon, canonicalSelectionFromContext(context));
  if (shape.source !== 'canonical') return [];
  return shape.abilityRelations.filter((r) => r.relation && (!only || only.has(r.relation)) && abilityMatchesRelationKey(item, r.abilityToken));
}

/** Does the canonical weapon explicitly declare this ability applicable to it? (SELECTOR/EXECUTION join) */
export const weaponDeclaresAbility = (weapon, item, context = {}) => relationsForAbility(weapon, item, context, APPLICABILITY_RELATIONS).length > 0;

/** Ability identity tokens a weapon form refuses to negate with (CANNOT_NEGATE_ATTACK), e.g. ['deflect', 'talents-with-deflect-as-prerequisite']. */
export function negationExclusions(weapon, context = {}) {
  const shape = shapeOfWeapon(weapon, canonicalSelectionFromContext(context));
  if (shape.source !== 'canonical') return null;
  return shape.abilityRelations.filter((r) => r.relation === 'CANNOT_NEGATE_ATTACK').map((r) => r.abilityToken);
}
