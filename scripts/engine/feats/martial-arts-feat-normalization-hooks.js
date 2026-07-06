import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function martialArtsLevel(name) {
  const normalized = normalizeName(name);
  if (normalized === 'martial arts iii' || normalized === 'martial arts 3') return 3;
  if (normalized === 'martial arts ii' || normalized === 'martial arts 2') return 2;
  if (normalized === 'martial arts i' || normalized === 'martial arts 1') return 1;
  return 0;
}

function hasRule(item, id, type) {
  const wanted = String(id ?? '');
  const wantedType = String(type ?? '').toUpperCase();
  return asArray(item?.system?.abilityMeta?.rules).some(rule => String(rule?.id ?? rule?.key ?? '') === wanted && String(rule?.type ?? '').toUpperCase() === wantedType);
}

function highestStackingUnarmedStepRule(level) {
  return {
    type: 'UNARMED_DAMAGE_STEP',
    id: `martialArts${level}UnarmedStep`,
    value: level,
    stacking: 'highest',
    stackingKey: 'martialArtsUnarmedDamageStep',
    source: `Martial Arts ${['I', 'II', 'III'][level - 1]}`,
    label: `Martial Arts ${['I', 'II', 'III'][level - 1]} unarmed damage step`
  };
}

function armedUnarmedRule(level) {
  return {
    type: 'UNARMED_DOES_NOT_PROVOKE_AOO',
    id: `martialArts${level}ArmedUnarmed`,
    source: `Martial Arts ${['I', 'II', 'III'][level - 1]}`,
    label: `Martial Arts ${['I', 'II', 'III'][level - 1]}: unarmed attacks count as armed`
  };
}

function reflexDefenseRule(level) {
  return {
    type: 'DEFENSE_BONUS',
    id: `martialArts${level}ReflexDefense`,
    target: 'reflex',
    value: level,
    bonusType: 'dodge',
    stacking: 'highest',
    stackingKey: 'martialArtsReflexDefense',
    source: `Martial Arts ${['I', 'II', 'III'][level - 1]}`,
    label: `Martial Arts ${['I', 'II', 'III'][level - 1]} Reflex Defense`
  };
}

async function normalizeMartialArtsFeat(item, options = {}) {
  if (options?.swseMartialArtsNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const level = martialArtsLevel(item.name);
  if (!level) return false;

  const rules = asArray(item.system?.abilityMeta?.rules);
  const additions = [];
  const unarmedRule = highestStackingUnarmedStepRule(level);
  const armedRule = armedUnarmedRule(level);
  const defenseRule = reflexDefenseRule(level);
  if (!hasRule(item, unarmedRule.id, unarmedRule.type)) additions.push(unarmedRule);
  if (!hasRule(item, armedRule.id, armedRule.type)) additions.push(armedRule);
  if (!hasRule(item, defenseRule.id, defenseRule.type)) additions.push(defenseRule);
  if (!additions.length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'passive_rule',
      'system.abilityMeta.applicationScope': 'weapon_and_defense_math',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': [...rules, ...additions]
    }], {
      source: 'MartialArts.normalization',
      swseMartialArtsNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[MartialArtsNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerMartialArtsFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeMartialArtsFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeMartialArtsFeat(item, options));
  SWSELogger.log('[MartialArtsNormalization] Hooks registered');
}

export default registerMartialArtsFeatNormalizationHooks;
