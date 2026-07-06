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

function weaponCategoryText(context = {}) {
  return [
    context.weaponCategory,
    context.weaponType,
    context.damageType,
    context.areaType,
    context.workflowContext?.weaponCategory,
    context.workflowContext?.weaponType,
    context.workflowContext?.damageType,
    context.workflowContext?.areaType,
    context.weapon?.name,
    context.weapon?.system?.weaponType,
    context.weapon?.system?.weaponGroup,
    context.weapon?.system?.category,
    context.weapon?.system?.type,
    context.weapon?.system?.subtype,
    Array.isArray(context.weapon?.system?.traits) ? context.weapon.system.traits.join(' ') : context.weapon?.system?.traits,
    Array.isArray(context.weapon?.system?.properties) ? context.weapon.system.properties.join(' ') : context.weapon?.system?.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function isBurstOrSplashContext(context = {}) {
  const text = weaponCategoryText(context);
  return text.includes('burst') || text.includes('splash') || contextAffirms(context.burstWeapon) || contextAffirms(context.splashWeapon) || contextAffirms(context.workflowContext?.burstWeapon) || contextAffirms(context.workflowContext?.splashWeapon);
}

function isBeyondPointBlankContext(context = {}) {
  const band = normalizeKey(context.rangeBand ?? context.rangeCategory ?? context.range ?? context.workflowContext?.rangeBand ?? context.workflowContext?.rangeCategory ?? context.workflowContext?.range ?? '');
  if (!band) return false;
  return band !== 'point-blank' && band !== 'pointblank' && band !== 'close';
}

function isGrenadeContext(context = {}) {
  const type = normalizeKey(context.weaponCategory ?? context.weaponType ?? context.attackType ?? context.workflowContext?.weaponCategory ?? context.workflowContext?.weaponType ?? '');
  return ['grenade', 'thermal-detonator', 'thermaldetonator'].includes(type)
    || contextAffirms(context.grenadeAttack)
    || contextAffirms(context.workflowContext?.grenadeAttack);
}

function isDamagingHitContext(context = {}) {
  const hit = contextAffirms(context.hit) || contextAffirms(context.isHit) || contextAffirms(context.workflowContext?.hit) || contextAffirms(context.workflowContext?.isHit) || contextAffirms(context.damagedTarget) || contextAffirms(context.workflowContext?.damagedTarget);
  const damage = numeric(context.damage ?? context.damageTotal ?? context.workflowContext?.damage ?? context.workflowContext?.damageTotal, 0);
  return hit && (damage > 0 || contextAffirms(context.damagedTarget) || contextAffirms(context.workflowContext?.damagedTarget));
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

function resolveAreaTemplateMutations(actor, context = {}) {
  if (!actor || !isAreaAttackContext(context) || !isWeaponProficientContext(context)) return [];
  return collectRules(actor, 'AREA_ATTACK_TEMPLATE_MUTATION').flatMap(rule => {
    if (rule.requiresBurstOrSplashWeapon && !isBurstOrSplashContext(context)) return [];
    if (rule.requiresBeyondPointBlankRange && !isBeyondPointBlankContext(context)) return [];
    const mutation = rule.areaTemplateMutation ?? {};
    return [{
      id: rule.id,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'areaTemplateMutation',
      addAdjacentSquares: mutation.addAdjacentSquares ?? 0,
      targetSelection: mutation.targetSelection,
      appliesToBurst: mutation.appliesToBurst === true,
      appliesToSplash: mutation.appliesToSplash === true,
      advisoryOnly: mutation.advisoryOnly === true,
      canvasAutomation: mutation.canvasAutomation === true,
      note: mutation.note ?? rule.summary,
      rule
    }];
  });
}

function resolveAreaDamageRiders(actor, context = {}) {
  if (!actor || !isAreaAttackContext(context) || !isDamagingHitContext(context)) return [];
  return collectRules(actor, 'AREA_DAMAGE_RIDER').flatMap(rule => {
    if (rule.requiresBurstOrSplashWeapon && !isBurstOrSplashContext(context)) return [];
    return asArray(rule.targetEffectsOnDamage).map(effect => ({
      id: `${rule.id}-${effect.type ?? 'effect'}`,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: effect.type,
      advisoryOnly: effect.advisoryOnly !== false,
      targetScoped: effect.targetScoped === true,
      appliesAgainstDamagedTargetOnly: effect.appliesAgainstDamagedTargetOnly === true,
      duration: effect.duration,
      concealment: effect.concealment === true,
      note: effect.note ?? rule.summary,
      rule,
      effect
    }));
  });
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
    advisoryOnly: rule.targetDefenseMutation?.advisoryOnly === true,
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
  CombatOptionResolver.resolveAreaTemplateMutations = resolveAreaTemplateMutations;
  CombatOptionResolver.resolveAreaDamageRiders = resolveAreaDamageRiders;
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
  game.swse.feats.resolveAreaTemplateMutations = resolveAreaTemplateMutations;
  game.swse.feats.resolveAreaDamageRiders = resolveAreaDamageRiders;
  game.swse.feats.resolveAutofireTargetDefenseRiders = resolveAutofireTargetDefenseRiders;
  game.swse.feats.resolveGrenadeDamageRiders = resolveGrenadeDamageRiders;
  game.swse.feats.getSpecialAreaAttackActions = getSpecialAreaAttackActions;
  SWSELogger.log('[AreaExplosivesRuntime] Runtime helpers registered');
}

Hooks.once('ready', () => registerAreaExplosivesRuntimePatches());

export {
  resolveAutofireShapeMutations,
  resolveAreaTemplateMutations,
  resolveAreaDamageRiders,
  resolveAutofireTargetDefenseRiders,
  resolveGrenadeDamageRiders,
  getSpecialAreaAttackActions
};

export default registerAreaExplosivesRuntimePatches;
