import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const GALAXY_INTRIGUE_COMBAT_ACTIONS = [
  {
    _id: 'galaxy-intrigue-grazing-shot',
    name: 'Grazing Shot',
    type: 'combat-action',
    img: 'icons/svg/target.svg',
    system: {
      key: 'grazing-shot',
      domain: 'character',
      category: 'combat',
      actionType: 'standard',
      actionTypeRaw: 'standard',
      actionCost: 'standard',
      cost: 1,
      summary: 'Make a precise ranged attack that can split one damage roll between two targets if both attack rolls hit.',
      notes: 'Standard Action. Make a ranged attack against a single target. If that attack hits, make a second attack roll against an additional target in direct line of sight and no farther than 6 squares from the original target. If the second attack hits, roll damage once and split it equally between both targets. If the second attack misses, neither target takes damage.',
      notesAdvanced: 'Special ranged attack action. Workflow should resolve two attack rolls before damage. Damage is all-or-nothing: do not roll/apply damage until both attacks succeed. If both hit, make one damage roll and divide the total equally between the two targets. The second target must be in direct line of sight and within 6 squares of the original target. Spatial predicates remain GM/workflow adjudicated unless a reliable line/geometry authority is present.',
      restriction: 'Requires Point-Blank Shot and a ranged weapon. Second target must be in direct line of sight and within 6 squares of the original target.',
      relatedSkills: [
        { skill: 'Attack Roll', outcome: 'Two ranged attack rolls; one all-or-nothing split damage roll if both hit.' }
      ],
      sourcebook: 'Star Wars Saga Edition Galaxy of Intrigue',
      executable: true,
      trigger: 'manual',
      resolutionMode: 'specialAttack',
      automationBoundary: 'runtime-helper',
      gmManaged: false,
      manualResolution: false,
      contextTags: ['attack', 'ranged', 'specialAttack', 'twoTargets', 'lineOfSight', 'splitDamage'],
      requiredContext: [
        'Actor has Grazing Shot feat',
        'Selected weapon is a ranged weapon',
        'Primary target is a single target',
        'Secondary target has direct line of sight',
        'Secondary target is no farther than 6 squares from original target'
      ],
      ruleData: {
        actionKey: 'grazing-shot',
        specialRangedAttackAction: true,
        twoAttackRolls: true,
        allOrNothingDamage: true,
        splitDamageEquallyBetweenTargets: true,
        helper: 'CombatOptionResolver.getSpecialRangedAttackActions'
      }
    },
    effects: [],
    folder: null,
    sort: 4.7,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, phase: 'galaxy-intrigue-combat-feat-pass' } }
  }
];

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
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

function injectActions(actions = []) {
  const existingKeys = new Set(actions.map(action => action?.system?.key ?? action?.key ?? action?._id).filter(Boolean));
  const out = [...actions];
  for (const action of GALAXY_INTRIGUE_COMBAT_ACTIONS) {
    if (existingKeys.has(action.system.key)) continue;
    out.push(action);
  }
  return out;
}

function patchMapper() {
  if (CombatActionsMapper.__swseGalaxyIntrigueCombatActionsPatched === true) return;

  const originalEnsure = CombatActionsMapper._ensureCoreManualCombatActions?.bind(CombatActionsMapper);
  if (typeof originalEnsure === 'function') {
    CombatActionsMapper._ensureCoreManualCombatActions = function patchedGalaxyIntrigueActions(actions = []) {
      return injectActions(originalEnsure(actions));
    };
  }

  const originalGetAllActionsBySkill = CombatActionsMapper.getAllActionsBySkill?.bind(CombatActionsMapper);
  if (typeof originalGetAllActionsBySkill === 'function') {
    CombatActionsMapper.getAllActionsBySkill = function patchedGalaxyIntrigueGetAllActionsBySkill(actor = null, options = {}) {
      const result = originalGetAllActionsBySkill(actor, options) ?? {};
      if (!actor || actorHasFeat(actor, 'Grazing Shot')) return result;
      for (const bucket of Object.values(result)) {
        bucket.combatActions = (bucket.combatActions ?? []).filter(action => action.key !== 'grazing-shot');
      }
      return result;
    };
  }

  if (Array.isArray(CombatActionsMapper._combatActions)) {
    CombatActionsMapper._combatActions = injectActions(CombatActionsMapper._combatActions);
  }

  CombatActionsMapper.__swseGalaxyIntrigueCombatActionsPatched = true;
}

export function registerGalaxyIntrigueCombatActionAdapter() {
  if (registered) return;
  registered = true;
  patchMapper();
  SWSELogger.log('[GalaxyIntrigueCombatActionAdapter] Grazing Shot action adapter registered');
}

export default registerGalaxyIntrigueCombatActionAdapter;
