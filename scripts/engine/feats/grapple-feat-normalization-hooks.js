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
      clearsGrapple: true,
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

  if (normalized === 'bone crusher') {
    return [{
      type: 'CONDITION_SHIFT_ON_GRAPPLE_DAMAGE',
      id: 'boneCrusherConditionShiftOnGrappleDamage',
      source: 'Bone Crusher',
      trigger: 'damageToGrappledOpponent',
      requiresTargetState: ['grappled', 'pinned'],
      steps: 1,
      summary: 'When you deal damage to a Grappled opponent, the target moves -1 step on the Condition Track.'
    }];
  }

  if (normalized === 'grapple resistance') {
    return [{
      type: 'RESIST_GRAB_AND_GRAPPLE',
      id: 'grappleResistancePlusFive',
      source: 'Grapple Resistance',
      bonus: 5,
      modes: ['resistGrab', 'resistGrapple'],
      objectReflexBonus: 5,
      summary: '+5 Reflex Defense against enemy Grab/Grapple attacks, +5 opposed Grapple checks, and +5 Reflex Defense for held/carried objects when attacked.'
    }];
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

  if (normalized === 'pincer') {
    return [{
      type: 'PIN_MAINTENANCE_AND_CRUSH',
      id: 'pincerMaintainPinAndCrush',
      source: 'Pincer',
      actionId: 'pincer',
      actionType: 'swift',
      requiresTargetState: 'pinned',
      requiresAppendageType: ['claw', 'hand'],
      canMaintainPinBeyondOneRound: true,
      subsequentGrappleCheckActionType: 'swift',
      mayApplyCrushOnSuccessfulCheck: true,
      delegatesTo: 'GrappleFeatActions.pincer',
      summary: 'While a target is already Pinned, maintain the Pin beyond 1 round with a Swift Action grapple check and apply Crush whenever the subsequent check succeeds.'
    }];
  }

  if (normalized === 'slammer') {
    return [{
      type: 'SLAMMER_SPECIAL_ATTACK',
      id: 'slammerAppendageCrushAttack',
      source: 'Slammer',
      actionId: 'slammer',
      actionType: 'standard',
      attackType: 'melee',
      requiresDroid: true,
      requiresMinimumSize: 'small',
      requiresAppendageCount: 2,
      damageAbility: 'strength',
      damageAbilityMultiplier: 2,
      persistentConditionOnThreshold: true,
      crushFeatAddsUnarmedDamageDie: true,
      delegatesTo: 'GrappleFeatActions.slammer',
      summary: 'Standard Action special melee attack using two appendages; deals unarmed damage with double Strength bonus, marks a Persistent Condition on threshold exceedance, and gains +1 unarmed die if the actor has Crush.'
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
      delegatesTo: 'GrappleFeatActions.knockHeads',
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
