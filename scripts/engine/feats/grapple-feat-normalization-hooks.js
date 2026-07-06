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
  return asArray(item?.system?.abilityMeta?.grappleRules);
}

function hasGrappleRule(item, source) {
  const wanted = normalizeName(source);
  return getExistingRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function maneuverUnlock(maneuver, source, extra = {}) {
  return {
    type: 'UNLOCK_GRAPPLE_MANEUVER',
    maneuver,
    source,
    ...extra
  };
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'pin') {
    return [maneuverUnlock('pin', 'Pin', {
      requiresState: 'grappled',
      resultState: 'pinned',
      opposed: true,
      summary: 'Unlocks the Pin grapple action through the canonical SWSEGrappling.attemptPin path.'
    })];
  }

  if (normalized === 'trip') {
    return [maneuverUnlock('trip', 'Trip', {
      requiresState: 'grappled',
      resultCondition: 'prone',
      opposed: true,
      summary: 'Unlocks Trip Grappled Opponent through the canonical advanced grapple maneuver path.'
    })];
  }

  if (normalized === 'throw') {
    return [maneuverUnlock('throw', 'Throw', {
      requiresState: 'grappled',
      damage: true,
      clearsGrapple: true,
      movementAdvisory: {
        distance: 'up to 1 square beyond reach',
        canvasAutomation: false,
        note: 'Final thrown position remains GM/player adjudicated.'
      },
      summary: 'Unlocks Throw Grappled Opponent through the canonical advanced grapple maneuver path.'
    })];
  }

  if (normalized === 'crush') {
    return [maneuverUnlock('crush', 'Crush', {
      requiresTargetState: 'pinned',
      damage: true,
      summary: 'Unlocks Crush Pinned Opponent through the canonical advanced grapple maneuver path.'
    })];
  }

  if (normalized === 'rancor crush') {
    return [
      maneuverUnlock('crush', 'Rancor Crush', {
        requiresTargetState: 'pinned',
        damage: true,
        requiresConcurrentFeatUse: ['Pin', 'Crush'],
        summary: 'Counts as a Crush unlock for actors that receive Rancor Crush without a separate Crush metadata rule.'
      }),
      {
        type: 'CONDITION_SHIFT_ON_GRAPPLE_MANEUVER',
        id: 'rancorCrushConditionShiftOnPinCrush',
        maneuver: 'crush',
        requiresTargetState: 'pinned',
        requiresConcurrentFeatUse: ['Pin', 'Crush'],
        steps: 1,
        source: 'Rancor Crush',
        summary: 'When a Pin succeeds and Crush is used at the same time, move the target -1 step on the Condition Track in addition to Crush damage.'
      }
    ];
  }

  if (normalized === 'multi grab' || normalized === 'multi-grab') {
    return [{
      type: 'MULTI_GRAB',
      id: 'multiGrabTwoAdjacentTargets',
      source: 'Multi-Grab',
      actionId: 'multi-grab',
      actionType: 'standard',
      maxTargets: 2,
      targetSelector: 'twoTargetsAdjacentToYou',
      requiresEmptyHands: 2,
      separateAttackRolls: true,
      delegatesTo: 'GrappleFeatActions.multiGrab',
      adjacencyAdvisory: true,
      summary: 'As a Standard Action, make separate Grab attacks against up to two adjacent targets. Requires two empty hands; adjacency and hand availability are workflow/GM context.'
    }];
  }

  if (normalized === 'grab back') {
    return [{
      type: 'REACTION_GRAB_BACK',
      source: 'Grab Back',
      trigger: 'enemyFailedGrabOrGrappleAttempt',
      delegatesTo: 'GrappleFeatActions.grabBack',
      reactionAdvisory: true,
      summary: 'Reaction helper for grabbing an enemy after their failed grab/grapple attempt; trigger detection belongs to the reaction workflow.'
    }];
  }

  if (normalized === 'knock heads') {
    return [{
      type: 'GRAPPLE_ADVISORY_RIDER',
      id: 'knockHeadsMultiGrabRider',
      source: 'Knock Heads',
      trigger: 'afterSuccessfulMultiGrabAgainstTwoTargets',
      requiresManeuver: 'multi-grab',
      requiresTwoGrabbedTargets: true,
      requiresTargetsAdjacentToActorAndEachOther: true,
      immediate: true,
      damage: {
        automatic: true,
        dice: '1d6',
        abilityModifier: 'strength',
        damageType: 'bludgeoning',
        appliesToEachTarget: true
      },
      damageThresholdModifier: -5,
      preserveGrabbedState: true,
      spatialAdvisory: true,
      summary: 'After a successful Multi-Grab against two targets adjacent to you and each other, immediately deal 1d6 + Strength modifier bludgeoning damage to each, compare against DT as 5 lower, and keep both targets Grabbed.'
    }];
  }

  if (normalized === 'battering attack') {
    return [{
      type: 'GRAPPLE_ADVISORY_RIDER',
      id: 'batteringAttack',
      source: 'Battering Attack',
      trigger: 'grappleOrGrabbedTargetUsedAsImpact',
      spatialAdvisory: true,
      damageAdvisory: true,
      summary: 'Stores metadata for a grapple-position impact rider. Exact spatial setup and collateral target handling remain GM/player adjudicated.'
    }];
  }

  return null;
}

async function normalizeGrappleFeat(item, options = {}) {
  if (options?.swseGrappleFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;
  if (hasGrappleRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'grapple_rule',
      'system.abilityMeta.applicationScope': 'grapple_engine',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.grappleRules': [
        ...getExistingRules(item),
        ...rules
      ]
    }], {
      source: 'GrappleFeatNormalization.normalize',
      swseGrappleFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[GrappleFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerGrappleFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeGrappleFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeGrappleFeat(item, options));
  SWSELogger.log('[GrappleFeatNormalization] Hooks registered');
}

export default registerGrappleFeatNormalizationHooks;
