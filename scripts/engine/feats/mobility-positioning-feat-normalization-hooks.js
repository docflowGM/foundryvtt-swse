import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getExistingRules(item) {
  return asArray(item?.system?.abilityMeta?.rules);
}

function hasMobilityPositioningRule(item, source) {
  const wanted = normalizeName(source);
  return getExistingRules(item).some(rule => normalizeName(rule?.source ?? '') === wanted
    && (String(rule?.type ?? '').includes('MOBILITY')
      || String(rule?.type ?? '').includes('POSITION')
      || String(rule?.type ?? '').includes('MOVEMENT')
      || String(rule?.type ?? '').includes('RIDER')
      || String(rule?.type ?? '').includes('ADVISORY')
      || String(rule?.type ?? '') === 'ATTACK_OPTION'
      || String(rule?.type ?? '') === 'HIT_RIDER'
      || String(rule?.type ?? '') === 'RANGED_DAMAGE_RIDER'));
}

function advisoryRule({ id, label, trigger, actionEconomy = 'advisory', movement = {}, attack = {}, target = {}, source, summary }) {
  return {
    type: 'MOBILITY_POSITIONING_ADVISORY',
    id,
    label,
    trigger,
    actionEconomy,
    movement: {
      advisoryOnly: true,
      canvasAutomation: false,
      note: 'Path legality, adjacency, threatened squares, line of sight, and final token placement remain GM/player adjudicated unless a later workflow supplies that context.',
      ...movement
    },
    attack,
    target,
    source,
    summary
  };
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'tactical advantage') {
    return [{
      type: 'ATTACK_OF_OPPORTUNITY_DAMAGE_RIDER',
      id: 'tacticalAdvantage',
      label: 'Tactical Advantage',
      source: 'Tactical Advantage',
      prerequisiteFeat: 'Combat Reflexes',
      trigger: 'damagingAttackOfOpportunity',
      requiresAttackOfOpportunity: true,
      requiresDamage: true,
      selfMovementOnHit: {
        distanceSquares: 1,
        direction: 'any',
        actionTiming: 'immediate',
        provokesAttacksOfOpportunity: false,
        advisoryOnly: true,
        note: 'On a successful damaging Attack of Opportunity, the attacker may immediately move 1 square in any direction. Destination/path legality remains GM/player adjudicated.'
      },
      summary: 'ATOP rider: after successfully damaging an opponent with an Attack of Opportunity, immediately move 1 square in any direction without provoking Attacks of Opportunity.'
    }];
  }

  if (normalized === 'opportunistic retreat') {
    return [{
      type: 'ATTACK_OF_OPPORTUNITY_REPLACEMENT_RIDER',
      id: 'opportunisticRetreat',
      label: 'Opportunistic Retreat',
      source: 'Opportunistic Retreat',
      prerequisiteFeat: 'Combat Reflexes',
      trigger: 'opponentProvokesAttackOfOpportunity',
      frequency: {
        limit: 1,
        period: 'turn'
      },
      replaces: {
        action: 'attackOfOpportunity',
        sacrificeAttack: true
      },
      movement: {
        distanceFormula: 'floor(speed / 2)',
        speedFraction: 0.5,
        provokesAttacksOfOpportunity: false,
        advisoryOnly: true,
        note: 'Once per turn when an opponent provokes an Attack of Opportunity, sacrifice the attack to move a number of squares equal to one-half Speed. Path and destination remain GM/player adjudicated.'
      },
      summary: 'ATOP replacement rider: once per turn, when an opponent provokes an Attack of Opportunity, sacrifice the attack to move half Speed without provoking Attacks of Opportunity.'
    }];
  }

  if (normalized === 'impulsive flight') {
    return [{
      type: 'WITHDRAW_ACTION_RIDER',
      id: 'impulsiveFlight',
      label: 'Impulsive Flight',
      source: 'Impulsive Flight',
      trigger: 'withdrawAction',
      actionId: 'withdraw',
      movement: {
        extraWithdrawSquares: 1,
        advisoryOnly: false,
        note: 'When using the Withdraw action, increase the allowed withdraw movement by 1 square.'
      },
      summary: 'Withdraw action rider: move 1 extra square when using the Withdraw action.'
    }];
  }

  if (normalized === 'steadying position') {
    return [advisoryRule({
      id: 'steadyingPosition',
      label: 'Steadying Position',
      trigger: 'bracedOrStationaryPosition',
      actionEconomy: 'positioningStateAdvisory',
      movement: {
        requiresStablePosition: true,
        likelyEndsOnMovement: true
      },
      attack: {
        positioningDependent: true,
        likelyRangedOrHeavyWeapon: true
      },
      source: 'Steadying Position',
      summary: 'Stationary/braced-position rider. Records that the feat depends on remaining in a steady position; exact attack modifier requires workflow context.'
    })];
  }

  if (normalized === 'bantha herder') {
    return [{
      type: 'RANGED_DAMAGE_RIDER',
      id: 'banthaHerder',
      label: 'Bantha Herder',
      source: 'Bantha Herder',
      trigger: 'damagingRangedAttack',
      requiresAttackType: 'ranged',
      requiresDamage: true,
      requiresProficientWeapon: true,
      targetEligibility: {
        maxSize: 'large',
        cannotBeGrabbed: true,
        cannotBeGrappled: true
      },
      compareAttackRollToDefense: 'will',
      supportsMultipleEligibleTargets: true,
      targetEffectsOnDamage: [{
        type: 'forcedMovement',
        distanceSquares: 1,
        direction: 'any',
        actionTiming: 'free',
        advisoryOnly: true,
        restrictions: {
          cannotMoveIntoSolidObject: true,
          cannotMoveIntoOccupiedFightingSpace: true
        },
        note: 'On a damaging ranged attack with a proficient weapon against a Large or smaller target, compare the attack roll to Will Defense; on success, the attacker may move the target 1 square in any direction as a free action. No automatic token movement.'
      }],
      summary: 'Ranged damage rider: damaging ranged attack with a proficient weapon can move each eligible target 1 square if the attack roll equals or exceeds Will Defense.'
    }];
  }

  if (normalized === 'fleet footed' || normalized === 'fleet-footed') {
    return [{
      type: 'RUNNING_ATTACK_RIDER',
      id: 'fleetFooted',
      label: 'Fleet-Footed',
      prerequisiteFeat: 'Running Attack',
      trigger: 'runningAttackMoveBeforeAndAfterAttack',
      movement: {
        speedBonusSquares: 2,
        appliesUntil: 'endOfTurn',
        requiresRunningAttack: true,
        requiresMoveBeforeAttack: true,
        requiresMoveAfterAttack: true,
        advisoryOnly: false,
        note: 'If the actor moves both before and after making an attack using Running Attack, speed is increased by 2 squares until the end of the actor turn.'
      },
      source: 'Fleet-Footed',
      summary: 'Running Attack rider: when the actor moves both before and after the Running Attack attack, increase Speed by 2 squares until end of turn.'
    }];
  }

  if (normalized === 'cornered') {
    return [{
      type: 'ATTACK_ADVISORY_OPTION',
      id: 'cornered',
      label: 'Cornered',
      source: 'Cornered',
      trigger: 'playerSelectedCorneredAttackOption',
      selection: {
        key: 'cornered',
        label: 'Cornered',
        prompt: 'Apply Cornered? You are threatened and unable to take the Withdraw action.',
        playerSelectable: true,
        defaultSelected: false,
        requiresPlayerConfirmation: true
      },
      attack: {
        bonus: 2,
        target: 'attack.roll',
        bonusType: 'feat',
        appliesAgainst: 'opponentsThreateningActor',
        requiresThreatenedByTarget: true,
        requiresUnableToWithdraw: true,
        advisoryOnly: true
      },
      summary: 'Opt-in advisory attack option: when selected by the player for a valid cornered attack, apply +2 to attacks against threatening opponents.'
    }];
  }

  return null;
}

async function normalizeMobilityPositioningFeat(item, options = {}) {
  if (options?.swseMobilityPositioningFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;
  if (hasMobilityPositioningRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'mobility_positioning_metadata',
      'system.abilityMeta.applicationScope': 'movement_reaction_or_positioning_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': [
        ...getExistingRules(item),
        ...rules
      ]
    }], {
      source: 'MobilityPositioningFeatNormalization.normalize',
      swseMobilityPositioningFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[MobilityPositioningFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerMobilityPositioningFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeMobilityPositioningFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeMobilityPositioningFeat(item, options));
  SWSELogger.log('[MobilityPositioningFeatNormalization] Hooks registered');
}

export default registerMobilityPositioningFeatNormalizationHooks;
