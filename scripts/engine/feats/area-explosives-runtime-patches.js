import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function getRules(item) {
  return asArray(item?.system?.abilityMeta?.rules);
}

function collectRules(actor, type) {
  const rules = [];
  for (const feat of actorItems(actor)) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    for (const rule of getRules(feat)) {
      if (rule?.type !== type) continue;
      rules.push({ ...rule, sourceName: feat.name, sourceId: feat.id });
    }
  }
  return rules;
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isAutofireContext(context = {}) {
  const mode = normalizeKey(context.attackMode ?? context.fireMode ?? context.workflowContext?.attackMode ?? context.workflowContext?.fireMode ?? '');
  return mode === 'autofire'
    || contextAffirms(context.autofire)
    || contextAffirms(context.weaponSetToAutofire)
    || contextAffirms(context.workflowContext?.autofire)
    || contextAffirms(context.workflowContext?.weaponSetToAutofire);
}

function isAreaAttackContext(context = {}) {
  const mode = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  return mode === 'area' || mode === 'area-attack'
    || contextAffirms(context.areaAttack)
    || contextAffirms(context.workflowContext?.areaAttack);
}

function isGrenadeContext(context = {}) {
  const type = normalizeKey(context.weaponCategory ?? context.weaponType ?? context.attackType ?? context.workflowContext?.weaponCategory ?? context.workflowContext?.weaponType ?? '');
  return ['grenade', 'thermal-detonator', 'thermaldetonator'].includes(type)
    || contextAffirms(context.grenadeAttack)
    || contextAffirms(context.workflowContext?.grenadeAttack);
}

function isDamagingHitContext(context = {}) {
  const hit = contextAffirms(context.hit) || contextAffirms(context.isHit) || contextAffirms(context.workflowContext?.hit) || contextAffirms(context.workflowContext?.isHit);
  const damage = numeric(context.damage ?? context.damageTotal ?? context.workflowContext?.damage ?? context.workflowContext?.damageTotal, 0);
  return hit && damage > 0;
}

function isWeaponProficientContext(context = {}) {
  const explicit = context.weaponProficient ?? context.isWeaponProficient ?? context.workflowContext?.weaponProficient ?? context.workflowContext?.isWeaponProficient;
  return explicit === undefined ? true : contextAffirms(explicit);
}

function getAttackTotal(context = {}) {
  return numeric(context.attackTotal ?? context.attackRollTotal ?? context.workflowContext?.attackTotal ?? context.workflowContext?.attackRollTotal, 0);
}

function getTargetDefense(context = {}, defenseKey = 'fortitude') {
  const key = normalizeKey(defenseKey);
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  return numeric(
    context.targetDefense?.[key]
      ?? context.workflowContext?.targetDefense?.[key]
      ?? target?.system?.defenses?.[key]?.value
      ?? target?.system?.derived?.defenses?.[key]
      ?? target?.system?.defense?.[key]
      ?? 0,
    0
  );
}

function getTargetSizeRank(context = {}) {
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  const size = normalizeKey(context.targetSize ?? context.workflowContext?.targetSize ?? target?.system?.details?.size ?? target?.system?.size ?? '');
  const ranks = { fine: 0, diminutive: 1, tiny: 2, small: 3, medium: 4, large: 5, huge: 6, gargantuan: 7, colossal: 8 };
  return ranks[size] ?? null;
}

function targetIsGrabbedOrGrappled(context = {}) {
  return contextAffirms(context.targetGrabbed)
    || contextAffirms(context.targetGrappled)
    || contextAffirms(context.workflowContext?.targetGrabbed)
    || contextAffirms(context.workflowContext?.targetGrappled);
}

function targetEligibleForForcedMovement(rule, context = {}) {
  const maxSize = normalizeKey(rule?.targetEligibility?.maxSize ?? 'large');
  const ranks = { fine: 0, diminutive: 1, tiny: 2, small: 3, medium: 4, large: 5, huge: 6, gargantuan: 7, colossal: 8 };
  const targetRank = getTargetSizeRank(context);
  const maxRank = ranks[maxSize] ?? 5;
  if (targetRank !== null && targetRank > maxRank) return false;
  if (targetIsGrabbedOrGrappled(context)) return false;
  return true;
}

function resolveAutofireShapeMutations(actor, context = {}) {
  if (!actor || !isAutofireContext(context)) return [];
  return collectRules(actor, 'AUTOFIRE_SHAPE_MUTATION').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'autofireShapeMutation',
    selectable: rule.shapeMutation?.playerSelectable === true,
    from: rule.shapeMutation?.from,
    to: rule.shapeMutation?.to,
    jetPackSpecial: rule.shapeMutation?.jetPackSpecial,
    advisoryOnly: rule.shapeMutation?.advisoryOnly === true,
    note: rule.shapeMutation?.note ?? rule.summary,
    rule
  }));
}

function resolveAutofireTargetDefenseRiders(actor, context = {}) {
  if (!actor || !isAutofireContext(context) || !isAreaAttackContext(context) || !isWeaponProficientContext(context)) return [];
  return collectRules(actor, 'AUTOFIRE_TARGET_DEFENSE_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'targetDefenseMutation',
    defense: rule.targetDefenseMutation?.defense ?? 'reflex',
    removeDodgeBonuses: rule.targetDefenseMutation?.removeDodgeBonuses === true,
    removeDeflectionBonuses: rule.targetDefenseMutation?.removeDeflectionBonuses === true,
    appliesToAllTargetsInArea: rule.targetDefenseMutation?.appliesToAllTargetsInArea === true,
    appliesToThisAttackOnly: rule.targetDefenseMutation?.appliesToThisAttackOnly !== false,
    advisoryOnly: rule.targetDefenseMutation?.advisoryOnly !== false,
    note: rule.targetDefenseMutation?.note ?? rule.summary,
    rule
  }));
}

function resolveGrenadeDamageRiders(actor, context = {}) {
  if (!actor || !isGrenadeContext(context) || !isDamagingHitContext(context)) return [];
  const attackTotal = getAttackTotal(context);
  return collectRules(actor, 'GRENADE_DAMAGE_RIDER').flatMap(rule => {
    if (!targetEligibleForForcedMovement(rule, context)) return [];
    const defenseKey = String(rule.compareAttackRollToDefense ?? '').trim();
    if (defenseKey) {
      const targetDefense = getTargetDefense(context, defenseKey);
      if (!targetDefense || attackTotal < targetDefense) return [];
    }
    return asArray(rule.targetEffectsOnDamage).map(effect => ({
      id: `${rule.id}-${effect.type ?? 'effect'}`,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: effect.type,
      advisoryOnly: effect.advisoryOnly !== false,
      distanceSquares: effect.distanceSquares,
      direction: effect.direction,
      actionTiming: effect.actionTiming,
      restrictions: effect.restrictions,
      supportsMultipleEligibleTargets: rule.supportsMultipleEligibleTargets === true,
      note: effect.note ?? rule.summary,
      rule,
      effect
    }));
  });
}

function getSpecialAreaAttackActions(actor) {
  return collectRules(actor, 'SPECIAL_AREA_ATTACK_ACTION').map(rule => ({
    id: rule.actionId ?? rule.id,
    key: rule.actionId ?? rule.id,
    label: rule.label,
    name: rule.label,
    source: rule.sourceName ?? rule.source ?? rule.label,
    actionType: rule.actionEconomy?.type ?? 'full-round',
    actionCost: rule.actionEconomy?.type ?? 'full-round',
    type: 'specialAreaAttackAction',
    requiresAttackType: rule.requiresAttackType,
    areaAttack: rule.areaAttack,
    prerequisites: rule.prerequisites,
    advisoryOnly: rule.areaAttack?.advisoryOnly !== false,
    note: rule.areaAttack?.note ?? rule.summary,
    rule
  }));
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseAreaExplosivesRuntimePatched === true) return;
  CombatOptionResolver.resolveAutofireShapeMutations = resolveAutofireShapeMutations;
  CombatOptionResolver.resolveAutofireTargetDefenseRiders = resolveAutofireTargetDefenseRiders;
  CombatOptionResolver.resolveGrenadeDamageRiders = resolveGrenadeDamageRiders;
  CombatOptionResolver.getSpecialAreaAttackActions = getSpecialAreaAttackActions;
  CombatOptionResolver.__swseAreaExplosivesRuntimePatched = true;
}

export function registerAreaExplosivesRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.resolveAutofireShapeMutations = resolveAutofireShapeMutations;
  game.swse.feats.resolveAutofireTargetDefenseRiders = resolveAutofireTargetDefenseRiders;
  game.swse.feats.resolveGrenadeDamageRiders = resolveGrenadeDamageRiders;
  game.swse.feats.getSpecialAreaAttackActions = getSpecialAreaAttackActions;
  SWSELogger.log('[AreaExplosivesRuntime] Runtime helpers registered');
}

Hooks.once('ready', () => registerAreaExplosivesRuntimePatches());

export {
  resolveAutofireShapeMutations,
  resolveAutofireTargetDefenseRiders,
  resolveGrenadeDamageRiders,
  getSpecialAreaAttackActions
};

export default registerAreaExplosivesRuntimePatches;
