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
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function collectRules(actor, type) {
  const rules = [];
  for (const feat of actorItems(actor)) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    for (const rule of asArray(feat?.system?.abilityMeta?.rules)) {
      if (rule?.type !== type) continue;
      rules.push({ ...rule, sourceName: feat.name, sourceId: feat.id });
    }
  }
  return rules;
}

function optionActive(context = {}, id) {
  return contextAffirms(context[id])
    || contextAffirms(context.attackOptions?.[id])
    || contextAffirms(context.combatOptions?.[id])
    || asArray(context.selectedOptions).map(normalizeKey).includes(normalizeKey(id))
    || asArray(context.workflowContext?.selectedOptions).map(normalizeKey).includes(normalizeKey(id));
}

function selectedCombatValue(context = {}, id) {
  const value = context.combatOptions?.[id] ?? context.attackOptions?.[id] ?? context[id] ?? 0;
  if (value === true) return 1;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  return [
    context.weaponCategory,
    context.weaponType,
    context.weaponGroup,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.group,
    system.category,
    system.type,
    system.subtype,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function attackType(context = {}, weapon = null) {
  const raw = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  if (raw) return raw;
  const text = weaponText(weapon, context);
  if (/ranged|blaster|pistol|rifle|grenade|slugthrower|bowcaster/.test(text)) return 'ranged';
  if (/melee|lightsaber|vibro|unarmed|blade/.test(text)) return 'melee';
  return '';
}

function isAutofire(context = {}) {
  const mode = normalizeKey(context.attackMode ?? context.fireMode ?? context.workflowContext?.attackMode ?? context.workflowContext?.fireMode ?? '');
  return mode === 'autofire' || contextAffirms(context.autofire) || contextAffirms(context.workflowContext?.autofire);
}

function isAreaAttack(context = {}) {
  const mode = normalizeKey(context.attackMode ?? context.attackType ?? context.workflowContext?.attackMode ?? context.workflowContext?.attackType ?? '');
  return mode === 'area' || mode === 'area-attack' || contextAffirms(context.areaAttack) || contextAffirms(context.workflowContext?.areaAttack);
}

function isGrenadeLike(weapon, context = {}) {
  const text = weaponText(weapon, context);
  return /grenade|grenade-like|grenadelike|thermal-detonator|detonator/.test(text) || contextAffirms(context.grenadeAttack) || contextAffirms(context.workflowContext?.grenadeAttack);
}

function isRapidStrikeActive(context = {}) {
  return contextAffirms(context.rapidStrike) || contextAffirms(context.attackOptions?.rapidStrike) || contextAffirms(context.combatOptions?.rapidStrike) || contextAffirms(context.workflowContext?.rapidStrike);
}

function isDamagingHitContext(context = {}) {
  const hit = contextAffirms(context.hit) || contextAffirms(context.isHit) || contextAffirms(context.workflowContext?.hit) || contextAffirms(context.workflowContext?.isHit) || contextAffirms(context.damagedTarget);
  const damage = Number(context.damage ?? context.damageTotal ?? context.workflowContext?.damage ?? context.workflowContext?.damageTotal ?? 0) || 0;
  return hit && (damage > 0 || contextAffirms(context.damagedTarget) || contextAffirms(context.workflowContext?.damagedTarget));
}

function isMissContext(context = {}) {
  return contextAffirms(context.miss) || contextAffirms(context.isMiss) || context.hit === false || context.workflowContext?.hit === false;
}

function targetUnawareContext(context = {}) {
  return contextAffirms(context.targetUnawareOfYou) || contextAffirms(context.targetUnaware) || contextAffirms(context.workflowContext?.targetUnawareOfYou) || contextAffirms(context.workflowContext?.targetUnaware);
}

function firstAttackThisTurnContext(context = {}) {
  const explicit = context.firstAttackThisTurn ?? context.workflowContext?.firstAttackThisTurn;
  return explicit === undefined ? true : contextAffirms(explicit);
}

function resolveAngledThrowCoverOverride(actor, weapon, context = {}) {
  if (!actor || !isGrenadeLike(weapon, context) || !optionActive(context, 'angledThrow')) return null;
  const attackTotal = Number(context.attackTotal ?? context.attackRollTotal ?? context.workflowContext?.attackTotal ?? context.workflowContext?.attackRollTotal ?? 0) || 0;
  const rule = collectRules(actor, 'ATTACK_OPTION').find(r => r.id === 'angledThrow');
  const threshold = Number(rule?.coverOverrideAfterRoll?.requiresAttackTotalExceedsReflex ?? 15) || 15;
  if (attackTotal <= threshold) return null;
  return {
    id: 'angledThrowCoverOverride',
    source: 'Angled Throw',
    type: 'coverOverrideAfterRoll',
    ignoreCoverTypes: ['cover', 'improvedCover'],
    doesNotIgnore: ['totalCover'],
    threshold,
    attackTotal,
    note: rule?.coverOverrideAfterRoll?.note ?? rule?.summary,
    rule
  };
}

function getAutofireDamageRiders(actor, context = {}) {
  if (!actor || !isAutofire(context) || !isDamagingHitContext(context)) return [];
  return collectRules(actor, 'AUTOFIRE_DAMAGE_RIDER').flatMap(rule => asArray(rule.targetEffectsOnDamage).map(effect => ({
    id: `${rule.id}-${effect.type ?? 'effect'}`,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: effect.type,
    bonus: effect.bonus,
    bonusType: effect.bonusType,
    duration: effect.duration,
    targetScoped: effect.targetScoped === true,
    appliesTo: effect.appliesTo,
    rule,
    effect
  })));
}

function getSoftCoverMissRiders(actor, weapon, context = {}) {
  if (!actor || attackType(context, weapon) !== 'ranged' || !isMissContext(context)) return [];
  const hasSoftCover = contextAffirms(context.targetHasSoftCover) || contextAffirms(context.softCover) || contextAffirms(context.workflowContext?.targetHasSoftCover) || contextAffirms(context.workflowContext?.softCover);
  if (!hasSoftCover) return [];
  return collectRules(actor, 'MISS_RIDER').filter(rule => rule.id === 'crossfireSoftCoverProviderAttack').flatMap(rule => asArray(rule.targetEffectsOnMiss).map(effect => ({
    id: `${rule.id}-${effect.type ?? 'effect'}`,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: effect.type,
    oncePer: rule.oncePer ?? 'round',
    sameWeapon: effect.sameWeapon === true,
    sameAttackBonus: effect.sameAttackBonus === true,
    target: effect.target,
    timing: effect.timing,
    rule,
    effect
  })));
}

function getMissRerollResources(actor, context = {}) {
  if (!actor || !isMissContext(context)) return [];
  return collectRules(actor, 'MISS_REROLL_RESOURCE').map(rule => ({
    id: rule.id,
    key: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'missRerollResource',
    oncePer: rule.oncePer ?? 'turn',
    keep: rule.keep ?? 'second',
    canUseOnNaturalOne: rule.canUseOnNaturalOne === true,
    defensePenaltyOnUse: rule.defensePenaltyOnUse,
    naturalOne: Number(context.d20 ?? context.naturalRoll ?? context.workflowContext?.d20 ?? 0) === 1,
    rule
  }));
}

function getRapidStrikeHitRiders(actor, weapon, context = {}) {
  if (!actor || attackType(context, weapon) !== 'melee' || !isRapidStrikeActive(context) || !isDamagingHitContext(context) || isAreaAttack(context)) return [];
  return collectRules(actor, 'HIT_RIDER').filter(rule => rule.id === 'wickedStrikeRapidStrikeSecondaryAttack').flatMap(rule => asArray(rule.targetEffectsOnHit).map(effect => ({
    id: `${rule.id}-${effect.type ?? 'effect'}`,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: effect.type,
    oncePer: rule.oncePer ?? 'turn',
    attackPenalty: effect.attackPenalty,
    target: effect.target,
    damage: effect.damage,
    timing: effect.timing,
    rule,
    effect
  })));
}

function applyDeadlySniper(result, actor, weapon, context = {}) {
  if (!actor || attackType(context, weapon) !== 'ranged' || !targetUnawareContext(context) || !firstAttackThisTurnContext(context)) return;
  const hasRule = collectRules(actor, 'ATTACK_OPTION').some(rule => rule.id === 'deadlySniper');
  if (!hasRule) return;
  result.attackBonus = Number(result.attackBonus ?? 0) + 2;
  result.damageExtraWeaponDice = Number(result.damageExtraWeaponDice ?? 0) + 1;
  result.damageDiceStepBonus = Number(result.damageDiceStepBonus ?? 0) + 1;
  result.flags ??= {};
  result.flags.deadlySniper = true;
  result.breakdown ??= [];
  result.breakdown.push({ label: 'Deadly Sniper', value: 2, type: 'attack' });
  result.breakdown.push({ label: 'Deadly Sniper', value: 1, type: 'damageExtraWeaponDice' });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseForceScoundrelCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedForceScoundrelCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        applyDeadlySniper(result, actor, weapon, options);
        const coverOverride = resolveAngledThrowCoverOverride(actor, weapon, options);
        if (coverOverride) {
          result.coverOverrides ??= [];
          result.coverOverrides.push(coverOverride);
          result.flags ??= {};
          result.flags.angledThrowCoverOverride = true;
        }
        const autofireRiders = getAutofireDamageRiders(actor, options);
        if (autofireRiders.length) result.autofireDamageRiders = asArray(result.autofireDamageRiders).concat(autofireRiders);
        const softCoverRiders = getSoftCoverMissRiders(actor, weapon, options);
        if (softCoverRiders.length) result.missRiders = asArray(result.missRiders).concat(softCoverRiders);
        const rerolls = getMissRerollResources(actor, options);
        if (rerolls.length) result.attackRerollResources = asArray(result.attackRerollResources).concat(rerolls);
        const rapidHitRiders = getRapidStrikeHitRiders(actor, weapon, options);
        if (rapidHitRiders.length) result.hitRiders = asArray(result.hitRiders).concat(rapidHitRiders);
      } catch (err) {
        SWSELogger.warn('[ForceScoundrelCombatRuntime] Failed to collect combat feat riders', { error: err });
      }
      return result;
    };
  }

  CombatOptionResolver.resolveAngledThrowCoverOverride = resolveAngledThrowCoverOverride;
  CombatOptionResolver.getAutofireDamageRiders = getAutofireDamageRiders;
  CombatOptionResolver.getSoftCoverMissRiders = getSoftCoverMissRiders;
  CombatOptionResolver.getMissRerollResources = getMissRerollResources;
  CombatOptionResolver.getRapidStrikeHitRiders = getRapidStrikeHitRiders;
  CombatOptionResolver.__swseForceScoundrelCombatRuntimePatched = true;
}

export function registerForceScoundrelCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.resolveAngledThrowCoverOverride = resolveAngledThrowCoverOverride;
  game.swse.feats.getAutofireDamageRiders = getAutofireDamageRiders;
  game.swse.feats.getSoftCoverMissRiders = getSoftCoverMissRiders;
  game.swse.feats.getMissRerollResources = getMissRerollResources;
  game.swse.feats.getRapidStrikeHitRiders = getRapidStrikeHitRiders;
  SWSELogger.log('[ForceScoundrelCombatRuntime] Runtime helpers registered');
}

export {
  resolveAngledThrowCoverOverride,
  getAutofireDamageRiders,
  getSoftCoverMissRiders,
  getMissRerollResources,
  getRapidStrikeHitRiders
};

export default registerForceScoundrelCombatRuntimePatches;
