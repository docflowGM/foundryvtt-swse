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

function numeral(level) {
  return ['I', 'II', 'III'][Math.max(1, Number(level) || 1) - 1] ?? String(level);
}

function hasRule(rules, id, type) {
  const wanted = String(id ?? '');
  const wantedType = String(type ?? '').toUpperCase();
  return asArray(rules).some(rule => String(rule?.id ?? rule?.key ?? '') === wanted && String(rule?.type ?? '').toUpperCase() === wantedType);
}

function hasModifier(modifiers, id) {
  const wanted = String(id ?? '');
  return asArray(modifiers).some(modifier => String(modifier?.id ?? modifier?.key ?? '') === wanted);
}

function removeObsoleteMartialArtsRules(rules = []) {
  return asArray(rules).filter(rule => {
    const id = String(rule?.id ?? rule?.key ?? '');
    const type = String(rule?.type ?? '').toUpperCase();
    return !(type === 'DEFENSE_BONUS' && /^martialArts\d+ReflexDefense$/.test(id));
  });
}

function unarmedStepRule(level) {
  return {
    type: 'UNARMED_DAMAGE_STEP',
    id: `martialArts${level}UnarmedStep`,
    value: 1,
    stacking: 'stack',
    stackingKey: `martialArts${level}UnarmedDamageStep`,
    source: `Martial Arts ${numeral(level)}`,
    label: `Martial Arts ${numeral(level)} unarmed damage +1 die step`,
    consumedBy: 'UnarmedAttackHelper.buildVirtualUnarmedWeapon'
  };
}

function armedUnarmedRule() {
  return {
    type: 'UNARMED_DOES_NOT_PROVOKE_AOO',
    id: 'martialArtsArmedUnarmed',
    source: 'Martial Arts I',
    label: 'Martial Arts I: unarmed attacks do not provoke attacks of opportunity',
    consumedBy: 'UnarmedAttackHelper.buildVirtualUnarmedWeapon'
  };
}

function reflexDefenseModifier(level) {
  return {
    id: `martialArts${level}ReflexDodge`,
    target: 'defense.reflex',
    value: 1,
    type: 'dodge',
    bonusType: 'dodge',
    source: `Martial Arts ${numeral(level)}`,
    label: `Martial Arts ${numeral(level)} Reflex Defense +1 dodge`,
    mechanicsMode: 'passive_state',
    applicationScope: 'defense.reflex',
    staticSheetPolicy: 'include'
  };
}

async function normalizeMartialArtsFeat(item, options = {}) {
  if (options?.swseMartialArtsNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const level = martialArtsLevel(item.name);
  if (!level) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = removeObsoleteMartialArtsRules(currentRules);
  const unarmedRule = unarmedStepRule(level);
  if (!hasRule(nextRules, unarmedRule.id, unarmedRule.type)) nextRules.push(unarmedRule);
  if (level === 1) {
    const armedRule = armedUnarmedRule();
    if (!hasRule(nextRules, armedRule.id, armedRule.type)) nextRules.push(armedRule);
  }

  const currentModifiers = asArray(item.system?.abilityMeta?.modifiers);
  const nextModifiers = [...currentModifiers];
  const reflexModifier = reflexDefenseModifier(level);
  if (!hasModifier(nextModifiers, reflexModifier.id)) nextModifiers.push(reflexModifier);

  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  const modifiersChanged = JSON.stringify(nextModifiers) !== JSON.stringify(currentModifiers);
  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'STATE'
    || item.system?.abilityMeta?.mechanicsMode !== 'passive_state'
    || item.system?.abilityMeta?.applicationScope !== 'virtual_unarmed_attack_and_defense_reflex'
    || item.system?.abilityMeta?.staticSheetPolicy !== 'include';
  if (!rulesChanged && !modifiersChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'STATE',
      'system.abilityMeta.mechanicsMode': 'passive_state',
      'system.abilityMeta.applicationScope': 'virtual_unarmed_attack_and_defense_reflex',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': nextRules,
      'system.abilityMeta.modifiers': nextModifiers
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
