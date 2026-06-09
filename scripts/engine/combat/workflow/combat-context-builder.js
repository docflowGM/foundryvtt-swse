/**
 * Combat Context Builder
 *
 * Creates the transport context passed from combat-action UI into existing
 * combat authorities. This is intentionally a shim: it records intent and
 * routing metadata without owning rule math.
 */

import { normalizeCombatAction } from './combat-action-normalizer.js';

function docId(doc) {
  return doc?.id ?? doc?._id ?? null;
}

function docName(doc) {
  return doc?.name ?? null;
}

function randomWorkflowId() {
  return `swse-combat-${globalThis.foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function getTargetFromOptions(options = {}) {
  return options.target ?? globalThis.game?.user?.targets?.first?.()?.actor ?? null;
}

export function buildCombatWorkflowContext({ actor = null, actionId = null, actionData = {}, options = {}, sheet = null } = {}) {
  const action = normalizeCombatAction(actionData, { actionId });
  const target = getTargetFromOptions(options);
  const weapon = options.weapon ?? options.item ?? (action.weaponId ? actor?.items?.get?.(action.weaponId) : null) ?? null;

  return {
    schema: 'swse.combat.workflow.v1',
    workflowId: options.workflowId ?? action.workflowId ?? randomWorkflowId(),
    createdAt: new Date().toISOString(),
    actor,
    actorId: docId(actor),
    actorName: docName(actor),
    action,
    actionId: action.id,
    actionName: action.name,
    resolutionMode: action.resolutionMode,
    actionType: action.actionType,
    automationBoundary: action.automationBoundary,
    contextTags: Array.isArray(action.contextTags) ? [...action.contextTags] : [],
    requiredContext: Array.isArray(action.requiredContext) ? [...action.requiredContext] : [],
    resources: action.resources && typeof action.resources === 'object'
      ? { ...action.resources }
      : { value: action.resources ?? null, ammoCost: action.ruleData?.ammoCost ?? action.ammoCost ?? null },
    ruleData: { ...(action.ruleData ?? {}) },
    attack: {
      mode: options.attackMode ?? action.attackMode ?? action.ruleData?.attackMode ?? null,
      isArea: action.ruleData?.areaAttack === true || action.contextTags?.includes?.('areaAttack') || options.areaAttack === true,
      isAutofire: action.contextTags?.includes?.('autofire') || options.autofire === true,
      isBurstFire: action.contextTags?.includes?.('burstFire') || options.burstFire === true,
      isAiming: action.contextTags?.includes?.('aim') || options.aim === true,
      isCharging: action.contextTags?.includes?.('charge') || options.charge === true,
      defense: options.defense ?? action.ruleData?.defense ?? null
    },
    weapon,
    weaponId: docId(weapon) ?? action.weaponId ?? action.itemId ?? null,
    weaponName: docName(weapon) ?? null,
    target,
    targetId: docId(target) ?? options.targetId ?? null,
    targetName: docName(target) ?? options.targetName ?? null,
    source: {
      invocation: options.source ?? 'combat-action',
      element: options.sourceElement ?? null,
      sheetClass: sheet?.constructor?.name ?? null
    },
    economy: {
      spendAction: action.spendAction !== false,
      requestedType: action.actionType
    },
    options: {
      targetContext: options.targetContext ?? null,
      source: options.source ?? null
    }
  };
}
