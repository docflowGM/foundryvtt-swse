import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeId(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  try { return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value)); }
  catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function hasRule(item, id) {
  const wanted = normalizeId(id);
  return asArray(item?.system?.abilityMeta?.rules).some(rule => normalizeId(rule?.id ?? rule?.key ?? rule?.ruleId) === wanted);
}

function teamSkillBonusRule({ id, label, skillKey, sourceBook = 'Galaxy at War' }) {
  return {
    type: 'TEAM_FEAT_SKILL_BONUS',
    id,
    label,
    skillKeys: [skillKey],
    teamFeat: true,
    bonusType: 'competence',
    baseValue: 3,
    perMatchingAllyWithinRange: 1,
    rangeSquares: 12,
    maxValue: 7,
    promptForMatchingAllies: true,
    sourceBook,
    summary: '+3 competence bonus to the listed skill; increase by +1 for each ally within 12 squares who also has this Team Feat, to a maximum of +7.'
  };
}

function secondaryRule(rule) {
  return { sourceBook: 'Galaxy at War', ...clone(rule) };
}

const TEAM_FEAT_DEFINITIONS = Object.freeze({
  'nimble team': {
    label: 'Nimble Team',
    skillKey: 'acrobatics',
    secondary: [{
      type: 'EXTRA_SKILL_USE_DISTANCE_RIDER',
      id: 'nimble-team-extra-tumble-square',
      label: 'Nimble Team: Tumble Distance',
      skillKeys: ['acrobatics'],
      extraUses: ['acrobatics.tumble'],
      extraSquares: 1,
      summary: 'When using Acrobatics to Tumble, the actor can Tumble 1 extra square.'
    }]
  },
  'ascension specialists': {
    label: 'Ascension Specialists',
    skillKey: 'climb',
    secondary: [{
      type: 'MOVEMENT_SKILL_RIDER',
      id: 'ascension-specialists-climb-speed',
      label: 'Ascension Specialists: Climb Speed',
      skillKeys: ['climb'],
      movementMode: 'climb',
      moveActionSpeedFraction: 0.5,
      fullRoundSpeedFraction: 1,
      summary: 'When climbing, climb at half speed as a move action or normal speed as a full-round action.'
    }]
  },
  'tireless squad': {
    label: 'Tireless Squad',
    skillKey: 'endurance',
    secondary: [{
      type: 'AID_ANOTHER_BONUS_OVERRIDE',
      id: 'tireless-squad-endurance-aid-another',
      label: 'Tireless Squad: Endurance Aid',
      skillKeys: ['endurance'],
      aidAnotherBonus: 4,
      normalAidAnotherBonus: 2,
      targetMustHaveSameFeat: true,
      summary: 'When using Aid Another on an ally with this feat for an Endurance check, provide +4 instead of +2.'
    }]
  },
  'unhindered approach': {
    label: 'Unhindered Approach',
    skillKey: 'jump',
    secondary: [{
      type: 'MOVEMENT_SKILL_RIDER',
      id: 'unhindered-approach-jump-distance',
      label: 'Unhindered Approach: Jump Distance',
      skillKeys: ['jump'],
      jumpDistanceBonusSquares: 1,
      summary: 'When using Jump, add 1 square to total jump distance.'
    }]
  },
  'technical experts': {
    label: 'Technical Experts',
    skillKey: 'mechanics',
    secondary: [{
      type: 'AID_ANOTHER_BONUS_OVERRIDE',
      id: 'technical-experts-mechanics-aid-another',
      label: 'Technical Experts: Mechanics Aid',
      skillKeys: ['mechanics'],
      aidAnotherBonus: 4,
      normalAidAnotherBonus: 2,
      targetMustHaveSameFeat: true,
      summary: 'When using Aid Another on an ally with this feat for a Mechanics check, provide +4 instead of +2.'
    }]
  },
  'wary sentries': {
    label: 'Wary Sentries',
    skillKey: 'perception',
    secondary: [{
      type: 'SKILL_TAKE_10_OVERRIDE',
      id: 'wary-sentries-threatened-rushed-take-10',
      label: 'Wary Sentries: Take 10',
      skillKeys: ['perception'],
      mayTake10WhenThreatened: true,
      mayTake10WhenRushed: true,
      summary: 'The actor can Take 10 on Perception checks even when threatened or rushed.'
    }]
  },
  'unified squadron': {
    label: 'Unified Squadron',
    skillKey: 'pilot',
    secondary: [{
      type: 'VEHICLE_SKILL_AUTOSUCCESS_RIDER',
      id: 'unified-squadron-avoid-ally-collision',
      label: 'Unified Squadron: Avoid Allied Collision',
      skillKeys: ['pilot'],
      extraUses: ['pilot.avoid-collision'],
      automaticSuccess: true,
      appliesWhen: 'collisionWithVehiclePilotedByAllyWithSameFeat',
      preventsCollision: true,
      includesCharacterScale: true,
      summary: 'Always succeed when trying to Avoid Collision with a vehicle piloted by an ally who also has this feat, including character scale.'
    }]
  },
  'mounted regiment': {
    label: 'Mounted Regiment',
    skillKey: 'ride',
    secondary: [{
      type: 'REACTION_DEFENSE_SUBSTITUTION_RIDER',
      id: 'mounted-regiment-mount-reflex-substitution',
      label: 'Mounted Regiment: Protect Mount',
      skillKeys: ['ride'],
      actionCost: 'reaction',
      oncePer: 'round',
      trigger: 'mountAttacked',
      checkSkill: 'ride',
      targetDefense: 'mount.reflex',
      useCheckResultIfHigher: true,
      summary: 'Once per round as a reaction to the mount being attacked, make a Ride check; if it exceeds the mount\'s Reflex Defense, use the check result against the attack.'
    }]
  },
  'covert operatives': {
    label: 'Covert Operatives',
    skillKey: 'stealth',
    secondary: [{
      type: 'EXTRA_SKILL_USE_PENALTY_OVERRIDE',
      id: 'covert-operatives-stealth-movement-penalty-reduction',
      label: 'Covert Operatives: Fast Stealth',
      skillKeys: ['stealth'],
      appliesWhen: ['moveMoreThanSpeed', 'moveMoreThanTwiceSpeed'],
      penaltyReduction: 2,
      summary: 'When moving more than speed or more than twice speed, reduce the Stealth penalty by 2.'
    }]
  },
  'wilderness specialists': {
    label: 'Wilderness Specialists',
    skillKey: 'survival',
    secondary: [{
      type: 'AID_ANOTHER_BONUS_OVERRIDE',
      id: 'wilderness-specialists-survival-aid-another',
      label: 'Wilderness Specialists: Survival Aid',
      skillKeys: ['survival'],
      aidAnotherBonus: 4,
      normalAidAnotherBonus: 2,
      targetMustHaveSameFeat: true,
      summary: 'When using Aid Another on an ally with this feat for a Survival check, provide +4 instead of +2.'
    }]
  },
  'aquatic specialists': {
    label: 'Aquatic Specialists',
    skillKey: 'swim',
    secondary: [{
      type: 'MOVEMENT_SKILL_RIDER',
      id: 'aquatic-specialists-swim-speed',
      label: 'Aquatic Specialists: Swim Speed',
      skillKeys: ['swim'],
      movementMode: 'swim',
      moveActionSpeedFraction: 0.5,
      fullRoundSpeedFraction: 1,
      summary: 'When swimming, swim at half speed as a move action or full speed as a full-round action.'
    }]
  },
  'medical team': {
    label: 'Medical Team',
    skillKey: 'treatInjury',
    secondary: [{
      type: 'AID_ANOTHER_RESULT_RIDER',
      id: 'medical-team-restore-hit-points-aid-rider',
      label: 'Medical Team: Restore Hit Points Aid',
      skillKeys: ['treatInjury'],
      targetMustHaveSameFeat: true,
      appliesWhen: 'aidAnotherToRestoreHitPoints',
      extraHitPointsRestored: 4,
      summary: 'When using Aid Another to assist an ally with this feat on a Treat Injury check to restore hit points, the ally restores +4 extra hit points to the target.'
    }]
  },
  'slicer team': {
    label: 'Slicer Team',
    skillKey: 'useComputer',
    secondary: [{
      type: 'AID_ANOTHER_BONUS_OVERRIDE',
      id: 'slicer-team-use-computer-aid-another',
      label: 'Slicer Team: Use Computer Aid',
      skillKeys: ['useComputer'],
      aidAnotherBonus: 4,
      normalAidAnotherBonus: 2,
      targetMustHaveSameFeat: true,
      summary: 'When using Aid Another on an ally with this feat for a Use Computer check, provide +4 instead of +2.'
    }]
  }
});

function rulesForTeamFeat(name) {
  const normalized = normalizeName(name);
  const def = TEAM_FEAT_DEFINITIONS[normalized];
  if (!def) return [];
  const id = `${normalizeId(def.label)}-team-skill-bonus`;
  return [
    teamSkillBonusRule({ id, label: def.label, skillKey: def.skillKey }),
    ...asArray(def.secondary).map(secondaryRule)
  ];
}

async function normalizeTeamFeat(item, options = {}) {
  if (options?.swseTeamFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  const rules = rulesForTeamFeat(item.name);
  if (!rules.length) return false;

  const existingRules = asArray(item.system?.abilityMeta?.rules);
  const newRules = rules.filter(rule => !hasRule(item, rule.id));
  if (!newRules.length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'team_skill_feat_rule',
      'system.abilityMeta.applicationScope': 'skill_roll_or_aid_context',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.rules': [...existingRules, ...newRules]
    }], {
      source: 'TeamFeats.normalization',
      swseTeamFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[TeamFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerTeamFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeTeamFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeTeamFeat(item, options));
  SWSELogger.log('[TeamFeats] Normalization hooks registered');
}

export { normalizeTeamFeat, rulesForTeamFeat };

export default registerTeamFeatNormalizationHooks;
