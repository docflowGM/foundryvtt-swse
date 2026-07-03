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
      || String(rule?.type ?? '') === 'ATTACK_OPTION'
      || String(rule?.type ?? '') === 'HIT_RIDER'));
}

function advisoryRule({ id, label, trigger, actionEconomy = 'advisory', movement = {}, attack = {}, target = {}, defense = null, source, summary }) {
  const rule = {
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
  if (defense) rule.defenseModifier = defense;
  return rule;
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'tactical advantage') {
    return [advisoryRule({
      id: 'tacticalAdvantage',
      label: 'Tactical Advantage',
      trigger: 'positioningContext',
      movement: { positioningRider: true },
      attack: { positioningDependent: true },
      source: 'Tactical Advantage',
      summary: 'Positioning-dependent tactical rider. The system records the feat metadata; exact battlefield condition and modifier application remain workflow/GM adjudicated.'
    })];
  }

  if (normalized === 'opportunistic retreat') {
    return [advisoryRule({
      id: 'opportunisticRetreat',
      label: 'Opportunistic Retreat',
      trigger: 'opportunityOrRetreatWindow',
      actionEconomy: 'reactionOrFreeMovementAdvisory',
      movement: {
        movementType: 'retreat',
        provokesAttackOfOpportunity: 'rulesTextDependent',
        canMoveAwayFromThreat: true
      },
      source: 'Opportunistic Retreat',
      summary: 'Retreat/repositioning rider. Stores the reaction/free-movement opportunity metadata without choosing a destination or validating threatened squares.'
    })];
  }

  if (normalized === 'impulsive flight') {
    return [advisoryRule({
      id: 'impulsiveFlight',
      label: 'Impulsive Flight',
      trigger: 'dangerOrPanicMovementWindow',
      actionEconomy: 'reactionMovementAdvisory',
      movement: {
        movementType: 'flight',
        forcedOrVoluntary: 'rulesTextDependent',
        canMoveAwayFromThreat: true
      },
      source: 'Impulsive Flight',
      summary: 'Flight/repositioning rider. The system records the movement opportunity but does not automate path or destination.'
    })];
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
      type: 'HIT_RIDER',
      id: 'banthaHerder',
      label: 'Bantha Herder',
      requiresAttackType: 'ranged',
      compareAttackRollToDefense: 'will',
      targetEffectsOnHit: [{
        type: 'forcedMovement',
        distanceSquares: 1,
        direction: 'any',
        requiresDamage: true,
        requiresAttackRollMeetsOrExceeds: 'target.will',
        source: 'Bantha Herder',
        advisoryOnly: true,
        note: 'On a damaging ranged hit, compare the attack roll to Will Defense; if it equals or exceeds Will, the attacker may move the target 1 square in any direction. Destination/path legality remains GM adjudicated.'
      }],
      source: 'Bantha Herder',
      summary: 'On a successful damaging ranged attack, compare the attack roll to Will Defense; if successful, move the target 1 square in any direction as a free action.'
    }];
  }

  if (normalized === 'fleet footed' || normalized === 'fleet-footed') {
    return [{
      type: 'MOVEMENT_SPEED_ADVISORY',
      id: 'fleetFooted',
      label: 'Fleet-Footed',
      movement: {
        speedBonusSquares: 2,
        appliesToBaseLandSpeed: true,
        advisoryOnly: false,
        note: 'Static speed bonus metadata for sheet/movement consumers. Actual movement path remains canvas-adjudicated.'
      },
      source: 'Fleet-Footed',
      summary: 'Records a +2-square movement speed bonus for movement-aware sheet or action workflows.'
    }];
  }

  if (normalized === 'cornered') {
    return [advisoryRule({
      id: 'cornered',
      label: 'Cornered',
      trigger: 'noSafeEscapeOrCorneredContext',
      actionEconomy: 'conditionalCombatStateAdvisory',
      movement: {
        requiresCorneredContext: true
      },
      attack: {
        conditionalCombatBonus: true
      },
      defense: {
        target: 'defense.reflex',
        type: 'conditional',
        value: null,
        appliesWhen: 'corneredContext'
      },
      source: 'Cornered',
      summary: 'Conditional cornered-state rider. Stores metadata only until the combat workflow can supply a cornered/no-escape context.'
    })];
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
