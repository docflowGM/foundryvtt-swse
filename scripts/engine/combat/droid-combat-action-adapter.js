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
      domain: 'character',
      category: 'combat',
      actionType: 'full-round',
      actionTypeRaw: 'full-round',
      actionCost: 'full-round',
      cost: 1,
      summary: 'Droid-only full-round Aim variant that sets up a +5 bonus on the next qualifying attack in the following round.',
      notes: 'Full-Round Action. If you have the Aiming Accuracy feat, Aim at a target with a proficient weapon. Your next attack in the following round against that target gains +5 if the target remains in line of sight.',
      notesAdvanced: 'Workflow should create an aimed-target state with source action aiming-accuracy, target identity, selected/proficient weapon context, +5 attack bonus, and expiry after the next qualifying attack or when line of sight is lost. This action does not replace the normal Aim action; it is the droid feat-specific full-round variant.',
      restriction: 'Requires Droid, Aiming Accuracy, Point-Blank Shot, Precise Shot, a proficient weapon, and line of sight to the target. Prerequisite validation belongs to feat acquisition; action execution should validate line of sight and weapon proficiency.',
      relatedSkills: [
        { skill: 'Attack Roll', outcome: 'Creates +5 next-attack setup against aimed target in following round.' }
      ],
      sourcebook: "Star Wars Saga Edition Scavenger's Guide to Droids",
      executable: true,
      trigger: 'manual',
      resolutionMode: 'stateSetup',
      automationBoundary: 'runtime-helper',
      gmManaged: false,
      manualResolution: false,
      contextTags: ['aim', 'droid', 'fullRound', 'attackBonus', 'proficientWeapon'],
      requiredContext: [
        'Actor has Aiming Accuracy feat',
        'Actor is a Droid',
        'Selected target remains in line of sight',
        'Selected weapon is proficient'
      ],
      ruleData: {
        actionKey: 'aiming-accuracy',
        aimActionVariant: true,
        actionEconomy: 'full-round',
        attackBonus: 5,
        appliesTo: 'nextAttackAgainstAimedTargetInFollowingRound',
        expires: 'afterNextQualifyingAttackOrLineOfSightLost',
        helper: 'CombatOptionResolver.getAimActionRiders'
      }
    },
    effects: [],
    folder: null,
    sort: 4.6,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'droid-combat-feat-pass' } }
  }
];

function actorHasFeat(actor, featName) {
  const wanted = String(featName ?? '').trim().toLowerCase();
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat'
      && item?.system?.disabled !== true
      && String(item?.name ?? '').trim().toLowerCase() === wanted);
  } catch (_err) {
    return false;
  }
}

function injectActions(actions = []) {
  const existingKeys = new Set(actions.map(action => action?.system?.key ?? action?.key ?? action?._id).filter(Boolean));
  const out = [...actions];
  for (const action of DROID_COMBAT_ACTIONS) {
    if (existingKeys.has(action.system.key)) continue;
    out.push(action);
  }
  return out;
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
      if (!actor || actorHasFeat(actor, 'Aiming Accuracy')) return result;
      for (const bucket of Object.values(result)) {
        bucket.combatActions = (bucket.combatActions ?? []).filter(action => action.key !== 'aiming-accuracy');
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
  SWSELogger.log('[DroidCombatActionAdapter] Aiming Accuracy action adapter registered');
}

export default registerDroidCombatActionAdapter;
