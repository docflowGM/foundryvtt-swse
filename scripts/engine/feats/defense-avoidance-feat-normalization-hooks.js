import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getDefenseRules(item) {
  return asArray(item?.system?.abilityMeta?.defenseRules);
}

function getResourceRules(item) {
  const rules = item?.system?.abilityMeta?.resourceRules;
  return rules && typeof rules === 'object' ? rules : {};
}

function hasDefenseAvoidanceRule(item, source) {
  const wanted = normalizeName(source);
  const defenseHit = getDefenseRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
  const resourceRules = getResourceRules(item);
  const resourceHit = Object.values(resourceRules).flatMap(asArray).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
  return defenseHit || resourceHit;
}

function staticDefenseBonus({ id, label, target, value, type = 'feat', source, summary }) {
  return {
    type: 'STATIC_DEFENSE_BONUS',
    id,
    label,
    target,
    value,
    bonusType: type,
    source,
    summary
  };
}

function buildPayloadForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'great fortitude') {
    return {
      defenseRules: [staticDefenseBonus({
        id: 'greatFortitude',
        label: 'Great Fortitude',
        target: 'defense.fortitude',
        value: 2,
        source: 'Great Fortitude',
        summary: 'Adds +2 feat bonus to Fortitude Defense.'
      })]
    };
  }

  if (normalized === 'lightning reflexes') {
    return {
      defenseRules: [staticDefenseBonus({
        id: 'lightningReflexes',
        label: 'Lightning Reflexes',
        target: 'defense.reflex',
        value: 2,
        source: 'Lightning Reflexes',
        summary: 'Adds +2 feat bonus to Reflex Defense.'
      })]
    };
  }

  if (normalized === 'improved damage threshold') {
    return {
      resourceRules: {
        damageThreshold: [{
          type: 'FLAT_BONUS',
          value: 5,
          source: 'Improved Damage Threshold',
          summary: 'Adds +5 to Damage Threshold.'
        }]
      },
      defenseRules: [{
        type: 'DAMAGE_THRESHOLD_BONUS',
        id: 'improvedDamageThreshold',
        value: 5,
        source: 'Improved Damage Threshold',
        summary: 'Adds +5 to Damage Threshold; consumed by MetaResourceFeatResolver damageThreshold rules.'
      }]
    };
  }

  if (normalized === 'fight through pain') {
    return {
      resourceRules: {
        damageThreshold: [{
          type: 'USE_WILL_AS_BASE',
          useBest: true,
          source: 'Fight Through Pain',
          summary: 'Allows damage threshold calculations to use the better of Fortitude or Will when supported by the damage-threshold resolver.'
        }]
      },
      defenseRules: [{
        type: 'DAMAGE_THRESHOLD_BASE_OVERRIDE',
        id: 'fightThroughPain',
        useWillAsBase: true,
        useBestFortitudeOrWill: true,
        source: 'Fight Through Pain',
        summary: 'Damage Threshold base override metadata; consumed by MetaResourceFeatResolver damageThreshold rules.'
      }]
    };
  }

  if (normalized === 'tumble defense') {
    return {
      defenseRules: [{
        type: 'TUMBLE_DC_RIDER',
        id: 'tumbleDefense',
        label: 'Tumble Defense',
        source: 'Tumble Defense',
        trigger: 'opponentTumblesThroughThreatenedSquare',
        requiresThreatenedSquare: true,
        requiresMeleeWeapon: true,
        requiresProficientWeapon: true,
        disabledWhenActorFlatFooted: true,
        dcBonus: {
          ability: 'baseAttackBonus',
          target: 'acrobatics.tumble.dc',
          advisoryOnly: true
        },
        failureRider: {
          type: 'attackOfOpportunityAvailable',
          advisoryOnly: true
        },
        summary: 'When an opponent tumbles through a threatened square, add this actor\'s BAB to the Acrobatics Tumble DC if the actor is not flat-footed and threatens with a proficient melee weapon.'
      }]
    };
  }

  if (normalized === 'predictive defense') {
    return {
      defenseRules: [{
        type: 'DEFENSE_ABILITY_SUBSTITUTION_ADVISORY',
        id: 'predictiveDefense',
        label: 'Predictive Defense',
        source: 'Predictive Defense',
        defense: 'reflex',
        useEitherAbilityModifier: ['dexterity', 'intelligence'],
        prerequisite: { ability: 'intelligence', minimum: 13 },
        advisoryOnly: true,
        summary: 'Advisory: actor may use either Dexterity or Intelligence modifier to determine Reflex Defense. Character defense ability selection remains sheet/player handled.'
      }]
    };
  }

  if (normalized === 'moving target') {
    return {
      defenseRules: [{
        type: 'ACTIVATED_DEFENSE_RIDER',
        id: 'movingTarget',
        label: 'Moving Target',
        source: 'Moving Target',
        prerequisiteFeat: 'Dodge',
        trigger: 'endTurnMovedAtLeastThreeSquares',
        activation: {
          distanceFromStartMinimumSquares: 3,
          timing: 'endOfTurn',
          expires: 'startOfNextTurn',
          playerSelectable: true
        },
        defenseModifier: {
          target: 'defense.reflex',
          value: 1,
          type: 'dodge'
        },
        summary: 'Activated defense rider: if the actor ends its turn at least 3 squares from where it started, gain +1 dodge bonus to Reflex Defense until start of next turn.'
      }]
    };
  }

  if (normalized === 'trench warrior') {
    return {
      defenseRules: [{
        type: 'ATTACK_ADVISORY_OPTION',
        id: 'trenchWarrior',
        label: 'Trench Warrior',
        source: 'Trench Warrior',
        trigger: 'playerSelectedCoverAttackOption',
        selection: {
          key: 'trenchWarrior',
          label: 'Trench Warrior',
          prompt: 'Apply Trench Warrior? You are adjacent to cover that protects you from the target\'s ranged attacks.',
          playerSelectable: true,
          defaultSelected: false
        },
        attack: {
          bonus: 1,
          target: 'attack.roll',
          bonusType: 'circumstance',
          requiresAdjacentCoverAgainstTargetRangedAttacks: true,
          advisoryOnly: true
        },
        summary: 'Opt-in advisory attack option: +1 circumstance bonus when adjacent to a wall/object that gives cover from the target\'s ranged attacks.'
      }]
    };
  }

  if (normalized === 'cunning attack') {
    return {
      defenseRules: [{
        type: 'ATTACK_ADVISORY_OPTION',
        id: 'cunningAttack',
        label: 'Cunning Attack',
        source: 'Cunning Attack',
        trigger: 'playerSelectedTargetFlatFootedOrDeniedDex',
        selection: {
          key: 'cunningAttack',
          label: 'Cunning Attack',
          prompt: 'Apply Cunning Attack? Target is flat-footed or denied Dexterity bonus to Reflex Defense.',
          playerSelectable: true,
          defaultSelected: false,
          enablesTargetDeniedDexFeatContext: true
        },
        attack: {
          bonus: 2,
          target: 'attack.roll',
          bonusType: 'feat',
          requiresTargetFlatFootedOrDeniedDex: true,
          advisoryOnly: true
        },
        targetState: 'flatFootedOrDeniedDexToReflex',
        summary: 'Opt-in advisory attack option: +2 attack bonus against a flat-footed target or one denied Dexterity bonus to Reflex Defense.'
      }]
    };
  }

  if (normalized === 'resilient strength') {
    return {
      defenseRules: [{
        type: 'DEFENSE_ABILITY_SUBSTITUTION_ADVISORY',
        id: 'resilientStrength',
        label: 'Resilient Strength',
        source: 'Resilient Strength',
        defense: 'fortitude',
        useEitherAbilityModifier: ['strength', 'constitution'],
        prerequisite: { ability: 'strength', minimum: 13 },
        advisoryOnly: true,
        summary: 'Advisory: actor may use either Strength or Constitution modifier to determine Fortitude Defense. Character defense ability selection remains sheet/player handled.'
      }]
    };
  }

  if (normalized === 'wary defender') {
    return {
      defenseRules: [{
        type: 'FIGHT_DEFENSIVELY_DEFENSE_RIDER',
        id: 'waryDefender',
        label: 'Wary Defender',
        source: 'Wary Defender',
        trigger: 'fightDefensivelyAction',
        requiresFightDefensively: true,
        expires: 'beginningOfNextTurn',
        defenseModifiers: [
          { target: 'defense.fortitude', value: 2, type: 'competence' },
          { target: 'defense.will', value: 2, type: 'competence' }
        ],
        summary: 'Fight Defensively rider: gain +2 competence bonus to Fortitude Defense and Will Defense until beginning of next turn.'
      }]
    };
  }

  return null;
}

async function normalizeDefenseAvoidanceFeat(item, options = {}) {
  if (options?.swseDefenseAvoidanceFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const payload = buildPayloadForFeat(item.name);
  if (!payload) return false;
  if (hasDefenseAvoidanceRule(item, item.name)) return false;

  const currentResourceRules = getResourceRules(item);
  const mergedResourceRules = { ...currentResourceRules };
  for (const [key, rules] of Object.entries(payload.resourceRules ?? {})) {
    mergedResourceRules[key] = [...asArray(currentResourceRules[key]), ...asArray(rules)];
  }

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'defense_avoidance_rule',
      'system.abilityMeta.applicationScope': 'defense_attack_or_damage_threshold_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.defenseRules': [
        ...getDefenseRules(item),
        ...asArray(payload.defenseRules)
      ],
      'system.abilityMeta.resourceRules': mergedResourceRules
    }], {
      source: 'DefenseAvoidanceFeatNormalization.normalize',
      swseDefenseAvoidanceFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[DefenseAvoidanceFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerDefenseAvoidanceFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeDefenseAvoidanceFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeDefenseAvoidanceFeat(item, options));
  SWSELogger.log('[DefenseAvoidanceFeatNormalization] Hooks registered');
}

export default registerDefenseAvoidanceFeatNormalizationHooks;
