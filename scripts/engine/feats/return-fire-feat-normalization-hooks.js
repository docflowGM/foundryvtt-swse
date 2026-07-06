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

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isReturnFire(item) {
  const name = normalizeName(item?.name);
  return name === 'return fire' || name.startsWith('return fire ');
}

function hasStoredChoice(item) {
  const choice = item?.system?.selectedChoice ?? item?.system?.selectedChoices ?? item?.system?.choiceMeta?.selectedChoice;
  if (Array.isArray(choice)) return choice.length > 0;
  if (choice && typeof choice === 'object') return Object.keys(choice).length > 0;
  return choice !== undefined && choice !== null && String(choice).trim() !== '';
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

function selectedChoicePatch(item) {
  const selected = selectedChoiceFromItem(item);
  if (!selected) return {};
  return {
    'system.selectedChoice': selected,
    'system.choiceMeta.selectedChoice': selected,
    'system.abilityMeta.selectedChoice': selected,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function withoutExistingRules(rules) {
  return asArray(rules).filter(rule => String(rule?.id ?? '') !== 'returnFireRangedMissReactionAttack');
}

function returnFireRule() {
  return {
    type: 'REACTION_ATTACK_RESOURCE',
    id: 'returnFireRangedMissReactionAttack',
    trigger: 'enemyMissesYouWithRangedAttack',
    actionType: 'reaction',
    selectedChoice: true,
    requiresWeaponFocusChoice: true,
    requiresAttackType: 'ranged',
    requiresLineOfSight: true,
    requiresWeaponInHand: true,
    excludesVehicleWeapons: true,
    excludesHeavyWeapons: true,
    attack: {
      kind: 'singleRangedAttack',
      target: 'triggeringEnemy',
      selectedWeaponOnly: true
    },
    oncePer: 'encounter',
    combinedFeat: {
      feat: 'Combat Reflexes',
      usesPerEncounterAbility: 'dexterityModifier',
      maxOncePerEnemyTurn: true
    },
    source: 'Return Fire',
    label: 'Return Fire: reaction ranged attack after selected enemy misses you'
  };
}

function returnFireChoicePatch() {
  return {
    'system.choiceMeta.required': true,
    'system.choiceMeta.repeatable': true,
    'system.choiceMeta.resolution': 'immediate',
    'system.choiceMeta.choiceKind': 'weapon_focus_weapon',
    'system.choiceMeta.choiceSource': 'prerequisiteDerived',
    'system.choiceMeta.choiceKey': 'return_fire_weapon',
    'system.choiceMeta.storagePath': 'system.selectedChoice',
    'system.choiceMeta.label': 'Return Fire Weapon',
    'system.choiceMeta.prompt': 'Choose one weapon group or exotic weapon for which you already have Weapon Focus. Return Fire does not apply to vehicle weapons or heavy weapons.',
    'system.choiceMeta.requiresOwnedFeatChoice': {
      feat: 'Weapon Focus',
      choicePath: 'system.selectedChoice'
    },
    'system.choiceMeta.excludesWeaponGroups': ['heavy weapons', 'heavy-weapons', 'vehicle weapons', 'vehicle-weapons'],
    'system.choiceMeta.excludesVehicleWeapons': true,
    'system.choiceMeta.excludesHeavyWeapons': true,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function scheduleReturnFireChoicePrompt(actor, itemId) {
  if (!actor || !itemId || !globalThis.ui || !globalThis.game?.user) return;
  const key = `${actor.id || actor.uuid || 'actor'}:${itemId}`;
  if (pendingChoicePrompts.has(key)) return;
  pendingChoicePrompts.add(key);
  globalThis.setTimeout?.(async () => {
    try {
      const item = actor.items?.get?.(itemId);
      if (!item || !isReturnFire(item) || hasStoredChoice(item)) return;
      if (item.system?.choiceMeta?.required !== true) return;
      if (actor.isOwner === false && !globalThis.game?.user?.isGM) return;
      await FeatChoiceDialog.promptAndApply(actor, item);
    } catch (err) {
      SWSELogger.warn('[ReturnFireNormalization] Failed to open Return Fire choice prompt', { actorId: actor?.id, itemId, error: err });
    } finally {
      pendingChoicePrompts.delete(key);
    }
  }, 250);
}

async function normalizeReturnFireFeat(item, options = {}) {
  if (options?.swseReturnFireFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat' || !isReturnFire(item)) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules);
  nextRules.push(returnFireRule());

  const patch = {
    'system.executionModel': 'PASSIVE',
    'system.subType': 'REACTION',
    'system.abilityMeta.mechanicsMode': 'selected_weapon_reaction_attack_resource',
    'system.abilityMeta.applicationScope': 'ranged_miss_against_actor_context',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules,
    ...returnFireChoicePatch(),
    ...selectedChoicePatch(item)
  };

  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'REACTION'
    || item.system?.abilityMeta?.mechanicsMode !== 'selected_weapon_reaction_attack_resource'
    || item.system?.choiceMeta?.required !== true
    || item.system?.choiceMeta?.choiceKind !== 'weapon_focus_weapon';
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) {
    if (!hasStoredChoice(item)) scheduleReturnFireChoicePrompt(item.actor, item.id);
    return false;
  }

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'ReturnFireFeatNormalization.normalize',
      swseReturnFireFeatNormalization: true,
      render: false
    });
    if (!hasStoredChoice(item)) scheduleReturnFireChoicePrompt(item.actor, item.id);
    return true;
  } catch (err) {
    SWSELogger.error(`[ReturnFireNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerReturnFireFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeReturnFireFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeReturnFireFeat(item, options));
  SWSELogger.log('[ReturnFireNormalization] Hooks registered');
}

export default registerReturnFireFeatNormalizationHooks;
