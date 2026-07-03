import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";

let registered = false;

function normalizeKey(value) {
  return String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.itemType,
    system.sourceType,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ];
  return fields.map(normalizeKey).filter(Boolean).join(' ');
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorHasRiflemaster(actor) {
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === 'riflemaster');
}

function hasRiflemasterRule(actor, ruleType) {
  return actorItems(actor).some(item => {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) return false;
    const rules = item?.system?.abilityMeta?.rules;
    return Array.isArray(rules) && rules.some(rule => rule?.type === ruleType && String(rule?.source ?? '').toLowerCase() === 'riflemaster');
  });
}

function isRifleAttack(weapon, context = {}) {
  const explicit = normalizeKey(context.attackType ?? context.rangeType ?? context.weaponType ?? '');
  if (explicit && explicit !== 'ranged') return false;
  const text = weaponText(weapon);
  return text.includes('rifle') || text.includes('carbine') || text.includes('light-repeating-blaster');
}

function rangeBand(context = {}) {
  const key = normalizeKey(context.rangeBand ?? context.rangeCategory ?? context.range ?? '');
  if (key === 'pointblank' || key === 'point-blank' || key === 'close') return 'point-blank';
  return key;
}

function addBreakdown(result, label, value, type) {
  result.breakdown ??= [];
  if (!result.breakdown.some(entry => entry?.label === label && entry?.type === type)) {
    result.breakdown.push({ label, value, type });
  }
}

function addAttackBonus(result, value, label) {
  result.attackBonus = Number(result.attackBonus ?? 0) + value;
  addBreakdown(result, label, value, 'attack');
}

function applyAccurateShortRangeBonus(result, context, label) {
  if (rangeBand(context) !== 'short') return;
  if (result.flags?.[`swse.${label}.shortRangeBonusApplied`] === true) return;
  result.flags ??= {};
  result.flags[`swse.${label}.shortRangeBonusApplied`] = true;
  addAttackBonus(result, 2, label);
}

function applyRiflemaster(result, actor, weapon, context = {}) {
  if (!actor || !weapon || !isRifleAttack(weapon, context)) return result;
  const text = weaponText(weapon);
  const hasFeat = actorHasRiflemaster(actor);
  const hasRule = hasRiflemasterRule(actor, 'WEAPON_PROPERTY_OVERRIDE')
    || hasRiflemasterRule(actor, 'BRACE_AUTOFIRE_ALLOWED')
    || hasRiflemasterRule(actor, 'WEAPON_DAMAGE_DIE_SIZE_STEP')
    || hasRiflemasterRule(actor, 'EFFECTIVE_WEAPON_SIZE');
  if (!hasFeat && !hasRule) return result;

  result.flags ??= {};

  const blasterRifle = text.includes('blaster-rifle') && !text.includes('heavy-blaster-rifle');
  if (blasterRifle) {
    result.flags['weaponProperty.accurate'] = true;
    addBreakdown(result, 'Riflemaster: Blaster Rifle Accurate', 0, 'weaponProperty');
    applyAccurateShortRangeBonus(result, context, 'Riflemaster: Accurate Short Range');
  }

  if (text.includes('blaster-carbine')) {
    result.flags.braceAutofireAllowed = true;
    result.flags['weaponProperty.braceAutofireAllowed'] = true;
    addBreakdown(result, 'Riflemaster: Blaster Carbine Autofire Brace', 0, 'braceAutofireAllowed');
  }

  if (text.includes('light-repeating-blaster')) {
    result.flags.effectiveWeaponSize = 'medium';
    result.flags['weaponProperty.effectiveSize'] = 'medium';
    addBreakdown(result, 'Riflemaster: Light Repeating Blaster Medium Size', 0, 'effectiveWeaponSize');
  }

  return result;
}

export function registerRiflemasterRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalCollectAttackModifiers = CombatOptionResolver.collectAttackModifiers.bind(CombatOptionResolver);
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    const result = originalCollectAttackModifiers(actor, weapon, options);
    return applyRiflemaster(result, actor, weapon, options);
  };
}

export default registerRiflemasterRuntimePatches;
