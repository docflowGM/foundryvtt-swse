import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";

let registered = false;

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === wanted);
}

function abilityScore(actor, ability) {
  const key = normalizeKey(ability).slice(0, 3);
  const aliases = key === 'str' ? ['str', 'strength'] : [key];
  for (const alias of aliases) {
    const candidates = [
      actor?.system?.abilities?.[alias]?.total,
      actor?.system?.abilities?.[alias]?.value,
      actor?.system?.attributes?.[alias]?.total,
      actor?.system?.attributes?.[alias]?.value,
      actor?.system?.derived?.abilities?.[alias]?.total,
      actor?.system?.derived?.attributes?.[alias]?.total
    ];
    for (const value of candidates) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return 10;
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.size,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ];
  return fields.map(normalizeKey).filter(Boolean).join(' ');
}

function isVehicleWeapon(weapon, context = {}) {
  if (context.vehicleWeapon === true || context.starshipWeapon === true || context.weaponSystem === true) return true;
  const system = weapon?.system ?? {};
  if (system.vehicleWeapon === true || system.starshipWeapon === true || system.weaponSystem === true) return true;
  const text = weaponText(weapon);
  return /vehicle-weapon|starship-weapon|weapon-system|turbolaser|laser-cannon|ion-cannon|proton-torpedo|concussion-missile/.test(text);
}

function isObjectOrVehicleTarget(context = {}) {
  if (context.targetIsObject === true || context.objectTarget === true || context.targetIsVehicle === true || context.vehicleTarget === true) return true;
  const target = context.target ?? context.targetActor ?? null;
  const system = target?.system ?? {};
  const text = [
    target?.type,
    target?.name,
    system.actorType,
    system.creatureType,
    system.vehicleType,
    system.details?.type,
    system.details?.creatureType
  ].map(normalizeKey).join(' ');
  return /object|vehicle|starship|droid-starfighter|speeder|walker/.test(text);
}

function isTwoHandedWeapon(weapon, context = {}) {
  if (context.twoHanded === true || context.wieldedTwoHanded === true) return true;
  const system = weapon?.system ?? {};
  if (system.twoHanded === true || system.isTwoHanded === true || system.wieldedTwoHanded === true) return true;
  const hands = Number(system.hands ?? system.handedness ?? system.weaponHands);
  if (Number.isFinite(hands) && hands >= 2) return true;
  const text = weaponText(weapon);
  return /two-handed|twohanded|two-hands|large/.test(text);
}

function isLightOrLightsaberWeapon(weapon) {
  const system = weapon?.system ?? {};
  if (system.light === true || system.isLight === true || system.isLightWeapon === true) return true;
  const text = weaponText(weapon);
  return text.includes('light')
    || text.includes('lightsaber')
    || text.includes('hold-out')
    || text.includes('knife')
    || text.includes('dagger');
}

function equippedWeapons(actor) {
  return actorItems(actor).filter(item => item?.type === 'weapon' && item?.system?.equipped === true);
}

function allEquippedWeaponsAllowFlurry(actor, weapon) {
  const weapons = equippedWeapons(actor);
  const relevant = weapons.length ? weapons : [weapon].filter(Boolean);
  return relevant.length > 0 && relevant.every(isLightOrLightsaberWeapon);
}

function selectedCombatValue(options = {}, id) {
  const combat = options.combatOptions ?? options.attackOptions ?? {};
  const value = combat?.[id];
  if (value === true) return 1;
  if (value === false || value === undefined || value === null || value === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function filterFlurryOption(options, actor, weapon) {
  if (!actorHasFeat(actor, 'flurry')) return options;
  if (allEquippedWeaponsAllowFlurry(actor, weapon)) return options;
  return options.filter(option => normalizeKey(option?.id ?? option?.key ?? option?.option ?? '') !== 'flurry');
}

function applyRapidShotStrengthPenalty(result, actor, weapon, options = {}) {
  if (!selectedCombatValue(options, 'rapidShot')) return;
  if (abilityScore(actor, 'strength') >= 13) return;
  if (isVehicleWeapon(weapon, options)) return;
  result.attackBonus = Number(result.attackBonus ?? 0) - 3;
  result.breakdown ??= [];
  result.breakdown.push({ label: 'Rapid Shot: Strength below 13', value: -3, type: 'attack' });
}

function applyPowerAttackEdgeCases(result, weapon, options = {}) {
  const value = selectedCombatValue(options, 'powerAttack');
  if (value <= 0) return;
  result.breakdown ??= [];
  if (isObjectOrVehicleTarget(options)) {
    result.damageBonus = Number(result.damageBonus ?? 0) - value;
    result.flags ??= {};
    result.flags['powerAttack.damageSuppressedVsObjectOrVehicle'] = true;
    result.breakdown.push({ label: 'Power Attack: no bonus damage vs object/vehicle', value: -value, type: 'damage' });
    return;
  }
  if (isTwoHandedWeapon(weapon, options)) {
    result.damageBonus = Number(result.damageBonus ?? 0) + value;
    result.flags ??= {};
    result.flags['powerAttack.twoHandedDamageApplied'] = true;
    result.breakdown.push({ label: 'Power Attack: two-handed damage', value, type: 'damage' });
  }
}

export function registerCoreAttackOptionRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalGetAvailableAttackOptions = CombatOptionResolver.getAvailableAttackOptions.bind(CombatOptionResolver);
  CombatOptionResolver.getAvailableAttackOptions = function patchedGetAvailableAttackOptions(actor, weapon, context = {}) {
    const options = originalGetAvailableAttackOptions(actor, weapon, context);
    return filterFlurryOption(options, actor, weapon);
  };

  const originalCollectAttackModifiers = CombatOptionResolver.collectAttackModifiers.bind(CombatOptionResolver);
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    const result = originalCollectAttackModifiers(actor, weapon, options);
    applyRapidShotStrengthPenalty(result, actor, weapon, options);
    applyPowerAttackEdgeCases(result, weapon, options);
    return result;
  };
}

export default registerCoreAttackOptionRuntimePatches;
