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

function hasAreaExplosivesRule(item, source) {
  const wanted = normalizeName(source);
  return getExistingRules(item).some(rule => normalizeName(rule?.source ?? '') === wanted
    && (String(rule?.type ?? '') === 'ATTACK_OPTION'
      || String(rule?.type ?? '').startsWith('AREA_')
      || String(rule?.type ?? '').startsWith('AUTOFIRE_')
      || String(rule?.type ?? '').startsWith('GRENADE_')
      || String(rule?.type ?? '').startsWith('SPECIAL_')
      || String(rule?.type ?? '').startsWith('MOVEMENT_')));
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'targeted area') {
    return [{
      type: 'ATTACK_OPTION',
      id: 'targetedArea',
      label: 'Targeted Area',
      control: 'toggle',
      requiresAreaAttack: true,
      requiresProficientWeapon: true,
      actionEconomy: {
        type: 'riderOnly',
        spend: 'ridesAreaAttack',
        riderFor: 'areaAttack'
      },
      areaEffect: {
        advisoryOnly: true,
        explosiveRider: true,
        targetSelection: 'singleHitTargetWithinArea',
        timing: 'afterSuccessfulAreaAttackBeforeEvasion',
        canvasAutomation: false,
        note: 'Select one target hit by the area attack. That target takes +5 damage before Evasion is applied.'
      },
      damageMutation: {
        advisoryOnly: false,
        packetLevel: true,
        value: 5,
        timing: 'preEvasion',
        appliesOnlyToSelectedHitTarget: true,
        requiresProficientWeapon: true,
        note: 'Applied by DamagePacketRules before Evasion is evaluated. Spatial target eligibility is not resolved from canvas geometry.'
      },
      source: 'Targeted Area',
      summary: 'Area/explosive rider: when a successful proficient area attack hits at least one target, select one hit target in the area to take +5 damage before Evasion.'
    }];
  }

  if (normalized === 'artillery shot') {
    return [{
      type: 'AREA_ATTACK_TEMPLATE_MUTATION',
      id: 'artilleryShot',
      label: 'Artillery Shot',
      source: 'Artillery Shot',
      requiresAreaAttack: true,
      requiresProficientWeapon: true,
      requiresBurstOrSplashWeapon: true,
      requiresBeyondPointBlankRange: true,
      areaTemplateMutation: {
        addAdjacentSquares: 2,
        targetSelection: 'twoAdditionalSquaresAdjacentToNormalArea',
        appliesToBurst: true,
        appliesToSplash: true,
        advisoryOnly: false,
        canvasAutomation: false,
        note: 'When making a proficient Burst or Splash attack beyond point-blank range, affect two additional squares adjacent to the normal Burst radius or Splash area.'
      },
      summary: 'Burst/Splash area rider: beyond point-blank range, add two adjacent squares to the normal area.'
    }];
  }

  if (normalized === 'flash and clear') {
    return [{
      type: 'AREA_DAMAGE_RIDER',
      id: 'flashAndClear',
      label: 'Flash and Clear',
      source: 'Flash and Clear',
      requiresBurstOrSplashWeapon: true,
      requiresDamage: true,
      targetEffectsOnDamage: [{
        type: 'source-gains-concealment-against-target',
        sourceName: 'Flash and Clear',
        duration: 'untilBeginningOfSourceNextTurn',
        targetScoped: true,
        appliesAgainstDamagedTargetOnly: true,
        concealment: true,
        advisoryOnly: false,
        note: 'After damaging a target with a Burst or Splash weapon, the attacker gains Concealment against that damaged target until the beginning of the attacker\'s next turn.'
      }],
      summary: 'Burst/Splash damage rider: gain target-scoped concealment against each damaged target until the beginning of your next turn.'
    }];
  }

  if (normalized === 'whirlwind attack') {
    return [{
      type: 'SPECIAL_AREA_ATTACK_ACTION',
      id: 'whirlwindAttack',
      label: 'Whirlwind Attack',
      source: 'Whirlwind Attack',
      actionId: 'whirlwindAttack',
      actionEconomy: {
        type: 'full-round',
        spend: 'fullRoundAction'
      },
      requiresAttackType: 'melee',
      areaAttack: {
        usesAreaAttackRules: true,
        shape: 'meleeReachBurst',
        targetSelection: 'allTargetsWithinReach',
        oneAttackRollAppliedToAllTargets: true,
        weapon: 'melee',
        advisoryOnly: true,
        canvasAutomation: false,
        note: 'Full-round melee Area Attack. Make one attack roll and apply it to every target within reach. Final reach/target selection remains workflow/GM adjudicated.'
      },
      prerequisites: {
        dexterity: 13,
        intelligence: 13,
        feats: ['Melee Defense'],
        baseAttackBonus: 4
      },
      summary: 'Special full-round melee Area Attack action: one melee attack roll against every target within reach.'
    }];
  }

  if (normalized === 'spray shot') {
    return [{
      type: 'AUTOFIRE_SHAPE_MUTATION',
      id: 'sprayShot',
      label: 'Spray Shot',
      source: 'Spray Shot',
      requiresAutofire: true,
      requiresWeaponSetToAutofire: true,
      shapeMutation: {
        from: { shape: 'square', widthSquares: 2, heightSquares: 2, areaSquares: 4 },
        to: { shape: 'singleSquare', widthSquares: 1, heightSquares: 1, areaSquares: 1 },
        playerSelectable: true,
        advisoryOnly: false,
        note: 'When using Autofire, reduce the targeted Autofire area to 1 square.'
      },
      summary: 'Autofire rider: reduce the Autofire targeted area from 2x2 squares to 1 square.'
    }];
  }

  if (normalized === 'flood of fire') {
    return [{
      type: 'AUTOFIRE_TARGET_DEFENSE_RIDER',
      id: 'floodOfFire',
      label: 'Flood of Fire',
      source: 'Flood of Fire',
      requiresAutofire: true,
      requiresAreaAttack: true,
      requiresProficientWeapon: true,
      targetDefenseMutation: {
        defense: 'reflex',
        removeDodgeBonuses: true,
        removeDeflectionBonuses: true,
        appliesToAllTargetsInArea: true,
        appliesToThisAttackOnly: true,
        advisoryOnly: false,
        note: 'All targets in the Autofire area lose dodge and deflection bonuses to Reflex Defense against this Autofire attack.'
      },
      summary: 'Autofire rider: proficient Autofire Area Attack causes all targets in the area to lose dodge and deflection bonuses to Reflex Defense for that attack.'
    }];
  }

  if (normalized === 'forceful blast') {
    return [{
      type: 'GRENADE_DAMAGE_RIDER',
      id: 'forcefulBlast',
      label: 'Forceful Blast',
      source: 'Forceful Blast',
      requiresAttackType: 'grenade',
      requiresWeaponCategory: ['grenade', 'thermalDetonator'],
      requiresDamage: true,
      targetEligibility: {
        maxSize: 'large',
        cannotBeGrabbed: true,
        cannotBeGrappled: true
      },
      compareAttackRollToDefense: 'fortitude',
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
        note: 'On grenade/thermal detonator damage against a Large or smaller target, compare the attack roll to Fortitude Defense; on success, the attacker may move the target 1 square in any direction as a free action. No automatic token movement.'
      }],
      prerequisites: {
        feats: ['Weapon Proficiency (Simple Weapons)'],
        baseAttackBonus: 1
      },
      summary: 'Grenade damage rider: damaging grenade/thermal detonator can move each eligible target 1 square if attack roll equals or exceeds Fortitude Defense.'
    }];
  }

  if (normalized === 'strafe') {
    return [{
      type: 'AUTOFIRE_SHAPE_MUTATION',
      id: 'strafe',
      label: 'Strafe',
      source: 'Strafe',
      requiresAutofire: true,
      requiresWeaponSetToAutofire: true,
      shapeMutation: {
        from: { shape: 'square', widthSquares: 2, heightSquares: 2, areaSquares: 4 },
        to: { shape: 'line', widthSquares: 1, lengthSquares: 4, areaSquares: 4 },
        playerSelectable: true,
        advisoryOnly: false,
        jetPackSpecial: {
          canTargetSquaresFlownOver: true,
          advisoryOnly: true
        },
        note: 'When using Autofire, replace the normal 2x2 area with a line 1 square wide and 4 squares long. Jet Pack path targeting remains workflow/GM adjudicated.'
      },
      prerequisites: {
        baseAttackBonus: 1
      },
      summary: 'Autofire rider: replace the normal 2x2 Autofire area with a 1x4 line; with a Jet Pack, may target squares flown over.'
    }];
  }

  if (normalized === 'mobility') {
    return [{
      type: 'MOVEMENT_DEFENSE_ADVISORY',
      id: 'mobility',
      label: 'Mobility',
      defenseModifier: {
        target: 'defense.reflex',
        type: 'dodge',
        value: 5,
        appliesAgainst: 'attacksOfOpportunityProvokedByMovement'
      },
      source: 'Mobility',
      summary: 'Advisory +5 dodge bonus to Reflex Defense against attacks of opportunity provoked by movement. Applied when the AoO workflow supplies that context.'
    }];
  }

  return null;
}

async function normalizeAreaExplosivesFeat(item, options = {}) {
  if (options?.swseAreaExplosivesFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;
  if (hasAreaExplosivesRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'area_explosives_metadata',
      'system.abilityMeta.applicationScope': 'area_attack_autofire_or_explosive_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': [
        ...getExistingRules(item),
        ...rules
      ]
    }], {
      source: 'AreaExplosivesFeatNormalization.normalize',
      swseAreaExplosivesFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[AreaExplosivesFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerAreaExplosivesFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeAreaExplosivesFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeAreaExplosivesFeat(item, options));
  SWSELogger.log('[AreaExplosivesFeatNormalization] Hooks registered');
}

export default registerAreaExplosivesFeatNormalizationHooks;
