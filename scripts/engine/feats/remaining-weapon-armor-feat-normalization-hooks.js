import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { FeatChoiceDialog } from "/systems/foundryvtt-swse/scripts/apps/choices/feat-choice-dialog.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const pendingChoicePrompts = new Set();

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compact(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function selectedChoiceFromItem(item) {
  const system = item?.system ?? {};
  const meta = system.abilityMeta ?? {};
  const choiceMeta = system.choiceMeta ?? {};
  const raw = system.selectedChoice ?? system.selectedChoices ?? choiceMeta.selectedChoice ?? choiceMeta.choice ?? meta.selectedChoice ?? meta.selectedChoices;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (entry && typeof entry === 'object') {
    const value = entry.value ?? entry.id ?? entry.group ?? entry.weapon ?? entry.weaponGroup ?? entry.label ?? entry.name;
    if (String(value ?? '').trim()) return String(value).trim();
  }
  const paren = String(item?.name ?? '').match(/\(([^)]+)\)/);
  return paren?.[1]?.trim() ?? '';
}

function hasStoredChoice(item) {
  const choice = item?.system?.selectedChoice ?? item?.system?.selectedChoices ?? item?.system?.choiceMeta?.selectedChoice;
  if (Array.isArray(choice)) return choice.length > 0;
  if (choice && typeof choice === 'object') return Object.keys(choice).length > 0;
  return choice !== undefined && choice !== null && String(choice).trim() !== '';
}

function featKey(item) {
  return compact(item?.name);
}

function isRelentlessAttack(item) {
  const name = featKey(item);
  return name === 'relentlessattack' || name.startsWith('relentlessattack(');
}

function isWithdrawalStrike(item) {
  const name = featKey(item);
  return name === 'withdrawalstrike' || name.startsWith('withdrawalstrike(');
}

function isGrandArmyTraining(item) {
  return featKey(item) === 'grandarmyoftherepublictraining';
}

function selectedChoicePatch(item) {
  const choice = selectedChoiceFromItem(item);
  if (!choice) return {};
  return {
    'system.selectedChoice': choice,
    'system.choiceMeta.selectedChoice': choice,
    'system.abilityMeta.selectedChoice': choice,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function relentlessAttackRule() {
  return {
    type: 'MISS_RIDER',
    id: 'relentlessAttackMarkMissedTarget',
    selectedChoice: true,
    requiresAttackType: 'any',
    targetEffectsOnMiss: [{
      type: 'relentless-attack-missed-target-mark',
      sourceName: 'Relentless Attack',
      attackBonus: 2,
      bonusType: 'competence',
      appliesToNextAttackAgainstMissedTarget: true,
      expires: 'endOfNextTurn',
      targetScoped: true,
      selectedWeaponOnly: true,
      manualResolution: false
    }],
    source: 'Relentless Attack',
    label: 'Relentless Attack: mark missed target for +2 competence next attack'
  };
}

function withdrawalStrikeRule() {
  return {
    type: 'THREAT_MOVEMENT_RESTRICTION',
    id: 'withdrawalStrikeNoWithdrawFromThreatenedSquares',
    selectedChoice: true,
    requiresAttackType: 'melee',
    preventsWithdrawFromThreatenedSquares: true,
    allowsTumbleNormally: true,
    affectedTargets: 'adjacentOpponents',
    source: 'Withdrawal Strike',
    label: 'Withdrawal Strike: adjacent opponents cannot Withdraw from threatened squares'
  };
}

function grandArmyArmorRule() {
  return {
    type: 'APPLY_ARMOR_FORT_EQUIPMENT_TO_WILL',
    requiresEquippedArmor: true,
    requiresArmorProficiency: true,
    requiresArmorFortitudeEquipmentBonus: true,
    source: 'Grand Army of the Republic Training',
    label: 'Grand Army of the Republic Training: apply armor Fortitude equipment bonus to Will'
  };
}

function rulesForFeat(item) {
  if (isRelentlessAttack(item)) return [relentlessAttackRule()];
  if (isWithdrawalStrike(item)) return [withdrawalStrikeRule()];
  return [];
}

function ruleIdsForFeat(item) {
  if (isRelentlessAttack(item)) return ['relentlessAttackMarkMissedTarget'];
  if (isWithdrawalStrike(item)) return ['withdrawalStrikeNoWithdrawFromThreatenedSquares'];
  return [];
}

function choicePatchForFeat(item) {
  if (isRelentlessAttack(item)) {
    return {
      'system.choiceMeta.required': true,
      'system.choiceMeta.repeatable': true,
      'system.choiceMeta.resolution': 'immediate',
      'system.choiceMeta.choiceKind': 'double_attack_weapon',
      'system.choiceMeta.choiceSource': 'prerequisiteDerived',
      'system.choiceMeta.choiceKey': 'relentless_attack_weapon',
      'system.choiceMeta.storagePath': 'system.selectedChoice',
      'system.choiceMeta.label': 'Relentless Attack Weapon',
      'system.choiceMeta.prompt': 'Choose the weapon group or exotic weapon for which you have Double Attack.',
      'system.abilityMeta.requiresSelectedChoice': true
    };
  }
  if (isWithdrawalStrike(item)) {
    return {
      'system.choiceMeta.required': true,
      'system.choiceMeta.repeatable': true,
      'system.choiceMeta.resolution': 'immediate',
      'system.choiceMeta.choiceKind': 'melee_weapon_or_group',
      'system.choiceMeta.choiceSource': 'prerequisiteDerived',
      'system.choiceMeta.choiceKey': 'withdrawal_strike_weapon',
      'system.choiceMeta.storagePath': 'system.selectedChoice',
      'system.choiceMeta.label': 'Withdrawal Strike Weapon',
      'system.choiceMeta.prompt': 'Choose the proficient melee weapon group or exotic melee weapon for Withdrawal Strike.',
      'system.abilityMeta.requiresSelectedChoice': true
    };
  }
  return {};
}

function scheduleChoicePrompt(actor, itemId, predicate, label) {
  if (!actor || !itemId || !globalThis.ui || !globalThis.game?.user) return;
  const key = `${actor.id || actor.uuid || 'actor'}:${itemId}`;
  if (pendingChoicePrompts.has(key)) return;
  pendingChoicePrompts.add(key);
  globalThis.setTimeout?.(async () => {
    try {
      const item = actor.items?.get?.(itemId);
      if (!item || !predicate(item) || hasStoredChoice(item)) return;
      if (item.system?.choiceMeta?.required !== true) return;
      if (actor.isOwner === false && !globalThis.game?.user?.isGM) return;
      await FeatChoiceDialog.promptAndApply(actor, item);
    } catch (err) {
      SWSELogger.warn(`[RemainingWeaponArmorNormalization] Failed to open ${label} choice prompt`, { actorId: actor?.id, itemId, error: err });
    } finally {
      pendingChoicePrompts.delete(key);
    }
  }, 250);
}

async function normalizeChoiceFeat(item, options = {}) {
  if (options?.swseRemainingWeaponArmorNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (!isRelentlessAttack(item) && !isWithdrawalStrike(item)) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, ruleIdsForFeat(item));
  nextRules.push(...rulesForFeat(item));

  const mechanicsMode = isRelentlessAttack(item) ? 'weapon_miss_rider_choice' : 'threatened_square_movement_restriction_choice';
  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'STATE',
    'system.abilityMeta.mechanicsMode': mechanicsMode,
    'system.abilityMeta.applicationScope': isRelentlessAttack(item) ? 'selected_weapon_miss_resolution' : 'selected_melee_weapon_threat_control',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.rules': nextRules,
    ...choicePatchForFeat(item),
    ...selectedChoicePatch(item)
  };

  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'STATE'
    || item.system?.abilityMeta?.mechanicsMode !== mechanicsMode
    || item.system?.abilityMeta?.requiresSelectedChoice !== true
    || item.system?.choiceMeta?.required !== true;
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) {
    if (isRelentlessAttack(item) && !hasStoredChoice(item)) scheduleChoicePrompt(item.actor, item.id, isRelentlessAttack, 'Relentless Attack');
    if (isWithdrawalStrike(item) && !hasStoredChoice(item)) scheduleChoicePrompt(item.actor, item.id, isWithdrawalStrike, 'Withdrawal Strike');
    return false;
  }

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'RemainingWeaponArmor.normalization',
      swseRemainingWeaponArmorNormalization: true,
      render: false
    });
    if (isRelentlessAttack(item) && !hasStoredChoice(item)) scheduleChoicePrompt(item.actor, item.id, isRelentlessAttack, 'Relentless Attack');
    if (isWithdrawalStrike(item) && !hasStoredChoice(item)) scheduleChoicePrompt(item.actor, item.id, isWithdrawalStrike, 'Withdrawal Strike');
    return true;
  } catch (err) {
    SWSELogger.error(`[RemainingWeaponArmorNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

async function normalizeGrandArmyTraining(item, options = {}) {
  if (options?.swseRemainingWeaponArmorNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (!isGrandArmyTraining(item)) return false;

  const currentRules = asArray(item.system?.abilityMeta?.defenseArmorRules);
  const nextRules = withoutExistingRules(currentRules, ['grandArmyApplyArmorFortToWill']);
  nextRules.push({ id: 'grandArmyApplyArmorFortToWill', ...grandArmyArmorRule() });

  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'STATE',
    'system.abilityMeta.mechanicsMode': 'armor_defense_rule',
    'system.abilityMeta.applicationScope': 'equipped_proficient_armor_will_defense',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.defenseArmorRules': nextRules
  };

  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'STATE'
    || item.system?.abilityMeta?.mechanicsMode !== 'armor_defense_rule';
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'RemainingWeaponArmor.grandArmyNormalization',
      swseRemainingWeaponArmorNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[RemainingWeaponArmorNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerRemainingWeaponArmorFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => {
    await normalizeChoiceFeat(item, options);
    await normalizeGrandArmyTraining(item, options);
  });
  Hooks.on('updateItem', async (item, data, options) => {
    await normalizeChoiceFeat(item, options);
    await normalizeGrandArmyTraining(item, options);
  });
  SWSELogger.log('[RemainingWeaponArmorNormalization] Hooks registered');
}

export default registerRemainingWeaponArmorFeatNormalizationHooks;
