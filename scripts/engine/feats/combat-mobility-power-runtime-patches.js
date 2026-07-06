import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

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

function selectedCombatValue(options = {}, id) {
  const combat = options.combatOptions ?? options.attackOptions ?? {};
  const value = combat?.[id] ?? options?.[id];
  if (value === true) return 1;
  if (value === false || value === undefined || value === null || value === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  const fields = [
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
  ];
  return fields.map(normalizeKey).filter(Boolean).join(' ');
}

function isVehicleWeapon(weapon, context = {}) {
  if (contextAffirms(context.vehicleWeapon) || contextAffirms(context.starshipWeapon) || contextAffirms(context.weaponSystem)) return true;
  const system = weapon?.system ?? {};
  if (system.vehicleWeapon === true || system.starshipWeapon === true || system.weaponSystem === true) return true;
  return /vehicle-weapon|starship-weapon|weapon-system|turbolaser|laser-cannon|ion-cannon|proton-torpedo|concussion-missile/.test(weaponText(weapon, context));
}

function isObjectOrVehicleTarget(context = {}) {
  if (contextAffirms(context.targetIsObject) || contextAffirms(context.objectTarget) || contextAffirms(context.targetIsVehicle) || contextAffirms(context.vehicleTarget)) return true;
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
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

function isAreaAttack(context = {}) {
  const mode = normalizeKey(context.attackMode ?? context.attackType ?? context.workflowContext?.attackMode ?? context.workflowContext?.attackType ?? '');
  return mode === 'area' || mode === 'area-attack' || contextAffirms(context.areaAttack) || contextAffirms(context.workflowContext?.areaAttack);
}

function optionId(option = {}) {
  return normalizeKey(option.id ?? option.key ?? option.option ?? option.name ?? '');
}

function hasTumbleTargetContext(context = {}) {
  return contextAffirms(context.successfulTumbleAvoidedOpportunityAttack)
    || contextAffirms(context.workflowContext?.successfulTumbleAvoidedOpportunityAttack)
    || contextAffirms(context.acrobaticStrikeAvailable)
    || contextAffirms(context.workflowContext?.acrobaticStrikeAvailable);
}

function hasMomentumContext(context = {}) {
  const mounted = contextAffirms(context.ridingMount)
    || contextAffirms(context.mounted)
    || contextAffirms(context.speederBike)
    || contextAffirms(context.onSpeederBike)
    || contextAffirms(context.workflowContext?.ridingMount)
    || contextAffirms(context.workflowContext?.mounted)
    || contextAffirms(context.workflowContext?.speederBike)
    || contextAffirms(context.workflowContext?.onSpeederBike);
  const moved = contextAffirms(context.mountOrVehicleMovedAtLeastSpeed)
    || contextAffirms(context.movedAtLeastMountSpeed)
    || contextAffirms(context.workflowContext?.mountOrVehicleMovedAtLeastSpeed)
    || contextAffirms(context.workflowContext?.movedAtLeastMountSpeed);
  return mounted && moved;
}

function filterContextualOptions(options = [], context = {}) {
  return options.filter(option => {
    const id = optionId(option);
    if (id === 'acrobatic-strike') return hasTumbleTargetContext(context);
    if (id === 'momentum-strike') return hasMomentumContext(context);
    return true;
  });
}

function applyPowerBlastEdgeCases(result, actor, weapon, context = {}) {
  const value = selectedCombatValue(context, 'powerBlast');
  if (value <= 0) return;
  result.breakdown ??= [];
  if (isAreaAttack(context) || isObjectOrVehicleTarget(context)) {
    result.damageBonus = Number(result.damageBonus ?? 0) - value;
    result.flags ??= {};
    result.flags['powerBlast.damageSuppressed'] = true;
    result.breakdown.push({ label: 'Power Blast: no bonus damage for area/object/vehicle', value: -value, type: 'damage' });
  }
  if (abilityScore(actor, 'strength') < 13 && !isVehicleWeapon(weapon, context)) {
    result.attackBonus = Number(result.attackBonus ?? 0) - 5;
    result.flags ??= {};
    result.flags['powerBlast.strengthPenaltyApplied'] = true;
    result.breakdown.push({ label: 'Power Blast: Strength below 13 with non-vehicle weapon', value: -5, type: 'attack' });
  }
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseCombatMobilityPowerRuntimePatched === true) return;

  const originalGetAvailableAttackOptions = CombatOptionResolver.getAvailableAttackOptions?.bind(CombatOptionResolver);
  if (typeof originalGetAvailableAttackOptions === 'function') {
    CombatOptionResolver.getAvailableAttackOptions = function patchedCombatMobilityGetOptions(actor, weapon, context = {}) {
      const options = originalGetAvailableAttackOptions(actor, weapon, context) ?? [];
      return filterContextualOptions(options, context);
    };
  }

  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedCombatMobilityCollect(actor, weapon, context = {}) {
      const result = originalCollect(actor, weapon, context) ?? {};
      try {
        applyPowerBlastEdgeCases(result, actor, weapon, context);
      } catch (err) {
        SWSELogger.warn('[CombatMobilityPowerRuntime] Failed to apply runtime edge cases', { error: err });
      }
      return result;
    };
  }

  CombatOptionResolver.__swseCombatMobilityPowerRuntimePatched = true;
}

export function registerCombatMobilityPowerRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[CombatMobilityPowerRuntime] Runtime patches registered');
}

export default registerCombatMobilityPowerRuntimePatches;
