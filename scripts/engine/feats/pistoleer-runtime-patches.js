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

function actorHasPistoleer(actor) {
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === 'pistoleer');
}

function hasPistoleerRule(actor, ruleType) {
  return actorItems(actor).some(item => {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) return false;
    const rules = item?.system?.abilityMeta?.rules;
    return Array.isArray(rules) && rules.some(rule => rule?.type === ruleType && String(rule?.source ?? '').toLowerCase() === 'pistoleer');
  });
}

function isPistolAttack(weapon, context = {}) {
  const explicit = normalizeKey(context.attackType ?? context.rangeType ?? context.weaponType ?? '');
  if (explicit && explicit !== 'ranged') return false;
  const text = weaponText(weapon);
  return text.includes('pistol') || text.includes('hold-out-blaster') || text.includes('heavy-blaster');
}

function rangeBand(context = {}) {
  const key = normalizeKey(context.rangeBand ?? context.rangeCategory ?? context.range ?? '');
  if (key === 'pointblank' || key === 'point-blank' || key === 'close') return 'point-blank';
  return key;
}

function targetHasNotActed(context = {}) {
  if (context.targetNotActedInCombat === true || context.targetHasNotActed === true || context.targetNotActed === true) return true;
  if (context.flatFootedTarget === true || context.targetFlatFooted === true || context.deniedDexBonus === true) return true;
  const flags = new Set([
    ...(Array.isArray(context.flags) ? context.flags : []),
    ...(Array.isArray(context.contextFlags) ? context.contextFlags : [])
  ].map(String));
  return flags.has('targetNotActedInCombat') || flags.has('targetHasNotActed') || flags.has('targetNotActed');
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

function applyPistoleer(result, actor, weapon, context = {}) {
  if (!actor || !weapon || !isPistolAttack(weapon, context)) return result;
  const text = weaponText(weapon);
  const hasFeat = actorHasPistoleer(actor);
  const hasRule = hasPistoleerRule(actor, 'WEAPON_ATTACK_BONUS') || hasPistoleerRule(actor, 'WEAPON_PROPERTY_OVERRIDE');
  if (!hasFeat && !hasRule) return result;

  result.flags ??= {};

  const regularBlasterPistol = text.includes('blaster-pistol')
    && !text.includes('heavy-blaster-pistol')
    && !text.includes('hold-out-blaster-pistol');

  // Correct any generic metadata over-match from "blaster-pistol" text rules.
  if (!regularBlasterPistol && result.flags['weaponProperty.accurate'] === true) {
    delete result.flags['weaponProperty.accurate'];
  }

  if (regularBlasterPistol) {
    result.flags['weaponProperty.accurate'] = true;
    addBreakdown(result, 'Pistoleer: Blaster Pistol Accurate', 0, 'weaponProperty');
    applyAccurateShortRangeBonus(result, context, 'Pistoleer: Accurate Short Range');
  }

  if (text.includes('heavy-blaster-pistol')) {
    result.flags['weaponProperty.inaccurate'] = false;
    result.flags.inaccurateSuppressed = true;
    addBreakdown(result, 'Pistoleer: Heavy Blaster Pistol Not Inaccurate', 0, 'weaponProperty');
  }

  if (text.includes('hold-out-blaster-pistol') && targetHasNotActed(context)) {
    addAttackBonus(result, 2, 'Pistoleer: Hold-Out Blaster Opening Shot');
  }

  return result;
}

export function registerPistoleerRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalCollectAttackModifiers = CombatOptionResolver.collectAttackModifiers.bind(CombatOptionResolver);
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    const result = originalCollectAttackModifiers(actor, weapon, options);
    return applyPistoleer(result, actor, weapon, options);
  };
}

export default registerPistoleerRuntimePatches;
