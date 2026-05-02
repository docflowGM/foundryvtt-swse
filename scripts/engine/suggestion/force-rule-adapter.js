import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

function getSetting(key, fallback) {
  try {
    const value = HouseRuleService.get(key, fallback);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function getForceTrainingAbilityKey() {
  const setting = String(getSetting('forceTrainingAttribute', 'wisdom')).toLowerCase();
  return setting === 'charisma' ? 'cha' : 'wis';
}

export function getUseTheForceAbilityKey() {
  const setting = String(getSetting('useTheForceAttribute', 'charisma')).toLowerCase();
  return setting === 'wisdom' ? 'wis' : 'cha';
}

export function getForceAbilityConfig() {
  return {
    capacityAbility: getForceTrainingAbilityKey(),
    executionAbility: getUseTheForceAbilityKey()
  };
}

export function getAbilityScore(actor, key) {
  const score = actor?.system?.abilities?.[key]?.value
    ?? actor?.system?.abilities?.[key]?.total
    ?? actor?.system?.abilities?.[key]?.base
    ?? actor?.system?.attributes?.[key]?.value
    ?? actor?.system?.attributes?.[key]?.total
    ?? actor?.system?.attributes?.[key]?.base
    ?? 10;
  return Number.isFinite(Number(score)) ? Number(score) : 10;
}

export function getAbilityMod(actor, key) {
  const explicit = actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod;
  if (Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }
  const score = getAbilityScore(actor, key);
  return Math.floor((score - 10) / 2);
}

export function getForceAxisSnapshot(actor) {
  const { capacityAbility, executionAbility } = getForceAbilityConfig();
  return {
    capacityAbility,
    executionAbility,
    capacityScore: getAbilityScore(actor, capacityAbility),
    executionScore: getAbilityScore(actor, executionAbility),
    capacityMod: getAbilityMod(actor, capacityAbility),
    executionMod: getAbilityMod(actor, executionAbility)
  };
}
