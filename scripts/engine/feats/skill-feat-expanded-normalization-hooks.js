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

function advisoryRule({ id, label, skillKeys = ['any'], summary, sourceBook, data = {} }) {
  return {
    type: 'SKILL_ADVISORY',
    id,
    label,
    skillKeys,
    advisoryOnly: true,
    sourceBook,
    summary,
    ...clone(data)
  };
}

function scavengeRules() {
  return [
    {
      type: 'EXTRA_SKILL_USE_GRANT',
      id: 'scavenger-scavenge-building-materials',
      label: 'Scavenge Building Materials',
      skillKeys: ['perception'],
      extraUse: {
        id: 'perception.scavenge-building-materials',
        key: 'scavenge-building-materials',
        name: 'Scavenge Building Materials',
        skill: 'perception',
        actionCost: '1 hour',
        valueFormula: 'checkTotal * 30',
        valueUnit: 'credits',
        applyToward: 'singleObjectConstruction',
        oncePerObject: true
      },
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'Spend 1 hour scavenging Vehicles or objects; generate raw materials worth Perception check result x 30 credits for one object under construction.'
    },
    advisoryRule({
      id: 'scavenger-materials-inventory-boundary',
      label: 'Scavenger: Materials Boundary',
      skillKeys: ['perception'],
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'Raw materials should be tracked against a single construction project; do not automatically credit the actor.',
      data: { automationBoundary: 'constructionLedger', preventsCreditGrant: true }
    })
  ];
}

function impersonateRules() {
  return [{
    type: 'EXTRA_SKILL_USE_GRANT',
    id: 'impersonate-specific-person',
    label: 'Impersonate Specific Person',
    skillKeys: ['deception'],
    extraUse: {
      id: 'deception.impersonate-specific-person',
      key: 'impersonate-specific-person',
      name: 'Impersonate Specific Person',
      skill: 'deception',
      dcBand: 'moderate',
      changesVoice: true,
      tags: ['deception', 'shapeshift', 'impersonation']
    },
    sourceBook: 'Scum and Villainy',
    summary: 'Use Deception to alter features and voice to match a specific person; always treat as a Moderate Deception.'
  }];
}

function hideousVisageRules() {
  return [{
    type: 'COMBAT_SKILL_ACTION_GRANT',
    id: 'hideous-visage-fear-mask',
    label: 'Hideous Visage',
    skillKeys: ['deception'],
    actionCost: 'swift',
    oncePer: 'encounter',
    opposedDefense: 'will',
    targetLimit: 1,
    requiresLineOfSight: true,
    mindAffecting: true,
    fear: true,
    successRider: {
      forcedMovementSquares: 1,
      forcedMovementDirection: 'awayFromActor',
      attackPenalty: -1,
      attackPenaltyDuration: 'untilStartOfYourNextTurn'
    },
    sourceBook: 'Scum and Villainy',
    summary: 'Once per encounter as a swift action, Deception vs Will against a visible opponent; on success move it 1 square away and apply -1 attacks until your next turn.'
  }];
}

function droidcraftRules() {
  return [{
    type: 'EXTRA_SKILL_USE_ACTION_ECONOMY_OVERRIDE',
    id: 'droidcraft-repair-droid-time',
    label: 'Droidcraft',
    skillKeys: ['mechanics'],
    extraUses: ['mechanics.repair-droid'],
    actionEconomy: {
      replacesTimeRequiredWith: '10 minutes',
      normalTimeRequired: '1 hour',
      appliesTo: ['repairDroid']
    },
    sourceBook: 'Clone Wars Campaign Guide',
    summary: 'Use Repair Droid in 10 minutes instead of 1 hour.'
  }];
}

function experiencedMedicRules() {
  return [{
    type: 'EXTRA_SKILL_USE_MULTITARGET_OVERRIDE',
    id: 'experienced-medic-multi-surgery',
    label: 'Experienced Medic',
    skillKeys: ['treatInjury'],
    extraUses: ['treat-injury.surgery'],
    maxTargetsFormula: 'max(2, int.mod)',
    checkPerTarget: true,
    sourceBook: 'Clone Wars Campaign Guide',
    summary: 'Perform Surgery on up to Intelligence modifier creatures, minimum 2, simultaneously; roll Treat Injury for each target.'
  }];
}

function expertDroidRepairRules() {
  return [{
    type: 'EXTRA_SKILL_USE_MULTITARGET_OVERRIDE',
    id: 'expert-droid-repair-multi-repair-droid',
    label: 'Expert Droid Repair',
    skillKeys: ['mechanics'],
    extraUses: ['mechanics.repair-droid'],
    maxTargetsFormula: 'max(2, int.mod)',
    checkPerTarget: true,
    sourceBook: 'Clone Wars Campaign Guide',
    summary: 'Use Repair Droid on up to Intelligence modifier droids, minimum 2, simultaneously; roll Mechanics for each droid.'
  }];
}

function unwaveringResolveRules() {
  return [{
    type: 'DEFENSE_SKILL_OPPOSED_BONUS',
    id: 'unwavering-resolve-deception-persuasion-will',
    label: 'Unwavering Resolve',
    defense: 'will',
    value: 5,
    bonusType: 'insight',
    againstSkillChecks: ['deception', 'persuasion'],
    sourceBook: 'Clone Wars Campaign Guide',
    summary: '+5 insight bonus to Will Defense against Deception and Persuasion checks.'
  }];
}

function biotechSurgeryRules() {
  return [
    {
      type: 'EXTRA_SKILL_USE_GRANT',
      id: 'biotech-surgery-install-bio-implant',
      label: 'Install Bio-Implant',
      skillKeys: ['treatInjury'],
      extraUse: {
        id: 'treat-injury.install-bio-implant',
        key: 'install-bio-implant',
        name: 'Install Bio-Implant',
        skill: 'treatInjury',
        trainedOnly: true,
        actionCost: '1 hour',
        dc: 20,
        retry: 'afterAnotherUninterruptedHour',
        selfInstallPenalty: -5
      },
      sourceBook: 'Legacy Era Campaign Guide',
      summary: 'Install Bio-Implants with 1 hour uninterrupted work and DC 20 Treat Injury; Surgical Expertise reduces time to 10 minutes.'
    },
    {
      type: 'EXTRA_SKILL_USE_ACTION_ECONOMY_OVERRIDE',
      id: 'biotech-surgery-surgical-expertise-time',
      label: 'Biotech Surgery: Surgical Expertise',
      skillKeys: ['treatInjury'],
      extraUses: ['treat-injury.install-bio-implant'],
      requiresFeat: 'Surgical Expertise',
      actionEconomy: { replacesTimeRequiredWith: '10 minutes', normalTimeRequired: '1 hour', appliesTo: ['bioImplantInstallation'] },
      sourceBook: 'Legacy Era Campaign Guide',
      summary: 'If the actor has Surgical Expertise, install a Bio-Implant in 10 minutes instead of 1 hour.'
    }
  ];
}

function vehicleSystemsExpertiseRules() {
  return [{
    type: 'EXTRA_SKILL_USE_ACTION_ECONOMY_OVERRIDE',
    id: 'vehicle-systems-expertise-shield-power-actions',
    label: 'Vehicle Systems Expertise',
    skillKeys: ['mechanics'],
    extraUses: ['mechanics.recharge-shields', 'mechanics.reroute-power'],
    actionEconomy: {
      normalSwiftActions: 3,
      swiftActions: 2,
      oncePerEncounterSwiftAction: true,
      oncePerEncounterDc: 30,
      checkSkill: 'mechanics'
    },
    sourceBook: 'Legacy Era Campaign Guide',
    summary: 'Recharge Shields or Reroute Power with two swift actions; once per encounter attempt either as one swift action with DC 30 Mechanics.'
  }];
}

function diveForCoverRules() {
  return [{
    type: 'REACTION_MOVEMENT_COVER_RIDER',
    id: 'dive-for-cover-ranged-target-reaction',
    label: 'Dive for Cover',
    skillKeys: ['jump'],
    actionCost: 'reaction',
    oncePer: 'turn',
    trigger: 'targetedByRangedAttack',
    movementCheck: 'longJump',
    grantsCoverIfDestinationProvidesCover: true,
    landsProne: true,
    sourceBook: 'Galaxy at War',
    summary: 'Once per turn as a reaction to being targeted by a ranged attack, Long Jump into cover; gain that cover bonus for the attack and land prone.'
  }];
}

function fortifyingRecoveryRules() {
  return [{
    type: 'RECOVER_ACTION_RIDER',
    id: 'fortifying-recovery-bonus-hit-points',
    label: 'Fortifying Recovery',
    trigger: 'recoverAction',
    bonusHitPointsFormula: 'max(2, 2 * con.mod)',
    bonusHitPointsStacking: 'doNotStack',
    expires: 'encounterEnd',
    sourceBook: 'Galaxy at War',
    summary: 'When taking Recover, gain bonus hit points equal to 2 x Constitution bonus, minimum 2, until encounter end.'
  }];
}

function missionSpecialistRules() {
  return [{
    type: 'AURA_SKILL_BONUS',
    id: 'mission-specialist-trained-skill-aura',
    label: 'Mission Specialist',
    requiresConfiguration: true,
    configurationKey: 'missionSpecialistSkill',
    selectedSkillMustBeTrained: true,
    targetFilter: 'alliesUntrainedInSelectedSkill',
    rangeSquares: 12,
    value: 2,
    bonusType: 'competence',
    forceSensitivityRequiredForUseTheForce: true,
    sourceBook: 'Galaxy at War',
    summary: 'Choose one trained skill. Untrained allies within 12 squares gain +2 competence to that skill; Use the Force requires Force Sensitivity.'
  }];
}

function neverSurrenderRules() {
  return [{
    type: 'ZERO_HP_REACTION_SKILL_GATE',
    id: 'never-surrender-endurance-save',
    label: 'Never Surrender',
    skillKeys: ['endurance'],
    actionCost: 'reaction',
    oncePer: 'encounter',
    trigger: 'firstReducedToZeroHitPoints',
    dcFormula: 'incomingDamage',
    successHitPoints: 1,
    sourceBook: 'Galaxy at War',
    summary: 'First time each encounter incoming damage would reduce you to 0 HP, make Endurance vs damage dealt; on success remain at 1 HP.'
  }];
}

function riskTakerRules() {
  return [
    {
      type: 'SKILL_FAILURE_THRESHOLD_OVERRIDE',
      id: 'risk-taker-climb-fall-threshold',
      label: 'Risk Taker',
      skillKeys: ['climb'],
      failureConsequence: 'fall',
      fallOnlyIfFailBy: 10,
      normalFallIfFailBy: 5,
      sourceBook: 'Galaxy at War',
      summary: 'Fall only if you fail a Climb check by 10 or more.'
    },
    {
      type: 'SKILL_FORCE_POINT_DISTANCE_RIDER',
      id: 'risk-taker-jump-force-point-distance',
      label: 'Risk Taker: Jump Recovery',
      skillKeys: ['jump'],
      cost: 'forcePoint',
      actionCost: 'free',
      trigger: 'jumpWouldMissSafeSurface',
      addForcePointRollToDistance: true,
      mustLandFirstAvailableSafeSquare: true,
      sourceBook: 'Galaxy at War',
      summary: 'If a failed Jump would miss safe ground, spend a Force Point as a free action and add it to distance; land in first available safe square.'
    }
  ];
}

function staggeringAttackGawRules() {
  return [{
    type: 'ATTACK_OPTION_SKILL_PENALTY_RIDER',
    id: 'staggering-attack-gaw-skill-penalty',
    label: 'Staggering Attack',
    attackType: 'melee',
    requiresProficientWeapon: true,
    options: [
      { attackPenalty: -2, targetSkillPenalty: -2 },
      { attackPenalty: -5, targetSkillPenalty: -5 }
    ],
    requiresDamage: true,
    targetPenaltyDuration: 'untilEndOfYourNextTurn',
    sourceBook: 'Galaxy at War',
    summary: 'With a proficient melee weapon, take -2 or -5 attack; if damage is dealt, target takes the same penalty to skill checks until end of your next turn.'
  }];
}

function droidFocusRules() {
  return [{
    type: 'CONFIGURED_CONTEXTUAL_BONUS',
    id: 'droid-focus-selected-degree',
    label: 'Droid Focus',
    requiresConfiguration: true,
    configurationKey: 'droidDegree',
    configurationChoices: ['1st-degree', '2nd-degree', '3rd-degree', '4th-degree', '5th-degree'],
    skillBonuses: [{
      skillKeys: ['deception', 'mechanics', 'perception', 'persuasion', 'useComputer'],
      value: 1,
      appliesWhen: 'onOrAgainstConfiguredDroidDegree'
    }],
    defenseBonuses: [{
      defenses: ['reflex', 'fortitude', 'will'],
      value: 1,
      appliesAgainst: 'attackRollsAndSkillChecksFromConfiguredDroidDegree'
    }],
    sourceBook: "Scavenger's Guide to Droids",
    summary: 'Choose one droid degree. Gain +1 to listed skills on/against that degree and +1 defenses against attacks and skill checks from that degree. Requires feat-choice modal.'
  }];
}

function rulesForExpandedSkillFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'scavenger') return scavengeRules();
  if (normalized === 'impersonate') return impersonateRules();
  if (normalized === 'hideous visage') return hideousVisageRules();
  if (normalized === 'droidcraft') return droidcraftRules();
  if (normalized === 'experienced medic') return experiencedMedicRules();
  if (normalized === 'expert droid repair') return expertDroidRepairRules();
  if (normalized === 'unwavering resolve') return unwaveringResolveRules();
  if (normalized === 'biotech surgery') return biotechSurgeryRules();
  if (normalized === 'vehicle systems expertise') return vehicleSystemsExpertiseRules();
  if (normalized === 'dive for cover') return diveForCoverRules();
  if (normalized === 'fortifying recovery') return fortifyingRecoveryRules();
  if (normalized === 'mission specialist') return missionSpecialistRules();
  if (normalized === 'never surrender') return neverSurrenderRules();
  if (normalized === 'risk taker') return riskTakerRules();
  if (normalized === 'staggering attack' || normalized === 'staggering attack gaw') return staggeringAttackGawRules();
  if (normalized === 'droid focus') return droidFocusRules();
  return [];
}

async function normalizeExpandedSkillFeat(item, options = {}) {
  if (options?.swseExpandedSkillFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  const rules = rulesForExpandedSkillFeat(item.name);
  if (!rules.length) return false;

  const existingRules = asArray(item.system?.abilityMeta?.rules);
  const newRules = rules.filter(rule => !hasRule(item, rule.id));
  if (!newRules.length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'skill_feat_rule',
      'system.abilityMeta.applicationScope': 'roll_action_or_combat_context',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.rules': [...existingRules, ...newRules]
    }], {
      source: 'ExpandedSkillFeats.normalization',
      swseExpandedSkillFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[ExpandedSkillFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerExpandedSkillFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeExpandedSkillFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeExpandedSkillFeat(item, options));
  SWSELogger.log('[ExpandedSkillFeats] Normalization hooks registered');
}

export { normalizeExpandedSkillFeat, rulesForExpandedSkillFeat };

export default registerExpandedSkillFeatNormalizationHooks;
