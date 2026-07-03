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

function targetHasNotActed(context = {}) {
  if (context.targetNotActedInCombat === true || context.targetHasNotActed === true || context.targetNotActed === true) return true;
  if (context.flatFootedTarget === true || context.targetFlatFooted === true || context.deniedDexBonus === true) return true;
  const flags = new Set([
    ...(Array.isArray(context.flags) ? context.flags : []),
    ...(Array.isArray(context.contextFlags) ? context.contextFlags : [])
  ].map(String));
  return flags.has('targetNotActedInCombat') || flags.has('targetHasNotActed') || flags.has('targetNotActed');
}

function applyPistoleer(result, actor, weapon, context = {}) {
  if (!actor || !weapon || !isPistolAttack(weapon, context)) return result;
  const text = weaponText(weapon);
  const hasFeat = actorHasPistoleer(actor);
  const hasRule = hasPistoleerRule(actor, 'WEAPON_ATTACK_BONUS') || hasPistoleerRule(actor, 'WEAPON_PROPERTY_OVERRIDE');
  if (!hasFeat && !hasRule) return result;

  if (text.includes('blaster-pistol') && !text.includes('heavy-blaster-pistol') && !text.includes('hold-out-blaster-pistol')) {
    result.flags ??= {};
    result.flags['weaponProperty.accurate'] = true;
    result.breakdown ??= [];
    result.breakdown.push({ label: 'Pistoleer: Blaster Pistol Accurate', value: 0, type: 'weaponProperty' });
  }

  if (text.includes('heavy-blaster-pistol')) {
    result.flags ??= {};
    result.flags['weaponProperty.inaccurate'] = false;
    result.breakdown ??= [];
    result.breakdown.push({ label: 'Pistoleer: Heavy Blaster Pistol Not Inaccurate', value: 0, type: 'weaponProperty' });
  }

  if (text.includes('hold-out-blaster-pistol') && targetHasNotActed(context)) {
    result.attackBonus = Number(result.attackBonus ?? 0) + 2;
    result.breakdown ??= [];
    result.breakdown.push({ label: 'Pistoleer: Hold-Out Blaster Opening Shot', value: 2, type: 'attack' });
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
