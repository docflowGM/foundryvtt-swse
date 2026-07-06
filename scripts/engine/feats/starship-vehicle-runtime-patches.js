import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
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

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function vehicleRole(context = {}) {
  return normalizeKey(context.vehicleRole ?? context.crewRole ?? context.role ?? context.workflowContext?.vehicleRole ?? context.workflowContext?.crewRole ?? context.workflowContext?.role ?? '');
}

function isGunnerContext(context = {}) {
  return vehicleRole(context) === 'gunner' || contextAffirms(context.isGunner) || contextAffirms(context.workflowContext?.isGunner);
}

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  return [
    context.weaponCategory,
    context.weaponType,
    context.weaponGroup,
    context.workflowContext?.weaponCategory,
    context.workflowContext?.weaponType,
    context.workflowContext?.weaponGroup,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.itemType,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function isVehicleWeapon(weapon, context = {}) {
  if (contextAffirms(context.vehicleWeapon) || contextAffirms(context.isVehicleWeapon) || contextAffirms(context.workflowContext?.vehicleWeapon) || contextAffirms(context.workflowContext?.isVehicleWeapon)) return true;
  const text = weaponText(weapon, context);
  return text.includes('vehicle-weapon') || text.includes('starship-weapon') || text.includes('weapon-system') || text.includes('emplacement');
}

function getVehicleWeaponProficiencyOverrides(actor, weapon, context = {}) {
  if (!actor || !isGunnerContext(context) || !isVehicleWeapon(weapon, context)) return [];
  return collectRules(actor, 'VEHICLE_ROLE_PROFICIENCY_OVERRIDE').filter(rule => normalizeKey(rule.requiresVehicleRole) === 'gunner').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'vehicleRoleProficiencyOverride',
    grantsProficiency: rule.grantsProficiency ?? 'vehicleWeapons',
    weaponCategory: rule.weaponCategory ?? 'vehicleWeapon',
    appliesOnlyWhileInRole: rule.appliesOnlyWhileInRole !== false,
    rule
  }));
}

function actorHasVehicleWeaponProficiencyOverride(actor, weapon, context = {}) {
  return getVehicleWeaponProficiencyOverrides(actor, weapon, context).length > 0;
}

function getVehicleWeaponAttackRerolls(actor, weapon, context = {}) {
  if (!actor || !isGunnerContext(context) || !isVehicleWeapon(weapon, context)) return [];
  return collectRules(actor, 'ATTACK_REROLL_RESOURCE').filter(rule => rule.requiresVehicleWeapon === true).map(rule => {
    const featureKey = rule.featureKey ?? rule.id;
    return {
      id: rule.id,
      key: featureKey,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'attackRerollResource',
      oncePer: rule.oncePer ?? 'encounter',
      timing: rule.timing ?? 'afterAttackResultBeforeDamage',
      keep: rule.keep ?? 'second',
      canDeclareAfterResult: rule.canDeclareAfterResult === true,
      mustUseBeforeDamageResolved: rule.mustUseBeforeDamageResolved !== false,
      available: EncounterUseTracker.canUse(actor, featureKey, { oncePer: rule.oncePer ?? 'encounter' }),
      rule
    };
  });
}

async function spendVehicleWeaponAttackReroll(actor, featureKey = 'gunnery-specialist-vehicle-weapon-reroll') {
  return EncounterUseTracker.checkAndMarkUsed(actor, featureKey, { oncePer: 'encounter' });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseStarshipVehicleRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);

  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedVehicleFeatCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        const proficiencyOverrides = getVehicleWeaponProficiencyOverrides(actor, weapon, options);
        if (proficiencyOverrides.length) {
          result.flags ??= {};
          result.flags.vehicleWeaponProficiencyOverride = true;
          result.flags.vehicleWeaponProficiencySources = proficiencyOverrides.map(rule => rule.source);
          result.breakdown ??= [];
          if (!result.breakdown.some(entry => entry?.type === 'vehicleProficiencyOverride')) {
            result.breakdown.push({ label: 'Vehicle weapon proficiency override', value: 0, type: 'vehicleProficiencyOverride' });
          }
        }
        const rerolls = getVehicleWeaponAttackRerolls(actor, weapon, options);
        if (rerolls.length) {
          result.attackRerollResources ??= [];
          result.attackRerollResources.push(...rerolls);
          result.flags ??= {};
          result.flags.vehicleWeaponRerollAvailable = rerolls.some(reroll => reroll.available);
        }
      } catch (err) {
        SWSELogger.warn('[StarshipVehicleRuntime] Failed to collect vehicle feat helpers', { error: err });
      }
      return result;
    };
  }

  CombatOptionResolver.getVehicleWeaponProficiencyOverrides = getVehicleWeaponProficiencyOverrides;
  CombatOptionResolver.actorHasVehicleWeaponProficiencyOverride = actorHasVehicleWeaponProficiencyOverride;
  CombatOptionResolver.getVehicleWeaponAttackRerolls = getVehicleWeaponAttackRerolls;
  CombatOptionResolver.spendVehicleWeaponAttackReroll = spendVehicleWeaponAttackReroll;
  CombatOptionResolver.__swseStarshipVehicleRuntimePatched = true;
}

export function registerStarshipVehicleRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getVehicleWeaponProficiencyOverrides = getVehicleWeaponProficiencyOverrides;
  game.swse.feats.actorHasVehicleWeaponProficiencyOverride = actorHasVehicleWeaponProficiencyOverride;
  game.swse.feats.getVehicleWeaponAttackRerolls = getVehicleWeaponAttackRerolls;
  game.swse.feats.spendVehicleWeaponAttackReroll = spendVehicleWeaponAttackReroll;
  SWSELogger.log('[StarshipVehicleRuntime] Runtime helpers registered');
}

export {
  getVehicleWeaponProficiencyOverrides,
  actorHasVehicleWeaponProficiencyOverride,
  getVehicleWeaponAttackRerolls,
  spendVehicleWeaponAttackReroll
};

export default registerStarshipVehicleRuntimePatches;
