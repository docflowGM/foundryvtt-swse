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

function hasAttackOptionRule(item, source) {
  const wanted = normalizeName(source);
  return getAttackOptionRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function drawWeaponSpeedMutation({ id, label, source, combinedEffects = [] }) {
  return {
    type: 'ACTION_SPEED_MUTATION',
    id,
    label,
    actionId: 'drawOrHolsterWeapon',
    aliases: ['draw', 'drawWeapon', 'holsterWeapon', 'drawOrHolster', 'drawOrReadyWeapon', 'readyWeapon'],
    baseActionCost: 'move',
    mutatedActionCost: 'swift',
    timing: 'whenDrawingOrHolsteringAWeapon',
    requiresWorkflowValidation: true,
    actionEconomy: {
      baseAction: 'drawOrHolsterWeapon',
      from: 'move',
      to: 'swift',
      spend: 'swift',
      mutatesEstablishedAction: true,
      workflowRequired: true
    },
    weaponAction: {
      drawOrHolsterWeapon: true,
      appliesToHeldOrCarriedWeapon: true,
      concealmentOrHolsterStateAdvisory: true
    },
    combinedEffects,
    source,
    summary: 'Mutates the established Draw/Holster Weapon action from a move action to a swift action when the action workflow validates the weapon/draw context.'
  };
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'rapid reaction') {
    return [{
      type: 'REACTION_TIMING_ADVISORY',
      id: 'rapidReaction',
      label: 'Rapid Reaction',
      trigger: 'reactionOrEncounterStartContext',
      actionEconomy: {
        timing: 'reaction',
        spend: 'reaction',
        workflowRequired: true
      },
      source: 'Rapid Reaction',
      summary: 'Stores Rapid Reaction timing metadata. Exact trigger and reaction availability must be supplied by the combat/reaction workflow.'
    }];
  }

  if (normalized === 'quick draw') {
    return [drawWeaponSpeedMutation({
      id: 'quickDraw',
      label: 'Quick Draw',
      source: 'Quick Draw',
      combinedEffects: [
        {
          requiresFeat: 'Dual Weapon Mastery I',
          actionId: 'drawOrHolsterTwoWeapons',
          actionCost: 'swift',
          requiresBothHandsFree: true,
          requiresOneHandedWeapons: true,
          advisoryOnly: true,
          summary: 'Combined feat rider: draw or holster two one-handed weapons with a single swift action when both hands are free.'
        },
        {
          requiresFeat: 'Weapon Proficiency (Lightsabers)',
          actionId: 'drawAndIgniteLightsaber',
          actionCost: 'swift',
          advisoryOnly: true,
          summary: 'Combined feat rider: draw and ignite a lightsaber as a single swift action.'
        }
      ]
    })];
  }

  if (normalized === 'lightning draw') {
    return [drawWeaponSpeedMutation({
      id: 'lightningDraw',
      label: 'Lightning Draw',
      source: 'Lightning Draw'
    })];
  }

  if (normalized === 'improved stun') {
    return [{
      type: 'STUN_ATTACK_OPTION_ADVISORY',
      id: 'improvedStun',
      label: 'Improved Stun',
      trigger: 'stunDamageAttack',
      damageMode: 'stun',
      stunRider: {
        workflowRequired: true,
        damagePacketRequired: true,
        note: 'Marks Improved Stun for stun-damage workflows. The actual stun packet mutation should occur only when the attack is confirmed as stun damage and the target is eligible.'
      },
      source: 'Improved Stun',
      summary: 'Stores Improved Stun metadata for stun-damage attack workflows. Does not alter normal damage or non-stun attacks.'
    }];
  }

  return null;
}

async function normalizeAttackOptionsFeat(item, options = {}) {
  if (options?.swseAttackOptionsFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;
  if (hasAttackOptionRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'attack_options_metadata',
      'system.abilityMeta.applicationScope': 'attack_reaction_or_stun_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.attackOptionRules': [
        ...getAttackOptionRules(item),
        ...rules
      ]
    }], {
      source: 'AttackOptionsFeatNormalization.normalize',
      swseAttackOptionsFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[AttackOptionsFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerAttackOptionsFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeAttackOptionsFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeAttackOptionsFeat(item, options));
  SWSELogger.log('[AttackOptionsFeatNormalization] Hooks registered');
}

export default registerAttackOptionsFeatNormalizationHooks;
