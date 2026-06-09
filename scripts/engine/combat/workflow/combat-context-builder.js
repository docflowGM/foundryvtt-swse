import { summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";

function randomId() {
  try {
    return foundry?.utils?.randomID?.() ?? crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch (_err) {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function idOf(doc) {
  return doc?.id ?? doc?._id ?? null;
}

function asBool(value) {
  return value === true;
}

function lowerTags(action = {}) {
  return new Set((Array.isArray(action.contextTags) ? action.contextTags : []).map(v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')));
}

function attackModeFor(action = {}) {
  const tags = lowerTags(action);
  if (tags.has('autofire')) return 'autofire';
  if (tags.has('burstfire') || tags.has('burst-fire')) return 'burstFire';
  if (tags.has('areaattack') || tags.has('area-attack') || action.ruleData?.areaAttack === true) return 'area';
  if (action.resolutionMode === 'attack') return 'single';
  return null;
}

export function buildCombatWorkflowContext({ actor = null, action = {}, actionId = null, options = {}, sheet = null } = {}) {
  const tags = lowerTags(action);
  const ruleData = action.ruleData ?? {};
  const resources = action.resources ?? {};
  const weapon = options.weapon ?? options.item ?? null;
  const target = options.target ?? globalThis.game?.user?.targets?.first?.()?.actor ?? null;

  const context = {
    schema: 'swse.combat.workflow.v1',
    workflowId: options.workflowId ?? action.workflowId ?? randomId(),
    actor,
    actorId: idOf(actor),
    actorName: actor?.name ?? '',
    action: {
      id: action.id ?? action.key ?? actionId ?? null,
      key: action.key ?? action.id ?? actionId ?? null,
      name: action.name ?? action.label ?? actionId ?? 'Combat Action',
      resolutionMode: action.resolutionMode ?? null,
      actionCost: action.actionCost ?? action.actionType ?? null,
      actionType: action.actionType ?? action.actionCost ?? null,
      automationBoundary: action.automationBoundary ?? null,
      gmManaged: action.gmManaged === true,
      manualResolution: action.manualResolution === true,
      contextTags: Array.isArray(action.contextTags) ? action.contextTags : []
    },
    actionId: action.id ?? action.key ?? actionId ?? null,
    actionName: action.name ?? action.label ?? actionId ?? 'Combat Action',
    resolutionMode: action.resolutionMode ?? null,
    actionType: action.actionCost ?? action.actionType ?? null,
    automationBoundary: action.automationBoundary ?? null,
    contextTags: Array.isArray(action.contextTags) ? action.contextTags : [],
    weapon,
    weaponId: idOf(weapon) ?? options.weaponId ?? action.weaponId ?? null,
    weaponName: weapon?.name ?? options.weaponName ?? action.weaponName ?? '',
    target,
    targetId: idOf(target) ?? options.targetId ?? null,
    targetName: target?.name ?? options.targetName ?? '',
    attack: {
      mode: options.attackMode ?? attackModeFor(action),
      isArea: asBool(options.areaAttack) || asBool(options.isAreaAttack) || tags.has('areaattack') || tags.has('area-attack') || ruleData.areaAttack === true,
      isAutofire: asBool(options.autofire) || tags.has('autofire'),
      isBurstFire: asBool(options.burstFire) || tags.has('burstfire') || tags.has('burst-fire'),
      isAiming: asBool(options.aim) || asBool(options.aiming),
      isCharging: asBool(options.charge) || asBool(options.charging) || tags.has('charge'),
      isStun: asBool(options.stun) || ruleData.damageMode === 'stun' || ruleData.stun === true,
      isIon: asBool(options.ion) || ruleData.ion === true,
      damageMode: options.damageMode ?? ruleData.damageMode ?? null,
      rangeBand: options.rangeBand ?? null,
      maneuver: options.maneuver ?? null
    },
    resources: {
      ...(resources ?? {}),
      ammoCost: Number(options.ammoCost ?? resources?.ammoCost ?? ruleData.ammoCost ?? 0) || 0,
      enforceAmmo: options.enforceAmmo === true || resources?.enforceAmmo === true
    },
    economy: {
      spendAction: action.spendAction !== false
    },
    ruleData,
    source: {
      invocation: options.source ?? 'combat-action',
      sheetId: sheet?.id ?? null,
      element: options.sourceElement ?? null
    }
  };

  return summarizeCombatWorkflowContext(context, { actor, weapon, target });
}

export const CombatContextBuilder = { buildCombatWorkflowContext };
export default CombatContextBuilder;
