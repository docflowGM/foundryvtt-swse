import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const DROID_COMBAT_ACTIONS = [
  {
    _id: 'droid-aiming-accuracy',
    name: 'Aiming Accuracy',
    type: 'combat-action',
    img: 'icons/svg/crosshair.svg',
    system: {
      key: 'aiming-accuracy',
      requiresFeat: 'Aiming Accuracy',
      domain: 'character',
      category: 'combat',
      actionType: 'full-round',
      actionTypeRaw: 'full-round',
      actionCost: 'full-round',
      cost: 1,
      summary: 'Droid-only full-round Aim variant that sets up a +5 bonus on the next qualifying attack in the following round.',
      notes: 'Full-Round Action. If you have the Aiming Accuracy feat, Aim at a target with a proficient weapon. Your next attack in the following round against that target gains +5 if the target remains in line of sight.',
      notesAdvanced: 'Workflow should create an aimed-target state with source action aiming-accuracy, target identity, selected/proficient weapon context, +5 attack bonus, and expiry after the next qualifying attack or when line of sight is lost.',
      restriction: 'Requires Droid, Aiming Accuracy, Point-Blank Shot, Precise Shot, a proficient weapon, and line of sight to the target.',
      relatedSkills: [{ skill: 'Attack Roll', outcome: 'Creates +5 next-attack setup against aimed target in following round.' }],
      sourcebook: "Star Wars Saga Edition Scavenger's Guide to Droids",
      executable: true,
      trigger: 'manual',
      resolutionMode: 'stateSetup',
      automationBoundary: 'runtime-helper',
      gmManaged: false,
      manualResolution: false,
      contextTags: ['aim', 'droid', 'fullRound', 'attackBonus', 'proficientWeapon'],
      requiredContext: ['Actor has Aiming Accuracy feat', 'Actor is a Droid', 'Selected target remains in line of sight', 'Selected weapon is proficient'],
      ruleData: { actionKey: 'aiming-accuracy', aimActionVariant: true, actionEconomy: 'full-round', attackBonus: 5, helper: 'CombatOptionResolver.getAimActionRiders' }
    },
    effects: [],
    folder: null,
    sort: 4.6,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-turn-and-burn-withdraw',
    name: 'Turn and Burn',
    type: 'combat-action',
    img: 'icons/svg/running.svg',
    system: {
      key: 'turn-and-burn',
      requiresFeat: 'Turn and Burn',
      domain: 'character',
      category: 'movement',
      actionType: 'move',
      actionTypeRaw: 'move/reaction',
      actionCost: 'move',
      summary: 'Enhanced Withdraw for qualifying droid locomotion; can also spend a Force Point as a Reaction when an enemy ends adjacent.',
      notes: 'Withdraw up to 2 threatened squares without provoking and move your full Speed. As a Reaction, spend a Force Point when an enemy ends movement adjacent to you to Withdraw.',
      restriction: 'Requires Droid with Hovering, Flying, Wheeled, or Tracked locomotion.',
      executable: true,
      trigger: 'manualOrReaction',
      resolutionMode: 'movementRider',
      automationBoundary: 'runtime-helper',
      contextTags: ['withdraw', 'droid', 'movement', 'reaction', 'forcePoint'],
      ruleData: { helper: 'CombatOptionResolver.getDroidMovementRiders', actionKey: 'turn-and-burn' }
    },
    effects: [],
    folder: null,
    sort: 4.61,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-shield-surge',
    name: 'Shield Surge',
    type: 'combat-action',
    img: 'icons/svg/shield.svg',
    system: {
      key: 'shield-surge',
      requiresFeat: 'Shield Surge',
      domain: 'vehicle',
      category: 'reaction',
      actionType: 'reaction',
      actionTypeRaw: 'reaction',
      actionCost: 'reaction',
      summary: 'Use a direct data link to spend remaining vehicle SR to reduce vehicle damage after SR is reduced.',
      notes: 'Reaction when your vehicle takes damage above its Shield Rating. Reduce damage by up to remaining SR; reduce SR by the same amount. Recharge Shields is blocked for a full round.',
      restriction: 'Requires Droid or Cyborg Hybrid, trained Mechanics, and a scomp/direct data link to the vehicle.',
      executable: true,
      trigger: 'vehicleDamageAfterSRReduction',
      resolutionMode: 'shieldDamageReduction',
      automationBoundary: 'runtime-helper',
      contextTags: ['vehicle', 'shieldRating', 'reaction', 'mechanics'],
      ruleData: { helper: 'CombatOptionResolver.getDroidShieldRiders', actionKey: 'shield-surge' }
    },
    effects: [],
    folder: null,
    sort: 4.62,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-sensor-link',
    name: 'Sensor Link',
    type: 'combat-action',
    img: 'icons/svg/eye.svg',
    system: {
      key: 'sensor-link',
      requiresFeat: 'Sensor Link',
      domain: 'character',
      category: 'utility',
      actionType: 'swift',
      actionTypeRaw: 'swift',
      actionCost: 'swift',
      summary: 'Broadcast sensor input to a droid ally or receiver within 24 squares.',
      notes: 'Target is aware of anything you are aware of and can Aid Another on your Perception checks without line of sight. Mutual Sensor Link grants +2 Perception.',
      restriction: 'Requires Droid or Cyborg Hybrid.',
      executable: true,
      trigger: 'manual',
      resolutionMode: 'sensorBroadcast',
      automationBoundary: 'runtime-helper',
      contextTags: ['sensor', 'perception', 'aidAnother', 'swift'],
      ruleData: { helper: 'CombatOptionResolver.getDroidSensorActions', actionKey: 'sensor-link' }
    },
    effects: [],
    folder: null,
    sort: 4.63,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-distracting-droid',
    name: 'Distracting Droid',
    type: 'combat-action',
    img: 'icons/svg/daze.svg',
    system: {
      key: 'distracting-droid',
      requiresFeat: 'Distracting Droid',
      domain: 'character',
      category: 'combat',
      actionType: 'standard',
      actionTypeRaw: 'standard',
      actionCost: 'standard',
      summary: 'Persuasion vs Will against enemies within 6 squares that can see or hear you.',
      notes: 'Success causes each affected enemy to lose one Move Action on its next turn. If you exceed Will by 10 or more, that enemy is also flat-footed until the start of your next turn. Mind-Affecting.',
      restriction: 'Requires Droid.',
      executable: true,
      trigger: 'manual',
      resolutionMode: 'areaSkillAttack',
      automationBoundary: 'runtime-helper',
      contextTags: ['persuasion', 'will', 'mindAffecting', 'area'],
      ruleData: { helper: 'CombatOptionResolver.getDistractingDroidActions', actionKey: 'distracting-droid' }
    },
    effects: [],
    folder: null,
    sort: 4.64,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-logic-upgrade-skill-swap',
    name: 'Logic Upgrade: Skill Swap',
    type: 'combat-action',
    img: 'icons/svg/upgrade.svg',
    system: {
      key: 'logic-upgrade-skill-swap',
      requiresFeat: 'Logic Upgrade: Skill Swap',
      domain: 'character',
      category: 'skill',
      actionType: 'full-round',
      actionTypeRaw: 'full-round',
      actionCost: 'full-round',
      summary: 'Temporarily swap a trained skill out to attempt the selected untrained skill.',
      notes: 'You do not count as trained in the swapped-in skill and cannot use trained-only options, but may roll it with half level and ability modifier. The original trained skill gives no trained benefit while swapped out.',
      restriction: 'Requires Droid with Basic Processor.',
      executable: true,
      trigger: 'manual',
      resolutionMode: 'skillTrainingSwap',
      automationBoundary: 'runtime-helper',
      contextTags: ['skill', 'droid', 'fullRound'],
      ruleData: { helper: 'CombatOptionResolver.getDroidSkillSwapActions', actionKey: 'logic-upgrade-skill-swap' }
    },
    effects: [],
    folder: null,
    sort: 4.65,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-erratic-target',
    name: 'Erratic Target',
    type: 'combat-action',
    img: 'icons/svg/aura.svg',
    system: {
      key: 'erratic-target',
      requiresFeat: 'Erratic Target',
      domain: 'character',
      category: 'defense',
      actionType: 'free',
      actionTypeRaw: 'movement rider',
      actionCost: 'free',
      summary: 'Reduce Speed by up to 2 squares to gain matching Dodge bonus until your next turn.',
      notes: 'You must be using Hovering or Flying locomotion and move at least 2 squares. Each square of speed you give up grants +1 Dodge, max +2.',
      restriction: 'Requires Droid with Hovering or Flying locomotion, Dexterity 13, and Dodge.',
      executable: true,
      trigger: 'onMovement',
      resolutionMode: 'movementDefenseRider',
      automationBoundary: 'runtime-helper',
      contextTags: ['movement', 'dodge', 'defense'],
      ruleData: { helper: 'CombatOptionResolver.getDroidMovementRiders', actionKey: 'erratic-target' }
    },
    effects: [],
    folder: null,
    sort: 4.66,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-shield-mastery-recharge',
    name: 'Droid Shield Mastery',
    type: 'combat-action',
    img: 'icons/svg/regen.svg',
    system: {
      key: 'droid-shield-mastery',
      requiresFeat: 'Droid Shield Mastery',
      domain: 'character',
      category: 'shield',
      actionType: 'swift',
      actionTypeRaw: 'two swift actions',
      actionCost: 'swift',
      summary: 'Automatically restore 5 Shield Rating with two Swift Actions.',
      notes: 'Automatically succeeds on the Endurance check to restore SR by 5, up to normal SR. Requires two Swift Actions instead of three.',
      restriction: 'Requires Droid and Shield Generator accessory.',
      executable: true,
      trigger: 'manual',
      resolutionMode: 'shieldRecharge',
      automationBoundary: 'runtime-helper',
      contextTags: ['shieldRating', 'swift', 'endurance'],
      ruleData: { helper: 'CombatOptionResolver.getDroidShieldRiders', actionKey: 'droid-shield-mastery' }
    },
    effects: [],
    folder: null,
    sort: 4.67,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  },
  {
    _id: 'droid-damage-conversion',
    name: 'Damage Conversion',
    type: 'combat-action',
    img: 'icons/svg/cycle.svg',
    system: {
      key: 'damage-conversion',
      requiresFeat: 'Damage Conversion',
      domain: 'character',
      category: 'reaction',
      actionType: 'reaction',
      actionTypeRaw: 'reaction',
      actionCost: 'reaction',
      summary: 'Take escalating extra damage instead of moving down the Condition Track from a qualifying threshold hit.',
      notes: 'When non-area, non-Ion, non-Force attack damage equals or exceeds your DT, take +10 damage instead of CT movement. Each later use in the same encounter increases the extra damage by +5.',
      restriction: 'Requires Droid and Dexterity 13.',
      executable: true,
      trigger: 'damageThresholdExceeded',
      resolutionMode: 'thresholdReplacement',
      automationBoundary: 'runtime-helper',
      contextTags: ['damageThreshold', 'reaction', 'conditionTrack'],
      ruleData: { helper: 'CombatOptionResolver.getDroidThresholdRiders', actionKey: 'damage-conversion' }
    },
    effects: [],
    folder: null,
    sort: 4.68,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  }
];

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeName(featName);
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat'
      && item?.system?.disabled !== true
      && normalizeName(item?.name) === wanted);
  } catch (_err) {
    return false;
  }
}

function actionKey(action) {
  return action?.system?.key ?? action?.key ?? action?._id;
}

function injectActions(actions = []) {
  const existingKeys = new Set(actions.map(actionKey).filter(Boolean));
  const out = [...actions];
  for (const action of DROID_COMBAT_ACTIONS) {
    if (existingKeys.has(action.system.key)) continue;
    out.push(action);
  }
  return out;
}

function filterActorDroidFeatActions(actions = [], actor = null) {
  if (!actor) return actions;
  return actions.filter(action => {
    const required = action?.system?.requiresFeat;
    if (!required) return true;
    return actorHasFeat(actor, required);
  });
}

function patchMapper() {
  if (CombatActionsMapper.__swseDroidCombatActionsPatched === true) return;

  const originalEnsure = CombatActionsMapper._ensureCoreManualCombatActions?.bind(CombatActionsMapper);
  if (typeof originalEnsure === 'function') {
    CombatActionsMapper._ensureCoreManualCombatActions = function patchedDroidCombatActions(actions = []) {
      return injectActions(originalEnsure(actions));
    };
  }

  const originalGetAllActionsBySkill = CombatActionsMapper.getAllActionsBySkill?.bind(CombatActionsMapper);
  if (typeof originalGetAllActionsBySkill === 'function') {
    CombatActionsMapper.getAllActionsBySkill = function patchedDroidGetAllActionsBySkill(actor = null, options = {}) {
      const result = originalGetAllActionsBySkill(actor, options) ?? {};
      for (const bucket of Object.values(result)) {
        bucket.combatActions = filterActorDroidFeatActions(bucket.combatActions ?? [], actor);
      }
      return result;
    };
  }

  if (Array.isArray(CombatActionsMapper._combatActions)) {
    CombatActionsMapper._combatActions = injectActions(CombatActionsMapper._combatActions);
  }

  CombatActionsMapper.__swseDroidCombatActionsPatched = true;
}

export function registerDroidCombatActionAdapter() {
  if (registered) return;
  registered = true;
  patchMapper();
  SWSELogger.log('[DroidCombatActionAdapter] Droid feat action adapter registered');
}

export default registerDroidCombatActionAdapter;
