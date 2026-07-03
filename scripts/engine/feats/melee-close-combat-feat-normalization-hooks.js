import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getAttackOptionRules(item) {
  return asArray(item?.system?.abilityMeta?.attackOptionRules);
}

function hasMeleeCloseRule(item, source) {
  const wanted = normalizeName(source);
  return getAttackOptionRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'accelerated strike') {
    return [{
      type: 'ACTION_SPEED_MUTATION',
      id: 'acceleratedStrike',
      label: 'Accelerated Strike',
      actionId: 'fullAttack',
      aliases: ['fullAttackAction', 'fullAttackMelee', 'fullAttackWithProficientWeapons'],
      baseActionCost: 'full-round',
      mutatedActionCost: 'standard',
      usesPerEncounter: 1,
      timing: 'whenTakingFullAttackAction',
      requiresWorkflowValidation: true,
      actionEconomy: {
        baseAction: 'fullAttack',
        from: 'full-round',
        to: 'standard',
        spend: 'standard',
        mutatesEstablishedAction: true,
        workflowRequired: true
      },
      weaponAction: {
        fullAttack: true,
        requiresOnlyProficientWeapons: true,
        requiresMeleeOrCloseWeaponContext: true,
        selectedWeaponsAdvisory: true
      },
      source: 'Accelerated Strike',
      summary: 'Once per encounter, when using only weapons with which the actor is proficient, mutates Full Attack from a full-round action to a standard action after workflow validation.'
    }];
  }

  return null;
}

async function normalizeMeleeCloseCombatFeat(item, options = {}) {
  if (options?.swseMeleeCloseCombatFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;
  if (hasMeleeCloseRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'melee_close_combat_metadata',
      'system.abilityMeta.applicationScope': 'melee_close_or_full_attack_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.attackOptionRules': [
        ...getAttackOptionRules(item),
        ...rules
      ]
    }], {
      source: 'MeleeCloseCombatFeatNormalization.normalize',
      swseMeleeCloseCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[MeleeCloseCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerMeleeCloseCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeMeleeCloseCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeMeleeCloseCombatFeat(item, options));
  SWSELogger.log('[MeleeCloseCombatFeatNormalization] Hooks registered');
}

export default registerMeleeCloseCombatFeatNormalizationHooks;
